#!/usr/bin/env python3
"""
RaceDayAI - Run Fade Prediction Model
======================================
Builds a model to predict how much the run is affected by bike effort.

Fade is defined as: RunTime / expected_standalone_run
  where expected_standalone_run = cohort median run time

The model predicts run_fade based on:
  - bike_intensity (BikeTime / cohort_median_bike)
  - age group
  - gender
  - total_race_duration

Usage:
  python scripts/analytics/06_fade_predictor.py [--csv path] [--output src/data/fade-model.json] [--test]

Output:
  - fade-model.json: regression coefficients, R² scores, and lookup tables
"""

import argparse
import json
import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import r2_score, mean_squared_error


def find_csv(base_dir: str) -> str:
    """Auto-discover the Ironman CSV file in the repo."""
    for root, _dirs, files in os.walk(base_dir):
        for f in files:
            if f.endswith(".csv") and ("ironman" in f.lower() or "half_ironman" in f.lower()):
                return os.path.join(root, f)
    for root, _dirs, files in os.walk(base_dir):
        for f in files:
            if f.endswith(".csv") and "node_modules" not in root:
                path = os.path.join(root, f)
                if os.path.getsize(path) > 1_000_000:
                    return path
    raise FileNotFoundError("Could not find Ironman CSV dataset")


def load_and_prepare(csv_path: str, test_mode: bool = False) -> pd.DataFrame:
    """Load dataset and prepare for fade prediction."""
    df = pd.read_csv(csv_path)

    if test_mode:
        df = df.sample(min(50000, len(df)), random_state=42)

    print(f"Loaded {len(df):,} records")

    # Map columns to standardized names
    col_map = {}
    for col in df.columns:
        cl = col.lower()
        if "swim" in cl and "time" in cl:
            col_map[col] = "swim_sec"
        elif "bike" in cl and "time" in cl:
            col_map[col] = "bike_sec"
        elif "run" in cl and "time" in cl:
            col_map[col] = "run_sec"
        elif "finish" in cl and "time" in cl:
            col_map[col] = "total_sec"
        elif "transition1" in cl:
            col_map[col] = "t1_sec"
        elif "transition2" in cl:
            col_map[col] = "t2_sec"

    df = df.rename(columns=col_map)

    if "total_sec" not in df.columns:
        components = [c for c in ["swim_sec", "bike_sec", "run_sec", "t1_sec", "t2_sec"] if c in df.columns]
        df["total_sec"] = df[components].sum(axis=1)

    # Standardize demographic columns
    for orig, target in [("Gender", "Gender"), ("AgeGroup", "AgeGroup")]:
        match = next((c for c in df.columns if c.lower().replace("_", "") == orig.lower()), None)
        if match and match != target:
            df = df.rename(columns={match: target})

    return df


def compute_cohort_medians(df: pd.DataFrame) -> dict:
    """Compute median bike and run times for each cohort."""
    medians = {}
    for (gender, age_group), group in df.groupby(["Gender", "AgeGroup"], dropna=False):
        key = f"{gender}_{age_group}"
        medians[key] = {
            "bike_median": group["bike_sec"].median(),
            "run_median": group["run_sec"].median(),
            "count": len(group)
        }
    return medians


def build_fade_features(df: pd.DataFrame, cohort_medians: dict) -> pd.DataFrame:
    """Build features for the fade model."""
    df = df.copy()

    # Handle missing values first
    df = df.dropna(subset=["Gender", "AgeGroup", "bike_sec", "run_sec", "total_sec"])
    df = df[(df["bike_sec"] > 0) & (df["run_sec"] > 0) & (df["total_sec"] > 0)]

    # Create cohort key
    df["cohort"] = df["Gender"].astype(str) + "_" + df["AgeGroup"].astype(str)

    # Map cohort medians
    df["bike_median"] = df["cohort"].map(lambda x: cohort_medians.get(x, {}).get("bike_median", None))
    df["run_median"] = df["cohort"].map(lambda x: cohort_medians.get(x, {}).get("run_median", None))

    # Drop rows where we don't have cohort data
    df = df.dropna(subset=["bike_median", "run_median"])

    # Compute bike intensity and run fade
    df["bike_intensity"] = df["bike_sec"] / df["bike_median"]
    df["run_fade"] = df["run_sec"] / df["run_median"]

    # Remove outliers (intensity or fade > 3 or < 0.3)
    df = df[(df["bike_intensity"] >= 0.3) & (df["bike_intensity"] <= 3.0)]
    df = df[(df["run_fade"] >= 0.3) & (df["run_fade"] <= 3.0)]

    return df


def prepare_model_data(df: pd.DataFrame) -> tuple:
    """Prepare features and target for modeling."""
    # Select features
    features = ["bike_intensity", "Gender", "AgeGroup", "total_sec"]
    df_model = df[features + ["run_fade"]].copy()
    df_model = df_model.dropna()

    # Encode categorical variables
    le_gender = LabelEncoder()
    le_age = LabelEncoder()

    df_model["Gender_encoded"] = le_gender.fit_transform(df_model["Gender"])
    df_model["AgeGroup_encoded"] = le_age.fit_transform(df_model["AgeGroup"])

    X = df_model[["bike_intensity", "Gender_encoded", "AgeGroup_encoded", "total_sec"]].values
    y = df_model["run_fade"].values

    return X, y, le_gender, le_age, df_model


def fit_models(X: np.ndarray, y: np.ndarray) -> tuple:
    """Fit linear and gradient boosting regression models."""
    # Linear Regression
    lr = LinearRegression()
    lr.fit(X, y)
    lr_pred = lr.predict(X)
    lr_r2 = r2_score(y, lr_pred)
    lr_rmse = np.sqrt(mean_squared_error(y, lr_pred))

    # Gradient Boosting Regressor
    gb = GradientBoostingRegressor(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        min_samples_split=20,
        random_state=42
    )
    gb.fit(X, y)
    gb_pred = gb.predict(X)
    gb_r2 = r2_score(y, gb_pred)
    gb_rmse = np.sqrt(mean_squared_error(y, gb_pred))

    return {
        "linear": {
            "model": lr,
            "r2": lr_r2,
            "rmse": lr_rmse,
            "coefficients": lr.coef_.tolist(),
            "intercept": float(lr.intercept_)
        },
        "gradient_boosting": {
            "model": gb,
            "r2": gb_r2,
            "rmse": gb_rmse,
            "feature_importances": gb.feature_importances_.tolist()
        }
    }


def build_lookup_table(df_model: pd.DataFrame, gb_model, le_gender, le_age) -> dict:
    """Build a lookup table of predicted fade by bike_intensity × gender × age_group."""
    lookup = {}

    genders = df_model["Gender"].unique()
    age_groups = sorted(df_model["AgeGroup"].unique())

    # Bike intensity buckets: 0.8 to 1.3 in 0.05 steps
    bike_intensity_range = np.arange(0.8, 1.35, 0.05)

    # Use median total_sec for predictions
    median_total = df_model["total_sec"].median()

    for gender in genders:
        gender_enc = le_gender.transform([gender])[0]
        for age_group in age_groups:
            age_enc = le_age.transform([age_group])[0]

            key = f"{gender}_{age_group}"
            lookup[key] = {}

            for bike_intensity in bike_intensity_range:
                # Create feature vector
                X_pred = np.array([[bike_intensity, gender_enc, age_enc, median_total]])
                predicted_fade = float(gb_model.predict(X_pred)[0])

                bucket_key = f"{bike_intensity:.2f}"
                lookup[key][bucket_key] = round(predicted_fade, 4)

    return lookup


def main():
    parser = argparse.ArgumentParser(description="RaceDayAI Run Fade Predictor")
    parser.add_argument("--csv", help="Path to CSV file", default=None)
    parser.add_argument("--output", help="Output JSON path", default="src/data/fade-model.json")
    parser.add_argument("--test", action="store_true", help="Test mode: use subset of data")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    csv_path = args.csv or find_csv(repo_root)
    output_path = os.path.join(repo_root, args.output) if not os.path.isabs(args.output) else args.output

    print(f"Loading {csv_path}...")
    df = load_and_prepare(csv_path, test_mode=args.test)

    print("\nComputing cohort medians...")
    cohort_medians = compute_cohort_medians(df)
    print(f"  {len(cohort_medians)} cohorts found")

    print("\nBuilding fade features...")
    df_features = build_fade_features(df, cohort_medians)
    print(f"  {len(df_features):,} records with valid features")

    if len(df_features) < 1000:
        print("ERROR: Not enough data to build model")
        sys.exit(1)

    print("\nPreparing model data...")
    X, y, le_gender, le_age, df_model = prepare_model_data(df_features)
    print(f"  {len(X):,} training samples")
    print(f"  Features shape: {X.shape}")

    print("\nFitting models...")
    models = fit_models(X, y)

    print(f"\n--- Linear Regression ---")
    print(f"  R² Score: {models['linear']['r2']:.4f}")
    print(f"  RMSE: {models['linear']['rmse']:.4f}")
    print(f"  Coefficients: bike_intensity={models['linear']['coefficients'][0]:.6f}, " +
          f"gender={models['linear']['coefficients'][1]:.6f}, " +
          f"age_group={models['linear']['coefficients'][2]:.6f}, " +
          f"total_sec={models['linear']['coefficients'][3]:.8f}")
    print(f"  Intercept: {models['linear']['intercept']:.4f}")

    print(f"\n--- Gradient Boosting Regressor ---")
    print(f"  R² Score: {models['gradient_boosting']['r2']:.4f}")
    print(f"  RMSE: {models['gradient_boosting']['rmse']:.4f}")
    print(f"  Feature Importances: bike_intensity={models['gradient_boosting']['feature_importances'][0]:.4f}, " +
          f"gender={models['gradient_boosting']['feature_importances'][1]:.4f}, " +
          f"age_group={models['gradient_boosting']['feature_importances'][2]:.4f}, " +
          f"total_sec={models['gradient_boosting']['feature_importances'][3]:.4f}")

    print("\nBuilding lookup table...")
    lookup = build_lookup_table(df_model, models['gradient_boosting']['model'], le_gender, le_age)
    print(f"  Lookup table: {len(lookup)} cohorts × ~9 intensity buckets")

    # Build output
    output = {
        "metadata": {
            "dataset": "Half Ironman / IRONMAN 70.3",
            "date_generated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "description": "Run fade prediction model: predicts how run time is affected by bike effort",
            "total_records": int(len(df)),
            "training_records": int(len(X)),
            "units": "run_fade is ratio (actual_run_time / median_run_time for cohort)",
            "bike_intensity_definition": "BikeTime / cohort_median_bike (1.0 = median effort, >1.0 = harder than peers)"
        },
        "linear_regression": {
            "r2_score": float(models['linear']['r2']),
            "rmse": float(models['linear']['rmse']),
            "coefficients": {
                "bike_intensity": float(models['linear']['coefficients'][0]),
                "gender": float(models['linear']['coefficients'][1]),
                "age_group": float(models['linear']['coefficients'][2]),
                "total_sec": float(models['linear']['coefficients'][3])
            },
            "intercept": float(models['linear']['intercept']),
            "interpretation": "For each unit increase in bike_intensity, run_fade increases by " +
                             f"{models['linear']['coefficients'][0]:.4f}. Positive values indicate greater fade with harder bike effort."
        },
        "gradient_boosting": {
            "r2_score": float(models['gradient_boosting']['r2']),
            "rmse": float(models['gradient_boosting']['rmse']),
            "feature_importances": {
                "bike_intensity": float(models['gradient_boosting']['feature_importances'][0]),
                "gender": float(models['gradient_boosting']['feature_importances'][1]),
                "age_group": float(models['gradient_boosting']['feature_importances'][2]),
                "total_sec": float(models['gradient_boosting']['feature_importances'][3])
            },
            "interpretation": "Relative importance of each feature in predicting run fade"
        },
        "lookup_table": lookup,
        "lookup_description": "predicted_fade[gender_agegroup][bike_intensity_bucket] - use bike_intensity_bucket like '1.05' to lookup predicted run_fade"
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved to {output_path} ({os.path.getsize(output_path):,} bytes)")

    # Print sample lookups
    sample_key = list(lookup.keys())[0] if lookup else None
    if sample_key:
        print(f"\nSample lookup ({sample_key}):")
        sample_lookup = lookup[sample_key]
        for intensity, fade in list(sample_lookup.items())[:5]:
            print(f"  Intensity {intensity}: fade={fade:.4f}")


if __name__ == "__main__":
    main()
