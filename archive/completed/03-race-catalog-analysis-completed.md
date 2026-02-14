# Race Catalog Analytics - Execution Summary

## Overview
Successfully created and executed the race catalog analytics script to extract comprehensive statistics from the Ironman 70.3 dataset (840,075 records across 195 unique race locations).

## Script Location
- **Script**: `/sessions/adoring-dazzling-einstein/mnt/racedayai/scripts/analytics/05_race_catalog.py`
- **Input CSV**: `/sessions/adoring-dazzling-einstein/mnt/racedayai/Half_Ironman_df6.csv` (70.3 MB, 840,075 records)

## Output Files Generated

### 1. race-catalog.json (472 KB)
**Location**: `/sessions/adoring-dazzling-einstein/mnt/racedayai/src/data/race-catalog.json`

Complete catalog of 195 race locations with comprehensive statistics:

```json
{
  "event_location": "IRONMAN 70.3 Aarhus",
  "metadata": {
    "raw_name": "IRONMAN 70.3 Aarhus",
    "is_championship": false,
    "location": "Aarhus",
    "event_type": "IRONMAN 70.3"
  },
  "stats": {
    "total_athletes": 1340,
    "years": [2014, 2015],
    "year_range": {
      "first": 2014,
      "last": 2015,
      "consistency_pct": 100.0,
      "type": "consistent"
    },
    "finish_time": {
      "median_sec": 19799,
      "mean_sec": 19996,
      "p10_sec": 17355,
      "p90_sec": 22807,
      "min_sec": 14343,
      "max_sec": 28618,
      "stdev_sec": 2188,
      "median_display": "5:29:59",
      "mean_display": "5:33:16",
      "p10_display": "4:49:15",
      "p90_display": "6:20:07"
    },
    "segments": {
      "swim": {
        "median_sec": 2226,
        "mean_sec": 2181,
        "pct_of_total": 11.2
      },
      "bike": {
        "median_sec": 10348,
        "mean_sec": 10515,
        "pct_of_total": 54.2
      },
      "run": {
        "median_sec": 6594,
        "mean_sec": 6715,
        "pct_of_total": 34.6
      }
    },
    "demographics": {
      "gender": {
        "M": 85.4,
        "F": 14.6,
        "counts": {"M": 1144, "F": 196}
      },
      "age_groups": {
        "25-29": {"count": 264, "pct": 19.7},
        "30-34": {"count": 257, "pct": 19.2},
        "35-39": {"count": 253, "pct": 18.9}
      }
    },
    "country_iso2": "DK"
  }
}
```

### 2. course-benchmarks.json (1.4 MB)
**Location**: `/sessions/adoring-dazzling-einstein/mnt/racedayai/src/data/course-benchmarks.json`

Performance benchmarks segmented by gender and age group for all 195 courses:

```json
{
  "event_location": "IRONMAN 70.3 Aarhus",
  "by_gender": {
    "M": {
      "count": 1144,
      "finish_time": {
        "median_sec": 19583,
        "mean_sec": 19719,
        "p10_sec": 17255,
        "p90_sec": 22348
      },
      "segments": {
        "swim": {"median_sec": 2206, "mean_sec": 2169},
        "bike": {"median_sec": 10183, "mean_sec": 10337},
        "run": {"median_sec": 6522, "mean_sec": 6630}
      }
    },
    "F": {
      "count": 196,
      "finish_time": {
        "median_sec": 21390,
        "mean_sec": 21611,
        "p10_sec": 18870,
        "p90_sec": 24601
      },
      "segments": {
        "swim": {"median_sec": 2316, "mean_sec": 2249},
        "bike": {"median_sec": 11309, "mean_sec": 11550},
        "run": {"median_sec": 7093, "mean_sec": 7207}
      }
    }
  },
  "by_age_group": {
    "18-24": {
      "count": 103,
      "finish_time": {
        "median_sec": 19648,
        "mean_sec": 20006,
        "p10_sec": 17364,
        "p90_sec": 22751
      },
      "segments": {
        "swim": {"median_sec": 2146, "mean_sec": 2141},
        "bike": {"median_sec": 10379, "mean_sec": 10620},
        "run": {"median_sec": 6560, "mean_sec": 6695}
      }
    },
    "25-29": {
      "count": 264,
      "finish_time": {
        "median_sec": 19602,
        "mean_sec": 19948,
        "p10_sec": 17303,
        "p90_sec": 22805
      }
    }
  }
}
```

## Execution Summary

### Data Processing
- **Total records processed**: 840,075
- **Unique race locations**: 195
- **Total athletes across all races**: 840,075
- **Execution time**: ~30 seconds

### Key Statistics

#### Championship Events
- **Count**: 12 races identified as championships
- **Examples**:
  - IRONMAN 70.3 Asia-Pacific Championship
  - IRONMAN 70.3 European Championship
  - IRONMAN 70.3 World Championship

#### Race Consistency
- **Recurring every year (>75%)**: 144 races
- **Sporadic (25-75%)**: 4 races
- **Single year only**: 47 races

#### Top 10 Races by Participation
1. IRONMAN 70.3 World Championship: 26,123 athletes (2006-2019)
2. IRONMAN 70.3 Augusta: 23,803 athletes (2009-2015+)
3. IRONMAN 70.3 Florida: 22,576 athletes (2004-2019)
4. IRONMAN 70.3 Texas: 17,168 athletes (2010-2019)
5. IRONMAN 70.3 California: 17,141 athletes (2007-2019)
6. IRONMAN 70.3 Eagleman: 16,618 athletes (2006-2018)
7. IRONMAN 70.3 Mallorca: 16,307 athletes (2012-2016)
8. IRONMAN 70.3 Mont-Tremblant: 15,669 athletes (2012-2019)
9. IRONMAN 70.3 Austria/St. Polten: 15,542 athletes (2007-2019)
10. IRONMAN 70.3 Miami: 15,240 athletes (2010-2019)

#### Overall Performance Distribution
- **Median finish time**: 5h 47m (20,839 seconds)
- **Mean finish time**: 5h 52m (21,129 seconds)
- **10th percentile**: 4h 50m (17,406 seconds) - fastest 10%
- **90th percentile**: 7h 01m (25,279 seconds) - slowest 10%

#### Races Longest Operational Span
1. IRONMAN 70.3 Florida: 16 years (2004-2019)
2. IRONMAN 70.3 Hawaii: 14 years (2006-2019)
3. IRONMAN 70.3 World Championship: 14 years (2006-2019)
4. IRONMAN 70.3 Austria/St. Polten: 13 years (2007-2019)
5. IRONMAN 70.3 Buffalo Springs Lake: 13 years (2006-2018)

## Features Implemented

### For Each Race Location:
- ✓ Years of operation (list of all years event appeared)
- ✓ Total athlete count
- ✓ Finish time statistics (median, mean, p10, p90, min, max, stdev)
- ✓ Time display format (HH:MM:SS) for easy reading
- ✓ Gender split (% M/F with absolute counts)
- ✓ Age group distribution (full breakdown with percentages)
- ✓ Swim/bike/run split ratios (both in seconds and % of total)
- ✓ Consistency detection (recurring vs. sporadic)
- ✓ Country detection (ISO2 code)
- ✓ Metadata parsing (location extraction, championship detection)

### Segmented Benchmarks (by Gender & Age Group):
- ✓ Participant counts for each segment
- ✓ Finish time stats (median, mean, p10, p90)
- ✓ Individual segment times (swim/bike/run)
- ✓ Complete coverage across 195 courses

## Usage

### Run Full Analysis
```bash
cd /sessions/adoring-dazzling-einstein/mnt/racedayai
python scripts/analytics/05_race_catalog.py
```

### Run Test Mode (50K records)
```bash
python scripts/analytics/05_race_catalog.py --test
```

### Custom CSV Path
```bash
python scripts/analytics/05_race_catalog.py --csv /path/to/data.csv --output /path/to/output
```

## Script Features

- **Auto-discovery**: Automatically finds CSV file in repo
- **Error handling**: Validates required columns, handles missing data
- **Scalable design**: Easily extend to new CSV sources
- **Memory efficient**: Processes 840K records without memory issues
- **JSON output**: Ready for TypeScript integration
- **Comprehensive reporting**: Terminal summary with key insights

## Integration Points

These output files are designed to be imported into:
- **TypeScript Engine**: For real-time race prediction and analysis
- **Frontend Dashboard**: For race comparison and visualization
- **API Endpoints**: For serving race metadata and benchmarks

## Data Quality Notes

- All times stored in seconds (integers) for precision
- All times display in HH:MM:SS format for readability
- Percentages rounded to 1 decimal place
- Count data stored as integers
- ISO2 country codes used for standardization
- Championship detection via keyword matching
- Location extraction via regex parsing of event names
