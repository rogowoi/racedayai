# RaceDayAI ML Training Scripts

Production ML pipeline for triathlon race time prediction with multi-output models.

## Overview

Converts research notebooks to production-ready Python scripts that train models predicting:
- **Time AND intensity together** (mathematically consistent)
- **4 distances**: Sprint, Olympic, 70.3, 140.6
- **Segment-level predictions**: Swim, Bike, Run with intensities

## Models Trained

Per distance (e.g., 70.3):
1. **Total Time** - `xgboost_total_70.3.json` (baseline/validation)
2. **Swim** - `[swim_sec, swim_pace_per_100m]`
   - `swim_sec_70.3.json`
   - `swim_pace_70.3.json`
3. **Bike** - `[bike_sec, avg_watts, normalized_watts]`
   - `bike_sec_70.3.json`
   - `bike_watts_70.3.json`
   - `bike_np_70.3.json`
4. **Run** - `[run_sec, run_pace_per_km]`
   - `run_sec_70.3.json`
   - `run_pace_70.3.json`
5. **Quantiles** - p05, p25, p50, p75, p95 (confidence intervals)
   - `quantile_p05_70.3.json`
   - `quantile_p25_70.3.json`
   - etc.

**Total**: 4 distances × 10 models = **40 model files**

## Setup

### Install Dependencies

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install pandas numpy scikit-learn xgboost optuna
```

### Verify Data

Ensure you have the cleaned data from notebooks:
```bash
# Required file from NB01 (etl.ipynb):
research/data/cleaned/athlete_race.csv
```

## Usage

### Step 1: ETL Pipeline

Compute intensity features from segment times:

```bash
python -m research.scripts.etl \
  --distances sprint,olympic,70.3,140.6 \
  --output-dir research/data/processed/ \
  --force
```

**Output**: `research/data/processed/athlete_race_with_intensities.csv`

**What it does**:
- Loads `athlete_race.csv` from NB01
- Computes intensity features:
  - `swim_pace_per_100m` (seconds per 100m)
  - `avg_watts`, `normalized_watts` (bike power, estimated from physics)
  - `run_pace_per_km` (minutes per km)
- Applies anomaly detection
- Saves processed data

### Step 2: Train Models

Train multi-output models for all distances:

```bash
# Train all distances
python -m research.scripts.train_models \
  --distances sprint,olympic,70.3,140.6 \
  --output-dir research/artifacts/models/

# Train single distance (faster for testing)
python -m research.scripts.train_models \
  --distances 70.3 \
  --output-dir research/artifacts/models/

# With hyperparameter tuning (slow)
python -m research.scripts.train_models \
  --distances 70.3 \
  --tune-hyperparams
```

**Output**: Model files in `research/artifacts/models/`

**What it does**:
- Loads processed data for each distance
- Splits 80/10/10 (train/val/test)
- Trains 5 model types:
  1. Total time (XGBoost)
  2. Swim (MultiOutputRegressor)
  3. Bike (MultiOutputRegressor with swim as input)
  4. Run (MultiOutputRegressor with swim + bike as inputs)
  5. Quantiles (5 XGBoost models)
- Validates consistency (time + intensity math checks)
- Saves models as JSON

### Step 3: Export for Production

**TODO**: Export models to TypeScript-compatible format

```bash
python -m research.scripts.export_artifacts \
  --input-dir research/artifacts/models/ \
  --output-dir apps/web/src/data/ml-models/
```

## Model Architecture

### Multi-Output Approach

Each segment model predicts **time AND intensity together**:

```python
# Swim model
inputs:  BASE_FEATURES (13 athlete features)
outputs: [swim_sec, swim_pace_per_100m]

# Bike model (chained)
inputs:  BASE_FEATURES + swim_sec_pred
outputs: [bike_sec, avg_watts, normalized_watts]

# Run model (chained)
inputs:  BASE_FEATURES + swim_sec_pred + bike_sec_pred
outputs: [run_sec, run_pace_per_km]
```

### Chaining Strategy

Models are trained sequentially:
1. Swim predicts first (no dependencies)
2. Bike uses swim prediction as feature (captures early-race dynamics)
3. Run uses swim + bike predictions as features (captures cumulative fatigue)

### Consistency Validation

After prediction, we validate that time and intensity are mathematically consistent:

**Swim**: `implied_time = (pace_per_100m × distance_m) / 100`
- Error < 5%

**Run**: `implied_time = pace_per_km × 60 × distance_km`
- Error < 5%

**Bike**: `implied_watts = speed_to_watts(distance_km / time_hours)`
- Error < 20% (physics model is approximate)

## Features

### Base Features (13)
From NB03 research:
- `pb_total_sec` - Personal best
- `gender_enc` - Gender (0/1)
- `age_band` - Age group (18-24, 25-29, etc.)
- `swim_strength_z`, `bike_strength_z`, `run_strength_z` - Discipline z-scores
- `total_races` - Experience
- `consistency_cv` - Coefficient of variation
- `improvement_slope` - Performance trend
- `dnf_rate` - Did-not-finish rate
- `cluster_id` - Athlete cluster
- `country_enc` - Country encoded
- `year` - Race year

### Computed Intensities

**Swim**:
```python
swim_pace_per_100m = (swim_sec / swim_distance_m) * 100
```

**Bike**:
```python
speed_kmh = bike_distance_km / (bike_sec / 3600)
avg_watts = speed_to_watts(speed_kmh, weight=75)  # Physics model
normalized_watts = avg_watts * 1.05  # Typical NP/AP ratio
```

**Run**:
```python
run_pace_per_km = (run_sec / 60) / run_distance_km
```

## Performance Targets

Based on NB03 research results:

| Distance | MAE (Total) | R² | Swim MAE | Bike MAE | Run MAE |
|----------|-------------|-----|----------|----------|---------|
| Sprint   | <5 min      | >0.75 | <1 min  | <2 min  | <2 min |
| Olympic  | <8 min      | >0.80 | <2 min  | <4 min  | <3 min |
| 70.3     | <12 min     | >0.85 | <3 min  | <8 min  | <7 min |
| 140.6    | <20 min     | >0.88 | <4 min  | <12 min | <12 min |

## Troubleshooting

### Missing Data File
```
FileNotFoundError: Could not find athlete_race.csv
```
**Solution**: Run NB01 (etl.ipynb) first to generate cleaned data.

### Missing Features
```
ValueError: Missing features: ['cluster_id']
```
**Solution**: Run NB02 (unsupervised.ipynb) to generate cluster assignments, or remove cluster_id from BASE_FEATURES.

### Low Data Quality
```
warning: Removed 50,000 anomalous records (20%)
```
**Solution**: Check anomaly detection thresholds in `etl.py`. High removal rate may indicate data quality issues.

### Inconsistent Predictions
```
warning: Swim consistency error: 8.5%
```
**Solution**: Multi-output model may need more training data or different hyperparameters. Check if swim_pace predictions are reasonable.

## Next Steps

1. ✅ ETL pipeline with intensity features
2. ✅ Multi-output model training
3. ⏳ Export artifacts to TypeScript format
4. ⏳ TypeScript XGBoost inference engine
5. ⏳ Inngest function for production predictions

See [Plan 10](../plans/10-production-prediction-implementation-plan.md) for full roadmap.
