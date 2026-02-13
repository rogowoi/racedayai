#!/usr/bin/env python3
"""
RaceDayAI - Cohort Distribution Fitting
========================================
Fits log-normal distributions to swim/bike/run/total times for each
Gender x AgeGroup cohort. Produces a JSON lookup file that the
pacing engine uses for distributional predictions.

Usage:
  python scripts/analytics/02_fit_distributions.py [--csv path/to/csv] [--output src/data/cohort-distributions.json]

Output:
  - cohort-distributions.json  (JSON lookup with lognorm params + percentiles)
"""

import argparse
import json
import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd
from scipy import stats


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


def load_and_prepare(csv_path: str) -> pd.DataFrame:
    """Load dataset and standardize time columns to seconds."""
    df = pd.read_csv(csv_path)
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


def fit_cohort(data: pd.Series, min_samples: int = 30) -> dict | None:
    """Fit a log-normal distribution to a series of times (seconds)."""
    clean = data.dropna()
    clean = clean[clean > 0]

    if len(clean) < min_samples:
        return None

    try:
        shape, loc, scale = stats.lognorm.fit(clean, floc=0)
    except Exception:
        return None

    percentiles = [0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95]
    pct_values = stats.lognorm.ppf(percentiles, shape, loc=loc, scale=scale)

    return {
        "fit": {
            "shape": float(shape),
            "loc": float(loc),
            "scale": float(scale),
        },
        "stats": {
            "mean": float(clean.mean()),
            "median": float(clean.median()),
            "std": float(clean.std()),
            "min": float(clean.min()),
            "max": float(clean.max()),
            "count": int(len(clean)),
            "p05": float(pct_values[0]),
            "p10": float(pct_values[1]),
            "p25": float(pct_values[2]),
            "p50": float(pct_values[3]),
            "p75": float(pct_values[4]),
            "p90": float(pct_values[5]),
            "p95": float(pct_values[6]),
        },
    }


def build_cohort_distributions(df: pd.DataFrame, min_samples: int = 30) -> dict:
    """Build distribution fits for all Gender x AgeGroup cohorts."""
    segments = ["swim_sec", "bike_sec", "run_sec", "total_sec"]
    segment_names = ["swim", "bike", "run", "total"]

    genders = sorted(df["Gender"].dropna().unique())
    age_groups = sorted(df["AgeGroup"].dropna().unique(), key=lambda x: str(x))

    cohorts = {}
    skipped = 0
    fitted = 0

    for gender in genders:
        for ag in age_groups:
            mask = (df["Gender"] == gender) & (df["AgeGroup"] == ag)
            subset = df[mask]

            if len(subset) < min_samples:
                skipped += 1
                continue

            key = f"{gender}_{ag}"
            cohorts[key] = {"count": int(len(subset))}

            for seg_col, seg_name in zip(segments, segment_names):
                if seg_col not in df.columns:
                    continue
                result = fit_cohort(subset[seg_col], min_samples)
                if result:
                    cohorts[key][seg_name] = result
                    fitted += 1

    print(f"Fitted {fitted} distributions across {len(cohorts)} cohorts (skipped {skipped} small cohorts)")
    return cohorts, genders, age_groups


def main():
    parser = argparse.ArgumentParser(description="RaceDayAI Distribution Fitting")
    parser.add_argument("--csv", help="Path to CSV file", default=None)
    parser.add_argument("--output", help="Output JSON path", default="src/data/cohort-distributions.json")
    parser.add_argument("--min-samples", type=int, default=30, help="Minimum samples per cohort")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    csv_path = args.csv or find_csv(repo_root)
    output_path = os.path.join(repo_root, args.output) if not os.path.isabs(args.output) else args.output

    df = load_and_prepare(csv_path)
    cohorts, genders, age_groups = build_cohort_distributions(df, args.min_samples)

    output = {
        "metadata": {
            "dataset": "Half Ironman / IRONMAN 70.3",
            "total_records": int(len(df)),
            "date_generated": datetime.now().strftime("%Y-%m-%d"),
            "description": "Log-normal distribution parameters for swim, bike, run, and total times by Gender and AgeGroup cohort",
            "units": "seconds",
            "genders": list(genders),
            "age_groups": [str(ag) for ag in age_groups],
            "min_samples_per_cohort": args.min_samples,
        },
        "cohorts": cohorts,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved to {output_path} ({os.path.getsize(output_path):,} bytes)")
    print(f"Cohorts: {len(cohorts)}")

    # Print sample
    sample_key = list(cohorts.keys())[0]
    print(f"\nSample cohort ({sample_key}):")
    print(f"  Count: {cohorts[sample_key]['count']}")
    if "swim" in cohorts[sample_key]:
        s = cohorts[sample_key]["swim"]["stats"]
        print(f"  Swim: mean={s['mean']:.0f}s median={s['median']:.0f}s p10={s['p10']:.0f}s p90={s['p90']:.0f}s")


if __name__ == "__main__":
    main()
