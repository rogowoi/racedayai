"""
ETL Pipeline: Extract, Transform, Load race data with intensity features.

Extends NB01 (etl.ipynb) to compute intensity metrics:
- Swim: pace per 100m (seconds)
- Bike: estimated average watts (from time + distance)
- Run: pace per km (minutes)
"""

import argparse
from pathlib import Path
import pandas as pd
import numpy as np
from typing import Dict, Optional

from .config import (
    RAW_DATA_DIR,
    PROCESSED_DATA_DIR,
    DISTANCE_CONFIG,
    DISTANCES,
    LOG_LEVEL,
)
from .utils import setup_logger, time_to_seconds, speed_to_watts

logger = setup_logger(__name__, LOG_LEVEL)


def load_cleaned_data() -> pd.DataFrame:
    """
    Load the already-cleaned athlete_race.csv from research/data/cleaned/.
    This data was produced by NB01 (etl.ipynb).
    """
    cleaned_path = RAW_DATA_DIR.parent / "cleaned" / "athlete_race.csv"

    if not cleaned_path.exists():
        raise FileNotFoundError(
            f"Could not find {cleaned_path}. "
            "Run NB01 (etl.ipynb) first to generate athlete_race.csv"
        )

    logger.info(f"Loading cleaned data from {cleaned_path}")
    df = pd.read_csv(cleaned_path)
    logger.info(f"Loaded {len(df):,} race records")

    return df


def filter_to_distances(df: pd.DataFrame, distances: list[str]) -> pd.DataFrame:
    """Filter dataset to specified distances."""
    logger.info(f"Filtering to distances: {distances}")

    df_filtered = df[df["event_distance"].isin(distances)].copy()

    logger.info(f"Kept {len(df_filtered):,} records across {len(distances)} distances")
    for dist in distances:
        count = len(df_filtered[df_filtered["event_distance"] == dist])
        logger.info(f"  {dist}: {count:,} records")

    return df_filtered


def compute_swim_intensity(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute swim pace per 100m.

    swim_pace_per_100m = (swim_sec / swim_distance_m) * 100
    """
    logger.info("Computing swim pace per 100m")

    def calc_swim_pace(row):
        if pd.isna(row["swim_sec"]):
            return np.nan

        distance = row["event_distance"]
        if distance not in DISTANCE_CONFIG:
            return np.nan

        swim_distance_m = DISTANCE_CONFIG[distance]["swim_distance_m"]
        pace_per_100m = (row["swim_sec"] / swim_distance_m) * 100

        return pace_per_100m

    df["swim_pace_per_100m"] = df.apply(calc_swim_pace, axis=1)

    # Log summary stats
    valid = df["swim_pace_per_100m"].dropna()
    logger.info(f"  Computed swim pace for {len(valid):,} races")
    logger.info(f"  Median: {valid.median():.1f} sec/100m")
    logger.info(f"  P10-P90: {valid.quantile(0.1):.1f} - {valid.quantile(0.9):.1f} sec/100m")

    return df


def compute_bike_intensity(df: pd.DataFrame, weight_kg: float = 75) -> pd.DataFrame:
    """
    Estimate bike power (watts) from time + distance using physics model.

    This is a rough estimate assuming:
    - Flat course (no elevation)
    - Typical CdA and Crr
    - Fixed weight

    avg_watts = speed_to_watts(speed_kmh, weight_kg)
    normalized_watts ≈ avg_watts * 1.05 (typical NP/AP ratio)
    """
    logger.info(f"Computing bike power (assuming {weight_kg}kg rider+bike)")

    def calc_bike_watts(row):
        if pd.isna(row["bike_sec"]):
            return np.nan, np.nan

        distance = row["event_distance"]
        if distance not in DISTANCE_CONFIG:
            return np.nan, np.nan

        bike_distance_km = DISTANCE_CONFIG[distance]["bike_distance_km"]
        speed_kmh = bike_distance_km / (row["bike_sec"] / 3600)

        avg_watts = speed_to_watts(speed_kmh, weight_kg)
        normalized_watts = avg_watts * 1.05  # Typical NP/AP ratio

        return avg_watts, normalized_watts

    df[["avg_watts", "normalized_watts"]] = df.apply(
        lambda row: pd.Series(calc_bike_watts(row)), axis=1
    )

    # Log summary stats
    valid = df["avg_watts"].dropna()
    logger.info(f"  Computed bike power for {len(valid):,} races")
    logger.info(f"  Median: {valid.median():.0f}W")
    logger.info(f"  P10-P90: {valid.quantile(0.1):.0f}W - {valid.quantile(0.9):.0f}W")

    return df


def compute_run_intensity(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute run pace per km.

    run_pace_per_km = (run_sec / 60) / run_distance_km  # minutes per km
    """
    logger.info("Computing run pace per km")

    def calc_run_pace(row):
        if pd.isna(row["run_sec"]):
            return np.nan

        distance = row["event_distance"]
        if distance not in DISTANCE_CONFIG:
            return np.nan

        run_distance_km = DISTANCE_CONFIG[distance]["run_distance_km"]
        pace_per_km = (row["run_sec"] / 60) / run_distance_km

        return pace_per_km

    df["run_pace_per_km"] = df.apply(calc_run_pace, axis=1)

    # Log summary stats
    valid = df["run_pace_per_km"].dropna()
    logger.info(f"  Computed run pace for {len(valid):,} races")
    logger.info(f"  Median: {valid.median():.2f} min/km")
    logger.info(f"  P10-P90: {valid.quantile(0.1):.2f} - {valid.quantile(0.9):.2f} min/km")

    return df


def merge_athlete_profiles(df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge race data with athlete profiles to get required features.
    """
    logger.info("Merging with athlete profiles")

    profile_path = RAW_DATA_DIR.parent / "cleaned" / "athlete_profile.csv"

    if not profile_path.exists():
        logger.warning(f"Athlete profile not found: {profile_path}")
        logger.warning("Some features will be missing")
        return df

    logger.info(f"Loading athlete profiles from {profile_path}")
    profiles = pd.read_csv(profile_path)
    logger.info(f"Loaded {len(profiles):,} athlete profiles")

    # Merge on athlete_hash
    initial_count = len(df)
    df = df.merge(
        profiles[[
            'athlete_hash', 'pb_total_sec', 'swim_strength_z',
            'bike_strength_z', 'run_strength_z', 'total_races',
            'consistency_cv', 'improvement_slope', 'dnf_rate'
        ]],
        on='athlete_hash',
        how='left',
        suffixes=('', '_profile')
    )

    logger.info(f"  Merged {len(df):,} records ({initial_count - len(df):,} lost in merge)")

    # Add missing encoded features
    # gender_enc: M=1, F=0
    df['gender_enc'] = df['gender'].map({'M': 1, 'F': 0}).fillna(1)

    # age_band: numeric encoding
    age_band_map = {
        '18-24': 0, '25-29': 1, '30-34': 2, '35-39': 3,
        '40-44': 4, '45-49': 5, '50-54': 6, '55-59': 7,
        '60-64': 8, '65-69': 9, '70-74': 10, '75+': 11
    }
    df['age_band'] = df['age_group'].map(age_band_map).fillna(2)  # Default to 30-34

    # country_enc: simple numeric encoding
    df['country_enc'] = pd.factorize(df['country_iso2'])[0]

    # year
    df['year'] = df['event_year']

    # cluster_id: placeholder (would come from NB02 clustering)
    df['cluster_id'] = 0

    logger.info("  Added encoded features: gender_enc, age_band, country_enc, year, cluster_id")

    return df


def apply_anomaly_detection(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply anomaly detection rules (from Plan 07 Appendix A).
    Flag records with intensity values outside reasonable bounds.
    """
    logger.info("Applying anomaly detection for intensity values")

    initial_count = len(df)

    # Swim pace: 60-180 sec/100m is reasonable
    df = df[
        (df["swim_pace_per_100m"].isna())
        | ((df["swim_pace_per_100m"] >= 60) & (df["swim_pace_per_100m"] <= 180))
    ]

    # Bike watts: 50-500W is reasonable for age-groupers
    df = df[
        (df["avg_watts"].isna())
        | ((df["avg_watts"] >= 50) & (df["avg_watts"] <= 500))
    ]

    # Run pace: 3-12 min/km is reasonable
    df = df[
        (df["run_pace_per_km"].isna())
        | ((df["run_pace_per_km"] >= 3.0) & (df["run_pace_per_km"] <= 12.0))
    ]

    removed_count = initial_count - len(df)
    logger.info(f"  Removed {removed_count:,} anomalous records ({removed_count/initial_count*100:.2f}%)")

    return df


def main(
    distances: Optional[list[str]] = None,
    output_dir: Optional[Path] = None,
    force: bool = False,
):
    """
    Run ETL pipeline to produce processed data with intensity features.

    Args:
        distances: List of distances to include (default: all)
        output_dir: Output directory for processed data
        force: Force recompute even if output exists
    """
    if distances is None:
        distances = DISTANCES

    if output_dir is None:
        output_dir = PROCESSED_DATA_DIR

    output_path = output_dir / "athlete_race_with_intensities.csv"

    if output_path.exists() and not force:
        logger.info(f"Output already exists: {output_path}")
        logger.info("Use --force to recompute")
        return

    # Load cleaned data
    df = load_cleaned_data()

    # Filter to distances
    df = filter_to_distances(df, distances)

    # Compute intensity features
    df = compute_swim_intensity(df)
    df = compute_bike_intensity(df)
    df = compute_run_intensity(df)

    # Merge with athlete profiles (adds required features)
    df = merge_athlete_profiles(df)

    # Apply anomaly detection
    df = apply_anomaly_detection(df)

    # Save processed data
    logger.info(f"Saving processed data to {output_path}")
    df.to_csv(output_path, index=False)
    logger.info(f"Saved {len(df):,} records")

    # Summary by distance
    logger.info("\nFinal dataset summary by distance:")
    for dist in distances:
        df_dist = df[df["event_distance"] == dist]
        logger.info(f"\n  {dist}:")
        logger.info(f"    Total records: {len(df_dist):,}")
        logger.info(f"    With swim pace: {df_dist['swim_pace_per_100m'].notna().sum():,}")
        logger.info(f"    With bike watts: {df_dist['avg_watts'].notna().sum():,}")
        logger.info(f"    With run pace: {df_dist['run_pace_per_km'].notna().sum():,}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL pipeline for race data with intensities")
    parser.add_argument(
        "--distances",
        type=str,
        default="sprint,olympic,70.3,140.6",
        help="Comma-separated list of distances (default: all)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Output directory (default: research/data/processed/)",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force recompute even if output exists",
    )

    args = parser.parse_args()

    distances = [d.strip() for d in args.distances.split(",")]

    main(distances=distances, output_dir=args.output_dir, force=args.force)
