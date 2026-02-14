# Plan B: Hybrid Prediction Engine (Statistical + Physics)

## Context

The existing engine uses heuristic models: `Speed = 5.8 * Power^(1/3)` for bike, simple multipliers for swim/run, basic carb/fluid thresholds for nutrition. The research document calls for physics-based models, evidence-based nutrition, prediction uncertainty, and strategy optimization. The existing statistical engine (840K records, cohort distributions, percentiles) is solid and should be preserved — we combine it with physics models for better accuracy.

**Prerequisite:** Plan A (monorepo) is complete. All paths below are relative to `apps/web/`.

---

## Hybrid Architecture

### Two-track prediction with blending

**Track 1 — Physics (bottom-up):** Athlete inputs (FTP, CSS, weight) + course (GPX gradient) + environment (temp, wind) → deterministic time. Personalized but depends on input accuracy.

**Track 2 — Statistical (top-down):** Existing cohort distributions (gender × age × 840K records) → population-level expectation + percentile. Robust but not personalized.

**Blending:**
```
finalTime = w_physics × physicsTime + w_stats × statsTime
```

Weights by input confidence:
- Verified FTP (Strava/Garmin) + GPX: `w_physics=0.7, w_stats=0.3`
- Self-reported FTP, no GPX: `w_physics=0.5, w_stats=0.5`
- No FTP/CSS (experience level only): `w_physics=0.2, w_stats=0.8`

Sanity check: if physics prediction falls outside statistical p5-p95, increase stats weight.

---

## Implementation

### Step 1: Bike physics solver — `src/lib/engine/bike-physics.ts` (new)

Power balance equation:
```
P_total = P_aero + P_rolling + P_gravity + P_drivetrain
P_aero    = 0.5 × ρ × CdA × v³
P_rolling = Crr × m × g × v × cos(θ)
P_gravity = m × g × v × sin(θ)
P_drivetrain = P_total × (1 - η)
```

- Newton-Raphson solver: given target power, solve for velocity
- Air density from altitude + temp: `ρ = 1.225 × (1 - 0.0000225577 × alt)^5.2559 × (288.15 / (288.15 + tempC - 15))`
- Per-segment solving: split GPX into gradient segments, solve each, sum time
- Defaults: CdA=0.35 (TT) / 0.40 (road), Crr=0.004, η=0.97, bike=9kg

New inputs: `bikeType`, `bikeMassKg`, `altitudeM`, `temperatureC`, `windSpeedKph`, `gradientProfile`

Falls back to flat-course assumption if no GPX.

### Step 2: Enhanced swim — modify `src/lib/engine/pacing.ts`

Add to `calculateSwimPacing`:
- Open water factor: +5% vs pool CSS (sighting, waves)
- Wetsuit: -4% pace improvement
- Water temp: <16°C → +2% (cold stress), >24°C → no wetsuit
- Drafting: moderate drafting saves ~5% energy → ~2% pace improvement

### Step 3: Enhanced run — modify `src/lib/engine/pacing.ts`

Replace simple TSS lookup in `calculateRunPacing`:
- Distance decay: 5k→0%, 10k→+3%, HM→+6%, marathon→+10% slower than threshold
- Bike fatigue: `fatigueFactor = 1 + 0.15 × (bikeIF - 0.65)` (clamped 1.0-1.15)
- Heat: +1.5% per 5°C above 20°C
- Elevation: +1% per 100m run elevation gain
- Longer bike = more fatigue: +0.5% per hour above 2.5h

### Step 4: Nutrition rewrite — `src/lib/engine/nutrition.ts`

Per-segment plans with science-based rules:
- Bike carbs: 30-60g/h (<2.5h), 60-80g/h (2.5-4h), 80-90g/h (>4h)
- Dual-transport (glucose+fructose 2:1) recommended at >60g/h
- Run carbs: same rates but via gels/aid stations (not bottles)
- Pre-race: carb loading 8-12g/kg/day for 48h, pre-race meal 1-4g/kg
- Schedule: concrete timeline items ("gel at km 10, 20, 30...")

### Step 5: Hydration — `src/lib/engine/hydration.ts` (new)

Sweat rate estimation:
- Base: 800 mL/h
- Male: +15%, temp: +100mL/h per 5°C above 20°C, humidity: +50mL/h per 10% above 50%
- Target 80% replacement
- Sodium: 300-600mg/h (baseline), 800-1000mg/h in heat

### Step 6: Strategy & risk flags — `src/lib/engine/strategy.ts` (new)

Risk detection:
- Over-biking: IF > 0.82 (140.6) or > 0.85 (70.3)
- Heat stress: temp > 30°C + humidity > 60%
- GI distress: carbs > 90g/h without training, > 70g/h for beginners
- Dehydration: sweat > 1.5L/h with intake < 50% replacement
- Bonking: duration > 4h with carbs < 60g/h

Each risk has: type, severity, description, trigger condition, mitigation action.

### Step 7: Prediction uncertainty — `src/lib/engine/uncertainty.ts` (new)

Confidence intervals from:
- Input accuracy: ±5% if self-reported FTP, ±2% if from device
- Weather forecast: ±1% if <3 days out, ±3% if >7 days
- Course data: ±2% with GPX, ±5% without
- Model error: from statistical cohort variance (p10-p90 range)

Combine via quadrature: `totalUncertainty = √(Σ uncertainty²)`

### Step 8: Blending — `src/lib/engine/blend.ts` (new)

`blendPredictions(physics, statistical, inputConfidence)`:
- Compute weights from input confidence level
- Blend each segment time
- Sanity check against statistical range
- Return blended prediction + combined uncertainty

### Step 9: Integration — modify `src/lib/engine/generate-plan-core.ts`

Update `computeStep`:
1. Run physics track (bike solver, enhanced swim/run)
2. Run statistical track (existing `buildFullContext()` — no changes)
3. Blend predictions
4. Run nutrition engine with blended durations
5. Run strategy engine with blended prediction
6. Compute uncertainty envelope
7. Save all to RacePlan (existing fields + new `strategyData`, `uncertaintyData`)

### Step 10: Prisma migration

Add to `RacePlan`:
```prisma
strategyData    Json?
uncertaintyData Json?
```

---

## Existing code to reuse (not modify)

- `src/lib/engine/statistics.ts` (793 lines) — `buildFullContext()`, cohort percentiles, split ratios
- `src/lib/engine/fade-model.ts` — Run fade lookup by bike intensity
- `src/lib/engine/weather-model.ts` — Weather impact bins
- `src/lib/engine/course-model.ts` — Course difficulty analysis
- `src/lib/engine/trends-model.ts` — Year-based performance trends
- `src/data/*.json` — All pre-computed JSON data

## Files to modify

- `src/lib/engine/pacing.ts` — enhanced swim + run models
- `src/lib/engine/nutrition.ts` — full rewrite
- `src/lib/engine/generate-plan-core.ts` — hybrid integration + blending
- `prisma/schema.prisma` — add strategyData, uncertaintyData fields

## New files to create

- `src/lib/engine/bike-physics.ts` — Newton-Raphson power→speed solver
- `src/lib/engine/hydration.ts` — Sweat rate estimation
- `src/lib/engine/uncertainty.ts` — Confidence interval propagation
- `src/lib/engine/strategy.ts` — Risk flags + contingency plans
- `src/lib/engine/blend.ts` — Hybrid prediction blending

## Verification

1. **Bike solver**: 200W, 80kg, flat, sea level → ~33-34 kph (matches known physics)
2. **Bike solver with gradient**: 200W, 80kg, 5% grade → ~15 kph (matches reality)
3. **Nutrition**: 70.3 ~5h → 80-90g/h carbs, 140.6 ~12h → 90g/h
4. **Risk flags**: IF=0.9 on 140.6 → over-biking flag fires
5. **Blending**: verified FTP + GPX → physics-dominant prediction; no FTP → stats-dominant
6. **End-to-end**: generate a plan through wizard, verify new strategy/uncertainty fields in plan view
