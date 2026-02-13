# ML Inference Pipeline (TypeScript)

Production-ready ML inference for race time prediction in the Next.js web app.

## Overview

This module provides:
- **XGBoost inference** - Pure TypeScript tree traversal (no external dependencies)
- **Multi-output predictions** - Time + intensity for each segment
- **Cold-start handling** - Tier 0-5 users with varying data richness
- **Consistency validation** - Ensures time and intensity are mathematically consistent
- **Inngest integration** - Async background prediction jobs

## Architecture

```
User Input → Tier Classification → Feature Imputation
                                         ↓
                            Load XGBoost Models (JSON)
                                         ↓
              Predict Swim [time, pace] ──────────────┐
                          ↓                            │
              Predict Bike [time, watts, NP] ←────────┤ (chained)
                          ↓                            │
              Predict Run [time, pace] ←──────────────┘
                          ↓
              Predict Quantiles [p05-p95]
                          ↓
              Validate Consistency
                          ↓
              Return RacePrediction
```

## Files

- **[types.ts](./types.ts)** - TypeScript interfaces
- **[xgboost-inference.ts](./xgboost-inference.ts)** - XGBoost tree traversal
- **[imputation.ts](./imputation.ts)** - Cold-start feature imputation
- **[validation.ts](./validation.ts)** - Consistency validation
- **[predict.ts](./predict.ts)** - Main prediction orchestrator

## Usage

### Basic Prediction

```typescript
import { predictRaceTime } from "@/lib/ml/predict";

const prediction = await predictRaceTime(
  {
    gender: "M",
    age: 35,
    ftp: 250,
    weight: 75,
    thresholdPace: 4.5, // min/km
  },
  "70.3"
);

console.log(prediction);
// {
//   totalSeconds: 19800,
//   quantiles: { p05: 17200, p25: 18500, p50: 19800, p75: 21200, p95: 23500 },
//   segments: {
//     swim: { seconds: 2100, pacePer100m: 110 },
//     bike: { seconds: 9720, avgWatts: 210, normalizedWatts: 220, intensityFactor: 0.84 },
//     run: { seconds: 6600, avgPacePerKm: 5.2, avgPacePerMile: 8.37 },
//     transitions: { t1: 180, t2: 120 }
//   },
//   confidence: "high",
//   tier: 3
// }
```

### Cold-Start (No Info)

```typescript
const prediction = await predictRaceTime({}, "70.3");
// Uses global cohort medians (Tier 0)
// confidence: "low"
```

### With Prior Race (Distance Transfer)

```typescript
const prediction = await predictRaceTime(
  {
    gender: "M",
    age: 35,
    priorRaces: [{ distance: "olympic", time: 9900 }], // 2:45:00
  },
  "70.3"
);
// Transfers Olympic time to 70.3 using ratio (×2.2)
// Tier 2, confidence: "moderate"
```

### Inngest Function

```typescript
// Trigger prediction via Inngest
await inngest.send({
  name: "prediction/race-time.requested",
  data: {
    userId: "user-123",
    planId: "plan-456",
    distance: "70.3",
  },
});

// Prediction runs in background and saves to DB
```

## Tiers (Data Richness)

| Tier | Data Available | Confidence | Approach |
|------|----------------|------------|----------|
| 0 | Nothing | Low | Global median |
| 1 | Gender + age | Low | Cohort median |
| 2 | One prior race | Moderate | Distance transfer |
| 3 | FTP/CSS/pace | High | Physics model + ML |
| 4 | Target race info | High | Course-specific |
| 5 | Multiple races | High | Full history |

## Multi-Output Models

### Swim
- **Inputs**: 13 base features
- **Outputs**: `[swim_sec, swim_pace_per_100m]`
- **Example**: `[2100s, 110 sec/100m]` for 70.3

### Bike (Chained)
- **Inputs**: 13 base features + `swim_sec_pred`
- **Outputs**: `[bike_sec, avg_watts, normalized_watts]`
- **Example**: `[9720s, 210W, 220W]` for 70.3

### Run (Chained)
- **Inputs**: 13 base features + `swim_sec_pred` + `bike_sec_pred`
- **Outputs**: `[run_sec, run_pace_per_km]`
- **Example**: `[6600s, 5.2 min/km]` for 70.3

### Quantiles
- **Inputs**: 13 base features
- **Outputs**: 5 models for p05, p25, p50, p75, p95
- **Purpose**: Confidence intervals

## Consistency Validation

After prediction, the system validates that time and intensity are mathematically consistent:

### Swim
```typescript
implied_time = (pace_per_100m × swim_distance_m) / 100
error = |implied_time - predicted_time| / predicted_time
✓ Pass if error < 5%
```

### Bike
```typescript
speed = bike_distance_km / (predicted_time / 3600)
implied_watts = physics_model(speed, weight)
error = |implied_watts - predicted_watts| / predicted_watts
✓ Pass if error < 20%  // Looser due to physics approximation
```

### Run
```typescript
implied_time = pace_per_km × 60 × run_distance_km
error = |implied_time - predicted_time| / predicted_time
✓ Pass if error < 5%
```

## Model Loading

Models are loaded from `/data/ml-models/`:

```
data/ml-models/
├── swim_sec_70.3.json
├── swim_pace_70.3.json
├── bike_sec_70.3.json
├── bike_watts_70.3.json
├── bike_np_70.3.json
├── run_sec_70.3.json
├── run_pace_70.3.json
├── quantile_p{05,25,50,75,95}_70.3.json
├── imputation_tables.json
├── feature_config.json
└── model_metadata.json
```

Models are exported from Python training scripts using:
```bash
python -m research.scripts.export_artifacts
```

## XGBoost Inference

Pure TypeScript implementation (no external libraries):

```typescript
function traverseTree(tree: XGBoostTree, features: number[]): number {
  // Leaf node
  if (tree.leaf !== undefined) {
    return tree.leaf;
  }

  // Internal node
  const featureValue = features[tree.split_feature!];
  const goLeft = featureValue < tree.split_condition!;
  const nextNode = tree.children?.find(
    (child) => child.nodeid === (goLeft ? tree.yes : tree.no)
  );

  return traverseTree(nextNode!, features);
}

export function predictXGBoost(model: XGBoostModel, features: number[]): number {
  const trees = model.learner.gradient_booster.model.trees;
  let sum = 0;
  for (const tree of trees) {
    sum += traverseTree(tree, features);
  }
  return sum;
}
```

## Error Handling

```typescript
try {
  const prediction = await predictRaceTime(input, distance);
} catch (error) {
  if (error.message.includes("Failed to load model")) {
    // Models not exported yet
    console.error("Run: python -m research.scripts.export_artifacts");
  } else if (error.message.includes("Athlete not found")) {
    // No athlete profile in DB
  } else {
    // Unknown error
    throw error;
  }
}
```

## Testing

See [predict.test.ts](../../__tests__/lib/ml/predict.test.ts) for unit tests.

```bash
# Run tests
pnpm test apps/web/src/lib/ml
```

## Performance

- **Inference time**: <100ms per prediction (13 models)
- **Model size**: ~40 models × 100KB = ~4MB total
- **Cold start**: Models loaded on-demand (cached after first load)

## Next Steps

- [ ] Add physics model integration (Tier 3)
- [ ] Implement full race history analysis (Tier 5)
- [ ] Add DNF risk classifier
- [ ] Add "athletes like you" similarity search (embeddings + FAISS)
- [ ] Scheduled model retraining (Inngest cron)

## References

- [Plan 10](../../../../../plans/10-production-prediction-implementation-plan.md) - Implementation plan
- [Python training scripts](../../../../../research/scripts/) - Model training
- [Research notebooks](../../../../../research/notebooks/) - Original research
