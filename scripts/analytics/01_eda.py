#!/usr/bin/env python3
"""
RaceDayAI - Exploratory Data Analysis
======================================
Loads the Ironman 70.3 dataset and produces comprehensive statistics:
  - Demographics breakdown (gender, age groups, years, locations)
  - Time distributions with percentiles for swim/bike/run/total
  - Split ratio analysis (swim:bike:run proportions)
  - Faster vs slower finisher comparison
  - Year-over-year performance trends

Usage:
  python scripts/analytics/01_eda.py [--csv path/to/Half_Ironman_df6.csv] [--output path/to/output/]

Output:
  - EDA_Summary_Report.txt  (human-readable analysis report)
  - Console output with key findings
"""

import argparse
import os
import sys
from datetime import datetime

import numpy as np
import pandas as pd


def find_csv(base_dir: str) -> str:
    """Auto-discover the Ironman CSV file in the repo."""
    for root, _dirs, files in os.walk(base_dir):
        for f in files:
            if f.endswith(".csv") and "ironman" in f.lower() or "half_ironman" in f.lower():
                return os.path.join(root, f)
    # Fallback: any large CSV
    for root, _dirs, files in os.walk(base_dir):
        for f in files:
            if f.endswith(".csv") and "node_modules" not in root:
                path = os.path.join(root, f)
                if os.path.getsize(path) > 1_000_000:
                    return path
    raise FileNotFoundError("Could not find Ironman CSV dataset in repo")


def load_data(csv_path: str) -> pd.DataFrame:
    """Load and prepare the dataset with computed columns."""
    print(f"Loading {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"  Loaded {len(df):,} records with {len(df.columns)} columns")

    # Identify time columns (they may have different names across dataset versions)
    time_cols = {}
    for col in df.columns:
        cl = col.lower()
        if "swim" in cl and "time" in cl:
            time_cols["swim"] = col
        elif "bike" in cl and "time" in cl:
            time_cols["bike"] = col
        elif "run" in cl and "time" in cl:
            time_cols["run"] = col
        elif "finish" in cl and "time" in cl:
            time_cols["total"] = col
        elif "transition1" in cl or ("t1" in cl and "time" in cl):
            time_cols["t1"] = col
        elif "transition2" in cl or ("t2" in cl and "time" in cl):
            time_cols["t2"] = col

    print(f"  Time columns found: {time_cols}")

    # Standardize column names
    rename_map = {}
    for key, col in time_cols.items():
        rename_map[col] = f"{key}_sec"
    df = df.rename(columns=rename_map)

    # Compute total if not present
    if "total_sec" not in df.columns:
        components = [c for c in ["swim_sec", "bike_sec", "run_sec", "t1_sec", "t2_sec"] if c in df.columns]
        df["total_sec"] = df[components].sum(axis=1)

    # Compute minutes versions
    for seg in ["swim", "bike", "run", "total"]:
        col = f"{seg}_sec"
        if col in df.columns:
            df[f"{seg}_min"] = df[col] / 60.0

    # Compute split ratios
    if "total_sec" in df.columns and df["total_sec"].gt(0).all():
        for seg in ["swim", "bike", "run"]:
            col = f"{seg}_sec"
            if col in df.columns:
                df[f"{seg}_pct"] = df[col] / df["total_sec"] * 100

    # Standardize demographic columns
    gender_col = next((c for c in df.columns if c.lower() == "gender"), None)
    age_col = next((c for c in df.columns if "agegroup" in c.lower() or "age_group" in c.lower()), None)
    year_col = next((c for c in df.columns if "year" in c.lower()), None)
    loc_col = next((c for c in df.columns if "location" in c.lower()), None)

    if gender_col and gender_col != "Gender":
        df = df.rename(columns={gender_col: "Gender"})
    if age_col and age_col != "AgeGroup":
        df = df.rename(columns={age_col: "AgeGroup"})
    if year_col and year_col != "EventYear":
        df = df.rename(columns={year_col: "EventYear"})
    if loc_col and loc_col != "EventLocation":
        df = df.rename(columns={loc_col: "EventLocation"})

    return df


def compute_demographics(df: pd.DataFrame) -> dict:
    """Compute demographic breakdowns."""
    stats = {}

    if "Gender" in df.columns:
        gender_counts = df["Gender"].value_counts()
        stats["gender"] = {
            g: {"count": int(c), "pct": round(c / len(df) * 100, 1)}
            for g, c in gender_counts.items()
        }

    if "AgeGroup" in df.columns:
        ag_counts = df["AgeGroup"].value_counts().head(10)
        stats["age_groups"] = {
            ag: {"count": int(c), "pct": round(c / len(df) * 100, 1)}
            for ag, c in ag_counts.items()
        }

    if "EventYear" in df.columns:
        stats["years"] = {
            "min": int(df["EventYear"].min()),
            "max": int(df["EventYear"].max()),
            "peak_year": int(df["EventYear"].value_counts().index[0]),
            "peak_count": int(df["EventYear"].value_counts().iloc[0]),
        }

    if "EventLocation" in df.columns:
        stats["unique_locations"] = int(df["EventLocation"].nunique())
        loc_counts = df["EventLocation"].value_counts().head(10)
        stats["top_locations"] = {
            loc: {"count": int(c), "pct": round(c / len(df) * 100, 2)}
            for loc, c in loc_counts.items()
        }

    return stats


def compute_time_stats(df: pd.DataFrame) -> dict:
    """Compute time distribution statistics for each segment."""
    stats = {}
    percentiles = [0.10, 0.25, 0.50, 0.75, 0.90]

    for seg in ["swim", "bike", "run", "total"]:
        col = f"{seg}_min"
        if col not in df.columns:
            continue

        series = df[col].dropna()
        pcts = series.quantile(percentiles)

        stats[seg] = {
            "mean": round(series.mean(), 2),
            "median": round(series.median(), 2),
            "std": round(series.std(), 2),
            "min": round(series.min(), 2),
            "max": round(series.max(), 2),
            "p10": round(pcts[0.10], 2),
            "p25": round(pcts[0.25], 2),
            "p50": round(pcts[0.50], 2),
            "p75": round(pcts[0.75], 2),
            "p90": round(pcts[0.90], 2),
            "count": int(series.count()),
        }

    return stats


def compute_split_ratios(df: pd.DataFrame) -> dict:
    """Compute split ratio analysis."""
    stats = {}

    pct_cols = [c for c in df.columns if c.endswith("_pct")]
    if not pct_cols:
        return stats

    # Overall
    stats["overall"] = {col.replace("_pct", ""): round(df[col].mean(), 2) for col in pct_cols}

    # By gender
    if "Gender" in df.columns:
        stats["by_gender"] = {}
        for gender, group in df.groupby("Gender"):
            stats["by_gender"][gender] = {
                col.replace("_pct", ""): round(group[col].mean(), 2) for col in pct_cols
            }

    # By age group (top 8)
    if "AgeGroup" in df.columns:
        top_groups = df["AgeGroup"].value_counts().head(8).index
        stats["by_age_group"] = {}
        for ag in top_groups:
            group = df[df["AgeGroup"] == ag]
            stats["by_age_group"][ag] = {
                col.replace("_pct", ""): round(group[col].mean(), 2) for col in pct_cols
            }

    return stats


def compare_fast_vs_slow(df: pd.DataFrame) -> dict:
    """Compare top 25% vs bottom 25% finishers."""
    if "total_min" not in df.columns:
        return {}

    q25 = df["total_min"].quantile(0.25)
    q75 = df["total_min"].quantile(0.75)

    fast = df[df["total_min"] <= q25]
    slow = df[df["total_min"] >= q75]

    pct_cols = [c for c in df.columns if c.endswith("_pct")]

    result = {
        "fast_25pct": {
            "count": len(fast),
            "avg_finish_min": round(fast["total_min"].mean(), 2),
            "splits": {col.replace("_pct", ""): round(fast[col].mean(), 2) for col in pct_cols},
        },
        "slow_25pct": {
            "count": len(slow),
            "avg_finish_min": round(slow["total_min"].mean(), 2),
            "splits": {col.replace("_pct", ""): round(slow[col].mean(), 2) for col in pct_cols},
        },
    }

    # Compute differences
    result["differences"] = {}
    for seg in ["swim", "bike", "run"]:
        if seg in result["fast_25pct"]["splits"] and seg in result["slow_25pct"]["splits"]:
            diff = result["fast_25pct"]["splits"][seg] - result["slow_25pct"]["splits"][seg]
            result["differences"][seg] = round(diff, 2)

    return result


def compute_yearly_trends(df: pd.DataFrame) -> dict:
    """Compute year-over-year performance trends."""
    if "EventYear" not in df.columns or "total_min" not in df.columns:
        return {}

    yearly = df.groupby("EventYear").agg(
        avg_finish=("total_min", "mean"),
        median_finish=("total_min", "median"),
        count=("total_min", "count"),
    ).round(2)

    first_year = yearly.index.min()
    last_year = yearly.index.max()

    return {
        "by_year": {int(y): {"avg": row["avg_finish"], "median": row["median_finish"], "count": int(row["count"])}
                    for y, row in yearly.iterrows()},
        "trend": {
            "first_year": int(first_year),
            "last_year": int(last_year),
            "first_avg": yearly.loc[first_year, "avg_finish"],
            "last_avg": yearly.loc[last_year, "avg_finish"],
            "change_min": round(yearly.loc[last_year, "avg_finish"] - yearly.loc[first_year, "avg_finish"], 2),
            "change_pct": round(
                (yearly.loc[last_year, "avg_finish"] - yearly.loc[first_year, "avg_finish"])
                / yearly.loc[first_year, "avg_finish"] * 100, 2
            ),
        },
    }


def write_report(output_path: str, demographics: dict, time_stats: dict,
                 split_ratios: dict, fast_slow: dict, yearly: dict, total_records: int):
    """Write human-readable report."""
    lines = []
    sep = "=" * 80

    lines.append(sep)
    lines.append("COMPREHENSIVE EXPLORATORY DATA ANALYSIS SUMMARY")
    lines.append("HALF IRONMAN / IRONMAN 70.3 DATASET")
    lines.append(sep)
    lines.append(f"\nAnalysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"Total Records: {total_records:,}\n")

    # Demographics
    lines.append(f"\n{sep}")
    lines.append("1. DEMOGRAPHIC BREAKDOWN")
    lines.append(sep)

    if "gender" in demographics:
        lines.append("\nBy Gender:")
        for g, d in demographics["gender"].items():
            lines.append(f"  {g}: {d['count']:,} ({d['pct']}%)")

    if "age_groups" in demographics:
        lines.append("\nAge Group Distribution (Top 10):")
        for ag, d in demographics["age_groups"].items():
            lines.append(f"  {ag}: {d['count']:,} ({d['pct']}%)")

    if "years" in demographics:
        y = demographics["years"]
        lines.append(f"\nEvent Years: {y['min']}-{y['max']}")
        lines.append(f"Peak Year: {y['peak_year']} ({y['peak_count']:,} records)")

    if "unique_locations" in demographics:
        lines.append(f"Unique Locations: {demographics['unique_locations']}")

    # Time distributions
    lines.append(f"\n{sep}")
    lines.append("2. TIME DISTRIBUTION STATISTICS")
    lines.append(sep)

    for seg, s in time_stats.items():
        lines.append(f"\n{seg.title()} Time (minutes):")
        lines.append(f"  Mean:      {s['mean']}")
        lines.append(f"  Median:    {s['median']}")
        lines.append(f"  Std Dev:   {s['std']}")
        lines.append(f"  P10/P90:   {s['p10']} / {s['p90']}")
        lines.append(f"  Min/Max:   {s['min']} / {s['max']}")
        lines.append(f"  IQR:       {s['p25']} - {s['p75']}")

    # Split ratios
    lines.append(f"\n{sep}")
    lines.append("3. SPLIT RATIOS (% of Total Time)")
    lines.append(sep)

    if "overall" in split_ratios:
        lines.append("\nOverall Splits:")
        for seg, pct in split_ratios["overall"].items():
            lines.append(f"  {seg.title()}: {pct}%")

    if "by_gender" in split_ratios:
        lines.append("\nSplits by Gender:")
        for gender, splits in split_ratios["by_gender"].items():
            parts = " | ".join(f"{s.title()}: {p}%" for s, p in splits.items())
            lines.append(f"  {gender}: {parts}")

    # Fast vs slow
    if fast_slow:
        lines.append(f"\n{sep}")
        lines.append("4. FASTER vs SLOWER FINISHERS")
        lines.append(sep)

        f = fast_slow["fast_25pct"]
        s = fast_slow["slow_25pct"]
        lines.append(f"\nTop 25% (Fastest):    n={f['count']:,}  avg={f['avg_finish_min']} min")
        f_parts = " | ".join(f"{k.title()}: {v}%" for k, v in f["splits"].items())
        lines.append(f"  Splits: {f_parts}")

        lines.append(f"Bottom 25% (Slowest): n={s['count']:,}  avg={s['avg_finish_min']} min")
        s_parts = " | ".join(f"{k.title()}: {v}%" for k, v in s["splits"].items())
        lines.append(f"  Splits: {s_parts}")

        if "differences" in fast_slow:
            lines.append("\nDifferences (fast - slow):")
            for seg, diff in fast_slow["differences"].items():
                sign = "+" if diff > 0 else ""
                lines.append(f"  {seg.title()}: {sign}{diff} pp")

    # Yearly trends
    if yearly and "trend" in yearly:
        lines.append(f"\n{sep}")
        lines.append("5. YEAR-OVER-YEAR TRENDS")
        lines.append(sep)
        t = yearly["trend"]
        lines.append(f"\n{t['first_year']}: {t['first_avg']} min average")
        lines.append(f"{t['last_year']}: {t['last_avg']} min average")
        lines.append(f"Change: {t['change_min']} min ({t['change_pct']}%)")

    # Top locations
    if "top_locations" in demographics:
        lines.append(f"\n{sep}")
        lines.append("6. TOP EVENT LOCATIONS")
        lines.append(sep)
        for i, (loc, d) in enumerate(demographics["top_locations"].items(), 1):
            lines.append(f"  {i:2d}. {loc:<45s} {d['count']:,} ({d['pct']}%)")

    lines.append(f"\n{sep}")
    lines.append("END OF REPORT")
    lines.append(sep)

    report = "\n".join(lines)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        f.write(report)
    print(f"\nReport saved to {output_path}")
    return report


def main():
    parser = argparse.ArgumentParser(description="RaceDayAI EDA")
    parser.add_argument("--csv", help="Path to CSV file", default=None)
    parser.add_argument("--output", help="Output directory", default="src/data")
    args = parser.parse_args()

    # Find repo root
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    csv_path = args.csv or find_csv(repo_root)
    output_dir = os.path.join(repo_root, args.output) if not os.path.isabs(args.output) else args.output

    df = load_data(csv_path)

    print("\n--- Demographics ---")
    demographics = compute_demographics(df)

    print("\n--- Time Distributions ---")
    time_stats = compute_time_stats(df)
    for seg, s in time_stats.items():
        print(f"  {seg.title()}: mean={s['mean']}min median={s['median']}min p10={s['p10']} p90={s['p90']}")

    print("\n--- Split Ratios ---")
    split_ratios = compute_split_ratios(df)
    if "overall" in split_ratios:
        print(f"  Overall: {split_ratios['overall']}")

    print("\n--- Fast vs Slow ---")
    fast_slow = compare_fast_vs_slow(df)
    if "differences" in fast_slow:
        print(f"  Differences: {fast_slow['differences']}")

    print("\n--- Yearly Trends ---")
    yearly = compute_yearly_trends(df)
    if "trend" in yearly:
        t = yearly["trend"]
        print(f"  {t['first_year']}-{t['last_year']}: {t['change_min']} min ({t['change_pct']}%)")

    report_path = os.path.join(output_dir, "EDA_Summary_Report.txt")
    write_report(report_path, demographics, time_stats, split_ratios, fast_slow, yearly, len(df))

    print("\nDone!")


if __name__ == "__main__":
    main()
