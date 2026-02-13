#!/usr/bin/env python3
"""
RaceDayAI - Race Catalog Generator
===================================
Extracts comprehensive statistics for every unique race location in the Ironman 70.3 dataset.

For each EventLocation, computes:
  - Years it appears (sporadic vs. recurring)
  - Total athlete count and demographic splits
  - Median/mean/p10/p90 finish times
  - Gender split (% M/F)
  - Age group distribution
  - Average swim/bike/run split ratios
  - Championship event detection
  - Location parsing (city/region extraction)

Outputs:
  - race-catalog.json: Full catalog of all races with stats and characteristics
  - course-benchmarks.json: Per-course performance benchmarks by gender/age

Usage:
  python scripts/analytics/05_race_catalog.py [--csv path/to/Half_Ironman_df6.csv] [--output path/to/output/] [--test]

Flags:
  --test: Process only first 50,000 rows for quick testing
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

import numpy as np
import pandas as pd


def find_csv(base_dir: str) -> str:
    """Auto-discover the Ironman CSV file in the repo."""
    for root, _dirs, files in os.walk(base_dir):
        for f in files:
            if "half_ironman" in f.lower() and f.endswith(".csv"):
                return os.path.join(root, f)
    raise FileNotFoundError("Could not find Half_Ironman CSV dataset")


def load_data(csv_path: str, test_mode: bool = False) -> pd.DataFrame:
    """Load and prepare the dataset with computed columns."""
    print(f"Loading {csv_path}...")

    nrows = 50000 if test_mode else None
    df = pd.read_csv(csv_path, nrows=nrows)
    print(f"  Loaded {len(df):,} records with {len(df.columns)} columns")

    # Ensure required columns exist
    required_cols = [
        "Gender", "AgeGroup", "AgeBand", "Country", "CountryISO2",
        "EventYear", "EventLocation", "SwimTime", "Transition1Time",
        "BikeTime", "Transition2Time", "RunTime", "FinishTime"
    ]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    # Clean up data
    df = df.dropna(subset=["EventLocation", "FinishTime"])
    print(f"  After cleanup: {len(df):,} valid records")

    return df


def parse_event_name(event_location: str) -> Dict[str, Any]:
    """
    Parse an event location string to extract metadata.

    Example:
      "IRONMAN 70.3 South American Championship Buenos Aires"
      -> {
        "raw_name": "...",
        "is_championship": True,
        "location": "Buenos Aires",
        "event_type": "IRONMAN 70.3"
      }
    """
    raw = event_location.strip()

    # Detect championship
    is_championship = bool(
        re.search(r"championship", raw, re.IGNORECASE) or
        re.search(r"worlds?", raw, re.IGNORECASE)
    )

    # Extract event type (IRONMAN 70.3, IRONMAN, etc.)
    event_type_match = re.match(
        r"(IRONMAN\s+(?:70\.3)?(?:\s+M-DISTANCE)?)",
        raw,
        re.IGNORECASE
    )
    event_type = event_type_match.group(1).strip() if event_type_match else "IRONMAN 70.3"

    # Extract location: remove the event type and championship keywords to get remaining text
    location = raw
    location = re.sub(r"^IRONMAN\s+(?:70\.3)?\s*", "", location, flags=re.IGNORECASE)
    location = re.sub(r"\bchampionship\b", "", location, flags=re.IGNORECASE)
    location = re.sub(r"\bworlds?\b", "", location, flags=re.IGNORECASE)
    location = re.sub(r"\s+", " ", location).strip()

    # Extract city/region (usually the last meaningful words)
    if not location:
        location = "Unknown"

    return {
        "raw_name": raw,
        "is_championship": is_championship,
        "location": location,
        "event_type": event_type
    }


def compute_race_stats(
    group_df: pd.DataFrame,
    event_location: str,
    country_iso2_samples: List[str]
) -> Dict[str, Any]:
    """
    Compute comprehensive statistics for a single race location.
    """
    # Time columns are in seconds
    finish_times = group_df["FinishTime"].values
    swim_times = group_df["SwimTime"].values
    bike_times = group_df["BikeTime"].values
    run_times = group_df["RunTime"].values

    # Total from three main segments (excluding transitions)
    total_main_times = swim_times + bike_times + run_times

    # Finish time stats
    finish_stats = {
        "median_sec": int(np.median(finish_times)),
        "mean_sec": int(np.mean(finish_times)),
        "p10_sec": int(np.percentile(finish_times, 10)),
        "p90_sec": int(np.percentile(finish_times, 90)),
        "min_sec": int(np.min(finish_times)),
        "max_sec": int(np.max(finish_times)),
        "stdev_sec": int(np.std(finish_times))
    }

    # Convert seconds to readable format (HH:MM:SS)
    def secs_to_hhmmss(secs: int) -> str:
        h = secs // 3600
        m = (secs % 3600) // 60
        s = secs % 60
        return f"{h}:{m:02d}:{s:02d}"

    finish_stats["median_display"] = secs_to_hhmmss(finish_stats["median_sec"])
    finish_stats["mean_display"] = secs_to_hhmmss(finish_stats["mean_sec"])
    finish_stats["p10_display"] = secs_to_hhmmss(finish_stats["p10_sec"])
    finish_stats["p90_display"] = secs_to_hhmmss(finish_stats["p90_sec"])

    # Segment split stats
    split_stats = {
        "swim": {
            "median_sec": int(np.median(swim_times)),
            "mean_sec": int(np.mean(swim_times)),
            "pct_of_total": round(100 * np.mean(swim_times) / np.mean(total_main_times), 1)
        },
        "bike": {
            "median_sec": int(np.median(bike_times)),
            "mean_sec": int(np.mean(bike_times)),
            "pct_of_total": round(100 * np.mean(bike_times) / np.mean(total_main_times), 1)
        },
        "run": {
            "median_sec": int(np.median(run_times)),
            "mean_sec": int(np.mean(run_times)),
            "pct_of_total": round(100 * np.mean(run_times) / np.mean(total_main_times), 1)
        }
    }

    # Demographics
    gender_counts = group_df["Gender"].value_counts().to_dict()
    total_count = len(group_df)

    gender_split = {
        "M": round(100 * gender_counts.get("M", 0) / total_count, 1),
        "F": round(100 * gender_counts.get("F", 0) / total_count, 1),
        "counts": {
            "M": int(gender_counts.get("M", 0)),
            "F": int(gender_counts.get("F", 0))
        }
    }

    # Age group distribution
    age_dist = group_df["AgeGroup"].value_counts().to_dict()
    age_distribution = {
        group: {
            "count": int(count),
            "pct": round(100 * count / total_count, 1)
        }
        for group, count in sorted(age_dist.items())
    }

    # Years
    years = sorted(group_df["EventYear"].unique().astype(int).tolist())
    years_set = set(years)

    # Consistency check: is this race recurring?
    if len(years) > 1:
        year_range = max(years) - min(years)
        expected_appearances = year_range + 1
        actual_appearances = len(years)
        consistency = round(100 * actual_appearances / expected_appearances, 0)
        consistency_type = "consistent" if consistency >= 75 else "sporadic"
    else:
        consistency = 100.0 if len(years) == 1 else 0.0
        consistency_type = "single_year" if len(years) == 1 else "unknown"

    # Country detection: use majority or fallback to mode of CountryISO2
    country_mode = group_df["CountryISO2"].mode()
    country_iso2 = country_mode[0] if len(country_mode) > 0 else "XX"

    # Metadata
    metadata = parse_event_name(event_location)

    return {
        "event_location": event_location,
        "metadata": metadata,
        "stats": {
            "total_athletes": int(total_count),
            "years": years,
            "year_range": {
                "first": int(min(years)),
                "last": int(max(years)),
                "consistency_pct": float(consistency),
                "type": consistency_type
            },
            "finish_time": finish_stats,
            "segments": split_stats,
            "demographics": {
                "gender": gender_split,
                "age_groups": age_distribution
            },
            "country_iso2": country_iso2
        }
    }


def compute_benchmarks_by_segment(
    df: pd.DataFrame,
    event_location: str
) -> Dict[str, Any]:
    """
    Compute performance benchmarks per course, segmented by gender and age group.
    """
    benchmarks = {
        "event_location": event_location,
        "by_gender": {},
        "by_age_group": {}
    }

    # By gender
    for gender in ["M", "F"]:
        gender_df = df[df["Gender"] == gender]
        if len(gender_df) == 0:
            continue

        benchmarks["by_gender"][gender] = {
            "count": int(len(gender_df)),
            "finish_time": {
                "median_sec": int(np.median(gender_df["FinishTime"])),
                "mean_sec": int(np.mean(gender_df["FinishTime"])),
                "p10_sec": int(np.percentile(gender_df["FinishTime"], 10)),
                "p90_sec": int(np.percentile(gender_df["FinishTime"], 90))
            },
            "segments": {
                "swim": {
                    "median_sec": int(np.median(gender_df["SwimTime"])),
                    "mean_sec": int(np.mean(gender_df["SwimTime"]))
                },
                "bike": {
                    "median_sec": int(np.median(gender_df["BikeTime"])),
                    "mean_sec": int(np.mean(gender_df["BikeTime"]))
                },
                "run": {
                    "median_sec": int(np.median(gender_df["RunTime"])),
                    "mean_sec": int(np.mean(gender_df["RunTime"]))
                }
            }
        }

    # By age group
    for age_group in sorted(df["AgeGroup"].unique()):
        ag_df = df[df["AgeGroup"] == age_group]
        if len(ag_df) == 0:
            continue

        benchmarks["by_age_group"][age_group] = {
            "count": int(len(ag_df)),
            "finish_time": {
                "median_sec": int(np.median(ag_df["FinishTime"])),
                "mean_sec": int(np.mean(ag_df["FinishTime"])),
                "p10_sec": int(np.percentile(ag_df["FinishTime"], 10)),
                "p90_sec": int(np.percentile(ag_df["FinishTime"], 90))
            },
            "segments": {
                "swim": {
                    "median_sec": int(np.median(ag_df["SwimTime"])),
                    "mean_sec": int(np.mean(ag_df["SwimTime"]))
                },
                "bike": {
                    "median_sec": int(np.median(ag_df["BikeTime"])),
                    "mean_sec": int(np.mean(ag_df["BikeTime"]))
                },
                "run": {
                    "median_sec": int(np.median(ag_df["RunTime"])),
                    "mean_sec": int(np.mean(ag_df["RunTime"]))
                }
            }
        }

    return benchmarks


def main():
    parser = argparse.ArgumentParser(
        description="Generate comprehensive race catalog and benchmarks from Ironman 70.3 dataset"
    )
    parser.add_argument(
        "--csv",
        type=str,
        default=None,
        help="Path to Half_Ironman_df6.csv (auto-discovered if not provided)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="src/data",
        help="Output directory for JSON files"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test mode: process only first 50,000 rows"
    )

    args = parser.parse_args()

    # Resolve CSV path
    if args.csv:
        csv_path = args.csv
    else:
        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        csv_path = find_csv(repo_root)

    if not os.path.exists(csv_path):
        print(f"ERROR: CSV file not found at {csv_path}")
        sys.exit(1)

    # Resolve output directory
    output_dir = args.output
    if not os.path.isabs(output_dir):
        repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        output_dir = os.path.join(repo_root, output_dir)

    Path(output_dir).mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print("RaceDayAI - Race Catalog Generator")
    print("=" * 80)
    if args.test:
        print("TEST MODE: Processing first 50,000 rows only")
    print()

    # Load data
    df = load_data(csv_path, test_mode=args.test)

    # Generate race stats
    print("\nExtracting unique race locations...")
    unique_locations = df["EventLocation"].unique()
    print(f"  Found {len(unique_locations)} unique race locations")

    catalog = []
    benchmarks = []
    location_count = 0

    print("\nComputing statistics for each location...")
    for i, location in enumerate(sorted(unique_locations), 1):
        location_df = df[df["EventLocation"] == location]

        # Compute race stats
        race_stats = compute_race_stats(
            location_df,
            location,
            location_df["CountryISO2"].tolist()
        )
        catalog.append(race_stats)

        # Compute benchmarks
        course_benchmarks = compute_benchmarks_by_segment(location_df, location)
        benchmarks.append(course_benchmarks)

        location_count += 1
        if i % 50 == 0:
            print(f"  Processed {i}/{len(unique_locations)} locations")

    # Write outputs
    race_catalog_path = os.path.join(output_dir, "race-catalog.json")
    benchmarks_path = os.path.join(output_dir, "course-benchmarks.json")

    print(f"\nWriting {race_catalog_path}...")
    with open(race_catalog_path, "w") as f:
        json.dump(catalog, f, indent=2)

    print(f"Writing {benchmarks_path}...")
    with open(benchmarks_path, "w") as f:
        json.dump(benchmarks, f, indent=2)

    # Summary report
    print("\n" + "=" * 80)
    print("SUMMARY REPORT")
    print("=" * 80)
    print(f"Total records processed: {len(df):,}")
    print(f"Unique race locations: {len(catalog)}")
    print(f"Date generated: {datetime.now().isoformat()}")
    print()

    # Statistics
    total_athletes = sum(r["stats"]["total_athletes"] for r in catalog)
    print(f"Total athletes across all races: {total_athletes:,}")
    print()

    # Championship races
    championship_races = [r for r in catalog if r["metadata"]["is_championship"]]
    print(f"Championship events: {len(championship_races)}")
    if championship_races:
        print("  Examples:")
        for race in championship_races[:5]:
            print(f"    - {race['event_location']}")
    print()

    # Consistency analysis
    consistent = [r for r in catalog if r["stats"]["year_range"]["type"] == "consistent"]
    sporadic = [r for r in catalog if r["stats"]["year_range"]["type"] == "sporadic"]
    single = [r for r in catalog if r["stats"]["year_range"]["type"] == "single_year"]

    print(f"Consistency breakdown:")
    print(f"  Recurring every year (>75%): {len(consistent)}")
    print(f"  Sporadic (25-75%): {len(sporadic)}")
    print(f"  Single year only: {len(single)}")
    print()

    # Top races by athlete count
    top_races = sorted(catalog, key=lambda r: r["stats"]["total_athletes"], reverse=True)[:10]
    print("Top 10 races by athlete participation:")
    for i, race in enumerate(top_races, 1):
        count = race["stats"]["total_athletes"]
        location = race["event_location"]
        years = ", ".join(map(str, race["stats"]["years"][:5]))
        if len(race["stats"]["years"]) > 5:
            years += "..."
        print(f"  {i:2d}. {count:6,} athletes | {location[:50]}")
        print(f"      Years: {years}")
    print()

    # Performance metrics
    print("Overall performance distribution:")
    all_finish_times = df["FinishTime"].values
    print(f"  Median finish time: {int(np.median(all_finish_times)):,} sec " +
          f"({int(np.median(all_finish_times)//3600)}h {int((np.median(all_finish_times)%3600)//60)}m)")
    print(f"  Mean finish time:   {int(np.mean(all_finish_times)):,} sec " +
          f"({int(np.mean(all_finish_times)//3600)}h {int((np.mean(all_finish_times)%3600)//60)}m)")
    print(f"  10th percentile:    {int(np.percentile(all_finish_times, 10)):,} sec " +
          f"({int(np.percentile(all_finish_times, 10)//3600)}h {int((np.percentile(all_finish_times, 10)%3600)//60)}m)")
    print(f"  90th percentile:    {int(np.percentile(all_finish_times, 90)):,} sec " +
          f"({int(np.percentile(all_finish_times, 90)//3600)}h {int((np.percentile(all_finish_times, 90)%3600)//60)}m)")
    print()

    # Output files info
    print("Output files:")
    print(f"  {race_catalog_path}")
    print(f"    - {len(catalog)} race locations")
    print(f"  {benchmarks_path}")
    print(f"    - Performance benchmarks for {len(benchmarks)} courses")
    print()

    print("=" * 80)
    print("SAMPLE DATA")
    print("=" * 80)

    # Show sample of first race
    if catalog:
        sample_race = catalog[0]
        print(f"\nSample race catalog entry:")
        print(json.dumps(sample_race, indent=2)[:2000])
        print("  [... truncated ...]")

    if benchmarks:
        sample_benchmark = benchmarks[0]
        print(f"\nSample benchmark entry:")
        print(json.dumps(sample_benchmark, indent=2)[:2000])
        print("  [... truncated ...]")

    print("\n" + "=" * 80)
    print("COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    main()
