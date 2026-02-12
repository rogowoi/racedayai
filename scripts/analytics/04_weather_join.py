#!/usr/bin/env python3
"""
RaceDayAI - Weather Data Join
==============================
Joins historical weather data to race results using the Open-Meteo
historical weather API. Maps EventLocation + EventYear to weather
conditions on race day.

This enables Model 4 (Weather Impact Quantifier): measuring how
temperature, humidity, and wind affect race performance.

Usage:
  python scripts/analytics/04_weather_join.py [--csv path] [--output src/data/weather-records.json]

Notes:
  - Open-Meteo historical API is free and requires no authentication
  - Rate limit: be respectful, add delays between requests
  - Requires geocoding EventLocations to lat/lon first
  - This script produces the location mapping; actual API calls need
    to be batched carefully

Output:
  - weather-records.json  (weather data keyed by location + year)
  - location-geocodes.json  (lat/lon for each EventLocation)
"""

import argparse
import json
import os
import time
from datetime import datetime
from urllib.request import urlopen
from urllib.parse import urlencode

import pandas as pd


# Known race locations with approximate coordinates
# This is a seed list; extend as needed
KNOWN_LOCATIONS = {
    "IRONMAN 70.3 World Championship": (21.31, -157.86),  # Kona/varies
    "IRONMAN 70.3 Augusta": (33.47, -81.97),
    "IRONMAN 70.3 Florida": (30.17, -85.80),
    "IRONMAN 70.3 Texas": (30.63, -97.68),
    "IRONMAN 70.3 California": (36.96, -122.02),
    "IRONMAN 70.3 Eagleman": (38.58, -76.07),
    "IRONMAN 70.3 Mallorca": (39.57, 2.65),
    "IRONMAN 70.3 Mont-Tremblant": (46.21, -74.58),
    "IRONMAN 70.3 Austria / St. Polten": (48.20, 15.63),
    "IRONMAN 70.3 Miami": (25.76, -80.19),
    "IRONMAN 70.3 Coeur d'Alene": (47.68, -116.78),
    "IRONMAN 70.3 Steelhead": (42.68, -86.21),
    "IRONMAN 70.3 Boulder": (40.01, -105.27),
    "IRONMAN 70.3 Oceanside": (33.20, -117.38),
    "IRONMAN 70.3 Chattanooga": (35.05, -85.31),
    "IRONMAN 70.3 Santa Cruz": (36.97, -122.03),
    "IRONMAN 70.3 Muskoka": (45.03, -79.30),
    "IRONMAN 70.3 Lubbock": (33.58, -101.85),
    "IRONMAN 70.3 Vineman": (38.51, -122.81),
    "IRONMAN 70.3 Lake Placid": (44.28, -73.99),
    "IRONMAN 70.3 Timberman": (43.56, -71.47),
}


def find_csv(base_dir: str) -> str:
    for root, _dirs, files in os.walk(base_dir):
        for f in files:
            if f.endswith(".csv") and ("ironman" in f.lower() or "half_ironman" in f.lower()):
                return os.path.join(root, f)
    raise FileNotFoundError("Could not find Ironman CSV dataset")


def get_unique_race_events(csv_path: str) -> pd.DataFrame:
    """Get unique EventLocation + EventYear combinations."""
    df = pd.read_csv(csv_path)

    loc_col = next((c for c in df.columns if "location" in c.lower()), None)
    year_col = next((c for c in df.columns if "year" in c.lower()), None)

    if not loc_col or not year_col:
        raise ValueError(f"Missing location or year columns. Found: {df.columns.tolist()}")

    events = df.groupby([loc_col, year_col]).size().reset_index(name="athlete_count")
    events.columns = ["location", "year", "athlete_count"]
    print(f"Found {len(events)} unique race events across {events['location'].nunique()} locations")
    return events


def fetch_weather(lat: float, lon: float, year: int, month: int = 6, day: int = 15) -> dict | None:
    """Fetch historical weather from Open-Meteo for a specific date."""
    # Default to mid-June if we don't know the exact date
    date_str = f"{year}-{month:02d}-{day:02d}"

    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": date_str,
        "end_date": date_str,
        "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,relative_humidity_2m_mean,wind_speed_10m_max,precipitation_sum",
        "timezone": "auto",
    }

    url = f"https://archive-api.open-meteo.com/v1/archive?{urlencode(params)}"

    try:
        response = urlopen(url, timeout=10)
        data = json.loads(response.read().decode())

        if "daily" in data and data["daily"]["time"]:
            daily = data["daily"]
            return {
                "date": date_str,
                "temp_max_c": daily["temperature_2m_max"][0],
                "temp_min_c": daily["temperature_2m_min"][0],
                "temp_mean_c": daily["temperature_2m_mean"][0],
                "humidity_pct": daily["relative_humidity_2m_mean"][0],
                "wind_max_kph": daily["wind_speed_10m_max"][0],
                "precipitation_mm": daily["precipitation_sum"][0],
            }
    except Exception as e:
        print(f"  Error fetching weather for ({lat}, {lon}) on {date_str}: {e}")

    return None


def main():
    parser = argparse.ArgumentParser(description="RaceDayAI Weather Join")
    parser.add_argument("--csv", default=None)
    parser.add_argument("--output", default="src/data/weather-records.json")
    parser.add_argument("--geocodes-output", default="src/data/location-geocodes.json")
    parser.add_argument("--fetch", action="store_true", help="Actually fetch weather data (slow, makes API calls)")
    parser.add_argument("--limit", type=int, default=10, help="Max locations to fetch weather for")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    csv_path = args.csv or find_csv(repo_root)
    output_path = os.path.join(repo_root, args.output) if not os.path.isabs(args.output) else args.output
    geocodes_path = os.path.join(repo_root, args.geocodes_output) if not os.path.isabs(args.geocodes_output) else args.geocodes_output

    events = get_unique_race_events(csv_path)

    # Match known locations
    matched = 0
    geocodes = {}
    for loc in events["location"].unique():
        if loc in KNOWN_LOCATIONS:
            geocodes[loc] = {"lat": KNOWN_LOCATIONS[loc][0], "lon": KNOWN_LOCATIONS[loc][1]}
            matched += 1

    print(f"\nGeocoded {matched}/{events['location'].nunique()} locations from known list")
    print(f"Unmatched locations need manual geocoding or an API (e.g., Nominatim)")

    # Save geocodes
    os.makedirs(os.path.dirname(geocodes_path), exist_ok=True)
    with open(geocodes_path, "w") as f:
        json.dump({
            "metadata": {"date_generated": datetime.now().strftime("%Y-%m-%d"), "matched": matched},
            "locations": geocodes,
            "unmatched": [loc for loc in events["location"].unique() if loc not in KNOWN_LOCATIONS],
        }, f, indent=2)
    print(f"Saved geocodes to {geocodes_path}")

    # Fetch weather if requested
    weather_records = {}
    if args.fetch:
        print(f"\nFetching weather for up to {args.limit} location-year combos...")
        count = 0
        for _, row in events.iterrows():
            if count >= args.limit:
                break
            loc = row["location"]
            year = int(row["year"])

            if loc not in geocodes:
                continue

            key = f"{loc}_{year}"
            if key in weather_records:
                continue

            lat, lon = geocodes[loc]["lat"], geocodes[loc]["lon"]
            print(f"  Fetching {loc} ({year})...")
            weather = fetch_weather(lat, lon, year)
            if weather:
                weather_records[key] = {
                    "location": loc,
                    "year": year,
                    "lat": lat,
                    "lon": lon,
                    **weather,
                }
                count += 1

            time.sleep(0.5)  # Be respectful to the API

        print(f"Fetched weather for {len(weather_records)} events")
    else:
        print("\nSkipping weather fetch (use --fetch to enable)")
        print("This will make API calls to Open-Meteo (free, no auth)")

    output = {
        "metadata": {
            "date_generated": datetime.now().strftime("%Y-%m-%d"),
            "total_events": int(len(events)),
            "geocoded_locations": matched,
            "weather_records_fetched": len(weather_records),
        },
        "records": weather_records,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved to {output_path}")


if __name__ == "__main__":
    main()
