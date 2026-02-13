#!/usr/bin/env python3
"""
RaceDayAI - PTO / T100 Results Parser
=======================================
Parses race results from the PTO (Professional Triathletes Organisation)
and T100 Triathlon World Tour websites.

These are SPA sites requiring Firecrawl or headless browser rendering.
The parser handles the specific markdown format returned by Firecrawl/Jina.

PTO table format quirks:
  - Header structure: empty row → separator → real header → data rows
  - Women's results appear before men's (detection via "Women" heading before table)
  - Athlete names may be prefixed with country flag emoji or code

Usage:
    python research/scrapers/pto_results.py --url "https://t100triathlon.com/results/..." --api-key "jina_xxx"

    # With Firecrawl (better for SPAs):
    python research/scrapers/pto_results.py --url "https://..." --api-key "fc_xxx" --provider firecrawl
"""

import argparse
import os
import re
import sys
from dataclasses import asdict

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scrapers import create_scraper
from scrapers.ironman_results import (
    RaceResultRecord,
    time_to_seconds,
    export_csv,
    export_json,
)


def _detect_gender_from_context(content: str, table_start_idx: int) -> str:
    """Detect gender by looking at headings before the table position."""
    lines = content.split("\n")
    # Find which line our table starts at
    line_count = 0
    for i, line in enumerate(lines):
        if "|" in line:
            line_count += 1
            if line_count == table_start_idx:
                # Look backwards for a heading containing "Women" or "Men"
                for j in range(i - 1, max(i - 20, -1), -1):
                    heading = lines[j].strip().lower()
                    if heading.startswith("#") or heading.startswith("**"):
                        if "women" in heading or "female" in heading:
                            return "F"
                        if "men" in heading or "male" in heading:
                            return "M"
                break
    return ""


def parse_pto_markdown(content: str, event_name: str = "", event_year: int = None,
                       event_distance: str = "100km", source_url: str = "") -> list[RaceResultRecord]:
    """
    Parse PTO/T100 race results from markdown content.

    PTO tables have a specific format:
      | | | |                    ← empty header
      | --- | --- | --- |       ← separator
      | Rank | Athlete | ... |  ← real header (looks like data)
      | 1 | Taylor Knibb | ... |

    The parser detects this pattern and uses the third row as the real header.
    """
    records = []
    lines = content.split("\n")

    # Find table blocks
    table_lines = []
    current_table = []
    table_positions = []
    line_idx = 0

    for line in lines:
        stripped = line.strip()
        if "|" in stripped and stripped.startswith("|"):
            if not current_table:
                table_positions.append(line_idx)
            current_table.append(stripped)
        else:
            if current_table:
                table_lines.append(current_table)
                current_table = []
        line_idx += 1

    if current_table:
        table_lines.append(current_table)

    print(f"  Found {len(table_lines)} table block(s)")

    for tbl_idx, tbl in enumerate(table_lines):
        if len(tbl) < 3:
            continue

        # Detect PTO format: first row is empty/minimal, second is separator
        first_cells = [c.strip() for c in tbl[0].split("|") if c.strip()]
        second_cells = [c.strip() for c in tbl[1].split("|") if c.strip()]

        is_pto_format = False
        real_header_idx = 0

        # Check if first row is empty and second is separator
        if not first_cells or all(not c for c in first_cells):
            is_sep = bool(second_cells and all(re.match(r"^[-:]+$", c) for c in second_cells))
            if is_sep and len(tbl) > 2:
                is_pto_format = True
                real_header_idx = 2
        # Or check if first is separator
        elif all(re.match(r"^[-:]+$", c) for c in first_cells):
            is_pto_format = True
            real_header_idx = 1

        if is_pto_format and real_header_idx < len(tbl):
            header_line = tbl[real_header_idx]
            data_start = real_header_idx + 1
        else:
            # Standard format: first row is header
            header_line = tbl[0]
            data_start = 1

        # Parse header
        headers = [h.strip().lower() for h in header_line.split("|") if h.strip()]

        # Map columns
        col_map = {}
        for i, h in enumerate(headers):
            hl = h.replace(" ", "")
            if hl in ("rank", "#", "pos", "place"):
                col_map["rank"] = i
            elif hl in ("athlete", "name", "triathlete", "competitor"):
                col_map["athlete"] = i
            elif "swim" in hl:
                col_map["swim"] = i
            elif "bike" in hl or "cycling" in hl or "cycle" in hl:
                col_map["bike"] = i
            elif "run" in hl and "rank" not in hl:
                col_map["run"] = i
            elif ("finish" in hl or "total" in hl or hl == "time" or
                  hl == "overalltime" or hl == "result"):
                col_map["total"] = i
            elif "t1" in hl or "transition1" in hl:
                col_map["t1"] = i
            elif "t2" in hl or "transition2" in hl:
                col_map["t2"] = i
            elif "country" in hl or "ctry" in hl or "nat" in hl:
                col_map["country"] = i
            elif "points" in hl or "pts" in hl:
                col_map["points"] = i

        has_results = any(k in col_map for k in ("swim", "bike", "run", "total"))
        if not has_results:
            print(f"  Table {tbl_idx + 1}: skipping (no result columns in: {headers})")
            continue

        print(f"  Table {tbl_idx + 1}: PTO format={is_pto_format}, columns={col_map}")

        # Detect gender from context
        gender = _detect_gender_from_context(
            content, tbl_idx + 1 if table_positions else 0
        )

        # Parse data rows
        for line in tbl[data_start:]:
            cells = [c.strip() for c in line.split("|") if c.strip()]
            # Skip separator lines
            if cells and all(re.match(r"^[-:]+$", c) for c in cells):
                continue

            try:
                record = RaceResultRecord(
                    event_name=event_name,
                    event_year=event_year,
                    event_distance=event_distance,
                    source_url=source_url,
                    gender=gender,
                )

                if "rank" in col_map and col_map["rank"] < len(cells):
                    try:
                        record.overall_rank = int(re.search(r"\d+", cells[col_map["rank"]]).group())
                    except (AttributeError, ValueError):
                        pass

                if "athlete" in col_map and col_map["athlete"] < len(cells):
                    name = cells[col_map["athlete"]]
                    # Strip country flag emojis and codes
                    name = re.sub(r"^[A-Z]{2,3}\s+", "", name)
                    name = re.sub(r"\s*\([A-Z]{2,3}\)\s*$", "", name)
                    record.athlete_name = name.strip()

                if "swim" in col_map and col_map["swim"] < len(cells):
                    record.swim_sec = time_to_seconds(cells[col_map["swim"]])
                if "bike" in col_map and col_map["bike"] < len(cells):
                    record.bike_sec = time_to_seconds(cells[col_map["bike"]])
                if "run" in col_map and col_map["run"] < len(cells):
                    record.run_sec = time_to_seconds(cells[col_map["run"]])
                if "total" in col_map and col_map["total"] < len(cells):
                    record.total_sec = time_to_seconds(cells[col_map["total"]])
                if "t1" in col_map and col_map["t1"] < len(cells):
                    record.t1_sec = time_to_seconds(cells[col_map["t1"]])
                if "t2" in col_map and col_map["t2"] < len(cells):
                    record.t2_sec = time_to_seconds(cells[col_map["t2"]])
                if "country" in col_map and col_map["country"] < len(cells):
                    record.country = cells[col_map["country"]].strip()

                if record.total_sec or (record.swim_sec and record.bike_sec and record.run_sec):
                    records.append(record)

            except Exception:
                continue

    return records


# ── Known T100 / PTO result URLs ─────────────────────────────────

T100_2024_URLS = [
    "https://t100triathlon.com/results/?event=miami-2024",
    "https://t100triathlon.com/results/?event=san-francisco-2024",
    "https://t100triathlon.com/results/?event=singapore-2024",
    "https://t100triathlon.com/results/?event=london-2024",
    "https://t100triathlon.com/results/?event=las-vegas-2024",
]

T100_2025_URLS = [
    "https://t100triathlon.com/results/?event=miami-2025",
    "https://t100triathlon.com/results/?event=san-francisco-2025",
    "https://t100triathlon.com/results/?event=singapore-2025",
    "https://t100triathlon.com/results/?event=london-2025",
    "https://t100triathlon.com/results/?event=las-vegas-2025",
]

PTO_TOUR_URLS = [
    "https://protriathletes.org/results/?event=us-open-2023",
    "https://protriathletes.org/results/?event=european-open-2023",
    "https://protriathletes.org/results/?event=asian-open-2023",
]


def main():
    parser = argparse.ArgumentParser(description="RaceDayAI PTO/T100 Results Scraper")
    parser.add_argument("--url", help="Single results page URL to scrape")
    parser.add_argument("--api-key", help="Scraper API key")
    parser.add_argument("--provider", default="jina", help="Scraper provider: jina or firecrawl")
    parser.add_argument("--output", help="Output file path (.csv or .json)")
    parser.add_argument("--event-name", default="", help="Event name")
    parser.add_argument("--event-year", type=int, help="Event year")
    parser.add_argument("--event-distance", default="100km", help="Race distance")
    parser.add_argument("--raw", action="store_true", help="Print raw markdown")
    parser.add_argument("--save-raw", help="Save raw markdown to file")
    args = parser.parse_args()

    api_key = args.api_key or os.environ.get("JINA_API_KEY", "")
    if not api_key:
        print("Error: No API key. Set JINA_API_KEY or pass --api-key")
        sys.exit(1)

    scraper = create_scraper(provider=args.provider, api_key=api_key)

    if not args.url:
        print("Error: --url required")
        sys.exit(1)

    print(f"Scraping {args.url}...")
    result = scraper.fetch_page(
        args.url,
        use_browser=True,
        timeout=30,
    )

    if not result.ok:
        print(f"Scrape failed: {result.error}")
        sys.exit(1)

    print(f"Got {len(result.content)} chars")

    if args.save_raw:
        os.makedirs(os.path.dirname(args.save_raw) or ".", exist_ok=True)
        with open(args.save_raw, "w") as f:
            f.write(result.content)
        print(f"Raw markdown saved to {args.save_raw}")

    if args.raw:
        print("\n--- RAW CONTENT ---")
        print(result.content[:5000])
        print("--- END ---\n")

    print("Parsing results...")
    records = parse_pto_markdown(
        result.content,
        event_name=args.event_name or result.title,
        event_year=args.event_year,
        event_distance=args.event_distance,
        source_url=args.url,
    )
    print(f"Parsed {len(records)} athlete records")

    if records:
        sample = records[0]
        print(f"  Sample: name={sample.athlete_name} rank={sample.overall_rank} "
              f"swim={sample.swim_sec}s bike={sample.bike_sec}s "
              f"run={sample.run_sec}s total={sample.total_sec}s")

    if args.output:
        if args.output.endswith(".csv"):
            export_csv(records, args.output)
        else:
            export_json(records, args.output)
    elif records:
        print("\nParsed records (first 5):")
        for r in records[:5]:
            print(f"  {asdict(r)}")


if __name__ == "__main__":
    main()
