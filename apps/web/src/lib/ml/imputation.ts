/**
 * Feature imputation for cold-start predictions
 *
 * Handles Tier 0-5 users with varying amounts of data:
 * - Tier 0: No info (use global medians)
 * - Tier 1: Gender + age (use cohort medians)
 * - Tier 2: One prior race time (use distance transfer)
 * - Tier 3: Fitness metrics (FTP/CSS/threshold pace)
 * - Tier 4: Specific target race info
 * - Tier 5: Multiple race history
 */

import type {
  UserInput,
  Tier,
  FeatureVector,
  Distance,
  ImputationTables,
  FeatureConfig,
} from "./types";

/**
 * Classify user tier based on available data
 */
export function classifyTier(input: UserInput): Tier {
  // Tier 5: Multiple race results
  if (input.priorRaces && input.priorRaces.length > 2) {
    return 5;
  }

  // Tier 3: Fitness metrics (FTP, CSS, threshold pace)
  if (
    (input.ftp && input.ftp > 0) ||
    (input.css && input.css > 0) ||
    (input.thresholdPace && input.thresholdPace > 0)
  ) {
    return 3;
  }

  // Tier 2: One prior race time
  if (input.priorRaces && input.priorRaces.length > 0) {
    return 2;
  }

  // Tier 1: Demographics (gender + age)
  if (input.gender && input.age) {
    return 1;
  }

  // Tier 0: No info
  return 0;
}

/**
 * Get age band from age
 */
function getAgeBand(age: number): number {
  if (age < 25) return 0; // 18-24
  if (age < 30) return 1; // 25-29
  if (age < 35) return 2; // 30-34
  if (age < 40) return 3; // 35-39
  if (age < 45) return 4; // 40-44
  if (age < 50) return 5; // 45-49
  if (age < 55) return 6; // 50-54
  if (age < 60) return 7; // 55-59
  if (age < 65) return 8; // 60-64
  if (age < 70) return 9; // 65-69
  if (age < 75) return 10; // 70-74
  return 11; // 75+
}

/**
 * Impute features for Tier 0 (no info)
 */
function imputeTier0(
  distance: Distance,
  imputation: ImputationTables,
  defaults: Partial<FeatureVector>
): FeatureVector {
  // Use global median (default gender=M, age_band=30-34)
  const cohort = imputation.cohort_medians[distance]?.["M"]?.["2"];
  const pbTotalSec = cohort?.total_sec || 19800; // Default: 5.5 hours for 70.3

  return {
    pb_total_sec: pbTotalSec,
    gender_enc: defaults.gender_enc ?? 1,
    age_band: defaults.age_band ?? 2,
    run_strength_z: imputation.strength_defaults.run_strength_z,
    bike_strength_z: imputation.strength_defaults.bike_strength_z,
    swim_strength_z: imputation.strength_defaults.swim_strength_z,
    total_races: defaults.total_races ?? 1,
    consistency_cv: defaults.consistency_cv ?? 0.15,
    improvement_slope: defaults.improvement_slope ?? 0,
    dnf_rate: defaults.dnf_rate ?? 0,
    cluster_id: defaults.cluster_id ?? 0,
    country_enc: defaults.country_enc ?? 0,
    year: defaults.year ?? new Date().getFullYear(),
  };
}

/**
 * Impute features for Tier 1 (gender + age)
 */
function imputeTier1(
  input: UserInput,
  distance: Distance,
  imputation: ImputationTables,
  defaults: Partial<FeatureVector>
): FeatureVector {
  const genderKey = input.gender || "M";
  const ageBand = input.age ? getAgeBand(input.age) : 2;
  const ageBandStr = String(ageBand);

  // Get cohort median for this gender + age_band
  const cohort = imputation.cohort_medians[distance]?.[genderKey]?.[ageBandStr];
  const pbTotalSec = cohort?.total_sec || 19800;

  return {
    pb_total_sec: pbTotalSec,
    gender_enc: genderKey === "M" ? 1 : 0,
    age_band: ageBand,
    run_strength_z: imputation.strength_defaults.run_strength_z,
    bike_strength_z: imputation.strength_defaults.bike_strength_z,
    swim_strength_z: imputation.strength_defaults.swim_strength_z,
    total_races: defaults.total_races ?? 1,
    consistency_cv: defaults.consistency_cv ?? 0.15,
    improvement_slope: defaults.improvement_slope ?? 0,
    dnf_rate: defaults.dnf_rate ?? 0,
    cluster_id: defaults.cluster_id ?? 0,
    country_enc: defaults.country_enc ?? 0,
    year: defaults.year ?? new Date().getFullYear(),
  };
}

/**
 * Distance transfer ratios (from Plan 10 Step 3.1)
 */
const DISTANCE_TRANSFER_MATRIX: Record<Distance, Record<Distance, number>> = {
  sprint: {
    sprint: 1.0,
    olympic: 2.0,
    "70.3": 4.5,
    "140.6": 9.5,
  },
  olympic: {
    sprint: 0.5,
    olympic: 1.0,
    "70.3": 2.2,
    "140.6": 4.8,
  },
  "70.3": {
    sprint: 0.22,
    olympic: 0.45,
    "70.3": 1.0,
    "140.6": 2.15,
  },
  "140.6": {
    sprint: 0.11,
    olympic: 0.21,
    "70.3": 0.47,
    "140.6": 1.0,
  },
};

/**
 * Impute features for Tier 2 (one prior race)
 */
function imputeTier2(
  input: UserInput,
  distance: Distance,
  imputation: ImputationTables,
  defaults: Partial<FeatureVector>
): FeatureVector {
  // Start with Tier 1 base
  const base = imputeTier1(input, distance, imputation, defaults);

  // Apply distance transfer if prior race is different distance
  if (input.priorRaces && input.priorRaces.length > 0) {
    const priorRace = input.priorRaces[0];
    const transferRatio = DISTANCE_TRANSFER_MATRIX[priorRace.distance][distance];
    base.pb_total_sec = priorRace.time * transferRatio;
  }

  return base;
}

/**
 * Impute features for Tier 3+ (fitness metrics or full history)
 */
function imputeTier3Plus(
  input: UserInput,
  distance: Distance,
  imputation: ImputationTables,
  defaults: Partial<FeatureVector>
): FeatureVector {
  // Start with Tier 2 base
  const base = imputeTier2(input, distance, imputation, defaults);

  // TODO: For Tier 3, use physics model to estimate pb_total_sec from FTP/CSS/threshold
  // For now, just use Tier 2 approach

  // TODO: For Tier 5, compute actual strength z-scores from race history

  return base;
}

/**
 * Main imputation function
 */
export function imputeFeatures(
  input: UserInput,
  tier: Tier,
  distance: Distance,
  imputation: ImputationTables,
  config: FeatureConfig
): FeatureVector {
  const defaults = config.defaults;

  switch (tier) {
    case 0:
      return imputeTier0(distance, imputation, defaults);
    case 1:
      return imputeTier1(input, distance, imputation, defaults);
    case 2:
      return imputeTier2(input, distance, imputation, defaults);
    case 3:
    case 4:
    case 5:
      return imputeTier3Plus(input, distance, imputation, defaults);
    default:
      throw new Error(`Invalid tier: ${tier}`);
  }
}

/**
 * Convert FeatureVector to array (for XGBoost inference)
 */
export function featureVectorToArray(
  features: FeatureVector,
  featureNames: string[]
): number[] {
  return featureNames.map((name) => {
    const key = name as keyof FeatureVector;
    return features[key];
  });
}

/**
 * Get confidence level from tier
 */
export function tierToConfidence(tier: Tier): "low" | "moderate" | "high" {
  if (tier >= 3) return "high";
  if (tier >= 2) return "moderate";
  return "low";
}
