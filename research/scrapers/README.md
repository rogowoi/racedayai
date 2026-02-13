# RaceDayAI Web Scraper Infrastructure

Modular scraper system for collecting race results from various sources. Uses a strategy pattern to support multiple scraper providers (Jina AI, Firecrawl, etc.) behind a common interface.

## Architecture

```
scripts/scrapers/
├── __init__.py              # Factory: create_scraper(provider, api_key)
├── base.py                  # Abstract BaseScraper + ScraperResult
├── jina_scraper.py          # Jina AI Reader API implementation
├── firecrawl_scraper.py     # Firecrawl stub (ready for implementation)
├── ironman_results.py       # Ironman results parser + CLI
└── README.md                # This file
```

## Quick Start

```bash
# Test connection
python scripts/scrapers/ironman_results.py --test --api-key "jina_xxx"

# Scrape and parse results
python scripts/scrapers/ironman_results.py \
  --url "https://en.wikipedia.org/wiki/Ironman_World_Championship" \
  --api-key "jina_xxx" \
  --target-selector "#mw-content-text" \
  --event-name "Ironman World Championship" \
  --event-distance "140.6" \
  --output src/data/scraped-ironman-wc.json

# Save raw markdown for debugging
python scripts/scrapers/ironman_results.py \
  --url "..." --api-key "..." --save-raw debug/raw.md --raw
```

## Environment

Set `JINA_API_KEY` to avoid passing `--api-key` every time:

```bash
export JINA_API_KEY=jina_xxx
```

## Scraper Providers

### Jina AI Reader (active)

- Endpoint: `https://r.jina.ai/{target_url}` (GET)
- Auth: Bearer token via `Authorization` header
- **Requires** `User-Agent` header (e.g., `RaceDayAI/1.0`)
- Features: CSS selectors (`X-Target-Selector`, `X-Remove-Selector`), JS rendering (`X-Engine: browser`), markdown output
- Rate limit: 500 RPM
- Free tier available

### Firecrawl (stub)

Stub implementation in `firecrawl_scraper.py`. To activate, implement `fetch_page()` and `test_connection()`, then register in `__init__.py`.

## Adding a New Provider

1. Create `new_provider_scraper.py` subclassing `BaseScraper`
2. Implement `fetch_page()` and `test_connection()`
3. Register in `__init__.py`: add to `PROVIDERS` dict and `ENV_KEYS`
4. Use: `create_scraper(provider="new_provider", api_key="...")`

## Parser Formats

The `ironman_results.py` parser handles multiple table formats:

**Standard results table:**
```
| Rank | Country | Swim | Bike | Run | Finish | Div Rank |
```

**Podium table (Wikipedia):**
```
| Year | Gold | Time | Silver | Time | Bronze | Time |
```

**Multi-table pages:** Automatically detects and parses all tables on a page.

## Data Source Findings

### What Works Well

| Source | Format | Notes |
|--------|--------|-------|
| Wikipedia race articles | Static HTML tables | Best for podium/records data; use `X-Target-Selector: #mw-content-text` |
| Static results pages | HTML tables | Any page with server-rendered tables works |
| Kaggle datasets | CSV download | Best source for bulk historical data (840K+ records) |

### What Needs Special Handling

| Source | Issue | Workaround |
|--------|-------|------------|
| ironman.com/results | SPA, JS-only rendering | Results loaded dynamically; even Jina browser engine can't capture. Use Kaggle dataset or direct API instead. |
| api.competitor.com | Requires subscription key | The actual Ironman results API. Needs paid access. |
| CoachCox, Athlinks, SportStats | Heavy SPA | All use client-side rendering. Would need Puppeteer/Playwright. |
| Challenge Family | Page not found / restructured | URLs seem to have changed. |

### Recommended Data Strategy

1. **Primary:** Kaggle Half Ironman dataset (840K records, already in repo as `Half_Ironman_df6.csv`)
2. **Supplemental:** Wikipedia podium results via Jina scraper (validated, works)
3. **Future:** Ironman API (`api.competitor.com`) if subscription obtained
4. **Future:** Playwright-based scraper for SPA sites (e.g., ironman.com results)

## Output Format

All parsed results use the `RaceResultRecord` dataclass (anonymized, no athlete names):

```json
{
  "gender": "M",
  "age_group": "M30-34",
  "country": "USA",
  "swim_sec": 1800.0,
  "bike_sec": 9000.0,
  "run_sec": 5400.0,
  "t1_sec": 120.0,
  "t2_sec": 90.0,
  "total_sec": 16410.0,
  "overall_rank": 42,
  "event_name": "IRONMAN 70.3 World Championship",
  "event_year": 2023,
  "event_distance": "70.3",
  "source_url": "https://..."
}
```
