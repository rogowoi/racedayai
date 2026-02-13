#!/usr/bin/env python3
"""
RaceDayAI - Scraper Ingest CLI
================================
Orchestrates scraping of triathlon race results from multiple sources.
Stores all output in data/scraped/ (gitignored, not in the database).

Sources:
  - Wikipedia: Race results via Jina AI (static HTML to markdown)
  - T100/PTO: Race results via Firecrawl or Jina (SPA rendering)
  - Kaggle: Downloaded separately via kaggle CLI

Usage:
    # Scrape all Wikipedia race pages
    python research/scrapers/ingest.py wiki --api-key "jina_xxx"

    # Scrape a specific Wikipedia category
    python research/scrapers/ingest.py wiki --api-key "jina_xxx" --category ironman

    # Scrape T100 2024 results
    python research/scrapers/ingest.py t100 --api-key "jina_xxx" --year 2024

    # Scrape a single URL (auto-detect parser)
    python research/scrapers/ingest.py single --url "https://..." --api-key "jina_xxx"

    # Dry run (list URLs without scraping)
    python research/scrapers/ingest.py wiki --dry-run

Output:
    data/scraped/wiki/       → JSON files per race
    data/scraped/t100/       → CSV files per event
    data/scraped/kaggle/     → Downloaded datasets (manual)
"""

import argparse
import json
import os
import sys
import time
from dataclasses import asdict
from datetime import datetime

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scrapers import create_scraper
from scrapers.ironman_results import (
    RaceResultRecord,
    parse_results_markdown,
    export_csv,
    export_json,
)
from scrapers.pto_results import parse_pto_markdown
from scrapers.wiki_races import WIKI_RACES, get_races

# Base output directory
DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "scraped",
)


def _safe_filename(name: str) -> str:
    """Convert event name to safe filename."""
    name = name.lower()
    name = name.replace(" ", "_").replace("/", "_").replace(".", "_")
    name = "".join(c for c in name if c.isalnum() or c in ("_", "-"))
    return name[:80]


def scrape_wiki(api_key: str, provider: str = "jina", category: str = "all",
                delay: float = 2.0, dry_run: bool = False, limit: int = 0):
    """Scrape Wikipedia race result pages."""
    races = get_races(category)
    if limit:
        races = races[:limit]

    print(f"Wikipedia scrape: {len(races)} URLs (category={category})")

    if dry_run:
        for r in races:
            print(f"  {r['event_name']}: {r['url']}")
        return

    scraper = create_scraper(provider=provider, api_key=api_key)
    out_dir = os.path.join(DATA_DIR, "wiki")
    os.makedirs(out_dir, exist_ok=True)

    total_records = 0
    results_summary = []

    for i, race in enumerate(races):
        url = race["url"]
        name = race["event_name"]
        distance = race["event_distance"]
        year = race.get("event_year")

        print(f"\n[{i+1}/{len(races)}] {name}")
        print(f"  URL: {url}")

        if i > 0:
            time.sleep(delay)

        try:
            result = scraper.fetch_page(
                url,
                use_browser=False,  # Wikipedia is static
                timeout=30,
            )

            if not result.ok:
                print(f"  ERROR: {result.error}")
                results_summary.append({"name": name, "status": "error", "error": result.error})
                continue

            content_len = len(result.content)
            print(f"  Got {content_len} chars")

            # Skip pages that are too small (likely missing/redirect)
            if content_len < 500:
                print(f"  SKIP: page too small ({content_len} chars)")
                results_summary.append({"name": name, "status": "skip", "reason": "too_small"})
                continue

            # Parse
            records = parse_results_markdown(
                result.content,
                event_name=name,
                event_year=year,
                event_distance=distance,
                source_url=url,
            )

            print(f"  Parsed {len(records)} records")
            total_records += len(records)

            # Export as JSON
            filename = _safe_filename(name) + ".json"
            out_path = os.path.join(out_dir, filename)
            data = {
                "metadata": {
                    "event_name": name,
                    "event_distance": distance,
                    "event_year": year,
                    "source_url": url,
                    "date_scraped": datetime.now().isoformat(),
                    "record_count": len(records),
                    "content_length": content_len,
                },
                "records": [asdict(r) for r in records],
            }
            with open(out_path, "w") as f:
                json.dump(data, f, indent=2)

            results_summary.append({
                "name": name,
                "status": "ok",
                "records": len(records),
                "file": filename,
            })

        except Exception as e:
            print(f"  EXCEPTION: {type(e).__name__}: {e}")
            results_summary.append({"name": name, "status": "exception", "error": str(e)})

    # Summary
    print(f"\n{'='*60}")
    print(f"Wikipedia scrape complete: {total_records} total records from {len(races)} pages")
    ok_count = sum(1 for r in results_summary if r["status"] == "ok" and r.get("records", 0) > 0)
    print(f"  Successful: {ok_count}")
    print(f"  Errors: {sum(1 for r in results_summary if r['status'] in ('error', 'exception'))}")
    print(f"  Skipped: {sum(1 for r in results_summary if r['status'] == 'skip')}")
    print(f"  Zero records: {sum(1 for r in results_summary if r['status'] == 'ok' and r.get('records', 0) == 0)}")

    # Save summary
    summary_path = os.path.join(out_dir, "_scrape_summary.json")
    with open(summary_path, "w") as f:
        json.dump({
            "date": datetime.now().isoformat(),
            "category": category,
            "total_records": total_records,
            "pages": results_summary,
        }, f, indent=2)
    print(f"  Summary: {summary_path}")


def scrape_t100(api_key: str, provider: str = "jina", year: int = 2024,
                delay: float = 3.0, dry_run: bool = False):
    """Scrape T100 race results (SPA sites)."""
    from scrapers.pto_results import T100_2024_URLS, T100_2025_URLS

    urls = T100_2024_URLS if year == 2024 else T100_2025_URLS if year == 2025 else []
    if not urls:
        print(f"No T100 URLs configured for year {year}")
        return

    print(f"T100 scrape: {len(urls)} URLs (year={year})")

    if dry_run:
        for u in urls:
            print(f"  {u}")
        return

    scraper = create_scraper(provider=provider, api_key=api_key)
    out_dir = os.path.join(DATA_DIR, "t100")
    os.makedirs(out_dir, exist_ok=True)

    total_records = 0

    for i, url in enumerate(urls):
        # Extract event name from URL
        event_slug = url.split("event=")[-1] if "event=" in url else f"t100_{i}"

        print(f"\n[{i+1}/{len(urls)}] {event_slug}")

        if i > 0:
            time.sleep(delay)

        try:
            result = scraper.fetch_page(url, use_browser=True, timeout=30)

            if not result.ok:
                print(f"  ERROR: {result.error}")
                continue

            print(f"  Got {len(result.content)} chars")

            records = parse_pto_markdown(
                result.content,
                event_name=event_slug.replace("-", " ").title(),
                event_year=year,
                event_distance="100km",
                source_url=url,
            )

            print(f"  Parsed {len(records)} records")
            total_records += len(records)

            if records:
                out_path = os.path.join(out_dir, f"{event_slug}.csv")
                export_csv(records, out_path)

        except Exception as e:
            print(f"  EXCEPTION: {type(e).__name__}: {e}")

    print(f"\nT100 scrape complete: {total_records} total records")


def scrape_single(url: str, api_key: str, provider: str = "jina",
                  event_name: str = "", event_year: int = None,
                  event_distance: str = "", output: str = "",
                  raw: bool = False):
    """Scrape a single URL with auto-detected parser."""
    scraper = create_scraper(provider=provider, api_key=api_key)

    print(f"Scraping {url}...")
    result = scraper.fetch_page(url, use_browser=True, timeout=30)

    if not result.ok:
        print(f"Scrape failed: {result.error}")
        return

    print(f"Got {len(result.content)} chars")

    if raw:
        print("\n--- RAW CONTENT ---")
        print(result.content[:5000])
        print("--- END ---\n")

    # Auto-detect parser
    is_pto = "t100" in url.lower() or "protriathletes" in url.lower() or "pto" in url.lower()

    if is_pto:
        records = parse_pto_markdown(
            result.content,
            event_name=event_name or result.title,
            event_year=event_year,
            event_distance=event_distance or "100km",
            source_url=url,
        )
    else:
        records = parse_results_markdown(
            result.content,
            event_name=event_name or result.title,
            event_year=event_year,
            event_distance=event_distance or "140.6",
            source_url=url,
        )

    print(f"Parsed {len(records)} records")

    if output:
        if output.endswith(".csv"):
            export_csv(records, output)
        else:
            export_json(records, output)
    elif records:
        print("\nFirst 5 records:")
        for r in records[:5]:
            print(f"  {asdict(r)}")


def main():
    parser = argparse.ArgumentParser(
        description="RaceDayAI Scraper Ingest CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python research/scrapers/ingest.py wiki --api-key "jina_xxx"
  python research/scrapers/ingest.py wiki --category ironman --dry-run
  python research/scrapers/ingest.py t100 --api-key "jina_xxx" --year 2024
  python research/scrapers/ingest.py single --url "https://..." --api-key "jina_xxx" --raw
        """,
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # Wiki subcommand
    wiki_parser = subparsers.add_parser("wiki", help="Scrape Wikipedia race pages")
    wiki_parser.add_argument("--api-key", help="Scraper API key (or set JINA_API_KEY)")
    wiki_parser.add_argument("--provider", default="jina", help="Scraper provider")
    wiki_parser.add_argument("--category", default="all",
                             help="Category: all, ironman, 703, olympic, wts")
    wiki_parser.add_argument("--delay", type=float, default=2.0, help="Seconds between requests")
    wiki_parser.add_argument("--dry-run", action="store_true", help="List URLs without scraping")
    wiki_parser.add_argument("--limit", type=int, default=0, help="Max URLs to scrape (0=all)")

    # T100 subcommand
    t100_parser = subparsers.add_parser("t100", help="Scrape T100/PTO race results")
    t100_parser.add_argument("--api-key", help="Scraper API key")
    t100_parser.add_argument("--provider", default="jina", help="Scraper provider")
    t100_parser.add_argument("--year", type=int, default=2024, help="Season year: 2024 or 2025")
    t100_parser.add_argument("--delay", type=float, default=3.0, help="Seconds between requests")
    t100_parser.add_argument("--dry-run", action="store_true", help="List URLs without scraping")

    # Single URL subcommand
    single_parser = subparsers.add_parser("single", help="Scrape a single URL")
    single_parser.add_argument("--url", required=True, help="URL to scrape")
    single_parser.add_argument("--api-key", help="Scraper API key")
    single_parser.add_argument("--provider", default="jina", help="Scraper provider")
    single_parser.add_argument("--event-name", default="", help="Event name")
    single_parser.add_argument("--event-year", type=int, help="Event year")
    single_parser.add_argument("--event-distance", default="", help="Race distance")
    single_parser.add_argument("--output", help="Output file (.csv or .json)")
    single_parser.add_argument("--raw", action="store_true", help="Print raw markdown")

    args = parser.parse_args()

    # Resolve API key
    api_key = getattr(args, "api_key", None) or os.environ.get("JINA_API_KEY", "")

    if args.command == "wiki":
        if not args.dry_run and not api_key:
            print("Error: No API key. Set JINA_API_KEY or pass --api-key")
            sys.exit(1)
        scrape_wiki(
            api_key=api_key,
            provider=args.provider,
            category=args.category,
            delay=args.delay,
            dry_run=args.dry_run,
            limit=args.limit,
        )

    elif args.command == "t100":
        if not args.dry_run and not api_key:
            print("Error: No API key. Set JINA_API_KEY or pass --api-key")
            sys.exit(1)
        scrape_t100(
            api_key=api_key,
            provider=args.provider,
            year=args.year,
            delay=args.delay,
            dry_run=args.dry_run,
        )

    elif args.command == "single":
        if not api_key:
            print("Error: No API key. Set JINA_API_KEY or pass --api-key")
            sys.exit(1)
        scrape_single(
            url=args.url,
            api_key=api_key,
            provider=args.provider,
            event_name=args.event_name,
            event_year=args.event_year,
            event_distance=args.event_distance,
            output=args.output or "",
            raw=args.raw,
        )


if __name__ == "__main__":
    main()
