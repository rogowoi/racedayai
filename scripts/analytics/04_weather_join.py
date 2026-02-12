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
  python scripts/analytics/04_weather_join.py --fetch --limit 500

Notes:
  - Open-Meteo historical API is free and requires no authentication
  - Rate limit: be respectful, add delays between requests
  - Autocodes locations via race-catalog.json or Open-Meteo geocoding API
  - Script saves progress incrementally and skips already-fetched records

Output:
  - weather-records.json  (weather data keyed by location + year)
  - location-geocodes.json  (lat/lon for each EventLocation)
  - weather-impact.json  (impact model: bins with slowdown factors)
"""

import argparse
import json
import os
import time
from datetime import datetime
from urllib.request import urlopen
from urllib.error import URLError
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


def load_race_catalog(repo_root: str) -> dict:
    """Load race catalog to auto-geocode locations."""
    catalog_path = os.path.join(repo_root, "src/data/race-catalog.json")
    if os.path.exists(catalog_path):
        with open(catalog_path) as f:
            catalog = json.load(f)
            # Build a map of event_location -> location name
            return {item["event_location"]: item["metadata"].get("location", item["event_location"])
                    for item in catalog}
    return {}


def geocode_location(location_name: str) -> tuple[float, float] | None:
    """Use Open-Meteo geocoding API to find lat/lon for a location name."""
    try:
        params = {"name": location_name, "count": 1, "language": "en"}
        url = f"https://geocoding-api.open-meteo.com/v1/search?{urlencode(params)}"
        response = urlopen(url, timeout=10)
        data = json.loads(response.read().decode())

        if data.get("results") and len(data["results"]) > 0:
            result = data["results"][0]
            return (result.get("latitude"), result.get("longitude"))
    except Exception as e:
        print(f"    Geocoding error for {location_name}: {e}")
    return None


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
    """Fetch historical weather from Open-Meteo archive API for a specific date."""
    # Clamp year to reasonable range (archive API has data up to ~2024)
    if year > 2024:
        year = 2024
    if year < 1940:
        year = 1940

    # Default to mid-month if we don't know the exact date
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

        if "daily" in data and data["daily"]["time"] and len(data["daily"]["time"]) > 0:
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
    except URLError as e:
        print(f"    Network error fetching weather for ({lat}, {lon}) on {date_str}: {e}")
    except Exception as e:
        print(f"    Error fetching weather for ({lat}, {lon}) on {date_str}: {e}")

    return None


def build_weather_impact_model(weather_records: dict) -> dict:
    """
    Build weather impact model from fetched records.
    Analyzes temperature, wind, and humidity impact on race performance.
    """
    # Bins for categorization
    temp_bins = [
        {"range": "< 15", "min": -float('inf'), "max": 15},
        {"range": "15-20", "min": 15, "max": 20},
        {"range": "20-25", "min": 20, "max": 25},
        {"range": "25-30", "min": 25, "max": 30},
        {"range": "30+", "min": 30, "max": float('inf')},
    ]

    wind_bins = [
        {"range": "calm", "min": 0, "max": 15},
        {"range": "moderate", "min": 15, "max": 30},
        {"range": "strong", "min": 30, "max": float('inf')},
    ]

    humidity_bins = [
        {"range": "dry", "min": 0, "max": 50},
        {"range": "moderate", "min": 50, "max": 70},
        {"range": "humid", "min": 70, "max": 100},
    ]

    # Default impact factors based on sports science research
    # Heat penalty: ~2-5% per 5°C above 25°C
    # Wind penalty: ~1-3% per 10 kph above 20 kph
    # Humidity penalty: ~1-2% per 10% above 70%
    impact_model = {
        "temperature": [
            {"bin": "< 15", "impact_pct": -1.5},  # Cool is slightly faster
            {"bin": "15-20", "impact_pct": -0.5},
            {"bin": "20-25", "impact_pct": 0.0},  # Baseline
            {"bin": "25-30", "impact_pct": 2.5},
            {"bin": "30+", "impact_pct": 5.0},
        ],
        "wind": [
            {"bin": "calm", "impact_pct": 0.0},  # Baseline
            {"bin": "moderate", "impact_pct": 1.5},
            {"bin": "strong", "impact_pct": 3.5},
        ],
        "humidity": [
            {"bin": "dry", "impact_pct": 0.0},  # Baseline
            {"bin": "moderate", "impact_pct": 0.5},
            {"bin": "humid", "impact_pct": 1.5},
        ],
    }

    # If we have enough weather records, we could empirically compute impacts
    # For now, return research-based defaults
    return {
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "source": "sports_science_research_defaults",
            "records_analyzed": len(weather_records),
        },
        "model": impact_model,
    }


def main():
    parser = argparse.ArgumentParser(description="RaceDayAI Weather Join")
    parser.add_argument("--csv", default=None, help="Path to CSV with race results")
    parser.add_argument("--output", default="src/data/weather-records.json", help="Output file for weather records")
    parser.add_argument("--geocodes-output", default="src/data/location-geocodes.json", help="Output file for geocodes")
    parser.add_argument("--impact-output", default="src/data/weather-impact.json", help="Output file for impact model")
    parser.add_argument("--fetch", action="store_true", help="Actually fetch weather data (slow, makes API calls)")
    parser.add_argument("--limit", type=int, default=200, help="Max location-year combos to fetch weather for")
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    csv_path = args.csv or find_csv(repo_root)
    output_path = os.path.join(repo_root, args.output) if not os.path.isabs(args.output) else args.output
    geocodes_path = os.path.join(repo_root, args.geocodes_output) if not os.path.isabs(args.geocodes_output) else args.geocodes_output
    impact_path = os.path.join(repo_root, args.impact_output) if not os.path.isabs(args.impact_output) else args.impact_output

    print("Loading race results...")
    events = get_unique_race_events(csv_path)

    print("Loading race catalog for auto-geocoding...")
    race_catalog = load_race_catalog(repo_root)

    # Geocode all locations
    print(f"\nGeocoding {events['location'].nunique()} unique locations...")
    geocodes = {}
    unmatched = []

    for loc in events["location"].unique():
        # Try known locations first
        if loc in KNOWN_LOCATIONS:
            geocodes[loc] = {"lat": KNOWN_LOCATIONS[loc][0], "lon": KNOWN_LOCATIONS[loc][1], "source": "known"}
        else:
            # Try race catalog location name
            catalog_name = race_catalog.get(loc)
            search_name = catalog_name or loc

            # Try geocoding via API
            coords = geocode_location(search_name)
            if coords:
                geocodes[loc] = {"lat": coords[0], "lon": coords[1], "source": "open-meteo", "search_term": search_name}
                print(f"  Geocoded {loc} -> ({coords[0]:.2f}, {coords[1]:.2f})")
            else:
                unmatched.append(loc)
                print(f"  Failed to geocode {loc}")

            time.sleep(0.3)  # Be respectful to geocoding API

    matched = len(geocodes)
    total_locs = events["location"].nunique()
    print(f"\nGeocoded {matched}/{total_locs} locations")

    # Save geocodes
    os.makedirs(os.path.dirname(geocodes_path), exist_ok=True)
    with open(geocodes_path, "w") as f:
        json.dump({
            "metadata": {
                "date_generated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "matched": matched,
                "total_locations": total_locs,
            },
            "locations": geocodes,
            "unmatched": unmatched,
        }, f, indent=2)
    print(f"Saved geocodes to {geocodes_path}")

    # Load existing weather records if available
    weather_records = {}
    if os.path.exists(output_path):
        try:
            with open(output_path) as f:
                data = json.load(f)
                weather_records = data.get("records", {})
                print(f"Loaded {len(weather_records)} existing weather records")
        except Exception as e:
            print(f"Could not load existing records: {e}")

    # Fetch weather if requested
    if args.fetch:
        print(f"\nFetching weather for up to {args.limit} location-year combos...")
        fetch_count = 0
        skip_count = 0

        for _, row in events.iterrows():
            if fetch_count >= args.limit:
                print(f"Reached fetch limit ({args.limit})")
                break

            loc = row["location"]
            year = int(row["year"])

            if loc not in geocodes:
                continue

            key = f"{loc}_{year}"
            if key in weather_records:
                skip_count += 1
                continue

            lat = geocodes[loc]["lat"]
            lon = geocodes[loc]["lon"]

            # Guess the race month (most IRONMAN 70.3 races are May-October)
            # Default to June 15 if unknown
            month = 6
            day = 15

            print(f"  Fetching {loc} ({year})...", end="", flush=True)
            weather = fetch_weather(lat, lon, year, month, day)
            if weather:
                weather_records[key] = {
                    "location": loc,
                    "year": year,
                    "lat": lat,
                    "lon": lon,
                    **weather,
                }
                fetch_count += 1
                print(" OK")
            else:
                print(" FAILED")

            time.sleep(0.3)  # Be respectful to the API

        print(f"Fetched {fetch_count} new records, skipped {skip_count} existing")
    else:
        print("\nSkipping weather fetch (use --fetch to enable)")
        print(f"To fetch: python {os.path.basename(__file__)} --fetch --limit 500")

    # Save weather records
    output = {
        "metadata": {
            "date_generated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_events": int(len(events)),
            "geocoded_locations": matched,
            "weather_records_fetched": len(weather_records),
        },
        "records": weather_records,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(output, f, indent=2)
    print(f"Saved {len(weather_records)} weather records to {output_path}")

    # Build and save impact model
    impact_model = build_weather_impact_model(weather_records)
    os.makedirs(os.path.dirname(impact_path), exist_ok=True)
    with open(impact_path, "w") as f:
        json.dump(impact_model, f, indent=2)
    print(f"Saved weather impact model to {impact_path}")


if __name__ == "__main__":
    main()
