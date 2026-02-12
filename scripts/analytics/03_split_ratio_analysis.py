#!/usr/bin/env python3
"""
RaceDayAI - Split Ratio Analysis
=================================
Analyzes swim:bike:run split ratios across the dataset to answer:
  - How do split ratios vary by finishing percentile?
  - Do faster finishers pace the bike more conservatively?
  - How do ratios differ by gender, age group, and course?
  - What split ratios should we recommend for a given target percentile?

Usage:
  python scripts/analytics/03_split_ratio_analysis.py [--csv path] [--output src/data/split-ratios.json]

Output:
  - split-ratios.json  (lookup by cohort + target percentile)
"""

import argparse
import json
import os
from datetime import datetime

import numpy as np
import pandas as pd


def find_csv(base_dir: str) -> str:
    for root, _dirs, files in os.walk(base_dir):
        for f in files:
            if f.endswith(".csv") and ("ironman" in f.lower() or "half_ironman" in f.lower()):
                return os.path.join(root, f)
    raise FileNotFoundError("Could not find Ironman CSV dataset")


def load_and_prepare(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)

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
    df = df.rename(columns=col_map)

    if "total_sec" not in df.columns:
        components = [c for c in ["swim_sec", "bike_sec", "run_sec"] if c in df.columns]
        df["total_sec"] = df[components].sum(axis=1)

    for seg in ["swim", "bike", "run"]:
        col = f"{seg}_sec"
        if col in df.columns and "total_sec" in df.columns:
            df[f"{seg}_pct"] = df[col] / df["total_sec"] * 100

    # Standardize demographics
    for orig, target in [("Gender", "Gender"), ("AgeGroup", "AgeGroup"), ("EventLocation", "EventLocation")]:
        match = next((c for c in df.columns if c.lower().replace("_", "") == orig.lower()), None)
        if match and match != target:
            df = df.rename(columns={match: target})

    # Compute finishing percentile within cohort
    if "Gender" in df.columns and "AgeGroup" in df.columns:
        df["finish_percentile"] = df.groupby(["Gender", "AgeGroup"])["total_sec"].rank(pct=True) * 100

    return df


def analyze_by_percentile_band(df: pd.DataFrame) -> dict:
    """Split ratios by finishing percentile bands."""
    bands = [
        ("top_10pct", 0, 10),
        ("top_25pct", 0, 25),
        ("25_50pct", 25, 50),
        ("50_75pct", 50, 75),
        ("bottom_25pct", 75, 100),
    ]

    results = {}
    for name, lo, hi in bands:
        mask = (df["finish_percentile"] >= lo) & (df["finish_percentile"] < hi)
        subset = df[mask]
        if len(subset) < 100:
            continue

        results[name] = {
            "count": int(len(subset)),
            "avg_total_min": round(subset["total_sec"].mean() / 60, 2),
            "splits": {},
        }
        for seg in ["swim", "bike", "run"]:
            col = f"{seg}_pct"
            if col in subset.columns:
                results[name]["splits"][seg] = {
                    "mean": round(subset[col].mean(), 2),
                    "median": round(subset[col].median(), 2),
                    "std": round(subset[col].std(), 2),
                }

    return results


def analyze_by_cohort_and_percentile(df: pd.DataFrame, min_samples: int = 50) -> dict:
    """Split ratios for each Gender x AgeGroup cohort, broken down by target percentile."""
    target_percentiles = [10, 20, 30, 40, 50, 60, 70, 80, 90]
    results = {}

    if "Gender" not in df.columns or "AgeGroup" not in df.columns:
        return results

    for (gender, ag), group in df.groupby(["Gender", "AgeGroup"]):
        if len(group) < min_samples:
            continue

        key = f"{gender}_{ag}"
        results[key] = {"count": int(len(group)), "by_percentile": {}}

        for pct in target_percentiles:
            # Get athletes near this percentile (within +/- 5 percentile points)
            lo = max(0, pct - 5)
            hi = min(100, pct + 5)
            mask = (group["finish_percentile"] >= lo) & (group["finish_percentile"] < hi)
            band = group[mask]

            if len(band) < 10:
                continue

            results[key]["by_percentile"][str(pct)] = {
                "count": int(len(band)),
                "avg_total_min": round(band["total_sec"].mean() / 60, 2),
            }
            for seg in ["swim", "bike", "run"]:
                col = f"{seg}_pct"
                if col in band.columns:
                    results[key]["by_percentile"][str(pct)][f"{seg}_pct"] = round(band[col].mean(), 2)

    return results


def analyze_bike_run_relationship(df: pd.DataFrame) -> dict:
    """Analyze the relationship between bike effort and run performance."""
    if "bike_pct" not in df.columns or "run_pct" not in df.columns:
        return {}

    # Correlation
    corr = df[["bike_pct", "run_pct"]].corr().iloc[0, 1]

    # Split into bike-heavy vs bike-light racers
    bike_median = df["bike_pct"].median()
    heavy_bike = df[df["bike_pct"] > bike_median + 2]
    light_bike = df[df["bike_pct"] < bike_median - 2]

    return {
        "bike_run_correlation": round(float(corr), 4),
        "interpretation": "Negative correlation means higher bike % correlates with lower run %",
        "heavy_bike_racers": {
            "count": int(len(heavy_bike)),
            "avg_bike_pct": round(heavy_bike["bike_pct"].mean(), 2),
            "avg_run_pct": round(heavy_bike["run_pct"].mean(), 2),
            "avg_total_min": round(heavy_bike["total_sec"].mean() / 60, 2),
        },
        "light_bike_racers": {
            "count": int(len(light_bike)),
            "avg_bike_pct": round(light_bike["bike_pct"].mean(), 2),
            "avg_run_pct": round(light_bike["run_pct"].mean(), 2),
            "avg_total_min": round(light_bike["total_sec"].mean() / 60, 2),
        },
    }


def main():
    parser = argparse.ArgumentParser(description="RaceDayAI Split Ratio Analysis")
    parser.add_argument("--csv", default=None)
    parser.add_argument("--output", default="src/data/split-ratios.json")
    parser.add_argument("--min-samples", type=int, default=50)
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    csv_path = args.csv or find_csv(repo_root)
    output_path = os.path.join(repo_root, args.output) if not os.path.isabs(args.output) else args.output

    print(f"Loading {csv_path}...")
    df = load_and_prepare(csv_path)
    print(f"Loaded {len(df):,} records")

    print("\n--- Split Ratios by Percentile Band ---")
    by_band = analyze_by_percentile_band(df)
    for band, data in by_band.items():
        splits = data["splits"]
        print(f"  {band}: bike={splits.get('bike', {}).get('mean', '?')}% run={splits.get('run', {}).get('mean', '?')}%")

    print("\n--- Cohort x Percentile Lookup ---")
    by_cohort = analyze_by_cohort_and_percentile(df, args.min_samples)
    print(f"  {len(by_cohort)} cohorts with percentile breakdowns")

    print("\n--- Bike-Run Relationship ---")
    bike_run = analyze_bike_run_relationship(df)
    if bike_run:
        print(f"  Correlation: {bike_run['bike_run_correlation']}")
        print(f"  Heavy bikers avg total: {bike_run['heavy_bike_racers']['avg_total_min']} min")
        print(f"  Light bikers avg total: {bike_run['light_bike_racers']['avg_total_min']} min")

    output = {
        "metadata": {
            "dataset": "Half Ironman / IRONMAN 70.3",
            "date_generated": datetime.now().strftime("%Y-%m-%d"),
            "description": "Split ratio analysis for pacing recommendations",
            "min_samples": args.min_samples,
        },
        "by_percentile_band": by_band,
        "by_cohort_and_percentile": by_cohort,
        "bike_run_relationship": bike_run,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to {output_path} ({os.path.getsize(output_path):,} bytes)")


if __name__ == "__main__":
    main()
