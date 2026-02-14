# RaceDayAI Architecture Evolution Plan

**From Static JSON Lookups → Real-Time DB-Backed Predictions with Background Processing**

Status: Planning
Date: 2026-02-12

---

## Motivation

RaceDayAI currently predicts race performance using a pipeline of static JSON files generated offline by Python analytics scripts. The engine reads `cohort-distributions.json` (49KB, 840,075 IRONMAN 70.3 records), `fade-model.json` (R²=0.939 gradient boosting model), `course-difficulty.json` (195 venues), and several other lookup tables via `import("@/data/...")` calls. This approach got us to launch fast, but it has fundamental limitations that cap how accurate and personalized predictions can be.

This document lays out why we need to evolve, what specific changes we're making, and the evidence behind each decision.

---

## 1. Why Move from JSON Files to DB-Backed Computation

### The Problem

Every prediction today follows the same path: `statistics.ts` imports `cohort-distributions.json` at module load time, looks up the caller's gender × age group cohort, and returns log-normal distribution parameters (shape, loc, scale) that were fitted once, offline, by `scripts/analytics/02_fit_distributions.py`. The data is frozen at generation time.

This means:

**No learning from new data.** When a user reports their actual race result (via the `PlanOutcome` table that already exists in our Prisma schema), that result sits in the database doing nothing. It never feeds back into cohort distributions, never improves future predictions. We have the `PlanOutcome` model with `actualSwimSec`, `actualBikeSec`, `actualRunSec`, `actualTotalSec` fields — but nothing reads from it.

**No personalization beyond cohort.** A 35-year-old male who has completed 8 half-Ironmans gets the same prediction as a first-timer in the same age bracket. Our `AthleteTrainingFeature` table already captures `weeklyTssAvg`, `longRideHrs`, `longRunKm`, `ftpTrend`, `volumeTrend` — but `buildFullContext()` in `statistics.ts` never queries it. It reads static JSON instead.

**Stale models.** The cohort distributions were fitted from a dataset spanning 2004–2020. Our `performance-trends.json` shows athletes are getting -6.04 seconds faster per year across all segments (swim: -1.07, bike: -5.17, run: -8.98 sec/year). The `trends-model.ts` applies a linear correction, but this is a band-aid over stale base data. With DB-backed cohort refitting, distributions would stay current.

**No weather reality.** The weather model uses hardcoded bins from `weather-impact.json` (sports science defaults: <15°C → -1.5%, 30°C+ → +5%). These are reasonable starting points but not validated against our own 840K-record dataset. The `WeatherRecord` Prisma model exists with `tempC`, `humidityPct`, `windKph` fields, and `04_weather_join.py` can geocode and fetch historical weather — but none of this feeds back into a learned impact model.

### What We Gain

By moving to DB-backed computation:

- Predictions improve every time a user reports a result (feedback loop via `PlanOutcome`)
- Cohort distributions stay fresh through weekly re-fitting from `RaceResult` + `PlanOutcome` tables
- Athletes with training history get blended predictions (cohort prior + personal model)
- Weather impact factors become learned from real race data, not hardcoded
- Course difficulty factors update as new results come in for each venue

### Evidence from Current Codebase

The schema is already halfway there. Our Prisma schema at `prisma/schema.prisma` includes:

- `RaceResult` — 840K historical records with `swimTimeSec`, `bikeTimeSec`, `runTimeSec`, `totalTimeSec`, indexed by `[eventYear, eventLocation]` and `[gender, ageGroup]`
- `CohortDistribution` — pre-computed fits with `mu`, `sigma`, `n`, percentiles, indexed by `[gender, ageGroup]`
- `WeatherRecord` — historical conditions by venue/year with `tempC`, `humidityPct`, `windKph`
- `PlanOutcome` — actual vs predicted with `actualSwimSec`, `actualBikeSec`, `actualRunSec`, `actualTotalSec`
- `AthleteTrainingFeature` — training load features with `weeklyTssAvg`, `longRideHrs`, `longRunKm`, `ftpTrend`, `volumeTrend`

The tables exist. They just aren't being read by the prediction engine. The engine reads JSON files instead.

---

## 2. Why Inngest for Background Jobs

### The Problem

Several operations should run on schedules or in response to events, but we have no job infrastructure. There's no Inngest, BullMQ, Redis, or cron system in the codebase. Every computation happens synchronously during plan generation in `generate-plan.ts`.

We need background processing for:

- **Strava/Garmin sync** — currently a manual button click (`src/components/strava-sync-button.tsx` triggers `POST /api/strava/sync`). Fetches only 20 activities. No periodic polling, no webhook handling. The sync extracts basic metrics (FTP estimate from weighted average watts / 0.85, threshold pace from 3 fastest runs, CSS from 3 fastest swims) but doesn't compute longitudinal features like TSS trends, taper detection, or form curves.

- **Cohort refitting** — `02_fit_distributions.py` runs manually, generates a JSON file, requires redeployment. Should be a weekly cron that reads `RaceResult` + `PlanOutcome` tables and updates `CohortDistribution`.

- **Model retraining** — once athletes have 3+ race results, we can train per-athlete prediction models. This requires compute time (30-60 seconds per model) that shouldn't block a web request.

- **Weather prefetching** — `04_weather_join.py` can fetch historical weather from Open-Meteo API (free, no key needed). For upcoming races, we should prefetch forecasts daily.

### Why Inngest Specifically

We're on Next.js 16 + Vercel. The background job system needs to be:

1. **Serverless-compatible** — Vercel functions have cold starts, 10s-300s timeout limits. Traditional workers (BullMQ + Redis) require a persistent process.
2. **Durable** — if a Strava sync fails mid-flight (API rate limit), it should retry automatically.
3. **Cron-capable** — weekly cohort refit, daily weather prefetch, 6-hourly activity sync.
4. **TypeScript-native** — same language as the rest of the codebase.

Inngest is purpose-built for this: serverless functions with built-in retries, cron scheduling, and event-driven triggers. It runs on Vercel's infrastructure with no Redis or worker processes needed. The alternative is BullMQ + a separate worker dyno on Railway/Render, which adds infrastructure complexity and cost.

### What Runs in Background

| Job | Trigger | Frequency | Why |
|-----|---------|-----------|-----|
| `strava.sync` | Cron + webhook | Every 6h per athlete | Current sync is manual-only, fetches just 20 activities. Need continuous feature extraction. |
| `garmin.sync` | Cron + webhook | Every 6h per athlete | `garminToken` field exists in Athlete model but Garmin API isn't implemented yet. |
| `cohort.refit` | Cron | Weekly (Sunday 2am) | Keep cohort distributions fresh as new results come in. Currently requires Python script + redeploy. |
| `model.retrain` | Event (3+ new results) | On-demand | Train per-athlete XGBoost model. 30-60s compute, can't run in web request. |
| `weather.prefetch` | Cron | Daily | Pre-fetch forecasts for races in next 14 days via Open-Meteo (free API). |
| `plan.outcome` | User action | On result submission | Compare predicted vs actual, update `ModelPerformance`, trigger cohort refit if warranted. |

---

## 3. Why Real-Time Prediction with Caching

### The Problem

Current engine latency breakdown in `buildFullContext()` (from `statistics.ts`):

| Step | What Happens | Approx Time |
|------|-------------|-------------|
| Import `cohort-distributions.json` (49KB) | Node.js dynamic import, parse JSON | ~50ms first call |
| Import `split-ratios.json` (43KB) | Same | ~30ms first call |
| Import `course-benchmarks.json` (946KB) | Largest file, fuzzy match against 195 courses | ~80ms first call |
| Import `fade-model.json` (8.9KB) | Lookup table by cohort × intensity bucket | ~10ms |
| Log-normal CDF/quantile computation | Abramowitz & Stegun approximation, pure math | ~5ms |
| Dynamic imports of `course-model.ts`, `trends-model.ts`, `weather-model.ts` | Each loads its own JSON | ~30ms each |
| **Total (cold)** | | **~250-350ms** |
| **Total (warm, module cached)** | Module-level singletons after first call | **~50-100ms** |

After first invocation, JSON data stays in module-level variables (`let fadeModel: FadeModel | null = null;` pattern used across all modules). This is fine for a single serverless instance, but Vercel spins up new instances frequently, causing repeated cold starts.

### The DB-Backed Approach

Replace JSON imports with database queries behind a multi-layer cache:

**Layer 1 — In-memory LRU cache (5 min TTL).** For the hot path. A 35-39M requesting half-Ironman cohort stats is the same query every time — cache it. The `lru-cache` npm package gives us a bounded in-memory cache (50-100 entries, ~100KB memory) that survives within a single serverless instance lifetime.

**Layer 2 — Vercel KV / Redis (15 min TTL).** Shared across all serverless instances. When instance A computes a cohort distribution, instance B can read it without hitting the database. Vercel KV is built into the platform, no additional infra needed.

**Layer 3 — PostgreSQL (source of truth).** The `CohortDistribution` table, updated weekly by the `cohort.refit` job. Query is simple: `WHERE gender = ? AND ageGroup = ? AND distance = ? AND discipline = ?` using the composite unique index.

**Expected latency after migration:**

| Step | Current (JSON) | Target (DB, cached) | Target (DB, cold) |
|------|---------------|--------------------|--------------------|
| Cohort lookup | ~50ms (file I/O) | ~1ms (LRU hit) | ~15-20ms (DB query) |
| Course matching | ~80ms (946KB JSON) | ~5ms (LRU hit) | ~25ms (DB query + fuzzy) |
| Fade prediction | ~10ms | ~1ms (LRU) | ~10ms (DB) |
| Weather impact | ~5ms | ~5ms | ~15ms (real-time API) |
| Personal model inference | N/A | ~20ms (ONNX) | ~50ms (load + infer) |
| **Total** | **~100-350ms** | **~30-50ms** | **~120-180ms** |

The cached path is actually faster than the current JSON approach because LRU hits avoid JSON parsing overhead entirely.

### Why Not Keep JSON but Add Caching?

The JSON files can't incorporate new data without regeneration. Even with caching, the data remains stale. The DB-backed approach lets us update distributions in-place (via `cohort.refit`) and have the cache automatically pick up fresh data after TTL expiry. The JSON approach requires: run Python script → generate new file → commit → redeploy. The DB approach requires: Inngest cron runs → updates table → cache expires → next request gets fresh data.

---

## 4. Why Bayesian Blending (Cohort + Personal)

### The Problem

Every athlete currently gets the same prediction for their cohort. A 35-39M with FTP of 280W and 5 completed half-Ironmans is treated identically to a 35-39M with FTP of 180W and zero race history. The only differentiator is the pacing engine in `pacing.ts`, which uses FTP for bike power targets — but the statistical prediction (percentile placement, confidence intervals, split ratios) is purely cohort-based.

### The Solution: Weighted Blending

For athletes with training data and race history, blend cohort predictions with personalized predictions:

```
final_prediction = w_cohort × cohort_prediction + w_personal × personal_prediction
```

**Cold start (new user, no history):** 100% cohort, 0% personal. This is exactly what we do today, so no regression.

**Warm start (5-15 synced activities, 0-2 race results):** 70% cohort, 30% personal. The personal model has some training data to work with (FTP trajectory, volume trends, basic fitness profile), but not enough race data to be confident.

**Hot start (15+ activities, 3+ race results):** 40% cohort, 60% personal. The personal model has seen how this specific athlete performs relative to cohort predictions. It can correct for systematic over/under-performance.

### Why These Weights?

This is a Bayesian prior/posterior approach. The cohort distribution (840K records) is a strong prior — it captures real-world distributions well. The personal model is a likelihood update that shifts the prediction based on individual evidence. With few observations, the prior dominates. With many observations, the likelihood takes over.

The specific numbers (70/30, 40/60) are initial values that we'll calibrate using the `ModelPerformance` table. After collecting 100+ `PlanOutcome` records, we can optimize the blending weights to minimize RMSE across the user base.

### What the Personal Model Uses

The `AthleteTrainingFeature` table already stores the right features. We extend Strava sync to compute:

| Feature | Source | Why It Predicts |
|---------|--------|----------------|
| `weeklyTssAvg` | Strava power/HR data | Training load → fitness level → race pace capacity |
| `ftpTrend` | Strava FTP over time | Rising FTP = improving cyclist = faster bike split |
| `volumeTrend` | Strava hours/week | Increasing volume = building endurance |
| `longRideHrs` | Strava rides >3h | Specific endurance for 70.3 bike leg |
| `longRunKm` | Strava runs >15km | Specific endurance for 70.3 run leg |
| Taper detection | Volume drop, last 2-3 weeks | Proper taper → 2-3% better performance (Mujika & Padilla, 2003) |
| Form score | Fitness - fatigue (Banister impulse-response) | Peak form = optimal race readiness |

The current Strava integration (`src/lib/strava.ts`) extracts only basic metrics: FTP estimate (weighted_average_watts / 0.85), threshold pace (3 fastest runs), CSS (3 fastest swims). It fetches just 20 activities. The enhanced sync would fetch all activities in the training window (12-16 weeks pre-race), compute rolling aggregates, and store in `AthleteTrainingFeature`.

---

## 5. Why XGBoost + ONNX for Personalization

### The Model Choice

For per-athlete prediction, we need a model that:

1. Works with small datasets (3-20 race results per athlete)
2. Handles mixed feature types (continuous: FTP, TSS; categorical: gender, age group)
3. Trains fast (< 60 seconds per athlete, runs in Inngest background job)
4. Serves fast (< 50ms inference, runs inline during plan generation)
5. Is interpretable (feature importances tell us what matters for this athlete)

XGBoost meets all five criteria. It's the standard for tabular prediction tasks with small-to-medium datasets. Our existing fade model already uses gradient boosting (R²=0.939) — this is the same family of algorithms applied per-athlete.

Alternatives considered:

- **Linear regression:** Too simple. Can't capture non-linear relationships (e.g., taper timing has diminishing returns, weather impact is non-linear). Our own fade model's linear regression had R²=0.834 vs gradient boosting's R²=0.939.
- **Neural network:** Needs too much data per athlete. With 3-20 observations, a neural net overfits immediately.
- **Random forest:** Close alternative. XGBoost generally outperforms on structured data and trains faster.

### Why ONNX

After XGBoost trains (in Python subprocess or lightweight JS implementation within the Inngest job), we export the model to ONNX format and store it as a `Bytes` blob in the `PersonalizationModel` table (the model we'll add to Prisma). During inference, `onnxruntime-node` loads the blob and runs prediction in ~20ms. This avoids needing Python at inference time — the entire serving path stays in Node.js/TypeScript.

The `PersonalizationModel` would track `modelVersion`, `rmse` (error metric), `lastTrainedAt`, `sampleCount`, and `features` (JSON metadata about which features were important for this athlete).

### Cold Start Handling

Not every athlete has enough data for a personal model. The system degrades gracefully:

| Athlete State | Behavior | Data Source |
|--------------|----------|-------------|
| No Strava, no history | 100% cohort prediction | `CohortDistribution` table |
| Strava connected, <5 activities | 100% cohort, but fitness metrics improve pacing targets | FTP/CSS from Strava |
| 5-15 activities, 0-2 races | 70% cohort + 30% feature-based estimate | Cohort + training features |
| 15+ activities, 3+ races | 40% cohort + 60% personal XGBoost | Cohort + trained model |

---

## 6. Why a Feedback Loop with Model Monitoring

### The Problem

We generate predictions but never learn if they were right. The `PlanOutcome` table captures `actualSwimSec`, `actualBikeSec`, `actualRunSec`, `actualTotalSec` — but no system reads this data to evaluate or improve the models.

Without a feedback loop:

- We can't measure prediction accuracy (RMSE, mean error)
- We can't detect model drift (predictions becoming systematically wrong)
- We can't compare model versions (is v2 better than v1?)
- We can't identify systematic biases (e.g., consistently over-predicting bike times for hilly courses)

### What We Build

**Race outcome reporting:** Two paths for data collection:

1. **Manual:** UI prompt on the plan page after race date has passed: "How did your race go?" User enters actual times. Stored in `PlanOutcome` with `source: "manual"`.

2. **Automatic (Strava):** The `strava.sync` job detects race-like activities near the planned race date/location. If a match is found (triathlon activity within ±2 days of `raceDate`, distance within 10%), auto-populate `PlanOutcome` with `source: "strava"`. Requires user confirmation before recording.

**Model performance tracking:** After each outcome is recorded:

1. Compute `errorSec = predictedFinishSec - actualTotalSec`
2. Compute `errorPct = errorSec / actualTotalSec * 100`
3. Store in a new `ModelPerformance` table with `modelVersion` tag
4. Update running RMSE aggregates

**Drift detection:** Weekly (in the `cohort.refit` job), check:

- Mean error trending away from zero → systematic bias
- RMSE increasing over time → model degradation
- Error by cohort → identify under-served demographics

**A/B testing:** Feature flag `PREDICTION_MODEL_VERSION` assigns athletes to model variants. Compare RMSE between variants over 4+ weeks before rolling out.

### What This Enables

With 100+ outcomes collected, we can:

- Quantify accuracy: "Our bike time predictions are within ±4.2% for 80% of athletes"
- Improve the weather model: correlate `WeatherRecord` conditions with prediction errors
- Calibrate blending weights: find the optimal cohort/personal ratio per athlete state
- Identify course-specific biases: maybe we under-predict for hilly courses
- Build trust: show athletes "our predictions were 94% accurate for your cohort last season"

---

## 7. Why Enhanced Strava/Garmin Integration

### Current State

The Strava integration (`src/lib/strava.ts`) is minimal:

- Fetches 20 recent activities (not all training history)
- Extracts 4 metrics: FTP (weighted_average_watts / 0.85), threshold pace (avg of 3 fastest runs in sec/km), CSS (avg of 3 fastest swims in sec/100m), max HR
- Manual sync only (user clicks button)
- No Garmin integration (fields exist: `garminConnected`, `garminToken` on Athlete model)
- No webhook subscription for real-time updates
- No longitudinal analysis (trends, taper, form curves)

### What We Gain with Enhanced Sync

**Deep feature extraction** from the full training window (12-16 weeks pre-race):

| Feature | How Computed | Prediction Value |
|---------|-------------|-----------------|
| Weekly TSS (Training Stress Score) | Sum of `(duration_hr × IF²) × 100` per activity | Quantifies training load; correlates with race capacity |
| TSS trend (12-week) | Linear regression on weekly TSS | Rising = building fitness; falling = potential detraining |
| FTP trajectory | Monthly FTP estimates from power data | Captures fitness improvement rate |
| Volume (hours/week) | Sum of `elapsed_time` per week | Endurance base correlates with half-Ironman performance |
| Long session frequency | Count of rides >3h + runs >90min in last 8 weeks | Race-specific preparation quality |
| Taper detection | Compare last 2 weeks volume to 4-week average; flag if >20% drop | Proper taper yields 2-3% improvement |
| HR drift (aerobic decoupling) | Compare 1st half to 2nd half HR:power ratio in long sessions | Lower drift = better aerobic fitness |
| Brick sessions | Activities with Ride→Run transition within 30 minutes | Triathlon-specific readiness |

**Garmin adds:**

- Training Status (Productive, Peaking, Recovery, Detraining)
- VO2max estimates (running and cycling)
- Body Battery / HRV data → fatigue/readiness quantification
- Sleep quality → recovery assessment

**Strava webhooks:**

Instead of polling every 6 hours, register a webhook subscription. Strava pushes activity creation events in real-time. The Inngest handler processes incoming events asynchronously.

### Evidence This Matters

Research on triathlon performance predictors (Knechtle et al., 2011; Landers et al., 2008) shows that training volume, peak training week TSS, longest training session, and taper timing are among the strongest predictors of half-Ironman finish time — stronger than age or gender alone. Our current model uses only age and gender as predictive features for the statistical engine. Adding training features should meaningfully reduce prediction error.

The fade model already demonstrates this: by adding `bike_intensity` as a feature (which comes from race execution, not demographics), R² jumped from 0.834 (linear, demographics only) to 0.939 (gradient boosting, with intensity). Training features capture similar race-relevant signal.

---

## 8. Migration Strategy: Feature Flags + Shadow Mode

### Why Not Just Switch Over

A big-bang migration from JSON to DB is risky because:

1. The JSON engine has been tested and is producing reasonable predictions
2. The DB engine introduces new query patterns, caching layers, and data dependencies
3. If the DB engine has a bug, predictions could be silently wrong with no comparison baseline
4. We can't measure improvement if we can't compare old vs new

### The Approach: Parallel Execution with Logging

**Week 1:** Deploy schema additions and seed script. `USE_DB_PREDICTIONS=false`. JSON engine still runs everything. Background: Inngest starts syncing Strava data.

**Week 2:** `USE_DB_PREDICTIONS=shadow`. Both engines run on every plan generation. The JSON result is served to the user. The DB result is logged. We compare:

```typescript
const jsonContext = await buildFullContextFromJSON(params);  // current code path
const dbContext = await buildFullContextFromDB(params);       // new code path

const divergence = Math.abs(jsonContext.predictedTotalSec - dbContext.predictedTotalSec);
if (divergence > 120) {  // >2 minute difference
  logger.warn("Prediction divergence", {
    json: jsonContext.predictedTotalSec,
    db: dbContext.predictedTotalSec,
    params,
  });
}

// Serve the JSON result (safe), but track DB result for comparison
return jsonContext;
```

After 50+ plans in shadow mode with low divergence, switch to DB primary.

**Week 3:** `USE_DB_PREDICTIONS=true`. DB engine is primary. JSON engine runs in background for safety comparison (can be turned off after confidence).

**Week 4:** `USE_PERSONAL_MODELS=true`. For athletes with sufficient data, start blending personal predictions. Monitor `ModelPerformance` closely.

### Rollback

Any feature flag flips instantly to restore previous behavior. No code deploy required. This is the safety net.

---

## 9. Schema Additions Needed

The existing Prisma schema already has most tables (`RaceResult`, `CohortDistribution`, `WeatherRecord`, `PlanOutcome`, `AthleteTrainingFeature`). We need to add:

**`PersonalizationModel`** — stores per-athlete trained models:

```prisma
model PersonalizationModel {
  id            String   @id @default(cuid())
  athleteId     String   @unique
  athlete       Athlete  @relation(fields: [athleteId], references: [id])
  modelVersion  Int      @default(1)
  modelBlob     Bytes?   // Serialized ONNX model
  features      Json     // Feature importance, training metadata
  rmse          Float?
  lastTrainedAt DateTime?
  sampleCount   Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**`ModelPerformance`** — tracks predicted vs actual for model evaluation:

```prisma
model ModelPerformance {
  id           String   @id @default(cuid())
  planId       String
  plan         RacePlan @relation(fields: [planId], references: [id])
  predictedSec Int
  actualSec    Int?
  errorSec     Int?
  errorPct     Float?
  modelVersion String
  createdAt    DateTime @default(now())
}
```

**Extensions to `AthleteTrainingFeature`:**

The existing table has `weeklyTssAvg`, `longRideHrs`, `longRunKm`, `ftpTrend`, `volumeTrend`. We should add:

- `fitnessScore Float?` — composite fitness (CTL analog)
- `fatigueScore Float?` — composite fatigue (ATL analog)
- `formScore Float?` — fitness - fatigue (TSB analog)
- `taperDetected Boolean @default(false)`
- `taperDaysBefore Int?` — days before target race that taper was detected
- `longestBikeMin Int?` — longest bike session in window
- `longestRunMin Int?` — longest run session in window

---

## 10. Implementation Order with Dependencies

| Step | Task | Depends On | Effort |
|------|------|-----------|--------|
| 1 | Schema additions + migration (PersonalizationModel, ModelPerformance, extended AthleteTrainingFeature) | — | 2-3h |
| 2 | Feature flags config (`USE_DB_PREDICTIONS`, `USE_PERSONAL_MODELS`, `USE_INNGEST_JOBS`) | — | 1h |
| 3 | Inngest setup (client, API route, dev server config) | — | 2-3h |
| 4 | Seed script: ensure `CohortDistribution` table matches JSON | Step 1 | 2-3h |
| 5 | DB-backed `buildFullContext()` with LRU caching | Steps 1, 4 | 4-5h |
| 6 | Shadow mode comparison logging | Steps 2, 5 | 2-3h |
| 7 | Strava enhanced sync (Inngest job, full feature extraction) | Steps 1, 3 | 4-5h |
| 8 | Race outcome reporting UI + auto-detect from Strava | Step 1 | 3-4h |
| 9 | XGBoost training pipeline + ONNX export (Inngest job) | Steps 7, 8 | 6-8h |
| 10 | Bayesian blending (cohort + personal) | Steps 5, 9 | 3-4h |
| 11 | Cohort refit job (weekly cron) | Steps 3, 8 | 2-3h |
| 12 | Model monitoring + drift detection dashboard | Steps 8, 9 | 2-3h |
| 13 | Garmin API integration | Step 3 | 3-4h |
| 14 | A/B testing framework | Step 12 | 2-3h |

**Total: ~40-50 hours across 4 weeks**

---

## 11. Key Architectural Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Background jobs | Inngest | Serverless-native for Vercel, no Redis needed, durable execution, TypeScript SDK, built-in cron |
| ML model | XGBoost | Works with small datasets (3-20 samples), handles mixed features, fast train/infer, interpretable |
| Model serving | ONNX Runtime (Node.js) | In-process inference (~20ms), no Python dependency at serve time, standard model exchange format |
| Caching | LRU (in-memory) + Vercel KV (shared) | Multi-layer for serverless (instances are ephemeral), cohort data changes slowly (weekly), safe to cache aggressively |
| Blending | Bayesian (weighted cohort + personal) | Graceful degradation — new users get same quality as today, data-rich users get personalized predictions |
| Migration | Feature flags + shadow mode | Zero-risk rollout, measurable improvement, instant rollback |
| Cohort updates | Weekly DB refit | Balance freshness with compute cost. Cohort stats don't change dramatically week-to-week, but incorporating new results keeps the model current |
| Strava sync | Webhooks + 6h polling fallback | Real-time when Strava sends events, polling as safety net for missed webhooks |
| Weather model | Learned from race data, not just hardcoded | 840K records with weather conditions let us build empirical impact factors specific to triathlon, not generic sports science defaults |

---

## 12. What We're Not Doing (and Why)

**Not building a custom ML training service.** XGBoost trains in seconds per athlete, small enough to run inside an Inngest function. We don't need a separate ML pipeline (MLflow, SageMaker, etc.) at this scale.

**Not using TensorFlow.js.** Too heavy for serverless (200MB+ cold start), overkill for tabular predictions. ONNX Runtime is 10x lighter.

**Not using materialized views (yet).** PostgreSQL materialized views could pre-aggregate cohort stats for even faster queries. But the LRU + Vercel KV cache layer should be sufficient initially. If query latency becomes a problem, materialized views are an easy add.

**Not pre-computing all possible cohort × course × weather combinations.** The combinatorial space is too large (90 cohorts × 195 courses × weather permutations). Instead, we compute on-demand and cache. The cache naturally fills with the most common queries.

**Not replacing the AI narrative engine.** The narrative generation via Grok-3 in `narrative.ts` stays as-is. It already receives the statistical context as input — as that context gets richer (personal insights, more confident predictions), the narrative automatically improves.

**Not moving off Vercel.** The architecture fits Vercel's model well: serverless functions, edge caching, KV store, Inngest integration. No need for containers or dedicated servers.
