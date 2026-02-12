#!/usr/bin/env python3
"""
RaceDayAI - Course Difficulty Model
====================================
Normalizes finish times across courses to compute a "course factor" that
represents how hard a course is relative to the global average.

Approach:
  1. Compute course factor = median_finish_time_at_course / global_median_finish_time
  2. Adjust for participant composition (gender/age demographics)
  3. Use residuals from a demographics-adjusted model to get true course difficulty
  4. Cluster courses into difficulty tiers: Easy, Moderate, Hard, Very Hard

Usage:
  python scripts/analytics/07_course_difficulty.py [--csv path] [--output src/data/course-difficulty.json] [--test]

Output:
  - course-difficulty.json: course factors, difficulty tiers, and clusters
"""

import argparse
import json
import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LinearRegression
from scipy.cluster.hierarchy import dendrogram, linkage, fcluster
from scipy.spatial.distance import pdist


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
    """Load dataset and prepare for course difficulty analysis."""
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
    for orig, target in [("Gender", "Gender"), ("AgeGroup", "AgeGroup"), ("EventLocation", "EventLocation")]:
        match = next((c for c in df.columns if c.lower().replace("_", "") == orig.lower()), None)
        if match and match != target:
            df = df.rename(columns={match: target})

    return df


def compute_simple_course_factors(df: pd.DataFrame, min_samples: int = 20) -> dict:
    """Compute simple course factors: median_finish_time_at_course / global_median."""
    global_median = df["total_sec"].median()

    course_factors = {}
    for location, group in df.groupby("EventLocation", dropna=False):
        if len(group) < min_samples:
            continue

        median_time = group["total_sec"].median()
        factor = median_time / global_median

        course_factors[str(location)] = {
            "median_finish_sec": float(median_time),
            "simple_factor": float(factor),
            "count": int(len(group))
        }

    return course_factors, global_median


def adjust_for_composition(df: pd.DataFrame, min_samples: int = 20) -> dict:
    """Adjust course factors for participant composition using regression."""
    df_clean = df.dropna(subset=["EventLocation", "Gender", "AgeGroup", "total_sec"])
    df_clean = df_clean[df_clean["total_sec"] > 0]

    # Filter courses with minimum samples
    course_counts = df_clean["EventLocation"].value_counts()
    valid_courses = course_counts[course_counts >= min_samples].index.tolist()
    df_clean = df_clean[df_clean["EventLocation"].isin(valid_courses)]

    if len(df_clean) < 1000:
        print("WARNING: Not enough data for course adjustment analysis")
        return {}

    # Encode categorical variables
    le_course = LabelEncoder()
    le_gender = LabelEncoder()
    le_age = LabelEncoder()

    df_clean["course_enc"] = le_course.fit_transform(df_clean["EventLocation"])
    df_clean["gender_enc"] = le_gender.fit_transform(df_clean["Gender"])
    df_clean["age_enc"] = le_age.fit_transform(df_clean["AgeGroup"])

    # Build regression: total_sec ~ gender + age + course
    X = df_clean[["gender_enc", "age_enc", "course_enc"]].values
    y = df_clean["total_sec"].values

    model = LinearRegression()
    model.fit(X, y)

    # Extract course coefficients (residual difficulty after adjusting for demographics)
    course_coef = model.coef_[2]  # coefficient for course_enc
    course_intercepts = []

    for course_idx, course_name in enumerate(le_course.classes_):
        # Partial effect of this course (holding gender/age at mean)
        partial_effect = course_coef * (course_idx - le_course.classes_.shape[0] / 2)
        course_intercepts.append((str(course_name), float(partial_effect)))

    return dict(course_intercepts)


def build_adjusted_course_factors(df: pd.DataFrame, simple_factors: dict, composition_adj: dict,
                                   min_samples: int = 20) -> dict:
    """Combine simple factors with composition adjustment."""
    global_median = df["total_sec"].median()

    adjusted = {}
    for location, data in simple_factors.items():
        if data["count"] < min_samples:
            continue

        simple = data["simple_factor"]

        # Composition adjustment (if available)
        comp_adj = 0.0
        if location in composition_adj:
            comp_adj = composition_adj[location]

        # Adjusted factor: simple factor + normalized composition adjustment
        if comp_adj != 0:
            comp_factor = 1.0 + (comp_adj / global_median)
        else:
            comp_factor = 1.0

        adjusted[location] = {
            "simple_factor": float(simple),
            "composition_adjustment": float(comp_adj),
            "adjusted_factor": float(simple * comp_factor),
            "count": int(data["count"]),
            "median_finish_sec": float(data["median_finish_sec"])
        }

    return adjusted


def classify_difficulty_tiers(adjusted_factors: dict) -> dict:
    """Classify courses into difficulty tiers."""
    if not adjusted_factors:
        return {}

    factors = [data["adjusted_factor"] for data in adjusted_factors.values()]
    factors_sorted = sorted(factors)

    # Define tier boundaries (quartiles)
    q1 = np.percentile(factors_sorted, 25)
    q2 = np.percentile(factors_sorted, 50)
    q3 = np.percentile(factors_sorted, 75)

    tiers = {}
    for location, data in adjusted_factors.items():
        factor = data["adjusted_factor"]

        if factor < q1:
            tier = "Easy"
        elif factor < q2:
            tier = "Moderate"
        elif factor < q3:
            tier = "Hard"
        else:
            tier = "Very Hard"

        data["difficulty_tier"] = tier
        if tier not in tiers:
            tiers[tier] = []
        tiers[tier].append(location)

    return tiers


def main():
    parser = argparse.ArgumentParser(description="RaceDayAI Course Difficulty Model")
    parser.add_argument("--csv", help="Path to CSV file", default=None)
    parser.add_argument("--output", help="Output JSON path", default="src/data/course-difficulty.json")
    parser.add_argument("--test", action="store_true", help="Test mode: use subset of data")
    parser.add_argument("--min-samples", type=int, default=20, help="Minimum samples per course")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    csv_path = args.csv or find_csv(repo_root)
    output_path = os.path.join(repo_root, args.output) if not os.path.isabs(args.output) else args.output

    print(f"Loading {csv_path}...")
    df = load_and_prepare(csv_path, test_mode=args.test)

    print("\nComputing simple course factors...")
    simple_factors, global_median = compute_simple_course_factors(df, args.min_samples)
    print(f"  {len(simple_factors)} courses found (global median: {global_median:.0f}s)")

    print("\nAdjusting for participant composition...")
    comp_adj = adjust_for_composition(df, args.min_samples)
    print(f"  Composition adjustment computed for {len(comp_adj)} courses")

    print("\nBuilding adjusted course factors...")
    adjusted = build_adjusted_course_factors(df, simple_factors, comp_adj, args.min_samples)
    print(f"  {len(adjusted)} courses with adjusted factors")

    print("\nClassifying difficulty tiers...")
    tiers = classify_difficulty_tiers(adjusted)
    for tier_name, courses in tiers.items():
        print(f"  {tier_name}: {len(courses)} courses")

    # Find extremes
    print("\n--- Top 5 Hardest Courses ---")
    sorted_courses = sorted(adjusted.items(), key=lambda x: x[1]["adjusted_factor"], reverse=True)
    for course_name, data in sorted_courses[:5]:
        print(f"  {course_name}: factor={data['adjusted_factor']:.4f} ({data['difficulty_tier']}) n={data['count']}")

    print("\n--- Top 5 Easiest Courses ---")
    for course_name, data in sorted_courses[-5:]:
        print(f"  {course_name}: factor={data['adjusted_factor']:.4f} ({data['difficulty_tier']}) n={data['count']}")

    # Build output
    output = {
        "metadata": {
            "dataset": "Half Ironman / IRONMAN 70.3",
            "date_generated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "description": "Course difficulty model: normalizes finish times across courses",
            "total_records": int(len(df)),
            "global_median_sec": float(global_median),
            "num_courses": int(len(adjusted)),
            "interpretation": "Course factor > 1.0 means course is harder (slower times). Adjusted factor accounts for participant demographics."
        },
        "difficulty_tiers": {
            tier: sorted(list(courses))
            for tier, courses in tiers.items()
        },
        "courses": adjusted
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved to {output_path} ({os.path.getsize(output_path):,} bytes)")


if __name__ == "__main__":
    main()
