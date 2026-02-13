#!/usr/bin/env python3
"""
RaceDayAI - Wikipedia Race URL Registry
=========================================
Defines all Wikipedia URLs to scrape for triathlon race results.

Categories:
  - Ironman World Championship (overview + year-specific pages)
  - Ironman 70.3 World Championship
  - Olympic triathlon (2000-2024, men + women + relay)
  - World Triathlon Series (WTS)

Each entry includes:
  - url: Wikipedia article URL
  - event_name: Canonical name for the event
  - event_distance: "140.6", "70.3", "olympic", "sprint", "relay"
  - event_year: Year if year-specific, None for overview pages

Usage:
    from wiki_races import WIKI_RACES
    for race in WIKI_RACES:
        print(race["url"], race["event_name"])
"""

# ── Ironman 140.6 World Championship ─────────────────────────────

# Overview page (podium table: Year | Gold | Time | Silver | Time | Bronze | Time)
_IRONMAN_WC_OVERVIEW = [
    {
        "url": "https://en.wikipedia.org/wiki/Ironman_World_Championship",
        "event_name": "Ironman World Championship",
        "event_distance": "140.6",
        "event_year": None,
    },
]

# Year-specific pages with full results + splits
_IRONMAN_WC_YEARS = []
for y in range(2005, 2025):
    _IRONMAN_WC_YEARS.append({
        "url": f"https://en.wikipedia.org/wiki/{y}_Ironman_World_Championship",
        "event_name": f"Ironman World Championship {y}",
        "event_distance": "140.6",
        "event_year": y,
    })


# ── Ironman 70.3 World Championship ──────────────────────────────

_IRONMAN_703_OVERVIEW = [
    {
        "url": "https://en.wikipedia.org/wiki/Ironman_70.3_World_Championship",
        "event_name": "Ironman 70.3 World Championship",
        "event_distance": "70.3",
        "event_year": None,
    },
]

_IRONMAN_703_YEARS = []
for y in range(2006, 2026):
    _IRONMAN_703_YEARS.append({
        "url": f"https://en.wikipedia.org/wiki/{y}_Ironman_70.3_World_Championship",
        "event_name": f"Ironman 70.3 World Championship {y}",
        "event_distance": "70.3",
        "event_year": y,
    })


# ── Olympic Triathlon ─────────────────────────────────────────────
# URL format: Triathlon_at_the_{year}_Summer_Olympics_%E2%80%93_Men%27s
# NOTE: Do NOT use _individual suffix — those pages don't exist

_OLYMPIC_YEARS = [2000, 2004, 2008, 2012, 2016, 2020, 2024]

_OLYMPIC_RACES = []
for y in _OLYMPIC_YEARS:
    _OLYMPIC_RACES.append({
        "url": f"https://en.wikipedia.org/wiki/Triathlon_at_the_{y}_Summer_Olympics_%E2%80%93_Men%27s",
        "event_name": f"Olympic Triathlon {y} Men",
        "event_distance": "olympic",
        "event_year": y,
    })
    _OLYMPIC_RACES.append({
        "url": f"https://en.wikipedia.org/wiki/Triathlon_at_the_{y}_Summer_Olympics_%E2%80%93_Women%27s",
        "event_name": f"Olympic Triathlon {y} Women",
        "event_distance": "olympic",
        "event_year": y,
    })

# Mixed relay (added 2020 Tokyo onward)
for y in [2020, 2024]:
    _OLYMPIC_RACES.append({
        "url": f"https://en.wikipedia.org/wiki/Triathlon_at_the_{y}_Summer_Olympics_%E2%80%93_Mixed_relay",
        "event_name": f"Olympic Triathlon {y} Mixed Relay",
        "event_distance": "relay",
        "event_year": y,
    })

# Overview page
_OLYMPIC_OVERVIEW = [
    {
        "url": "https://en.wikipedia.org/wiki/Triathlon_at_the_Summer_Olympics",
        "event_name": "Olympic Triathlon Overview",
        "event_distance": "olympic",
        "event_year": None,
    },
]


# ── World Triathlon Series (WTS) ─────────────────────────────────

_WTS_RACES = [
    {
        "url": "https://en.wikipedia.org/wiki/World_Triathlon_Championship_Series",
        "event_name": "World Triathlon Championship Series",
        "event_distance": "olympic",
        "event_year": None,
    },
]


# ── T100 / PTO Tour ──────────────────────────────────────────────
# T100 is scraped via Firecrawl (SPA), these are Wikipedia reference pages

_T100_WIKI = [
    {
        "url": "https://en.wikipedia.org/wiki/Professional_Triathletes_Organisation",
        "event_name": "PTO Overview",
        "event_distance": "100km",
        "event_year": None,
    },
]


# ── Combined registry ────────────────────────────────────────────

WIKI_RACES: list[dict] = (
    _IRONMAN_WC_OVERVIEW
    + _IRONMAN_WC_YEARS
    + _IRONMAN_703_OVERVIEW
    + _IRONMAN_703_YEARS
    + _OLYMPIC_OVERVIEW
    + _OLYMPIC_RACES
    + _WTS_RACES
    + _T100_WIKI
)


def get_races(category: str = "all") -> list[dict]:
    """Get race URLs by category.

    Args:
        category: "all", "ironman", "703", "olympic", "wts", "t100"

    Returns:
        List of race URL dicts matching the category.
    """
    categories = {
        "all": WIKI_RACES,
        "ironman": _IRONMAN_WC_OVERVIEW + _IRONMAN_WC_YEARS,
        "703": _IRONMAN_703_OVERVIEW + _IRONMAN_703_YEARS,
        "olympic": _OLYMPIC_OVERVIEW + _OLYMPIC_RACES,
        "wts": _WTS_RACES,
        "t100": _T100_WIKI,
    }
    return categories.get(category, WIKI_RACES)


if __name__ == "__main__":
    import sys

    cat = sys.argv[1] if len(sys.argv) > 1 else "all"
    races = get_races(cat)
    print(f"Category: {cat} — {len(races)} URLs")
    for r in races:
        print(f"  {r['event_name']}: {r['url']}")
