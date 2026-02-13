#!/usr/bin/env python3
"""
RaceDayAI - Ironman Race Results Scraper
==========================================
Scrapes race results from ironman.com using the configured scraper provider.
Parses athlete results into structured records and exports to CSV/JSON.

Handles multiple Wikipedia table formats:
  1. Standard results: | Rank | Country | Swim | Bike | Run | Finish |
  2. Podium tables:    | Year | Gold | Time | Silver | Time | Bronze | Time |
  3. Split-header:     | Rank | Time | Name | Country | Split times |
                       | Swim | T1 | Bike | T2 | Run |
  4. Medal-icon ranks: Gold/silver/bronze images instead of numeric ranks

Usage:
    python research/scrapers/ironman_results.py --url "https://..." --api-key "jina_xxx"
    python research/scrapers/ironman_results.py --url "https://..." --api-key "jina_xxx" --raw
    python research/scrapers/ironman_results.py --url "https://..." --api-key "jina_xxx" --output results.csv

Environment:
    JINA_API_KEY=jina_xxx  (or pass --api-key)
"""

import argparse
import csv
import json
import os
import re
import sys
import time
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Optional

# Add parent dir to path so we can import scrapers package
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scrapers import create_scraper, ScraperResult


@dataclass
class RaceResultRecord:
    """A single athlete's race result, anonymized."""
    gender: str = ""
    age_group: str = ""
    country: str = ""
    athlete_name: str = ""
    swim_sec: Optional[float] = None
    bike_sec: Optional[float] = None
    run_sec: Optional[float] = None
    t1_sec: Optional[float] = None
    t2_sec: Optional[float] = None
    total_sec: Optional[float] = None
    overall_rank: Optional[int] = None
    age_group_rank: Optional[int] = None
    gender_rank: Optional[int] = None
    event_name: str = ""
    event_year: Optional[int] = None
    event_distance: str = ""  # "70.3" or "140.6" or "olympic" etc.
    source_url: str = ""


def time_to_seconds(time_str: str) -> Optional[float]:
    """
    Parse various time formats to seconds.

    Handles:
      "1:23:45"  -> 5025.0
      "01:23:45" -> 5025.0
      "23:45"    -> 1425.0
      "DNF"      -> None
      "DNS"      -> None
      ""         -> None
    """
    if not time_str or not time_str.strip():
        return None

    time_str = time_str.strip()

    # Filter non-finishers
    if any(x in time_str.upper() for x in ["DNF", "DNS", "DQ", "DSQ", "WD", "--"]):
        return None

    # Try HH:MM:SS
    match = re.match(r"(\d{1,2}):(\d{2}):(\d{2})", time_str)
    if match:
        h, m, s = int(match.group(1)), int(match.group(2)), int(match.group(3))
        return h * 3600 + m * 60 + s

    # Try MM:SS
    match = re.match(r"(\d{1,2}):(\d{2})", time_str)
    if match:
        m, s = int(match.group(1)), int(match.group(2))
        return m * 60 + s

    return None


def _clean_athlete_name(raw: str) -> str:
    """Clean athlete name from wiki markdown artifacts."""
    # Strip markdown images like ![1st place, gold medalist(s)](...)
    raw = re.sub(r"!\[.*?\]\(.*?\)", "", raw)
    # Strip markdown links: [Name](url) -> Name
    raw = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", raw)
    # Remove wiki disambiguation text like "Tim O'Donnell (triathlete)"
    raw = re.sub(r'\s*"[^"]*"\)?', "", raw)
    # Remove trailing parenthesized text like "(triathlete)"
    raw = re.sub(r"\s*\([^)]*\)\s*$", "", raw)
    return raw.strip()


def _split_tables(table_lines: list[str]) -> list[list[str]]:
    """Split a list of markdown table lines into separate tables.

    Tables are separated when a new header row appears (detected by a
    following separator line like |---|---|).
    """
    tables = []
    current = []

    for i, line in enumerate(table_lines):
        cells = [c.strip() for c in line.split("|") if c.strip()]
        is_separator = bool(cells and all(re.match(r"^[-:]+$", c) for c in cells))

        if is_separator and current and len(current) >= 1:
            # The line before this separator is a header for a new table
            if len(current) >= 2:
                # Save everything before the last line as previous table
                tables.append(current[:-1])
            # Start new table with the header + separator
            current = [current[-1], line]
        else:
            current.append(line)

    if current:
        tables.append(current)

    return tables


def _parse_header_positional(header_line: str) -> list[str]:
    """Parse header line preserving column positions (keep empty cells)."""
    raw_hdr = header_line.split("|")
    # Strip leading/trailing empty strings from pipe boundaries
    if raw_hdr and raw_hdr[0].strip() == "":
        raw_hdr = raw_hdr[1:]
    if raw_hdr and raw_hdr[-1].strip() == "":
        raw_hdr = raw_hdr[:-1]
    return [h.strip().lower() for h in raw_hdr]


def _parse_cells_positional(line: str) -> list[str]:
    """Parse data line preserving column positions (keep empty cells)."""
    raw_parts = line.split("|")
    if raw_parts and raw_parts[0].strip() == "":
        raw_parts = raw_parts[1:]
    if raw_parts and raw_parts[-1].strip() == "":
        raw_parts = raw_parts[:-1]
    return [c.strip() for c in raw_parts]


def _is_separator_line(cells: list[str]) -> bool:
    """Check if cells represent a markdown table separator line."""
    return bool(cells and all(re.match(r"^[-:]+$", c) for c in cells if c))


def _merge_split_header_tables(tables: list[list[str]]) -> list[list[str]]:
    """Pre-process: merge consecutive tables where first has rank/athlete
    but no splits, and second has split columns (Swim/T1/Bike/T2/Run).

    Wikipedia Ironman WC year pages use this format:
      Table 1: | Rank | Time | Name | Country | Split times |
      Table 2: | Swim | T1 | Bike | T2 | Run |
    with data rows attached to table 2.
    """
    merged_tables = []
    skip_next = False

    for idx in range(len(tables)):
        if skip_next:
            skip_next = False
            continue

        tbl = tables[idx]
        if not tbl:
            merged_tables.append(tbl)
            continue

        header = _parse_header_positional(tbl[0])
        header_col_map = _map_columns(header)

        if idx + 1 < len(tables) and tables[idx + 1]:
            next_header = _parse_header_positional(tables[idx + 1][0])
            next_col_map = _map_columns(next_header)

            has_splits_in_next = any(k in next_col_map for k in ("swim", "bike", "run"))
            has_rank_in_current = any(k in header_col_map for k in ("rank", "athlete"))
            no_splits_in_current = not any(k in header_col_map for k in ("swim", "bike", "run"))

            if has_splits_in_next and has_rank_in_current and no_splits_in_current:
                # Drop the last column of base header (the colspan placeholder like "split times")
                base_headers = header[:-1]
                merged_header_parts = base_headers + next_header
                merged_header_line = "| " + " | ".join(merged_header_parts) + " |"

                # Collect data rows from BOTH tables (skip separator lines)
                next_tbl = tables[idx + 1]
                all_data = []
                for line in tbl[1:]:
                    cells = _parse_cells_positional(line)
                    if not _is_separator_line(cells):
                        all_data.append(line)
                for line in next_tbl[1:]:
                    cells = _parse_cells_positional(line)
                    if not _is_separator_line(cells):
                        all_data.append(line)

                sep_line = "| " + " | ".join(["---"] * len(merged_header_parts)) + " |"
                merged_tbl = [merged_header_line, sep_line] + all_data
                merged_tables.append(merged_tbl)
                skip_next = True
                continue

        merged_tables.append(tbl)

    return merged_tables


def _map_columns(headers: list[str]) -> dict:
    """Map header names to our standard field names."""
    col_map = {}
    for i, h in enumerate(headers):
        hl = h.lower().replace(" ", "")

        if "swim" in hl:
            col_map["swim"] = i
        elif "bike" in hl or "cycling" in hl or "cycle" in hl:
            col_map["bike"] = i
        elif "run" in hl and "rank" not in hl:
            col_map["run"] = i
        elif ("finish" in hl or "total" in hl) and "time" in hl:
            col_map["total"] = i
        elif hl.startswith("time") and "total" not in col_map:
            col_map["total"] = i
        elif hl.startswith("splittimes") or hl.startswith("split"):
            pass  # skip "split times" colspan placeholder
        elif "t1" in hl or "transition1" in hl:
            col_map["t1"] = i
        elif "t2" in hl or "transition2" in hl:
            col_map["t2"] = i
        elif "country" in hl or "ctry" in hl or "nationality" in hl:
            col_map["country"] = i
        elif "gender" in hl or "sex" in hl:
            col_map["gender"] = i
        elif "div" in hl and "rank" in hl:
            col_map["ag_rank"] = i
        elif "age" in hl and ("group" in hl or "grp" in hl or "div" in hl or "cat" in hl):
            col_map["age_group"] = i
        elif hl in ("rank", "overallrank", "place"):
            col_map["rank"] = i
        elif hl in ("#", "bib") and "rank" not in col_map:
            col_map["rank"] = i
        elif "genderrank" in hl:
            col_map["gender_rank"] = i
        elif "athlete" in hl or "triathlete" in hl or hl in ("name", "winner"):
            col_map["athlete"] = i
        elif hl in ("year", "edition"):
            col_map["year"] = i
        elif hl in ("gold", "winner", "1st"):
            col_map["gold"] = i
        elif hl in ("silver", "2nd"):
            col_map["silver"] = i
        elif hl in ("bronze", "3rd"):
            col_map["bronze"] = i
    return col_map


def _parse_rank_cell(rank_cell: str) -> Optional[int]:
    """Parse rank from a cell, handling medal icons and numeric values."""
    if not rank_cell:
        return None

    # Try direct integer
    try:
        return int(rank_cell)
    except (ValueError, TypeError):
        pass

    # Handle medal icon text (Wikipedia uses image alt text)
    rank_cell_lower = rank_cell.lower()
    if "gold" in rank_cell_lower or "1st" in rank_cell_lower:
        return 1
    elif "silver" in rank_cell_lower or "2nd" in rank_cell_lower:
        return 2
    elif "bronze" in rank_cell_lower or "3rd" in rank_cell_lower:
        return 3

    # Try extracting number from text
    m = re.search(r"\d+", rank_cell)
    if m:
        return int(m.group())

    return None


def _parse_podium_table(table_lines: list[str], event_name: str, event_distance: str,
                        source_url: str) -> list[RaceResultRecord]:
    """Parse Wikipedia-style podium tables: Year | Gold | Time | Silver | Time | Bronze | Time."""
    records = []
    if not table_lines:
        return records

    header_line = table_lines[0]
    headers = _parse_header_positional(header_line)
    col_map = _map_columns(headers)

    # Detect podium format: has gold/silver/bronze or multiple "time" columns
    time_cols = [i for i, h in enumerate(headers) if h.strip().lower() == "time"]
    is_podium = ("gold" in col_map or "silver" in col_map) or len(time_cols) >= 2

    if not is_podium:
        return records

    # For podium tables, identify placement + time column pairs
    placements = []
    for i, h in enumerate(headers):
        hl = h.strip().lower()
        if hl in ("gold", "winner", "1st", "silver", "2nd", "bronze", "3rd"):
            time_idx = None
            for j in range(i + 1, len(headers)):
                if headers[j].strip().lower() == "time":
                    time_idx = j
                    break
            rank_num = {"gold": 1, "winner": 1, "1st": 1,
                        "silver": 2, "2nd": 2,
                        "bronze": 3, "3rd": 3}.get(hl, 0)
            placements.append((i, time_idx, rank_num))

    if not placements:
        return records

    year_col = col_map.get("year")

    data_lines = []
    for line in table_lines[1:]:
        cells = _parse_cells_positional(line)
        if cells and not _is_separator_line(cells):
            data_lines.append(cells)

    for cells in data_lines:
        year = None
        if year_col is not None and year_col < len(cells):
            try:
                year = int(re.search(r"\d{4}", cells[year_col]).group())
            except (AttributeError, ValueError):
                pass

        for _name_col, time_col, rank in placements:
            if time_col is None or time_col >= len(cells):
                continue
            total = time_to_seconds(cells[time_col])
            if total:
                athlete = ""
                if _name_col < len(cells):
                    athlete = _clean_athlete_name(cells[_name_col])
                record = RaceResultRecord(
                    event_name=event_name,
                    event_year=year,
                    event_distance=event_distance,
                    source_url=source_url,
                    total_sec=total,
                    overall_rank=rank,
                    athlete_name=athlete,
                )
                records.append(record)

    return records


def parse_results_markdown(content: str, event_name: str = "", event_year: int = None,
                           event_distance: str = "", source_url: str = "") -> list[RaceResultRecord]:
    """
    Parse race results from markdown table content.

    Handles multiple table formats:
    1. Standard results: | Rank | Country | Swim | Bike | Run | Finish | ...
    2. Podium tables:    | Year | Gold | Time | Silver | Time | Bronze | Time |
    3. Split-header:     merged from two consecutive tables
    4. Medal icon ranks: gold/silver/bronze image alt text

    Automatically detects format from headers and parses accordingly.
    Handles pages with multiple tables (e.g., Wikipedia with men's + women's results).
    """
    records = []
    lines = content.split("\n")

    # Find table lines (contain pipes)
    table_lines = [l.strip() for l in lines if "|" in l and l.strip().startswith("|")]

    if not table_lines:
        return _parse_freeform(content, event_name, event_year, event_distance, source_url)

    # Split into separate tables
    tables = _split_tables(table_lines)

    # Pre-process: merge split-header tables (Ironman WC year pages)
    tables = _merge_split_header_tables(tables)

    print(f"  Found {len(tables)} table(s) in content (after merge)")

    for table_idx, tbl in enumerate(tables):
        if not tbl:
            continue

        header_line = tbl[0]
        headers = _parse_header_positional(header_line)
        col_map = _map_columns(headers)

        # Detect table type
        time_cols = [i for i, h in enumerate(headers) if h.strip().lower() == "time"]
        has_podium = any(k in col_map for k in ("gold", "silver", "bronze"))
        has_results = any(k in col_map for k in ("swim", "bike", "run", "total"))

        if has_podium or len(time_cols) >= 2:
            podium_records = _parse_podium_table(tbl, event_name, event_distance, source_url)
            if podium_records:
                print(f"  Table {table_idx + 1}: podium format, {len(podium_records)} records")
                records.extend(podium_records)
            continue

        if not has_results and not col_map:
            print(f"  Table {table_idx + 1}: skipping (no recognized columns in: {headers})")
            continue

        print(f"  Table {table_idx + 1}: standard results, columns={col_map}")

        # Parse standard results table (position-aware)
        data_lines = []
        for line in tbl[1:]:
            cells = _parse_cells_positional(line)
            if cells and not _is_separator_line(cells):
                data_lines.append(cells)

        for cells in data_lines:
            try:
                record = RaceResultRecord(
                    event_name=event_name,
                    event_year=event_year,
                    event_distance=event_distance,
                    source_url=source_url,
                )

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
                    record.country = _clean_athlete_name(cells[col_map["country"]])
                if "gender" in col_map and col_map["gender"] < len(cells):
                    record.gender = cells[col_map["gender"]]
                if "age_group" in col_map and col_map["age_group"] < len(cells):
                    record.age_group = cells[col_map["age_group"]]
                if "athlete" in col_map and col_map["athlete"] < len(cells):
                    record.athlete_name = _clean_athlete_name(cells[col_map["athlete"]])
                if "rank" in col_map and col_map["rank"] < len(cells):
                    record.overall_rank = _parse_rank_cell(cells[col_map["rank"]])
                if "ag_rank" in col_map and col_map["ag_rank"] < len(cells):
                    try:
                        record.age_group_rank = int(cells[col_map["ag_rank"]])
                    except (ValueError, TypeError):
                        pass
                if "gender_rank" in col_map and col_map["gender_rank"] < len(cells):
                    try:
                        record.gender_rank = int(cells[col_map["gender_rank"]])
                    except (ValueError, TypeError):
                        pass

                if record.total_sec or (record.swim_sec and record.bike_sec and record.run_sec):
                    records.append(record)

            except Exception:
                continue

    return records


def _parse_freeform(content: str, event_name: str, event_year: int,
                    event_distance: str, source_url: str) -> list[RaceResultRecord]:
    """Fallback parser for non-table formatted results."""
    time_pattern = re.compile(r"(\d{1,2}:\d{2}:\d{2})")
    matches = time_pattern.findall(content)

    if matches:
        print(f"  Freeform parser found {len(matches)} time values (needs manual review)")

    return []


def export_csv(records: list[RaceResultRecord], output_path: str):
    """Export records to CSV."""
    if not records:
        print("No records to export")
        return

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    fields = list(asdict(records[0]).keys())
    with open(output_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for r in records:
            writer.writerow(asdict(r))

    print(f"Exported {len(records)} records to {output_path}")


def export_json(records: list[RaceResultRecord], output_path: str):
    """Export records to JSON."""
    if not records:
        print("No records to export")
        return

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    data = {
        "metadata": {
            "date_scraped": datetime.now().isoformat(),
            "record_count": len(records),
        },
        "records": [asdict(r) for r in records],
    }

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    print(f"Exported {len(records)} records to {output_path}")


# ── Known Ironman results URLs for discovery ──────────────────────
SAMPLE_RESULT_URLS = [
    "https://www.ironman.com/im703-world-championship-2023-results",
    "https://www.ironman.com/im-world-championship-2023-results",
    "https://www.ironman.com/im703-world-championship-2024-results",
]


def main():
    parser = argparse.ArgumentParser(description="RaceDayAI Ironman Results Scraper")
    parser.add_argument("--url", help="Single results page URL to scrape")
    parser.add_argument("--api-key", help="Scraper API key (or set JINA_API_KEY env)")
    parser.add_argument("--provider", default="jina", help="Scraper provider: jina or firecrawl")
    parser.add_argument("--test", action="store_true", help="Test scraper connection")
    parser.add_argument("--output", help="Output file path (.csv or .json)")
    parser.add_argument("--event-name", default="", help="Event name for metadata")
    parser.add_argument("--event-year", type=int, help="Event year")
    parser.add_argument("--event-distance", default="70.3", help="Race distance: 70.3, 140.6, olympic")
    parser.add_argument("--target-selector", help="CSS selector to target on the page")
    parser.add_argument("--remove-selector", default="nav, footer, .cookie-banner, .header",
                        help="CSS selector to remove")
    parser.add_argument("--raw", action="store_true", help="Print raw markdown content")
    parser.add_argument("--save-raw", help="Save raw markdown to this path")
    args = parser.parse_args()

    # Resolve API key
    api_key = args.api_key or os.environ.get("JINA_API_KEY", "")
    if not api_key:
        print("Error: No API key. Set JINA_API_KEY or pass --api-key")
        sys.exit(1)

    scraper = create_scraper(provider=args.provider, api_key=api_key)

    # Test mode
    if args.test:
        print(f"Testing {args.provider} connection...")
        ok = scraper.test_connection()
        sys.exit(0 if ok else 1)

    if not args.url:
        print("Error: --url required (or use --test)")
        sys.exit(1)

    # Scrape
    print(f"Scraping {args.url}...")
    result = scraper.fetch_page(
        args.url,
        target_selector=args.target_selector,
        remove_selector=args.remove_selector,
        use_browser=True,
        timeout=30,
    )

    if not result.ok:
        print(f"Scrape failed: {result.error}")
        sys.exit(1)

    print(f"Got {len(result.content)} chars, {result.tokens_used} tokens")

    # Save raw
    if args.save_raw:
        os.makedirs(os.path.dirname(args.save_raw) or ".", exist_ok=True)
        with open(args.save_raw, "w") as f:
            f.write(result.content)
        print(f"Raw markdown saved to {args.save_raw}")

    if args.raw:
        print("\n--- RAW CONTENT ---")
        print(result.content[:5000])
        print("--- END ---\n")

    # Parse
    print("Parsing results...")
    records = parse_results_markdown(
        result.content,
        event_name=args.event_name or result.title,
        event_year=args.event_year,
        event_distance=args.event_distance,
        source_url=args.url,
    )
    print(f"Parsed {len(records)} athlete records")

    if records:
        sample = records[0]
        print(f"  Sample: name={sample.athlete_name} gender={sample.gender} "
              f"swim={sample.swim_sec}s bike={sample.bike_sec}s "
              f"run={sample.run_sec}s total={sample.total_sec}s")

    # Export
    if args.output:
        if args.output.endswith(".csv"):
            export_csv(records, args.output)
        else:
            export_json(records, args.output)
    elif records:
        print("\nParsed records (first 5):")
        for r in records[:5]:
            d = asdict(r)
            print(f"  {d}")


if __name__ == "__main__":
    main()
