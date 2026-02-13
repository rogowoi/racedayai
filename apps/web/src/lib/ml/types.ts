/**
 * TypeScript types for ML prediction pipeline
 */

// Distance types
export type Distance = "sprint" | "olympic" | "70.3" | "140.6";

// User input for prediction
export interface UserInput {
  gender?: "M" | "F";
  age?: number;
  ftp?: number;
  weight?: number;
  css?: number;
  thresholdPace?: number;
  priorRaces?: Array<{
    distance: Distance;
    time: number; // seconds
  }>;
}

// Tier classification (data richness)
export type Tier = 0 | 1 | 2 | 3 | 4 | 5;

// Feature vector for model input
export interface FeatureVector {
  pb_total_sec: number;
  gender_enc: number; // 0=F, 1=M
  age_band: number;
  run_strength_z: number;
  bike_strength_z: number;
  swim_strength_z: number;
  total_races: number;
  consistency_cv: number;
  improvement_slope: number;
  dnf_rate: number;
  cluster_id: number;
  country_enc: number;
  year: number;
}

// Segment predictions with intensities
export interface SegmentPrediction {
  swim: {
    seconds: number;
    pacePer100m: number; // seconds per 100m
  };
  bike: {
    seconds: number;
    avgWatts: number;
    normalizedWatts: number;
    intensityFactor: number; // NP / FTP
  };
  run: {
    seconds: number;
    avgPacePerKm: number; // minutes per km
    avgPacePerMile: number; // minutes per mile
  };
  transitions: {
    t1: number;
    t2: number;
  };
}

// Full race prediction
export interface RacePrediction {
  totalSeconds: number;
  quantiles: {
    p05: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  segments: SegmentPrediction;
  confidence: "low" | "moderate" | "high";
  tier: Tier;
}

// XGBoost model structure (columnar arrays format)
export interface XGBoostTree {
  base_weights: number[]; // Leaf values
  left_children: number[]; // -1 means leaf node
  right_children: number[]; // -1 means leaf node
  split_indices: number[]; // Feature index to split on
  split_conditions: number[]; // Threshold value
  default_left: number[]; // 0 or 1
}

export interface XGBoostModel {
  learner: {
    gradient_booster: {
      model: {
        trees: XGBoostTree[];
      };
    };
    learner_model_param?: {
      base_score: string; // e.g. "[2.2852993E3]"
      num_feature: string;
    };
    objective?: {
      name: string;
    };
  };
  version?: number[];
}

// Imputation tables
export interface ImputationTables {
  cohort_medians: {
    [distance: string]: {
      [gender: string]: {
        [age_band: string]: {
          total_sec: number;
          swim_sec?: number;
          bike_sec?: number;
          run_sec?: number;
        };
      };
    };
  };
  strength_defaults: {
    swim_strength_z: number;
    bike_strength_z: number;
    run_strength_z: number;
  };
  transition_estimates: {
    [distance: string]: {
      t1: number;
      t2: number;
    };
  };
}

// Feature configuration
export interface FeatureConfig {
  features: string[];
  encodings: {
    gender: { [key: string]: number };
    age_band: { [key: string]: number };
  };
  defaults: Partial<FeatureVector>;
}

// Model metadata
export interface ModelMetadata {
  version: string;
  created_at: string;
  distances: Distance[];
  distance_configs: {
    [distance: string]: {
      swim_distance_m: number;
      bike_distance_km: number;
      run_distance_km: number;
      typical_bike_if: number;
    };
  };
}
