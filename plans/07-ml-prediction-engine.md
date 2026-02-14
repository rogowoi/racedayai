# Plan 07: ML-Powered Prediction Engine & Personalized Suggestion Builder

## Executive Summary

RaceDayAI sits on **4.9M scraped race records** across four datasets, 14 T100 pro events, and 49 World Championship result files — but the current engine uses only heuristic physics and lookup tables. This plan designs a best-in-class prediction system that layers **unsupervised learning, supervised models, a lightweight neural embedding network, physics-based models, and LLM-driven coaching** into a unified pipeline. Since we have no real users yet, every model is trained and validated purely on scraped data.

All experimentation happens in **Jupyter notebooks** for rapid iteration and interactive data exploration. All intermediate and final outputs are **CSV files** in a `research/data/cleaned/` folder — no databases, no Parquet, no feature stores for now.

### Target Audience: Age-Group Athletes

The primary customer is the **age-group (amateur) triathlete** — someone racing in a 5-year age bracket (25-29, 30-34, ..., 65-69, 70+), not competing for prize money, typically finishing in the middle-to-back of the pack. This shapes the entire system:

- **Data weighting:** The Kaggle df6 dataset (840K records) is almost entirely age-groupers — this is our richest and most representative source. Pro results (~496 T100 + wiki podiums) are included but down-weighted in training.
- **Cohort granularity matters more than elite precision:** An age-grouper cares about "where do I sit among 40-44 males at this course?" not "can I win?" The model optimizes for MAE in the 4:30-7:00+ finish time range, not the 3:30-4:30 pro range.
- **Variance is higher and that's okay:** Age-groupers have wider time distributions, more inconsistency race-to-race, and more sensitivity to conditions (heat, hills, nutrition mistakes). The uncertainty quantification is a feature, not a weakness.
- **Coaching value > raw prediction:** A pro has a coach. An age-grouper deciding between a conservative or aggressive bike pacing strategy needs the LLM to explain trade-offs in plain language, not sport-science jargon.
- **Cold-start is the norm:** Most age-groupers don't have 10+ race results uploaded. The system must produce useful output from minimal input (gender, age, one recent race time, target race).
- **DNF prevention is high-value:** Age-groupers are more likely to bonk, cramp, or misjudge pacing. The DNF risk model and heat/nutrition warnings are critical features.

Pro data is still valuable — it calibrates the fast end of distributions, validates course difficulty ratings, and provides aspirational benchmarks. But model evaluation, cluster discovery, and coaching narratives are all optimized for the age-group experience.

---

## 1. Data Inventory & What We Can Extract

### 1.1 Raw Assets

| Dataset | Records | Fields | Distance | Source |
|---------|---------|--------|----------|--------|
| Kaggle Half Ironman (df6) | 840,075 | Gender, AgeGroup, AgeBand, Country, EventYear, EventLocation, Swim/T1/Bike/T2/Run/Finish (seconds) | 70.3 | Kaggle |
| Kaggle TriStat Stats | 2,961,502 | Gender, Name, Country, AgeGroup, Swim/T1/Bike/T2/Run/Finish (HH:MM:SS), EventLink | Full + Half | tristats.ru/Kaggle |
| Kaggle CoachCox Results | 1,096,719 | Name, Country, Gender, Division, DivisionRank, OverallRank, Swim/Bike/Run/Overall (HH:MM:SS), FinishStatus, AthleteID | Full | CoachCox/Kaggle |
| Kaggle Races | 587 | Year, Link, KonaSlots, 1st place times, Finishers, DNF, DQ | Full | CoachCox |
| T100 Pro Results | ~496 | Name, Gender, Country, Swim/Bike/Run/T1/T2/Total (sec), Rank | 100km | PTO stats |
| Wiki World Championships | 49 files | Podium results, historical champions | 70.3 + 140.6 | Wikipedia |

**Combined unique athlete-race records: ~4.9 million.**

### 1.2 Derived Features We Can Engineer (No User Input Needed)

From the scraped data alone, we can compute a rich feature set for every record:

**Athlete-Level (Cross-Race Linking)**
The TriStat and CoachCox datasets include athlete names/IDs. By linking the same athlete across multiple races, we can derive:

- **Personal best times** per discipline per distance
- **Improvement trajectory** (slope of finish times over years)
- **Consistency score** (coefficient of variation across races)
- **Discipline strength profile** (swim-heavy, bike-heavy, run-heavy — relative to cohort)
- **Race frequency** (events per year)
- **Distance versatility** (races across sprint / Olympic / 70.3 / 140.6)
- **DNF rate** (from CoachCox `finishStatus` field)
- **Kona/Championship qualification** (finishing position vs. known slot allocations)

**Race-Level**
- **Course difficulty factor** (already computed, but can be improved with ML)
- **Field strength** (median/mean finish time relative to global)
- **Attrition rate** (DNF/DNS ratio from CoachCox races dataset)
- **Weather conditions** (already joined for some, expandable via Open-Meteo)
- **Year effects** (secular trend in performance)

**Pacing Pattern Features**
- **Split ratios** (swim%, bike%, run% of total)
- **Bike-run coupling** (bike_time / run_time ratio)
- **Transition efficiency** (T1+T2 as % of total)
- **Negative/positive split classification** (second half run faster/slower)
- **Fade ratio** (run_actual / run_expected_from_cohort)
- **Discipline rank delta** (e.g., 50th percentile swimmer but 80th percentile runner)

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
│  4.9M race records → ETL notebooks → cleaned CSVs + features    │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌─────────────────────┐
│  UNSUPERVISED │  │   SUPERVISED    │  │   NEURAL NETWORK    │
│    LAYER      │  │     LAYER       │  │      LAYER          │
│               │  │                 │  │                     │
│ Athlete       │  │ Gradient Boost  │  │ Athlete embedding   │
│ Clustering    │  │ time predictor  │  │ network (MLP)       │
│               │  │                 │  │                     │
│ Pacing        │  │ Bayesian        │  │ Multi-task head:    │
│ Archetypes    │  │ hierarchical    │  │ time + splits +     │
│               │  │ model           │  │ risk                │
│ Anomaly       │  │                 │  │                     │
│ Detection     │  │ Quantile        │  │                     │
│               │  │ regression      │  │                     │
│               │  │                 │  │                     │
│               │  │ PHYSICS MODEL   │  │                     │
│               │  │ (existing,      │  │                     │
│               │  │  kept as input) │  │                     │
└───────┬───────┘  └────────┬────────┘  └──────────┬──────────┘
        │                   │                      │
        └───────────────────┼──────────────────────┘
                            ▼
                ┌───────────────────────┐
                │    ENSEMBLE BLENDER   │
                │  (stacking meta-model)│
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │     LLM LAYER         │
                │                       │
                │  Interprets model     │
                │  outputs → generates  │
                │  personalized race    │
                │  strategy, coaching   │
                │  narrative, nutrition │
                │  plan, risk warnings  │
                └───────────────────────┘
```

The **existing physics-based model** (bike power solver, CSS-based swim, threshold pace run) stays in the ensemble as a first-principles input. It's especially valuable at Tier 3+ where users provide FTP/CSS. It doesn't replace the ML models — it feeds into the stacking layer as another signal.

---

## 3. Phase 1 — Data Unification & Feature Engineering

### 3.1 Unified CSV Schema

All datasets are normalized into a single CSV: `research/data/cleaned/athlete_race.csv`

**Columns:**

```
# Identity
athlete_hash        — SHA256(normalized_name + country + gender), nullable for df6
athlete_name        — nullable (df6 has none)
gender              — M | F
age_group           — "30-34", "45-49", etc.
age_band            — 30, 45, etc. (lower bound of age group)
country
country_iso2
is_pro              — TRUE for MPRO/FPRO divisions, T100, wiki podium

# Event
event_name
event_year
event_location
event_distance      — sprint | olympic | 70.3 | 140.6 | 100km
source              — kaggle_df6 | tristat | coachcox | t100 | wiki

# Times (seconds)
swim_sec, t1_sec, bike_sec, t2_sec, run_sec, total_sec

# Rankings (nullable)
overall_rank, gender_rank, age_group_rank, division_rank
finish_status       — finisher | DNF | DNS | DQ

# Derived (computed during ETL)
swim_pct            — swim_sec / total_sec
bike_pct            — bike_sec / total_sec
run_pct             — run_sec / total_sec
transition_pct      — (t1 + t2) / total_sec
bike_run_ratio      — bike_sec / run_sec
fade_ratio          — actual_run / cohort_median_run
cohort_percentile   — percentile within gender × age_group
implied_bike_if     — reverse-engineered from bike split + cohort
```

### 3.2 Athlete Profile CSV

For datasets with athlete identity (TriStat: 2.96M, CoachCox: 1.1M), output: `research/data/cleaned/athlete_profile.csv`

**Columns:**

```
athlete_hash, name, gender, country
total_races, years_active, distances_raced
pb_swim_sec, pb_bike_sec, pb_run_sec, pb_total_sec
first_race_year, latest_race_year
improvement_slope       — seconds/year improvement (linear fit)
consistency_cv          — coefficient of variation across races
swim_strength_z         — z-score vs cohort
bike_strength_z
run_strength_z
dominant_discipline     — swim | bike | run
dnf_count, dnf_rate
avg_fade_ratio
```

### 3.3 ETL Pipeline

```
[Kaggle df6 CSV]  ──┐
[TriStat CSV]     ──┤
[CoachCox CSV]    ──┼──▶  normalize_times()
[T100 CSVs]       ──┤     deduplicate()
[Wiki JSONs]      ──┘     compute_derived_features()
                                │
                          ┌─────┴─────┐
                          ▼           ▼
                athlete_race.csv   athlete_profile.csv
                   (4.9M)            (~500K unique)
```

**Implementation:** Jupyter notebook `01_etl.ipynb` using Pandas. Outputs saved to `research/data/cleaned/`.

---

## 4. Phase 2 — Unsupervised Learning

**Notebook:** `02_unsupervised.ipynb`

### 4.1 Athlete Clustering (K-Means / HDBSCAN)

**Goal:** Discover natural athlete archetypes from data, replacing the simplistic gender×age cohort system.

**Features for clustering:**
```python
features = [
    'swim_strength_z',    # relative swim ability
    'bike_strength_z',    # relative bike ability
    'run_strength_z',     # relative run ability
    'cohort_percentile',  # overall ability level
    'bike_run_ratio',     # pacing strategy
    'fade_ratio',         # execution quality
    'consistency_cv',     # reliability
    'total_races',        # experience
    'improvement_slope',  # trajectory
]
```

**Methodology — try all, compare:**
1. **HDBSCAN** — density-based, auto-detects k, handles noise/outliers
2. **K-Means** — silhouette score sweep k=5..20, simple and fast
3. **Gaussian Mixture Model** — soft assignments, handles overlapping clusters
4. UMAP dimensionality reduction for visualization of all three

**Compare with:** Silhouette score, Calinski-Harabasz index, Davies-Bouldin index, plus manual inspection of cluster centroids against sports-science intuition.

**Expected age-group archetypes (hypothesis):**
- **"The Ex-Swimmer"** — strong swim (often masters swimmers), loses time on bike/run, typically 35-55, consistent but plateau'd
- **"The Cyclist Who Discovered Tri"** — dominant bike split, weak swim, moderate run fade, often owns a fancy TT bike and over-bikes
- **"The Runner Who Added Tri"** — conservative bike, fast run, low fade, strongest closing split, often came from marathon background
- **"The Balanced Mid-Packer"** — no single strength, finishes 40th-60th percentile across all three, reliable, 5:00-6:00 total, largest cluster
- **"The First-Timer / Beginner"** — slow transitions, wide split variance, typically 1-2 races total, improving rapidly
- **"The Veteran Age-Grouper"** — 5+ races, steady improvement then plateau, knows their numbers, consistent race-to-race
- **"The Over-Racer"** — many races per year, times plateau or decline, possible burnout/injury pattern
- **"The Back-of-Packer"** — 6:30+, highest run fade, longest transitions, highest DNF risk, most in need of pacing/nutrition coaching

Pro athletes (MPRO/FPRO from CoachCox, T100 results, wiki podiums) are clustered separately and flagged with `is_pro=TRUE`. They're included in training for distribution calibration but excluded from age-group cluster assignments.

**Use case:** When a new user inputs their fitness data (or we have nothing), we assign them to the closest age-group cluster and use that cluster's distribution instead of the crude gender×age bucket. This gives much richer priors. An "Ex-Swimmer" 45-49M gets a very different prediction than a "Runner Who Added Tri" 45-49M, even though the old system would treat them identically.

**Output:** `research/data/cleaned/cluster_assignments.csv` (athlete_hash → cluster_id, cluster_name, cluster_probabilities)

### 4.2 Pacing Archetype Discovery

**Goal:** Identify distinct pacing strategies that lead to different outcomes.

**Features:** `[swim_pct, bike_pct, run_pct, fade_ratio]`

**Methods to try:**
- GMM with BIC selection (3-8 components) per distance category
- K-Means on split ratios
- Compare both

**Expected patterns:**
- **Conservative Bike / Strong Run** (low fade, best outcomes)
- **Aggressive Bike / Heavy Fade** (fast bike, slow run)
- **Balanced** (near population-mean splits)
- **Swim-Focused** (disproportionate swim time, typical of weaker swimmers)

**Use case:** Each pacing archetype has an associated outcome distribution. We can show users: "Athletes who pace like you plan to have a 70% chance of fading >10% on the run."

**Output:** `research/data/cleaned/pacing_archetypes.csv`

### 4.3 Anomaly Detection for Data Quality

**Goal:** Flag suspicious records before they pollute training data.

**Methods to try:**
- Isolation Forest on `[swim_sec, bike_sec, run_sec, total_sec, t1_sec, t2_sec]`, grouped by distance
- Simple rule-based filters (see Appendix A)
- Compare recall of both approaches

**Flags:**
- Total time ≠ sum of splits (data corruption)
- Split ratios outside physical possibility (e.g., 5% swim, 80% bike)
- Transition times >600 seconds (likely data error or penalty)
- Negative times or zero values

**Output:** `research/data/cleaned/anomaly_flags.csv` (record_id → is_anomaly, reason)

---

## 5. Phase 3 — Supervised Learning

**Notebook:** `03_supervised.ipynb`

### 5.1 Gradient Boosted Finish-Time Predictor

**Goal:** Given athlete features + race features → predict segment times and total time.

**Target variables (multi-output):**
```
y = [swim_sec, bike_sec, run_sec, total_sec]
```

**Feature set:**

```python
# Athlete features (from profile or user input)
athlete_features = [
    'gender',              # categorical
    'age_band',            # ordinal
    'country_iso2',        # categorical (target-encoded)
    'total_races',         # experience proxy
    'pb_total_sec',        # best known performance
    'swim_strength_z',     # discipline profile
    'bike_strength_z',
    'run_strength_z',
    'improvement_slope',   # trajectory
    'consistency_cv',      # reliability
    'cluster_id',          # from unsupervised phase
]

# Race features
race_features = [
    'event_distance',      # categorical
    'course_difficulty',   # from course model
    'event_year',          # trend adjustment
    'temp_mean_c',         # weather
    'humidity_pct',
    'wind_speed_kph',
    'field_strength',      # median time at this event
    'attrition_rate',      # DNF rate at this event
]

# Interaction features
interaction_features = [
    'athlete_percentile × course_difficulty',
    'age_band × event_distance',
    'bike_strength_z × course_elevation',
]
```

**Training strategy:**
- **Split:** 80/10/10 train/val/test, stratified by distance × gender × age_band
- **Cross-validation:** 5-fold grouped by athlete_hash (prevent leakage)
- **Hyperparameter tuning:** Optuna with early stopping on validation RMSE
- **Multi-output:** Separate model per segment OR single model with chained residuals (bike prediction feeds into run model via fatigue)

**Algorithms to try and compare in the notebook:**

| Algorithm | Why Try It |
|-----------|-----------|
| XGBoost | Gold standard for tabular, fast, handles missing values |
| LightGBM | Faster training, good with high cardinality categoricals |
| CatBoost | Native categorical handling, less tuning needed |
| Random Forest | Simpler baseline, less prone to overfitting |
| Ridge / Lasso | Linear baseline — if this is close, features matter more than model |
| Chained models (swim→bike→run) | Sequential with fatigue carry-through signal |

**Baseline comparison (age-groupers only, pro excluded from eval):**
| Model | Expected R² | MAE (min) | Notes |
|-------|------------|-----------|-------|
| Current heuristic | ~0.27 | ~25 | Gender + age + location only |
| Cohort median lookup | ~0.45 | ~18 | Current statistical engine |
| XGBoost (demographics only) | ~0.55 | ~14 | Matches literature benchmarks |
| XGBoost (full features) | ~0.75-0.85 | ~8-10 | With athlete history + course + weather |
| Chained XGBoost (swim→bike→run) | ~0.80-0.88 | ~6-8 | Sequential prediction with fatigue signal |

Note: Age-grouper time distributions have higher variance than pro fields (~CV of 15-25% vs 3-5% for pros). This means R² is naturally lower when evaluating on the AG population alone. MAE in minutes is the more meaningful metric for users — "your prediction was off by 8 minutes" is concrete and useful.

### 5.2 Bayesian Hierarchical Model (PyMC / NumPyro)

**Notebook:** `04_bayesian.ipynb`

**Goal:** Principled uncertainty quantification with partial pooling for small cohorts.

**Model structure:**

```
# Hierarchical priors
μ_global ~ Normal(20000, 5000)           # global mean finish time (seconds)
σ_global ~ HalfNormal(3000)

# Group-level effects
μ_gender[g] ~ Normal(μ_global, σ_gender)
μ_age[a] ~ Normal(0, σ_age)
μ_course[c] ~ Normal(0, σ_course)
μ_weather[w] ~ Normal(0, σ_weather)

# Individual prediction
y[i] ~ Normal(
    μ_gender[g_i] + μ_age[a_i] + μ_course[c_i] + μ_weather[w_i]
    + β_fitness × fitness_i + β_experience × experience_i,
    σ_individual
)
```

**Key advantages over XGBoost:**
- Natural credible intervals (not just point estimates)
- Partial pooling: small cohorts borrow strength from larger ones
- Can incorporate prior knowledge (e.g., physics constraints)
- Handles missing data gracefully (marginalization)

**Use case:** When a user has sparse data, the Bayesian model gracefully falls back to group-level priors. When they have extensive race history, the model personalizes.

### 5.3 Quantile Regression

**Goal:** Predict the full distribution of outcomes, not just the mean.

**Methods to try:**
- `sklearn.ensemble.GradientBoostingRegressor(loss='quantile', alpha=q)` for q in [0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95]
- LightGBM quantile objective
- Compare coverage and sharpness

**Output:** For each athlete-race combination, produce a fan chart:
```
{
  "p05": 17200,   // best-case scenario
  "p25": 18500,   // good day
  "p50": 19800,   // expected
  "p75": 21200,   // tough day
  "p95": 23500    // worst-case scenario
}
```

**Use case:** Powers the uncertainty envelope in the UI. Users see "You'll likely finish between 5:08 and 5:53, with a most likely time of 5:30."

### 5.4 DNF Risk Classifier

**Goal:** Predict the probability of not finishing.

**Target:** Binary (finisher vs DNF/DNS/DQ) — available in CoachCox dataset.

**Features:** Same as time predictor + derived risk indicators:
- Predicted intensity factor (aggressive plan?)
- Historical DNF rate of this athlete
- Course attrition rate
- Weather severity score
- Athlete's fade ratio history (chronic over-bikers)

**Models to try:** LightGBM, XGBoost, Logistic Regression (calibrated baseline). Compare with ROC-AUC + precision-recall curves.

**Output:** `dnf_probability: 0.12` → "There's about a 12% chance of not finishing given your plan and this course."

---

## 6. Phase 4 — Neural Network (Lightweight Embedding)

**Notebook:** `05_embeddings.ipynb`

### 6.1 Athlete Embedding Network (MLP, not Transformer)

**Goal:** Learn dense representations of athletes that capture their complete racing profile. This is a standard MLP — no transformers, no sequence modeling, no attention.

**Architecture:**

```
Input Layer
├── Categorical embeddings:
│   ├── gender_emb(2) → dim 4
│   ├── age_group_emb(15) → dim 8
│   ├── country_emb(200) → dim 16
│   └── distance_emb(5) → dim 4
├── Continuous features (normalized):
│   ├── swim_sec, bike_sec, run_sec, total_sec
│   ├── swim_pct, bike_pct, run_pct
│   ├── fade_ratio, bike_run_ratio
│   └── course_difficulty, weather features
│
Concat → Dense(128, ReLU) → Dropout(0.3)
       → Dense(64, ReLU) → Dropout(0.2)
       → Athlete Embedding (dim 32)
       │
       ├── Head 1: Time Prediction → Dense(4) [swim, bike, run, total]
       ├── Head 2: Split Ratios   → Dense(3, Softmax) [swim%, bike%, run%]
       └── Head 3: Risk Score     → Dense(1, Sigmoid) [DNF probability]
```

**Training:**
- Multi-task loss: `L = λ₁·MSE_time + λ₂·CE_splits + λ₃·BCE_risk`
- Dataset: All 4.9M records with 5-fold CV
- Framework: PyTorch
- Optimizer: AdamW, OneCycleLR scheduler

**Key value:** The 32-dim athlete embedding becomes a universal representation. Athletes with similar racing profiles have similar embeddings, enabling:
- "Athletes like you" recommendations (cosine similarity in embedding space)
- Cold-start handling (map minimal user input to embedding space)
- Transfer learning across distances

**Output:** `research/data/cleaned/athlete_embeddings.csv` (athlete_hash → 32 embedding dimensions)

---

## 7. Phase 5 — Ensemble & Blending

**Notebook:** `06_ensemble.ipynb`

### 7.1 Meta-Model (Stacking)

All models produce predictions for the same output space. A meta-learner combines them:

```python
meta_features = [
    xgboost_prediction,      # point estimate
    bayesian_mean,           # point estimate
    bayesian_std,            # uncertainty signal
    quantile_p50,            # median estimate
    quantile_iqr,            # spread signal (p75 - p25)
    neural_prediction,       # embedding-based estimate
    physics_prediction,      # from existing bike physics solver ← STAYS IN
    cohort_median,           # baseline from current statistical engine
    input_confidence,        # how much we know about this athlete (tier level)
    n_prior_races,           # data richness
]
```

**Meta-learner — try both:** Ridge regression (simple, interpretable) and LightGBM (if non-linearity helps). Compare on held-out set.

**Weighting logic (expected, to be validated):**
- Athlete with many prior races → embedding + Bayesian get high weight
- Athlete with 1-2 races → XGBoost + Bayesian get high weight
- Athlete with zero history → Cohort median + physics dominate
- High input confidence (FTP, CSS provided) → Physics model gets boost

### 7.2 Physics Model Role

The existing physics-based engine (`generate-plan-core.ts`, `pacing.ts`) is **not replaced** — it becomes one input to the ensemble. This is important because:

- Physics model is the only one that uses FTP/CSS/threshold pace directly (user-provided fitness data)
- It encodes real biomechanical relationships (power-to-speed via aerodynamic drag)
- It's already validated and in production
- For Tier 3+ users who provide fitness metrics, physics is the most grounded signal
- ML models can learn to correct systematic biases in the physics predictions

The notebook should test: "Does adding physics_prediction to the meta-features improve the ensemble?" (Hypothesis: yes, especially for users with fitness data.)

---

## 8. Phase 6 — LLM-Powered Suggestion Builder

### 8.1 Architecture

The LLM layer receives structured model outputs and transforms them into actionable coaching narratives.

```
┌──────────────────────────────────────────────┐
│              MODEL OUTPUTS (JSON)             │
│                                               │
│  predicted_times: {swim, bike, run, total}    │
│  uncertainty: {p05, p25, p50, p75, p95}       │
│  athlete_cluster: "The Runner"                │
│  pacing_archetype: "Conservative Bike"        │
│  risk_flags: ["heat_stress", "over_biking"]   │
│  dnf_probability: 0.08                        │
│  similar_athletes: [list of comparable]       │
│  course_difficulty: 1.15                      │
│  weather_impact: +3.2%                        │
│  fade_prediction: +8%                         │
│  nutrition_model: {carbs, fluid, sodium/hr}   │
│  physics_prediction: {from existing engine}   │
│  improvement_trend: -45 sec/year              │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │   LLM PROMPT    │
         │   TEMPLATE      │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  STRUCTURED     │
         │  OUTPUT         │
         │                 │
         │  - Race strategy│
         │  - Pacing plan  │
         │  - Nutrition    │
         │  - Risk mgmt    │
         │  - "Athletes    │
         │    like you"    │
         │  - Coaching tips│
         └─────────────────┘
```

### 8.2 LLM Tasks

**Task 1: Personalized Race Strategy Narrative**
Turn model numbers into a coach's race briefing, written for an age-grouper (no jargon, practical, encouraging):
```
"You're a strong cyclist — your bike split puts you in the top 30% of your
age group, but your run is closer to the middle of the pack. That's a
common pattern, and it means your biggest time-saver isn't pushing harder
on the bike — it's holding back a little so your run doesn't blow up.

Age-groupers with your profile who push to IF 0.78+ on the bike see an
average 12% run fade — that's losing about 8 minutes on the run to gain
only 3 on the bike. Not worth it.

My suggestion: target a steady 165W on the bike (about 2:42). That sets
you up for a strong 1:52 run and a finish around 5:18. You'll feel like
you're holding back at km 30 of the bike — that's the plan working."
```

**Task 2: "Athletes Like You" Comparisons**
Using the embedding space, find the 5 most similar age-group athletes and surface their pacing patterns:
```
"I found 847 age-group athletes with a similar profile to yours — same
age bracket, similar bike/run balance, comparable fitness level. Here's
how the ones who finished in your predicted range (5:10-5:30) paced it:

Their swim: 32-35 minutes (you're planning 33 — right on target)
Their bike: 2:38-2:48, averaging around 23.5 kph
Their run: 1:48-2:00, with a 5-8% slowdown from their fresh half-marathon pace

The ones who cracked 5:15? They went 2% easier on the bike than the rest
and saw way less run fade (3% vs 8%). Patience on the bike is the pattern."
```

**Task 3: Risk Mitigation Coaching**
When risk flags fire, the LLM explains WHY and WHAT TO DO:
```
"⚠️ Heat Alert: Race day forecast is 31°C with 65% humidity. In our dataset,
athletes racing in similar conditions averaged 4.8% slower overall, with
the run segment hit hardest (+7.2%). Recommendation: reduce bike power by
5% (target 165W instead of 175W), increase fluid intake to 900ml/hr, and
add 400mg sodium per hour above your baseline. Consider ice in your jersey
at aid stations."
```

**Task 4: Dynamic Nutrition Plan Generation**
The LLM generates a concrete, minute-by-minute fueling schedule:
```
"Your 5:18 predicted race breaks down as:
  Swim (33 min): No nutrition needed.
  T1 (3 min): Small sip of sports drink.
  Bike (2:42): 80g carbs/hour = 216g total
    - Km 10: Gel #1 (25g) + 200ml drink
    - Km 25: Gel #2 (25g) + 200ml drink
    - Km 40: Bar (30g) + 200ml drink
    - Km 55: Gel #3 (25g) + 200ml drink
    - Km 70: Gel #4 (25g) + 200ml drink
    - Km 85: Last gel (25g) + 200ml drink
  T2 (2 min): Gel + water.
  Run (1:52): 60g carbs/hour = 112g total
    - Km 3: Gel + water at aid station
    - Km 7: Gel + cola
    - Km 11: Gel + water
    - Km 15: Gel + cola
    - Km 18: Last gel + water
Total carbs: ~330g | Total fluid: ~2.4L | Sodium: ~1800mg"
```

### 8.3 LLM Implementation Details

**Model:** Claude API (structured outputs with JSON schema).

**Prompt engineering:**
- System prompt with sports science knowledge base
- Few-shot examples of good race plans
- Structured JSON input (model outputs) → Structured JSON output (plan sections)
- Chain-of-thought for risk assessment reasoning

**Guardrails:**
- Validate all numbers in LLM output against model predictions (±5% tolerance)
- Clip nutrition recommendations to evidence-based ranges
- Flag if LLM generates contradictory advice
- Always show model confidence alongside LLM narrative

---

## 9. Cold-Start Strategy (No Real Users Yet)

Since we have zero real users, every prediction must work from scraped data alone. Critically, **most age-groupers will arrive at Tier 1 or Tier 2** — they know their gender, age, maybe one recent race time, and have a vague sense of their fitness. Very few will upload FTP data or link 10 race results. The system must be useful from the first interaction.

### 9.1 Tier System Based on Available Information

```
Tier 0: Zero information                             ← rare (bot traffic)
  → Use: Global AG population median + distance-specific distribution
  → Uncertainty: Very wide (p10-p90 of entire AG population)

Tier 1: Demographics only (gender, age)              ← MOST COMMON entry point
  → Use: AG cohort median + cluster assignment (ask 2-3 questions
    to narrow cluster: "Are you stronger on the bike or the run?",
    "How many triathlons have you done?", "What's your goal?")
  → Uncertainty: Cohort p10-p90

Tier 2: Demographics + one recent finish time        ← SECOND MOST COMMON
  → Use: Calibrate from that one result — XGBoost + Bayesian with
    strong prior from Tier 1 updated by the single observation
  → Uncertainty: Significantly narrower than Tier 1

Tier 3: Demographics + fitness metrics (FTP, CSS, threshold pace)
  → Use: Physics model + XGBoost with imputed features
  → Uncertainty: Moderate (model-based)
  → Note: Only ~10-20% of age-groupers know their FTP/CSS

Tier 4: Demographics + fitness + specific race selected
  → Use: Full model stack (course difficulty, weather, physics)
  → Uncertainty: Narrow (course-specific calibration)

Tier 5: Has previous race results (uploaded or linked)
  → Use: Full model stack + athlete embedding
  → Uncertainty: Narrowest (personalized from history)
  → Note: <5% of age-groupers at first visit, grows over time
```

The UX should be designed to **progressively collect data** without feeling like a form. Start at Tier 1 (gender + age → instant prediction), then prompt: "Got a recent race time? That'll sharpen this by 40%." Then: "Which race are you targeting? I'll factor in the course."

### 9.2 Synthetic User Simulation

To test and validate the system before real users arrive, we create synthetic user scenarios from the scraped data:

**Method:** For each athlete in the dataset with ≥3 races:
1. Hold out the most recent race as "ground truth"
2. Use the prior races as "known history"
3. Generate a prediction
4. Compare to actual result

This gives us ~150K test scenarios across all ability levels, ages, and courses.

### 9.3 Proxy User Features

When a user provides FTP/CSS but has no race history, we reverse-engineer a pseudo athlete profile:

```python
def estimate_profile_from_fitness(ftp, css, threshold_pace, weight, gender, age):
    # Estimate bike time from FTP using existing physics model
    estimated_bike_sec = physics_solve(ftp, weight, course_profile)

    # Estimate swim time from CSS
    estimated_swim_sec = (1900 / css) * 1.05  # open water factor

    # Estimate run time from threshold pace
    estimated_run_sec = threshold_pace * 21.1 * fatigue_factor

    # Find nearest cluster
    pseudo_features = normalize([estimated_swim, estimated_bike, estimated_run])
    cluster = nearest_cluster(pseudo_features)

    return cluster, estimated_times
```

---

## 10. Notebook Structure & Outputs

### 10.1 Notebook Plan

All experimentation lives in `research/notebooks/`:

```
research/
  notebooks/
    01_etl.ipynb                    # Data loading, normalization, dedup, feature engineering
    02_unsupervised.ipynb           # Clustering (HDBSCAN vs K-Means vs GMM), pacing archetypes, UMAP viz
    03_supervised.ipynb             # XGBoost / LightGBM / CatBoost / RF / Ridge comparison
    04_bayesian.ipynb               # NumPyro hierarchical model, credible intervals
    05_embeddings.ipynb             # PyTorch MLP embedding network, "athletes like you" similarity
    06_ensemble.ipynb               # Stacking meta-model, physics model integration, final evaluation
    07_dnf_risk.ipynb               # DNF classifier, calibration curves
    08_llm_prototyping.ipynb        # LLM prompt testing, narrative generation, guardrail validation

  data/
    scraped/                        # Raw data (existing, gitignored)
      kaggle/
      t100/
      wiki/
    cleaned/                        # ← ALL OUTPUTS GO HERE AS CSVs
      athlete_race.csv              # 4.9M unified records
      athlete_profile.csv           # ~500K unique athletes
      cluster_assignments.csv       # athlete → cluster
      pacing_archetypes.csv         # record → pacing archetype
      anomaly_flags.csv             # record → is_anomaly
      athlete_embeddings.csv        # athlete → 32-dim embedding
      model_predictions.csv         # backtest predictions vs actuals
      feature_importance.csv        # per-model feature rankings
```

### 10.2 Technology Stack

```
Data Processing:   Pandas (familiar, good for notebooks)
Visualization:     matplotlib + seaborn + plotly (interactive in notebooks)
ML Framework:      scikit-learn + XGBoost + LightGBM + CatBoost
Bayesian:          NumPyro (JAX-accelerated, fast MCMC)
Neural Network:    PyTorch (just the MLP, nothing fancy)
Similarity:        scikit-learn NearestNeighbors (cosine on embeddings)
LLM:               Claude API (structured outputs)
Notebooks:         Jupyter via the existing worker environment
```

---

## 11. Evaluation Framework

### 11.1 Metrics

All metrics are evaluated **on age-group athletes only** (excluding pro/elite records). The target finish time range is 4:30-8:00+ for 70.3 and 9:00-17:00 for 140.6 — the ranges where our customers live.

| Metric | Target | Description |
|--------|--------|-------------|
| MAE (total time, AG) | < 600 sec (10 min) | Mean absolute error, age-groupers only |
| MAPE (total time, AG) | < 5% | Percentage error, age-groupers only |
| R² (total time, AG) | > 0.80 | Variance explained, age-groupers only |
| MAE per segment (AG) | < 180 sec | Per-discipline accuracy |
| DNF AUC (AG) | > 0.75 | Discrimination for DNF prediction |
| Cluster purity (AG) | > 0.6 NMI | Do clusters correspond to meaningful groups? |
| Cold-start MAE (AG) | < 900 sec | Accuracy with demographics only |
| MAE by finish bracket | < 4% MAPE each | Separately for 4:30-5:30, 5:30-6:30, 6:30+ brackets |
| Back-of-pack accuracy | < 7% MAPE | Specific target for 6:30+ finishers (higher variance, needs care) |

### 11.2 Backtesting Protocol

```
For each athlete with ≥3 races (N ≈ 150,000):
  1. Sort races chronologically
  2. For each race Rₖ (k ≥ 3):
     - Train on races R₁..Rₖ₋₁ (this athlete's history)
     - Use global models trained without Rₖ
     - Predict Rₖ segment times
     - Record prediction vs. actual
  3. Aggregate: MAE, MAPE per distance/gender/age

Stratified evaluation (age-groupers only, pro excluded):
  - By data richness: 0 races, 1-2 races, 3-5 races, 5+ races
  - By distance: 70.3 vs 140.6
  - By finish bracket: 4:30-5:30, 5:30-6:30, 6:30-8:00, 8:00+ (70.3)
  - By age group: 18-29, 30-39, 40-49, 50-59, 60+
  - By course: easy vs hard courses
  - By weather: normal vs extreme conditions
  - By experience: first race vs veteran (5+ races)
```

---

## 12. Implementation Roadmap

### Sprint 1 (Week 1-2): Data Foundation
- [ ] `01_etl.ipynb` — Load all 5 sources, normalize, deduplicate, feature engineer
- [ ] Output `athlete_race.csv` and `athlete_profile.csv` to cleaned/
- [ ] Anomaly detection pass → `anomaly_flags.csv`
- [ ] Basic EDA cells at the end: distributions, missing values, cohort sizes

### Sprint 2 (Week 3-4): Unsupervised Models
- [ ] `02_unsupervised.ipynb` — Try HDBSCAN, K-Means, GMM side-by-side
- [ ] UMAP visualizations, cluster interpretability
- [ ] Pacing archetype discovery
- [ ] Output `cluster_assignments.csv`, `pacing_archetypes.csv`

### Sprint 3 (Week 5-6): Supervised Models
- [ ] `03_supervised.ipynb` — XGBoost / LightGBM / CatBoost / RF / Ridge comparison
- [ ] Chained model experiment (swim → bike → run)
- [ ] Quantile regression for uncertainty bands
- [ ] `07_dnf_risk.ipynb` — DNF classifier
- [ ] Output `model_predictions.csv`, `feature_importance.csv`

### Sprint 4 (Week 7-8): Bayesian + Embedding
- [ ] `04_bayesian.ipynb` — NumPyro hierarchical model
- [ ] `05_embeddings.ipynb` — PyTorch MLP, "athletes like you" similarity search
- [ ] Output `athlete_embeddings.csv`

### Sprint 5 (Week 9-10): Ensemble + LLM
- [ ] `06_ensemble.ipynb` — Stacking with physics model, final evaluation
- [ ] `08_llm_prototyping.ipynb` — Prompt testing, narrative generation
- [ ] End-to-end: synthetic user → all models → ensemble → LLM → race plan

---

## 13. Key Design Decisions & Trade-offs

### Why Both XGBoost AND Neural Embeddings?

XGBoost handles tabular data with heterogeneous features extremely well and is fast to train/serve. But it doesn't produce meaningful embeddings for similarity search. The MLP embedding network handles "athletes like you" and soft cluster assignment. Together via ensemble, they complement each other.

### Why Bayesian Alongside Tree Models?

Bayesian models produce principled uncertainty estimates with correct coverage probabilities. XGBoost's prediction intervals (via quantile regression) are often miscalibrated. For a product where users make real decisions (race pacing, nutrition), well-calibrated uncertainty is a differentiator.

### Why Keep Physics in the Ensemble?

The physics model (bike power solver, swim CSS, run threshold pace) encodes real biomechanical relationships that ML can't learn from demographics alone. For users who provide FTP/CSS (Tier 3+), it's the most grounded signal. ML models learn to correct its systematic biases (e.g., physics overpredicts in hot weather) while preserving its strengths.

### Why Unsupervised Before Supervised?

Cluster assignments from HDBSCAN become high-quality features for supervised models. They encode complex, non-linear relationships between discipline strengths, pacing patterns, and experience — patterns that would require many hand-engineered interaction terms to capture in a flat feature set. They also power the "athletes like you" feature.

### Why LLM Instead of Templates?

Templates can't adapt to the combinatorial explosion of conditions (weather × course × athlete type × risk flags × nutrition preferences). An LLM can reason about interactions: "This athlete is a strong cyclist planning an aggressive bike on a hot day on a hilly course — the risk compounds." Templates would need thousands of if-else branches to match this capability.

### Why Notebooks Instead of Production Scripts?

We're in the exploration phase. We need to:
- Try 5+ algorithms for each task and compare them interactively
- Visualize distributions, clusters, and decision boundaries
- Iterate on feature engineering based on what we see
- Share results with stakeholders visually

Once we find what works, the winning approaches get productionized into the worker. Notebooks are the lab; the worker is the factory.

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Athlete name matching across datasets produces false links | Corrupted profiles → bad predictions | Use strict matching (name + country + gender + similar age) + manual review of high-impact matches |
| 70.3 data dominates; 140.6/sprint/Olympic underrepresented | Poor predictions for non-70.3 distances | Distance-stratified training + transfer learning from 70.3 → other distances |
| LLM hallucination in race plans | Dangerous advice (over-hydration, wrong pacing) | All LLM outputs validated against model predictions; hard-clip to evidence-based ranges |
| Cold-start prediction too uncertain to be useful | Users get "5-8 hours" range and leave | Narrow uncertainty progressively by asking follow-up questions; show improvement with each input |
| Embedding MLP overfits on training data | Poor "athletes like you" recommendations | Regularization (dropout, weight decay) + evaluate on held-out athlete set |

---

## Appendix A: Data Quality Rules

```python
QUALITY_RULES = {
    'min_swim_sec': 600,      # 10 min minimum swim (any distance)
    'max_swim_sec': 7200,     # 2 hours max swim
    'min_bike_sec': 1800,     # 30 min minimum bike
    'max_bike_sec': 36000,    # 10 hours max bike
    'min_run_sec': 900,       # 15 min minimum run
    'max_run_sec': 25200,     # 7 hours max run
    'min_total_sec': 3600,    # 1 hour minimum total
    'max_total_sec': 61200,   # 17 hours maximum total
    'max_transition_sec': 600, # 10 min max per transition
    'sum_tolerance': 60,       # total must equal sum of splits ± 60 sec
    'min_split_pct': 0.02,     # no segment <2% of total
    'max_split_pct': 0.70,     # no segment >70% of total
}
```

## Appendix B: Feature Importance Expectations

Based on triathlon sports science literature and our EDA findings:

```
Expected rank for total_sec prediction:
  1. Personal best time (if available)     ~40%
  2. Course difficulty factor              ~15%
  3. Age band                               ~10%
  4. Gender                                 ~8%
  5. Weather (temperature + humidity)        ~7%
  6. Athlete cluster                         ~6%
  7. Country                                 ~5%
  8. Event year (trend)                      ~4%
  9. Experience (total races)                ~3%
  10. Wind speed                             ~2%
```
