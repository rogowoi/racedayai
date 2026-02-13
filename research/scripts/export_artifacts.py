"""
Export trained models to TypeScript-compatible format.

Packages model artifacts for production deployment:
- XGBoost models as JSON
- Imputation tables (cohort medians)
- Feature configurations
- Model metadata
"""

import argparse
import json
import shutil
from pathlib import Path
from typing import Dict, Any
import pandas as pd
import numpy as np

from .config import (
    MODELS_DIR,
    WEB_DATA_DIR,
    PROCESSED_DATA_DIR,
    DISTANCE_CONFIG,
    BASE_FEATURES,
    DISTANCES,
    LOG_LEVEL,
)
from .utils import setup_logger

logger = setup_logger(__name__, LOG_LEVEL)


def copy_model_files(input_dir: Path, output_dir: Path, distances: list[str]):
    """
    Copy XGBoost JSON model files to web app directory.

    Files per distance:
    - xgboost_total_{distance}.json
    - swim_sec_{distance}.json, swim_pace_{distance}.json
    - bike_sec_{distance}.json, bike_watts_{distance}.json, bike_np_{distance}.json
    - run_sec_{distance}.json, run_pace_{distance}.json
    - quantile_p{05,25,50,75,95}_{distance}.json
    """
    logger.info(f"Copying model files from {input_dir} to {output_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)

    copied_count = 0

    for distance in distances:
        # Total time model
        total_file = input_dir / f"xgboost_total_{distance}.json"
        if total_file.exists():
            shutil.copy2(total_file, output_dir / f"total_{distance}.json")
            copied_count += 1

        # Swim models
        for name in ["swim_sec", "swim_pace"]:
            src = input_dir / f"{name}_{distance}.json"
            if src.exists():
                shutil.copy2(src, output_dir / f"{name}_{distance}.json")
                copied_count += 1

        # Bike models
        for name in ["bike_sec", "bike_watts", "bike_np"]:
            src = input_dir / f"{name}_{distance}.json"
            if src.exists():
                shutil.copy2(src, output_dir / f"{name}_{distance}.json")
                copied_count += 1

        # Run models
        for name in ["run_sec", "run_pace"]:
            src = input_dir / f"{name}_{distance}.json"
            if src.exists():
                shutil.copy2(src, output_dir / f"{name}_{distance}.json")
                copied_count += 1

        # Quantile models
        for q in ["p05", "p25", "p50", "p75", "p95"]:
            src = input_dir / f"quantile_{q}_{distance}.json"
            if src.exists():
                shutil.copy2(src, output_dir / f"quantile_{q}_{distance}.json")
                copied_count += 1

    logger.info(f"  Copied {copied_count} model files")


def compute_imputation_tables() -> Dict[str, Any]:
    """
    Compute imputation tables for cold-start predictions.

    Returns cohort medians for Tier 0-1 users:
    - Total time medians by distance × gender × age_band
    - Strength score defaults
    - Transition time estimates
    """
    logger.info("Computing imputation tables from processed data")

    data_path = PROCESSED_DATA_DIR / "athlete_race_with_intensities.csv"

    if not data_path.exists():
        logger.warning(f"Processed data not found: {data_path}")
        logger.warning("Using default imputation values")
        return _get_default_imputation_tables()

    df = pd.read_csv(data_path)

    imputation = {
        "cohort_medians": {},
        "strength_defaults": {
            "swim_strength_z": 0.0,
            "bike_strength_z": 0.0,
            "run_strength_z": 0.0,
        },
        "transition_estimates": {},
    }

    # Compute cohort medians
    for distance in DISTANCES:
        df_dist = df[df["event_distance"] == distance]

        if len(df_dist) == 0:
            logger.warning(f"No data for {distance}, skipping")
            continue

        imputation["cohort_medians"][distance] = {}

        # Group by gender and age_band
        for gender in [0, 1]:  # 0=F, 1=M
            gender_key = "M" if gender == 1 else "F"
            imputation["cohort_medians"][distance][gender_key] = {}

            df_gender = df_dist[df_dist["gender_enc"] == gender]

            # Age bands (assuming age_band is numeric or string)
            age_bands = df_gender["age_band"].unique()

            for age_band in age_bands:
                df_cohort = df_gender[df_gender["age_band"] == age_band]

                if len(df_cohort) < 10:  # Skip small cohorts
                    continue

                imputation["cohort_medians"][distance][gender_key][str(age_band)] = {
                    "total_sec": float(df_cohort["total_sec"].median()),
                    "swim_sec": float(df_cohort["swim_sec"].median()),
                    "bike_sec": float(df_cohort["bike_sec"].median()),
                    "run_sec": float(df_cohort["run_sec"].median()),
                }

        # Transition estimates (median T1, T2 by distance)
        if "t1_sec" in df_dist.columns and "t2_sec" in df_dist.columns:
            imputation["transition_estimates"][distance] = {
                "t1": float(df_dist["t1_sec"].median()) if df_dist["t1_sec"].notna().sum() > 0 else 120,
                "t2": float(df_dist["t2_sec"].median()) if df_dist["t2_sec"].notna().sum() > 0 else 90,
            }
        else:
            # Default transition times
            imputation["transition_estimates"][distance] = {
                "t1": 120,  # 2 minutes
                "t2": 90,   # 1.5 minutes
            }

    logger.info(f"  Computed medians for {len(imputation['cohort_medians'])} distances")

    return imputation


def _get_default_imputation_tables() -> Dict[str, Any]:
    """Default imputation tables if data not available."""
    return {
        "cohort_medians": {
            "sprint": {
                "M": {"30": {"total_sec": 4500}},
                "F": {"30": {"total_sec": 5100}},
            },
            "olympic": {
                "M": {"30": {"total_sec": 8100}},
                "F": {"30": {"total_sec": 9300}},
            },
            "70.3": {
                "M": {"30": {"total_sec": 18900}},
                "F": {"30": {"total_sec": 21600}},
            },
            "140.6": {
                "M": {"30": {"total_sec": 37800}},
                "F": {"30": {"total_sec": 43200}},
            },
        },
        "strength_defaults": {
            "swim_strength_z": 0.0,
            "bike_strength_z": 0.0,
            "run_strength_z": 0.0,
        },
        "transition_estimates": {
            "sprint": {"t1": 90, "t2": 60},
            "olympic": {"t1": 120, "t2": 90},
            "70.3": {"t1": 180, "t2": 120},
            "140.6": {"t1": 300, "t2": 180},
        },
    }


def create_feature_config() -> Dict[str, Any]:
    """
    Create feature configuration for TypeScript inference.

    Includes:
    - Feature names and order
    - Encoding mappings (gender, age_band, country)
    - Feature defaults for missing values
    """
    logger.info("Creating feature configuration")

    config = {
        "features": BASE_FEATURES,
        "encodings": {
            "gender": {"M": 1, "F": 0},
            "age_band": {
                "18-24": 0, "25-29": 1, "30-34": 2, "35-39": 3,
                "40-44": 4, "45-49": 5, "50-54": 6, "55-59": 7,
                "60-64": 8, "65-69": 9, "70-74": 10, "75+": 11,
            },
        },
        "defaults": {
            "pb_total_sec": None,  # Must be imputed
            "gender_enc": 1,
            "age_band": 2,  # 30-34
            "run_strength_z": 0.0,
            "bike_strength_z": 0.0,
            "swim_strength_z": 0.0,
            "total_races": 1,
            "consistency_cv": 0.15,
            "improvement_slope": 0.0,
            "dnf_rate": 0.0,
            "cluster_id": 0,
            "country_enc": 0,
            "year": 2024,
        },
    }

    return config


def create_model_metadata(input_dir: Path, distances: list[str]) -> Dict[str, Any]:
    """
    Create metadata about trained models.

    Includes:
    - Training date
    - Model versions
    - Performance metrics (if available)
    - Distance configurations
    """
    logger.info("Creating model metadata")

    import datetime

    metadata = {
        "version": "0.1.0",
        "created_at": datetime.datetime.now().isoformat(),
        "distances": distances,
        "distance_configs": {
            dist: {
                "swim_distance_m": DISTANCE_CONFIG[dist]["swim_distance_m"],
                "bike_distance_km": DISTANCE_CONFIG[dist]["bike_distance_km"],
                "run_distance_km": DISTANCE_CONFIG[dist]["run_distance_km"],
                "typical_bike_if": DISTANCE_CONFIG[dist]["typical_bike_if"],
            }
            for dist in distances
        },
        "models": {
            "total": "Total time prediction (baseline)",
            "swim": "Multi-output: [swim_sec, swim_pace_per_100m]",
            "bike": "Multi-output: [bike_sec, avg_watts, normalized_watts]",
            "run": "Multi-output: [run_sec, run_pace_per_km]",
            "quantiles": "Confidence intervals: p05, p25, p50, p75, p95",
        },
        "chaining": {
            "swim": "Uses BASE_FEATURES only",
            "bike": "Uses BASE_FEATURES + swim_sec_pred",
            "run": "Uses BASE_FEATURES + swim_sec_pred + bike_sec_pred",
        },
    }

    return metadata


def main(
    input_dir: Path,
    output_dir: Path,
    distances: list[str],
):
    """
    Export all model artifacts to TypeScript-compatible format.

    Args:
        input_dir: Directory with trained models
        output_dir: Web app data directory
        distances: List of distances to export
    """
    logger.info(f"\n{'='*80}")
    logger.info("EXPORTING MODEL ARTIFACTS")
    logger.info(f"{'='*80}")
    logger.info(f"Input:  {input_dir}")
    logger.info(f"Output: {output_dir}")
    logger.info(f"Distances: {distances}")

    # 1. Copy model files
    copy_model_files(input_dir, output_dir, distances)

    # 2. Compute imputation tables
    imputation_tables = compute_imputation_tables()
    imputation_path = output_dir / "imputation_tables.json"
    with open(imputation_path, "w") as f:
        json.dump(imputation_tables, f, indent=2)
    logger.info(f"  Saved: {imputation_path}")

    # 3. Create feature config
    feature_config = create_feature_config()
    config_path = output_dir / "feature_config.json"
    with open(config_path, "w") as f:
        json.dump(feature_config, f, indent=2)
    logger.info(f"  Saved: {config_path}")

    # 4. Create model metadata
    metadata = create_model_metadata(input_dir, distances)
    metadata_path = output_dir / "model_metadata.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    logger.info(f"  Saved: {metadata_path}")

    logger.info(f"\n{'='*80}")
    logger.info("EXPORT COMPLETE")
    logger.info(f"{'='*80}")
    logger.info(f"\nArtifacts exported to: {output_dir}")
    logger.info("Ready for TypeScript inference pipeline!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export model artifacts for TypeScript")
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=MODELS_DIR,
        help="Directory with trained models",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=WEB_DATA_DIR,
        help="Output directory (web app data directory)",
    )
    parser.add_argument(
        "--distances",
        type=str,
        default="sprint,olympic,70.3,140.6",
        help="Comma-separated list of distances",
    )

    args = parser.parse_args()

    distances = [d.strip() for d in args.distances.split(",")]

    main(args.input_dir, args.output_dir, distances)
