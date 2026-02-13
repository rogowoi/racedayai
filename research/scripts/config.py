"""Configuration for ML training pipeline."""

import os
from pathlib import Path

# Paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
RESEARCH_DIR = PROJECT_ROOT / "research"
DATA_DIR = RESEARCH_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
ARTIFACTS_DIR = RESEARCH_DIR / "artifacts"
MODELS_DIR = ARTIFACTS_DIR / "models"
WEB_DATA_DIR = PROJECT_ROOT / "apps" / "web" / "src" / "data" / "ml-models"

# Ensure directories exist
PROCESSED_DATA_DIR.mkdir(parents=True, exist_ok=True)
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Distances
DISTANCES = ["sprint", "olympic", "70.3", "140.6"]

# Distance-specific configurations
DISTANCE_CONFIG = {
    "sprint": {
        "swim_distance_m": 750,
        "bike_distance_km": 20,
        "run_distance_km": 5,
        "typical_bike_if": 0.92,
        "time_bounds": {
            "total": (60 * 60, 180 * 60),  # 1-3 hours
            "swim": (8 * 60, 30 * 60),
            "bike": (25 * 60, 75 * 60),
            "run": (15 * 60, 50 * 60),
        },
    },
    "olympic": {
        "swim_distance_m": 1500,
        "bike_distance_km": 40,
        "run_distance_km": 10,
        "typical_bike_if": 0.88,
        "time_bounds": {
            "total": (100 * 60, 300 * 60),  # 1:40-5 hours
            "swim": (15 * 60, 45 * 60),
            "bike": (50 * 60, 120 * 60),
            "run": (30 * 60, 80 * 60),
        },
    },
    "70.3": {
        "swim_distance_m": 1900,
        "bike_distance_km": 90,
        "run_distance_km": 21.1,
        "typical_bike_if": 0.78,
        "time_bounds": {
            "total": (3.5 * 3600, 8.5 * 3600),  # 3:30-8:30
            "swim": (20 * 60, 90 * 60),
            "bike": (2 * 3600, 4.5 * 3600),
            "run": (1.5 * 3600, 4 * 3600),
        },
    },
    "140.6": {
        "swim_distance_m": 3800,
        "bike_distance_km": 180,
        "run_distance_km": 42.2,
        "typical_bike_if": 0.70,
        "time_bounds": {
            "total": (8 * 3600, 17 * 3600),  # 8-17 hours
            "swim": (40 * 60, 2.5 * 3600),
            "bike": (4.5 * 3600, 8 * 3600),
            "run": (3 * 3600, 7 * 3600),
        },
    },
}

# Feature names (from NB03)
BASE_FEATURES = [
    "pb_total_sec",
    "gender_enc",
    "age_band",
    "run_strength_z",
    "bike_strength_z",
    "swim_strength_z",
    "total_races",
    "consistency_cv",
    "improvement_slope",
    "dnf_rate",
    "cluster_id",
    "country_enc",
    "year",
]

# XGBoost hyperparameters (starting point, Optuna will tune)
XGBOOST_PARAMS = {
    "max_depth": 8,
    "learning_rate": 0.05,
    "n_estimators": 500,
    "min_child_weight": 3,
    "subsample": 0.9,
    "colsample_bytree": 0.9,
    "gamma": 0.1,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "random_state": 42,
    "n_jobs": -1,
}

# Optuna tuning
OPTUNA_N_TRIALS = 100
OPTUNA_N_FOLDS = 5

# Train/val/test split
TRAIN_SIZE = 0.80
VAL_SIZE = 0.10
TEST_SIZE = 0.10

# Consistency validation thresholds
CONSISTENCY_THRESHOLDS = {
    "swim_pace_error": 0.05,  # 5% error tolerance
    "run_pace_error": 0.05,   # 5% error tolerance
    "bike_watts_error": 0.20,  # 20% error tolerance (harder to estimate)
}

# Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
