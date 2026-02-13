# RaceDayAI ML Pipeline - Complete Guide

## Overview

Complete machine learning pipeline for triathlon race time prediction with segment-level breakdown and intensity recommendations.

**Key Features:**
- ✅ Multi-output models (time + intensity predicted together)
- ✅ 4 distances: Sprint, Olympic, 70.3, 140.6
- ✅ Segment predictions: Swim, Bike, Run with pacing
- ✅ Pure TypeScript inference (no Python runtime needed)
- ✅ Inngest integration for production deployment
- ✅ Cold-start handling (Tier 0-5 users)
- ✅ Consistency validation

---

## Architecture

```
┌─────────────────────────────────────────┐
│  PHASE 1: Training (Python - Local)     │
│  research/scripts/                       │
│                                          │
│  1. etl.py                               │
│     Load race data → Compute intensities │
│     Output: athlete_race_with_intensities.csv
│                                          │
│  2. train_models.py                      │
│     Train XGBoost models (4 distances)   │
│     Output: 40 model files (JSON)        │
│                                          │
│  3. export_artifacts.py                  │
│     Package for TypeScript               │
│     Output: apps/web/src/data/ml-models/ │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  PHASE 2: Inference (TypeScript - Prod) │
│  apps/web/src/lib/ml/                    │
│                                          │
│  User Input → Tier Classification        │
│            ↓                              │
│  Feature Imputation                       │
│            ↓                              │
│  Load Models (JSON)                       │
│            ↓                              │
│  Predict: Swim → Bike → Run              │
│            ↓                              │
│  Validate Consistency                     │
│            ↓                              │
│  Return RacePrediction                    │
│                                          │
│  Integration: Inngest Function           │
│  apps/web/src/inngest/functions/predict-race-time.ts
└─────────────────────────────────────────┘
```

---

## Quick Start

### 1. Train Models (Python)

```bash
# Navigate to project root
cd /Users/mykyta/projects/indie/racedayai

# 1.1 Run ETL to compute intensity features
python -m research.scripts.etl \
  --distances 70.3 \
  --force

# Output: research/data/processed/athlete_race_with_intensities.csv

# 1.2 Train models (start with 70.3 for testing)
python -m research.scripts.train_models \
  --distances 70.3 \
  --output-dir research/artifacts/models/

# Output: research/artifacts/models/*.json (10 model files)

# 1.3 Export to web app
python -m research.scripts.export_artifacts \
  --input-dir research/artifacts/models/ \
  --output-dir apps/web/src/data/ml-models/ \
  --distances 70.3

# Output: apps/web/src/data/ml-models/*.json
```

### 2. Test Inference (TypeScript)

```typescript
// In your Next.js app or API route
import { predictRaceTime } from "@/lib/ml/predict";

const prediction = await predictRaceTime(
  {
    gender: "M",
    age: 35,
    ftp: 250,
    weight: 75,
  },
  "70.3"
);

console.log(prediction);
// {
//   totalSeconds: 19800,
//   segments: {
//     swim: { seconds: 2100, pacePer100m: 110 },
//     bike: { seconds: 9720, avgWatts: 210, normalizedWatts: 220 },
//     run: { seconds: 6600, avgPacePerKm: 5.2 },
//     transitions: { t1: 180, t2: 120 }
//   },
//   quantiles: { p05: 17200, p25: 18500, p50: 19800, p75: 21200, p95: 23500 },
//   confidence: "high",
//   tier: 3
// }
```

### 3. Trigger via Inngest

```typescript
// Send Inngest event
await inngest.send({
  name: "prediction/race-time.requested",
  data: {
    userId: "user-123",
    planId: "plan-456",
    distance: "70.3",
  },
});

// Prediction runs in background
// Result saved to racePlan.mlPrediction
```

---

## Python Scripts

### [research/scripts/etl.py](research/scripts/etl.py)

Computes intensity features from segment times.

**What it does:**
- Loads cleaned data from NB01 (`athlete_race.csv`)
- Computes:
  - `swim_pace_per_100m` - Seconds per 100m
  - `avg_watts`, `normalized_watts` - Bike power (physics-based estimate)
  - `run_pace_per_km` - Minutes per km
- Applies anomaly detection
- Saves processed data

**Usage:**
```bash
python -m research.scripts.etl \
  --distances sprint,olympic,70.3,140.6 \
  --force
```

**Output:** `research/data/processed/athlete_race_with_intensities.csv`

---

### [research/scripts/train_models.py](research/scripts/train_models.py)

Trains multi-output XGBoost models.

**Models trained per distance:**
1. **Total time** - `xgboost_total_{distance}.json`
2. **Swim** - `[swim_sec, swim_pace_per_100m]`
   - `swim_sec_{distance}.json`
   - `swim_pace_{distance}.json`
3. **Bike** - `[bike_sec, avg_watts, normalized_watts]`
   - `bike_sec_{distance}.json`
   - `bike_watts_{distance}.json`
   - `bike_np_{distance}.json`
4. **Run** - `[run_sec, run_pace_per_km]`
   - `run_sec_{distance}.json`
   - `run_pace_{distance}.json`
5. **Quantiles** - p05, p25, p50, p75, p95
   - `quantile_p{05,25,50,75,95}_{distance}.json`

**Total:** 10 models × 4 distances = **40 model files**

**Usage:**
```bash
# Train single distance (fast)
python -m research.scripts.train_models --distances 70.3

# Train all distances
python -m research.scripts.train_models \
  --distances sprint,olympic,70.3,140.6

# With hyperparameter tuning (slow)
python -m research.scripts.train_models \
  --distances 70.3 \
  --tune-hyperparams
```

**Output:** `research/artifacts/models/*.json`

**Evaluation:**
- MAE (minutes), MAPE, R² for each model
- Consistency validation (time vs intensity)

---

### [research/scripts/export_artifacts.py](research/scripts/export_artifacts.py)

Exports models to TypeScript-compatible format.

**What it exports:**
1. Model files (XGBoost JSON)
2. `imputation_tables.json` - Cohort medians for cold-start
3. `feature_config.json` - Feature names, encodings, defaults
4. `model_metadata.json` - Distance configs, model info

**Usage:**
```bash
python -m research.scripts.export_artifacts \
  --input-dir research/artifacts/models/ \
  --output-dir apps/web/src/data/ml-models/ \
  --distances sprint,olympic,70.3,140.6
```

**Output:** `apps/web/src/data/ml-models/` (ready for TypeScript)

---

## TypeScript Modules

### [apps/web/src/lib/ml/types.ts](apps/web/src/lib/ml/types.ts)

TypeScript interfaces for the entire pipeline.

**Key types:**
- `Distance` - "sprint" | "olympic" | "70.3" | "140.6"
- `UserInput` - User data for prediction
- `FeatureVector` - 13 base features
- `SegmentPrediction` - Swim/bike/run with intensities
- `RacePrediction` - Complete prediction result
- `XGBoostModel` - Model JSON structure

---

### [apps/web/src/lib/ml/xgboost-inference.ts](apps/web/src/lib/ml/xgboost-inference.ts)

Pure TypeScript XGBoost inference (no external dependencies).

**Functions:**
- `loadModel(path)` - Load model from JSON
- `predictXGBoost(model, features)` - Single prediction
- `preloadModels(distance)` - Load all models for a distance

**Implementation:**
```typescript
function traverseTree(tree: XGBoostTree, features: number[]): number {
  if (tree.leaf !== undefined) return tree.leaf;

  const featureValue = features[tree.split_feature];
  const goLeft = featureValue < tree.split_condition;
  const nextNode = tree.children.find(
    (child) => child.nodeid === (goLeft ? tree.yes : tree.no)
  );

  return traverseTree(nextNode, features);
}
```

---

### [apps/web/src/lib/ml/imputation.ts](apps/web/src/lib/ml/imputation.ts)

Cold-start feature imputation for Tier 0-5 users.

**Functions:**
- `classifyTier(input)` - Determine data richness (0-5)
- `imputeFeatures(input, tier, distance)` - Fill missing features
- `featureVectorToArray(features)` - Convert to array for XGBoost

**Tiers:**
- **0**: No info → Global median
- **1**: Gender + age → Cohort median
- **2**: One prior race → Distance transfer
- **3**: Fitness metrics → Physics model
- **5**: Multiple races → Full history

---

### [apps/web/src/lib/ml/validation.ts](apps/web/src/lib/ml/validation.ts)

Validates that time and intensity are mathematically consistent.

**Functions:**
- `validateSwimConsistency()` - Pace × distance = time (5% tolerance)
- `validateBikeConsistency()` - Watts → speed → time (20% tolerance)
- `validateRunConsistency()` - Pace × distance = time (5% tolerance)
- `validateSegmentSum()` - Segments sum to total (2% tolerance)

---

### [apps/web/src/lib/ml/predict.ts](apps/web/src/lib/ml/predict.ts)

Main prediction orchestrator.

**Function:**
```typescript
async function predictRaceTime(
  input: UserInput,
  distance: Distance
): Promise<RacePrediction>
```

**Steps:**
1. Load static data (imputation tables, config, metadata)
2. Classify tier
3. Impute features
4. Load models
5. Predict swim `[swim_sec, swim_pace_per_100m]`
6. Predict bike `[bike_sec, avg_watts, normalized_watts]` (uses swim prediction)
7. Predict run `[run_sec, run_pace_per_km]` (uses swim + bike predictions)
8. Predict quantiles (p05-p95)
9. Compute transitions (T1, T2)
10. Validate consistency
11. Return full prediction

---

### [apps/web/src/inngest/functions/predict-race-time.ts](apps/web/src/inngest/functions/predict-race-time.ts)

Inngest function for production deployment.

**Event:** `prediction/race-time.requested`

**Steps:**
1. Load athlete profile from DB
2. Load prior race history (optional)
3. Run ML prediction
4. Save prediction to `racePlan.mlPrediction`

**Usage:**
```typescript
await inngest.send({
  name: "prediction/race-time.requested",
  data: { userId, planId, distance },
});
```

---

## Data Flow

### Training Flow

```
athlete_race.csv (NB01)
    ↓
etl.py: Compute intensities
    ↓
athlete_race_with_intensities.csv
    ↓
train_models.py: Train XGBoost
    ↓
research/artifacts/models/*.json
    ↓
export_artifacts.py: Package
    ↓
apps/web/src/data/ml-models/*.json
```

### Inference Flow

```
User Input (gender, age, FTP, etc.)
    ↓
classifyTier() → Tier 0-5
    ↓
imputeFeatures() → FeatureVector (13 features)
    ↓
loadModels() → 10 XGBoost models
    ↓
Predict Swim [swim_sec, swim_pace_per_100m]
    ↓
Predict Bike [bike_sec, avg_watts, NP] (+ swim_sec)
    ↓
Predict Run [run_sec, run_pace_per_km] (+ swim_sec + bike_sec)
    ↓
Predict Quantiles [p05, p25, p50, p75, p95]
    ↓
validateConsistency() → Check time vs intensity
    ↓
RacePrediction {
  totalSeconds,
  segments: { swim, bike, run, transitions },
  quantiles,
  confidence,
  tier
}
```

---

## Success Criteria

### Python Training
- [ ] Models train successfully for all 4 distances
- [ ] Metrics match research notebooks:
  - 70.3: MAE <12 min, R² >0.85
  - 140.6: MAE <20 min, R² >0.88
- [ ] Consistency validation passes (<5% error for swim/run, <20% for bike)
- [ ] Export produces valid JSON files

### TypeScript Inference
- [ ] Models load and predict successfully
- [ ] Predictions match Python output (±2% tolerance)
- [ ] Consistency validation passes
- [ ] Segments sum to total time (±2%)
- [ ] Inngest function completes in <30 seconds
- [ ] Cold-start (Tier 0-2) produces reasonable predictions

---

## Next Steps

### Immediate
1. **Test training pipeline** - Run ETL + training on 70.3
2. **Test inference** - Create simple test script
3. **Integration test** - End-to-end Inngest flow

### Phase 2 Enhancements
- [ ] Train models for all 4 distances
- [ ] Add physics model integration (Tier 3)
- [ ] Implement full race history analysis (Tier 5)
- [ ] Add DNF risk classifier
- [ ] Add ensemble meta-learner
- [ ] Add "athletes like you" (embeddings + FAISS)

### Production Deployment
- [ ] Scheduled model retraining (Inngest cron)
- [ ] Model versioning and rollback
- [ ] A/B testing framework
- [ ] Monitoring and alerting

---

## Troubleshooting

### "FileNotFoundError: athlete_race.csv"
**Solution:** Run NB01 (etl.ipynb) first to generate cleaned data.

### "Failed to load model: /data/ml-models/swim_sec_70.3.json"
**Solution:** Run training + export:
```bash
python -m research.scripts.train_models --distances 70.3
python -m research.scripts.export_artifacts --distances 70.3
```

### "Prediction consistency warnings"
**Solution:** Check model outputs. If errors >5% for swim/run or >20% for bike, retrain models with more data or different hyperparameters.

### Inngest function times out
**Solution:** Ensure models are preloaded. Consider caching models in memory or using Vercel Edge Functions.

---

## References

- [Plan 10](plans/10-production-prediction-implementation-plan.md) - Full implementation plan
- [Python Scripts README](research/scripts/README.md) - Training scripts documentation
- [TypeScript ML README](apps/web/src/lib/ml/README.md) - Inference pipeline documentation
- [Research Notebooks](research/notebooks/) - Original research (NB01-08)

---

## Contact

For questions or issues, see:
- GitHub Issues: https://github.com/anthropics/claude-code/issues
- Implementation Plan: [plans/10-production-prediction-implementation-plan.md](plans/10-production-prediction-implementation-plan.md)
