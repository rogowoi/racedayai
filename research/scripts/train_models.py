"""
Multi-Output Model Training

Trains XGBoost models that predict time + intensity together:
- Swim: [swim_sec, swim_pace_per_100m]
- Bike: [bike_sec, avg_watts, normalized_watts]
- Run: [run_sec, run_pace_per_km]
- Total: total_sec (for validation)
- Quantiles: p05, p25, p50, p75, p95 (for confidence intervals)
"""

import argparse
import json
from pathlib import Path
from typing import Dict, Tuple, Optional
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GroupKFold
from sklearn.multioutput import MultiOutputRegressor
import xgboost as xgb
from xgboost import XGBRegressor
import optuna

from .config import (
    PROCESSED_DATA_DIR,
    MODELS_DIR,
    BASE_FEATURES,
    XGBOOST_PARAMS,
    OPTUNA_N_TRIALS,
    OPTUNA_N_FOLDS,
    TRAIN_SIZE,
    VAL_SIZE,
    TEST_SIZE,
    DISTANCE_CONFIG,
    LOG_LEVEL,
)
from .utils import (
    setup_logger,
    calculate_mae_minutes,
    calculate_mape,
    calculate_r2,
    print_metrics,
    validate_swim_consistency,
    validate_run_consistency,
    validate_bike_consistency,
)

logger = setup_logger(__name__, LOG_LEVEL)


def load_processed_data(distance: str) -> pd.DataFrame:
    """Load processed data with intensity features for a specific distance."""
    data_path = PROCESSED_DATA_DIR / "athlete_race_with_intensities.csv"

    if not data_path.exists():
        raise FileNotFoundError(
            f"Could not find {data_path}. Run etl.py first to generate processed data."
        )

    logger.info(f"Loading processed data from {data_path}")
    df = pd.read_csv(data_path)

    # Filter to distance (handle both string and float formats)
    if distance in ["sprint", "olympic"]:
        df = df[df["event_distance"] == distance].copy()
    else:
        # Handle mixed string/float for 70.3 and 140.6
        distance_float = float(distance)
        df = df[(df["event_distance"] == distance) | (df["event_distance"] == distance_float)].copy()
    logger.info(f"Loaded {len(df):,} records for {distance}")

    return df


def prepare_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Prepare feature matrix and target variables.

    Returns:
        X: Feature matrix
        y: Target dictionary with all outputs
    """
    # Check if required features exist
    missing_features = [f for f in BASE_FEATURES if f not in df.columns]
    if missing_features:
        raise ValueError(f"Missing features: {missing_features}")

    # Feature matrix
    X = df[BASE_FEATURES].copy()

    # Target variables
    y = pd.DataFrame({
        "total_sec": df["total_sec"],
        "swim_sec": df["swim_sec"],
        "swim_pace_per_100m": df["swim_pace_per_100m"],
        "bike_sec": df["bike_sec"],
        "avg_watts": df["avg_watts"],
        "normalized_watts": df["normalized_watts"],
        "run_sec": df["run_sec"],
        "run_pace_per_km": df["run_pace_per_km"],
    })

    # Drop rows with NaN in targets (we need complete data for multi-output)
    mask = y.notna().all(axis=1) & X.notna().all(axis=1)
    X = X[mask]
    y = y[mask]

    logger.info(f"Prepared {len(X):,} complete records with all features and targets")

    return X, y


def split_data(
    X: pd.DataFrame,
    y: pd.DataFrame,
    stratify_cols: Optional[list] = None,
    random_state: int = 42,
) -> Tuple:
    """
    Split data into train/val/test sets.

    Args:
        X: Feature matrix
        y: Target dataframe
        stratify_cols: Columns to stratify by (e.g., ['gender_enc', 'age_band'])
        random_state: Random seed

    Returns:
        X_train, X_val, X_test, y_train, y_val, y_test
    """
    # First split: train+val vs test
    if stratify_cols:
        stratify = X[stratify_cols].astype(str).agg("-".join, axis=1)
    else:
        stratify = None

    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=random_state, stratify=stratify
    )

    # Second split: train vs val
    val_ratio = VAL_SIZE / (TRAIN_SIZE + VAL_SIZE)

    if stratify_cols:
        stratify = X_train_val[stratify_cols].astype(str).agg("-".join, axis=1)
    else:
        stratify = None

    X_train, X_val, y_train, y_val = train_test_split(
        X_train_val, y_train_val, test_size=val_ratio, random_state=random_state, stratify=stratify
    )

    logger.info(f"Split sizes:")
    logger.info(f"  Train: {len(X_train):,} ({len(X_train)/len(X)*100:.1f}%)")
    logger.info(f"  Val:   {len(X_val):,} ({len(X_val)/len(X)*100:.1f}%)")
    logger.info(f"  Test:  {len(X_test):,} ({len(X_test)/len(X)*100:.1f}%)")

    return X_train, X_val, X_test, y_train, y_val, y_test


def train_total_time_model(
    X_train: pd.DataFrame,
    y_train: pd.DataFrame,
    X_val: pd.DataFrame,
    y_val: pd.DataFrame,
    tune: bool = False,
) -> XGBRegressor:
    """
    Train total time prediction model (single output).
    This is used as a baseline and for validation.
    """
    logger.info("\n=== Training Total Time Model ===")

    if tune:
        logger.info("Tuning hyperparameters with Optuna...")
        # TODO: Implement Optuna tuning
        # For now, use default params
        params = XGBOOST_PARAMS.copy()
    else:
        params = XGBOOST_PARAMS.copy()

    model = XGBRegressor(**params)
    model.fit(
        X_train,
        y_train["total_sec"],
        eval_set=[(X_val, y_val["total_sec"])],
        verbose=False,
    )

    # Evaluate
    y_pred_train = model.predict(X_train)
    y_pred_val = model.predict(X_val)

    print_metrics(y_train["total_sec"].values, y_pred_train, "Train")
    print_metrics(y_val["total_sec"].values, y_pred_val, "Val")

    return model


def train_swim_model(
    X_train: pd.DataFrame,
    y_train: pd.DataFrame,
    X_val: pd.DataFrame,
    y_val: pd.DataFrame,
    distance: str,
) -> MultiOutputRegressor:
    """
    Train swim model: [swim_sec, swim_pace_per_100m]
    """
    logger.info("\n=== Training Swim Model ===")
    logger.info("Outputs: [swim_sec, swim_pace_per_100m]")

    # Targets
    y_train_swim = y_train[["swim_sec", "swim_pace_per_100m"]]
    y_val_swim = y_val[["swim_sec", "swim_pace_per_100m"]]

    # Multi-output wrapper
    model = MultiOutputRegressor(XGBRegressor(**XGBOOST_PARAMS))
    model.fit(X_train, y_train_swim)

    # Evaluate
    y_pred_train = model.predict(X_train)
    y_pred_val = model.predict(X_val)

    print_metrics(y_train_swim["swim_sec"].values, y_pred_train[:, 0], "Train (swim_sec)")
    print_metrics(y_val_swim["swim_sec"].values, y_pred_val[:, 0], "Val (swim_sec)")

    # Consistency check
    swim_distance_m = DISTANCE_CONFIG[distance]["swim_distance_m"]
    consistency_error = validate_swim_consistency(
        y_pred_val[:, 0], y_pred_val[:, 1], swim_distance_m
    )
    logger.info(f"  Swim consistency error: {consistency_error*100:.2f}%")

    return model


def train_bike_model(
    X_train: pd.DataFrame,
    y_train: pd.DataFrame,
    X_val: pd.DataFrame,
    y_val: pd.DataFrame,
    swim_pred_train: np.ndarray,
    swim_pred_val: np.ndarray,
    distance: str,
) -> MultiOutputRegressor:
    """
    Train bike model: [bike_sec, avg_watts, normalized_watts]
    Uses swim prediction as additional feature (chained model).
    """
    logger.info("\n=== Training Bike Model ===")
    logger.info("Outputs: [bike_sec, avg_watts, normalized_watts]")
    logger.info("Features: BASE_FEATURES + swim_sec_pred")

    # Add swim prediction as feature
    X_train_bike = X_train.copy()
    X_train_bike["swim_sec_pred"] = swim_pred_train

    X_val_bike = X_val.copy()
    X_val_bike["swim_sec_pred"] = swim_pred_val

    # Targets
    y_train_bike = y_train[["bike_sec", "avg_watts", "normalized_watts"]]
    y_val_bike = y_val[["bike_sec", "avg_watts", "normalized_watts"]]

    # Multi-output wrapper
    model = MultiOutputRegressor(XGBRegressor(**XGBOOST_PARAMS))
    model.fit(X_train_bike, y_train_bike)

    # Evaluate
    y_pred_train = model.predict(X_train_bike)
    y_pred_val = model.predict(X_val_bike)

    print_metrics(y_train_bike["bike_sec"].values, y_pred_train[:, 0], "Train (bike_sec)")
    print_metrics(y_val_bike["bike_sec"].values, y_pred_val[:, 0], "Val (bike_sec)")

    # Consistency check
    bike_distance_km = DISTANCE_CONFIG[distance]["bike_distance_km"]
    consistency_error = validate_bike_consistency(
        y_pred_val[:, 0], y_pred_val[:, 1], bike_distance_km
    )
    logger.info(f"  Bike consistency error: {consistency_error*100:.2f}%")

    return model


def train_run_model(
    X_train: pd.DataFrame,
    y_train: pd.DataFrame,
    X_val: pd.DataFrame,
    y_val: pd.DataFrame,
    swim_pred_train: np.ndarray,
    swim_pred_val: np.ndarray,
    bike_pred_train: np.ndarray,
    bike_pred_val: np.ndarray,
    distance: str,
) -> MultiOutputRegressor:
    """
    Train run model: [run_sec, run_pace_per_km]
    Uses swim + bike predictions as additional features (chained model).
    """
    logger.info("\n=== Training Run Model ===")
    logger.info("Outputs: [run_sec, run_pace_per_km]")
    logger.info("Features: BASE_FEATURES + swim_sec_pred + bike_sec_pred")

    # Add swim + bike predictions as features
    X_train_run = X_train.copy()
    X_train_run["swim_sec_pred"] = swim_pred_train
    X_train_run["bike_sec_pred"] = bike_pred_train

    X_val_run = X_val.copy()
    X_val_run["swim_sec_pred"] = swim_pred_val
    X_val_run["bike_sec_pred"] = bike_pred_val

    # Targets
    y_train_run = y_train[["run_sec", "run_pace_per_km"]]
    y_val_run = y_val[["run_sec", "run_pace_per_km"]]

    # Multi-output wrapper
    model = MultiOutputRegressor(XGBRegressor(**XGBOOST_PARAMS))
    model.fit(X_train_run, y_train_run)

    # Evaluate
    y_pred_train = model.predict(X_train_run)
    y_pred_val = model.predict(X_val_run)

    print_metrics(y_train_run["run_sec"].values, y_pred_train[:, 0], "Train (run_sec)")
    print_metrics(y_val_run["run_sec"].values, y_pred_val[:, 0], "Val (run_sec)")

    # Consistency check
    run_distance_km = DISTANCE_CONFIG[distance]["run_distance_km"]
    consistency_error = validate_run_consistency(
        y_pred_val[:, 0], y_pred_val[:, 1], run_distance_km
    )
    logger.info(f"  Run consistency error: {consistency_error*100:.2f}%")

    return model


def train_quantile_models(
    X_train: pd.DataFrame,
    y_train: pd.DataFrame,
    X_val: pd.DataFrame,
    y_val: pd.DataFrame,
) -> Dict[str, XGBRegressor]:
    """
    Train quantile regression models for uncertainty estimation.
    Outputs: p05, p25, p50, p75, p95
    """
    logger.info("\n=== Training Quantile Models ===")

    quantiles = [0.05, 0.25, 0.50, 0.75, 0.95]
    models = {}

    for q in quantiles:
        logger.info(f"Training quantile {q:.2f}...")

        params = XGBOOST_PARAMS.copy()
        params["objective"] = "reg:quantileerror"
        params["quantile_alpha"] = q

        model = XGBRegressor(**params)
        model.fit(
            X_train,
            y_train["total_sec"],
            eval_set=[(X_val, y_val["total_sec"])],
            verbose=False,
        )

        models[f"p{int(q*100):02d}"] = model

    # Check coverage
    y_pred = {name: model.predict(X_val) for name, model in models.items()}
    actual = y_val["total_sec"].values

    in_90_interval = ((actual >= y_pred["p05"]) & (actual <= y_pred["p95"])).mean()
    in_50_interval = ((actual >= y_pred["p25"]) & (actual <= y_pred["p75"])).mean()

    logger.info(f"  90% interval coverage: {in_90_interval*100:.1f}%")
    logger.info(f"  50% interval coverage: {in_50_interval*100:.1f}%")

    return models


def save_models(
    total_model: XGBRegressor,
    swim_model: MultiOutputRegressor,
    bike_model: MultiOutputRegressor,
    run_model: MultiOutputRegressor,
    quantile_models: Dict[str, XGBRegressor],
    distance: str,
    output_dir: Path,
):
    """Save all trained models."""
    logger.info(f"\n=== Saving Models to {output_dir} ===")

    output_dir.mkdir(parents=True, exist_ok=True)

    # Total time model
    total_path = output_dir / f"xgboost_total_{distance}.json"
    total_model.save_model(total_path)
    logger.info(f"  Saved: {total_path}")

    # Multi-output models (save each estimator separately)
    # Swim: [swim_sec, swim_pace_per_100m]
    swim_model.estimators_[0].save_model(output_dir / f"swim_sec_{distance}.json")
    swim_model.estimators_[1].save_model(output_dir / f"swim_pace_{distance}.json")
    logger.info(f"  Saved: swim models for {distance}")

    # Bike: [bike_sec, avg_watts, normalized_watts]
    bike_model.estimators_[0].save_model(output_dir / f"bike_sec_{distance}.json")
    bike_model.estimators_[1].save_model(output_dir / f"bike_watts_{distance}.json")
    bike_model.estimators_[2].save_model(output_dir / f"bike_np_{distance}.json")
    logger.info(f"  Saved: bike models for {distance}")

    # Run: [run_sec, run_pace_per_km]
    run_model.estimators_[0].save_model(output_dir / f"run_sec_{distance}.json")
    run_model.estimators_[1].save_model(output_dir / f"run_pace_{distance}.json")
    logger.info(f"  Saved: run models for {distance}")

    # Quantile models
    for name, model in quantile_models.items():
        model.save_model(output_dir / f"quantile_{name}_{distance}.json")
    logger.info(f"  Saved: {len(quantile_models)} quantile models for {distance}")


def train_distance(
    distance: str,
    output_dir: Path,
    tune_hyperparams: bool = False,
):
    """Train all models for a single distance."""
    logger.info(f"\n{'='*80}")
    logger.info(f"TRAINING MODELS FOR {distance.upper()}")
    logger.info(f"{'='*80}")

    # Load data
    df = load_processed_data(distance)

    # Prepare features
    X, y = prepare_features(df)

    # Split data
    X_train, X_val, X_test, y_train, y_val, y_test = split_data(
        X, y, stratify_cols=["gender_enc", "age_band"]
    )

    # 1. Train total time model (baseline)
    total_model = train_total_time_model(X_train, y_train, X_val, y_val, tune=tune_hyperparams)

    # 2. Train swim model
    swim_model = train_swim_model(X_train, y_train, X_val, y_val, distance)

    # Get swim predictions for bike model
    swim_pred_train = swim_model.predict(X_train)[:, 0]  # First output is swim_sec
    swim_pred_val = swim_model.predict(X_val)[:, 0]

    # 3. Train bike model
    bike_model = train_bike_model(
        X_train, y_train, X_val, y_val, swim_pred_train, swim_pred_val, distance
    )

    # Get bike predictions for run model
    X_train_bike = X_train.copy()
    X_train_bike["swim_sec_pred"] = swim_pred_train
    bike_pred_train = bike_model.predict(X_train_bike)[:, 0]  # First output is bike_sec

    X_val_bike = X_val.copy()
    X_val_bike["swim_sec_pred"] = swim_pred_val
    bike_pred_val = bike_model.predict(X_val_bike)[:, 0]

    # 4. Train run model
    run_model = train_run_model(
        X_train, y_train, X_val, y_val,
        swim_pred_train, swim_pred_val,
        bike_pred_train, bike_pred_val,
        distance
    )

    # 5. Train quantile models
    quantile_models = train_quantile_models(X_train, y_train, X_val, y_val)

    # Save models
    save_models(
        total_model, swim_model, bike_model, run_model, quantile_models,
        distance, output_dir
    )

    logger.info(f"\n✓ Completed training for {distance}")


def main(
    distances: list[str],
    output_dir: Path,
    tune_hyperparams: bool = False,
):
    """Train models for all specified distances."""
    logger.info(f"Training models for distances: {distances}")
    logger.info(f"Output directory: {output_dir}")
    logger.info(f"Tune hyperparameters: {tune_hyperparams}")

    for distance in distances:
        try:
            train_distance(distance, output_dir, tune_hyperparams)
        except Exception as e:
            logger.error(f"Failed to train {distance}: {e}")
            raise

    logger.info("\n" + "="*80)
    logger.info("ALL TRAINING COMPLETE")
    logger.info("="*80)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train multi-output XGBoost models")
    parser.add_argument(
        "--distances",
        type=str,
        default="70.3",
        help="Comma-separated list of distances (default: 70.3 for testing)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=MODELS_DIR,
        help="Output directory for models",
    )
    parser.add_argument(
        "--tune-hyperparams",
        action="store_true",
        help="Tune hyperparameters with Optuna (slow)",
    )

    args = parser.parse_args()

    distances = [d.strip() for d in args.distances.split(",")]

    main(distances, args.output_dir, args.tune_hyperparams)
