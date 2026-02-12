# RaceDayAI Analytics Scripts

Statistical analysis pipeline for the data-driven transformation. These scripts process raw race data and produce JSON lookup files consumed by the pacing engine.

## Prerequisites

```bash
pip install pandas scipy numpy --break-system-packages
```

## Scripts

| Script | Purpose | Input | Output |
|--------|---------|-------|--------|
| `01_eda.py` | Exploratory data analysis | CSV dataset | `EDA_Summary_Report.txt` |
| `02_fit_distributions.py` | Log-normal distribution fitting | CSV dataset | `cohort-distributions.json` |
| `03_split_ratio_analysis.py` | Split ratio regression by cohort + percentile | CSV dataset | `split-ratios.json` |
| `04_weather_join.py` | Join historical weather to race events | CSV dataset | `weather-records.json` + `location-geocodes.json` |

## Running

All scripts auto-discover the CSV file in the repo. Run from the project root:

```bash
# Full EDA report
python scripts/analytics/01_eda.py

# Fit distributions (produces the JSON used by pacing engine)
python scripts/analytics/02_fit_distributions.py

# Split ratio analysis
python scripts/analytics/03_split_ratio_analysis.py

# Weather join (dry run, no API calls)
python scripts/analytics/04_weather_join.py

# Weather join (actually fetch from Open-Meteo, limited to 10 events)
python scripts/analytics/04_weather_join.py --fetch --limit 10
```

## Output Files

All output goes to `src/data/`:

- **`cohort-distributions.json`** — Primary lookup for the pacing engine. Contains log-normal parameters (shape, loc, scale) and percentile stats (p10-p90) for each Gender x AgeGroup cohort across swim/bike/run/total.
- **`split-ratios.json`** — Split ratio recommendations by finishing percentile. Used to replace hardcoded IF values.
- **`weather-records.json`** — Historical weather matched to race events. Used for the weather impact regression.
- **`EDA_Summary_Report.txt`** — Human-readable analysis summary.

## Adding New Data

When new race data is scraped (Phase 2), re-run scripts 01-04 to regenerate all lookups. The pacing engine reads from the JSON files, so no code changes needed — just updated data.
