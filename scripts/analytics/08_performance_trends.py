#!/usr/bin/env python3
"""
RaceDayAI - Performance Trends Analysis
========================================
Analyzes year-over-year performance trends to answer:
  - Are athletes getting faster or slower over time?
  - How have finish times changed from 2004-2020+?
  - Do specific age groups show different trends?
  - Build a year coefficient for adjusting predictions

Usage:
  python scripts/analytics/08_performance_trends.py [--csv path] [--output src/data/performance-trends.json] [--test]

Output:
  - performance-trends.json: year coefficients, trend analysis, and segment breakdowns
"""

import argparse
import json
import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import LabelEncoder


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
    """Load dataset and prepare for trend analysis."""
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
        elif "event" in cl and "year" in cl:
            col_map[col] = "EventYear"

    df = df.rename(columns=col_map)

    if "total_sec" not in df.columns:
        components = [c for c in ["swim_sec", "bike_sec", "run_sec", "t1_sec", "t2_sec"] if c in df.columns]
        df["total_sec"] = df[components].sum(axis=1)

    # Standardize demographic columns
    for orig, target in [("Gender", "Gender"), ("AgeGroup", "AgeGroup")]:
        match = next((c for c in df.columns if c.lower().replace("_", "") == orig.lower()), None)
        if match and match != target:
            df = df.rename(columns={match: target})

    # Ensure EventYear is numeric
    if "EventYear" in df.columns:
        df["EventYear"] = pd.to_numeric(df["EventYear"], errors="coerce")

    return df


def compute_yearly_medians(df: pd.DataFrame, min_samples: int = 30) -> dict:
    """Compute median finish times for each year."""
    df_clean = df.dropna(subset=["EventYear", "total_sec"])
    df_clean = df_clean[df_clean["total_sec"] > 0]

    yearly = {}
    for year, group in df_clean.groupby("EventYear"):
        if len(group) < min_samples:
            continue

        yearly[int(year)] = {
            "median_sec": float(group["total_sec"].median()),
            "mean_sec": float(group["total_sec"].mean()),
            "std_sec": float(group["total_sec"].std()),
            "min_sec": float(group["total_sec"].min()),
            "max_sec": float(group["total_sec"].max()),
            "count": int(len(group)),
            "p50_min": round(group["total_sec"].median() / 60, 2),
            "p25": float(group["total_sec"].quantile(0.25)),
            "p75": float(group["total_sec"].quantile(0.75))
        }

    return yearly


def compute_cohort_trends(df: pd.DataFrame, min_samples: int = 30) -> dict:
    """Compute trends for each Gender x AgeGroup cohort over time."""
    df_clean = df.dropna(subset=["EventYear", "Gender", "AgeGroup", "total_sec"])
    df_clean = df_clean[df_clean["total_sec"] > 0]

    cohort_trends = {}
    for (gender, age_group), group in df_clean.groupby(["Gender", "AgeGroup"]):
        if len(group) < min_samples:
            continue

        key = f"{gender}_{age_group}"
        cohort_trends[key] = {}

        for year, year_group in group.groupby("EventYear"):
            if len(year_group) < 10:  # Lower threshold for sub-cohorts
                continue

            cohort_trends[key][int(year)] = {
                "median_sec": float(year_group["total_sec"].median()),
                "count": int(len(year_group))
            }

    return cohort_trends


def fit_linear_trends(df: pd.DataFrame) -> dict:
    """Fit linear regression to compute year coefficient."""
    df_clean = df.dropna(subset=["EventYear", "total_sec"])
    df_clean = df_clean[df_clean["total_sec"] > 0]

    if len(df_clean) < 1000:
        print("WARNING: Not enough data for trend regression")
        return {}

    # Linear regression: total_sec ~ year
    X = df_clean[["EventYear"]].values
    y = df_clean["total_sec"].values

    model = LinearRegression()
    model.fit(X, y)

    year_coeff = float(model.coef_[0])
    intercept = float(model.intercept_)

    # Compute R² and prediction interval
    from sklearn.metrics import r2_score
    y_pred = model.predict(X)
    r2 = r2_score(y, y_pred)

    # Interpretation: seconds per year
    # Negative = getting faster, positive = getting slower
    pct_change_per_year = (year_coeff / intercept) * 100 if intercept != 0 else 0

    return {
        "year_coefficient": year_coeff,
        "intercept": intercept,
        "r2_score": float(r2),
        "interpretation": f"{year_coeff:.2f} seconds per year " +
                         f"({'getting faster' if year_coeff < 0 else 'getting slower'})",
        "pct_change_per_year": float(pct_change_per_year)
    }


def fit_cohort_trends(df: pd.DataFrame) -> dict:
    """Fit linear trends for each cohort."""
    df_clean = df.dropna(subset=["EventYear", "Gender", "AgeGroup", "total_sec"])
    df_clean = df_clean[df_clean["total_sec"] > 0]

    cohort_model_results = {}
    for (gender, age_group), group in df_clean.groupby(["Gender", "AgeGroup"]):
        if len(group) < 100:
            continue

        key = f"{gender}_{age_group}"

        X = group[["EventYear"]].values
        y = group["total_sec"].values

        model = LinearRegression()
        model.fit(X, y)

        year_coeff = float(model.coef_[0])

        cohort_model_results[key] = {
            "year_coefficient": year_coeff,
            "trend": "getting faster" if year_coeff < 0 else "getting slower",
            "n_records": int(len(group))
        }

    return cohort_model_results


def compute_segment_trends(df: pd.DataFrame) -> dict:
    """Compute trends for swim, bike, run separately."""
    df_clean = df.dropna(subset=["EventYear", "swim_sec", "bike_sec", "run_sec"])
    df_clean = df_clean[(df_clean["swim_sec"] > 0) & (df_clean["bike_sec"] > 0) & (df_clean["run_sec"] > 0)]

    segment_trends = {}
    for segment in ["swim_sec", "bike_sec", "run_sec"]:
        X = df_clean[["EventYear"]].values
        y = df_clean[segment].values

        model = LinearRegression()
        model.fit(X, y)

        segment_trends[segment.replace("_sec", "")] = {
            "year_coefficient": float(model.coef_[0]),
            "trend": "improving" if model.coef_[0] < 0 else "slowing"
        }

    return segment_trends


def main():
    parser = argparse.ArgumentParser(description="RaceDayAI Performance Trends Analysis")
    parser.add_argument("--csv", help="Path to CSV file", default=None)
    parser.add_argument("--output", help="Output JSON path", default="src/data/performance-trends.json")
    parser.add_argument("--test", action="store_true", help="Test mode: use subset of data")
    parser.add_argument("--min-samples", type=int, default=30, help="Minimum samples per year")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    csv_path = args.csv or find_csv(repo_root)
    output_path = os.path.join(repo_root, args.output) if not os.path.isabs(args.output) else args.output

    print(f"Loading {csv_path}...")
    df = load_and_prepare(csv_path, test_mode=args.test)

    print("\nComputing yearly medians...")
    yearly_medians = compute_yearly_medians(df, args.min_samples)
    years_available = sorted(yearly_medians.keys())
    print(f"  {len(yearly_medians)} years available: {years_available[0]}-{years_available[-1]}")

    print("\nFitting overall trend...")
    overall_trend = fit_linear_trends(df)
    if overall_trend:
        print(f"  {overall_trend['interpretation']}")
        print(f"  R² = {overall_trend['r2_score']:.4f}")

    print("\nFitting cohort trends...")
    cohort_trends = fit_cohort_trends(df)
    print(f"  {len(cohort_trends)} cohorts analyzed")

    print("\nAnalyzing segment trends...")
    segment_trends = compute_segment_trends(df)
    for segment, data in segment_trends.items():
        print(f"  {segment}: {data['trend']} ({data['year_coefficient']:.2f} sec/year)")

    print("\nComputing yearly medians by cohort...")
    cohort_yearly = compute_cohort_trends(df, args.min_samples)
    print(f"  {len(cohort_yearly)} cohorts with year-by-year breakdown")

    # Print fastest/slowest cohorts
    if cohort_trends:
        sorted_cohorts = sorted(cohort_trends.items(), key=lambda x: x[1]["year_coefficient"])
        print("\n--- Fastest Improving Cohorts ---")
        for cohort, data in sorted_cohorts[:5]:
            print(f"  {cohort}: {data['year_coefficient']:.2f} sec/year ({data['trend']})")

        print("\n--- Slowest (or Most Slowing) Cohorts ---")
        for cohort, data in sorted_cohorts[-5:]:
            print(f"  {cohort}: {data['year_coefficient']:.2f} sec/year ({data['trend']})")

    # Build output
    output = {
        "metadata": {
            "dataset": "Half Ironman / IRONMAN 70.3",
            "date_generated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "description": "Year-over-year performance trends analysis",
            "total_records": int(len(df)),
            "years_range": f"{years_available[0]}-{years_available[-1]}" if years_available else "N/A",
            "interpretation": "Negative year_coefficient = athletes getting faster over time. Positive = getting slower."
        },
        "overall_trend": overall_trend,
        "segment_trends": segment_trends,
        "yearly_medians": yearly_medians,
        "cohort_trends": cohort_trends,
        "cohort_yearly_breakdown": cohort_yearly
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved to {output_path} ({os.path.getsize(output_path):,} bytes)")


if __name__ == "__main__":
    main()
