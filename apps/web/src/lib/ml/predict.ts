/**
 * Main prediction orchestrator
 *
 * Coordinates the full ML prediction pipeline:
 * 1. Classify tier
 * 2. Impute features
 * 3. Load models
 * 4. Predict segments (swim → bike → run)
 * 5. Predict quantiles
 * 6. Validate consistency
 */

import type {
  UserInput,
  Distance,
  RacePrediction,
  SegmentPrediction,
  FeatureVector,
  ImputationTables,
  FeatureConfig,
  ModelMetadata,
} from "./types";
import {
  classifyTier,
  imputeFeatures,
  featureVectorToArray,
  tierToConfidence,
} from "./imputation";
import { preloadModels, predictXGBoost } from "./xgboost-inference";
import { validateConsistency, validateSegmentSum } from "./validation";
import { readFile } from "fs/promises";
import { join } from "path";

/**
 * Load JSON file (supports Vercel Blob, Node.js, and browser)
 */
async function loadJSON(path: string): Promise<any> {
  const fileName = path.split("/").pop()!;

  // Production: Load from Vercel Blob
  if (typeof window === "undefined" && process.env.VERCEL) {
    const version = process.env.MODEL_VERSION || "v1.0.0";
    const blobUrl = `https://6azhd1xfgmdyqpi5.public.blob.vercel-storage.com/${version}/ml-models/${fileName}`;

    const response = await fetch(blobUrl);
    if (!response.ok) {
      throw new Error(`Failed to load from Blob: ${fileName} (${response.statusText})`);
    }
    return response.json();
  }

  // Local Node.js environment (tsx, next dev)
  if (typeof window === "undefined") {
    const basePath = process.cwd();
    const fullPath = join(basePath, "src", "data", "ml-models", fileName);
    const content = await readFile(fullPath, "utf-8");
    return JSON.parse(content);
  }

  // Browser environment
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Load static data files (imputation tables, feature config, metadata)
 */
export async function loadStaticData(): Promise<{
  imputation: ImputationTables;
  config: FeatureConfig;
  metadata: ModelMetadata;
}> {
  const [imputation, config, metadata] = await Promise.all([
    loadJSON("/data/ml-models/imputation_tables.json"),
    loadJSON("/data/ml-models/feature_config.json"),
    loadJSON("/data/ml-models/model_metadata.json"),
  ]);

  return { imputation, config, metadata };
}

/**
 * Predict race time with full segment breakdown
 */
export async function predictRaceTime(
  input: UserInput,
  distance: Distance
): Promise<RacePrediction> {
  // 1. Load static data
  const { imputation, config, metadata } = await loadStaticData();

  // 2. Classify tier
  const tier = classifyTier(input);

  // 3. Impute features
  const features = imputeFeatures(input, tier, distance, imputation, config);
  const featureArray = featureVectorToArray(features, config.features);

  // 4. Load models
  const models = await preloadModels(distance);

  // 5. Predict SWIM [swim_sec, swim_pace_per_100m]
  const swimSec = predictXGBoost(models.swim_sec, featureArray);
  const swimPace = predictXGBoost(models.swim_pace, featureArray);

  // 6. Predict BIKE [bike_sec, avg_watts, normalized_watts]
  // Add swim prediction as feature (chained)
  const bikeFeatures = [...featureArray, swimSec];
  const bikeSec = predictXGBoost(models.bike_sec, bikeFeatures);
  const bikeWatts = predictXGBoost(models.bike_watts, bikeFeatures);
  const bikeNP = predictXGBoost(models.bike_np, bikeFeatures);

  // 7. Predict RUN [run_sec, run_pace_per_km]
  // Add swim + bike predictions as features (chained)
  const runFeatures = [...featureArray, swimSec, bikeSec];
  const runSec = predictXGBoost(models.run_sec, runFeatures);
  const runPace = predictXGBoost(models.run_pace, runFeatures);

  // 8. Transitions
  const t1 = imputation.transition_estimates[distance]?.t1 || 120;
  const t2 = imputation.transition_estimates[distance]?.t2 || 90;

  // 9. Total time (sum segments)
  const totalSeconds = swimSec + bikeSec + runSec + t1 + t2;

  // 10. Quantiles (for confidence intervals)
  const quantiles = {
    p05: predictXGBoost(models.quantiles.p05, featureArray),
    p25: predictXGBoost(models.quantiles.p25, featureArray),
    p50: predictXGBoost(models.quantiles.p50, featureArray),
    p75: predictXGBoost(models.quantiles.p75, featureArray),
    p95: predictXGBoost(models.quantiles.p95, featureArray),
  };

  // 11. Compute derived metrics
  const intensityFactor = input.ftp ? bikeNP / input.ftp : bikeNP / 250; // Default FTP
  const avgPacePerMile = runPace * 1.60934;

  // 12. Build segment prediction
  const segments: SegmentPrediction = {
    swim: {
      seconds: swimSec,
      pacePer100m: swimPace,
    },
    bike: {
      seconds: bikeSec,
      avgWatts: bikeWatts,
      normalizedWatts: bikeNP,
      intensityFactor,
    },
    run: {
      seconds: runSec,
      avgPacePerKm: runPace,
      avgPacePerMile,
    },
    transitions: {
      t1,
      t2,
    },
  };

  // 13. Validate consistency
  const consistencyResult = validateConsistency(
    segments,
    distance,
    metadata,
    input.weight
  );

  if (!consistencyResult.isValid) {
    console.warn("Prediction consistency warnings:", consistencyResult.errors);
  }

  // 14. Validate segment sum
  const segmentSumResult = validateSegmentSum(segments, totalSeconds);

  if (!segmentSumResult.isValid && segmentSumResult.message) {
    console.warn(segmentSumResult.message);
  }

  // 15. Return full prediction
  return {
    totalSeconds,
    quantiles,
    segments,
    confidence: tierToConfidence(tier),
    tier,
  };
}

/**
 * Format prediction for display
 */
export function formatPrediction(prediction: RacePrediction): {
  total: string;
  swim: string;
  bike: string;
  run: string;
  bikeWatts: string;
  runPace: string;
} {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, "0")}`;
    }
  };

  return {
    total: formatTime(prediction.totalSeconds),
    swim: formatTime(prediction.segments.swim.seconds),
    bike: formatTime(prediction.segments.bike.seconds),
    run: formatTime(prediction.segments.run.seconds),
    bikeWatts: `${Math.round(prediction.segments.bike.avgWatts)}W`,
    runPace: `${Math.floor(prediction.segments.run.avgPacePerKm)}:${Math.round((prediction.segments.run.avgPacePerKm % 1) * 60).toString().padStart(2, "0")}/km`,
  };
}
