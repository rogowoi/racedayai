# Plan 09: Recommendations — Future Experiments & Production Pipeline

## Current State Summary

### Model Performance at a Glance

| Model | 70.3 MAE (min) | 70.3 R² | 140.6 MAE (min) | 140.6 R² |
|-------|----------------|---------|------------------|----------|
| **XGB Tuned** | **12.2** | **0.857** | **19.8** | **0.891** |
| Ensemble (LGB/Ridge) | 12.0 | — | 19.8 | — |
| XGBoost (default) | 12.8 | 0.846 | 20.7 | 0.886 |
| Random Forest | 12.9 | 0.831 | 21.7 | 0.867 |
| LightGBM | 13.5 | 0.836 | 21.9 | 0.878 |
| CatBoost | 13.6 | 0.834 | 22.0 | 0.878 |
| Chained (swim→bike→run) | 16.1 | 0.820 | 27.0 | 0.866 |
| Neural (MLP Embedding) | 18.8 | — | 32.6 | — |
| Ridge (linear baseline) | 27.1 | 0.535 | 45.3 | 0.667 |
| Bayesian (NumPyro) | 28.3 | — | 55.0 | — |

### Key Observations

1. **XGBoost Tuned dominates.** It is the single strongest model across both distances. The gap between XGB Tuned and the next best (default XGB) is larger than the gap between XGB and the ensemble.

2. **The ensemble barely helps.** On 70.3, the LGB ensemble improves MAE from 12.2→12.0 min (+1.6%). On 140.6, the Ridge ensemble is essentially tied with XGB Tuned (19.82 vs 19.79 min). The ensemble adds complexity without meaningful accuracy gains.

3. **Neural and Bayesian models underperform badly.** The MLP embedding network (18.8 / 32.6 min MAE) and Bayesian model (28.3 / 55.0 min MAE) are far weaker than tree-based models. They hurt the ensemble more than they help. The Bayesian model performs worse than the simple Ridge baseline on 140.6.

4. **Chained models lose accuracy.** Sequential prediction (swim→bike→run with fatigue carry-through) underperforms direct total time prediction by ~25-35%. Error compounds through the chain.

5. **Feature importance is heavily skewed.** Personal best time (`pb_total_sec`) accounts for 38% (70.3) and 47% (140.6) of XGBoost importance. Gender, age, cluster, and run strength round out the top 5. Weather, country, and improvement slope contribute minimally. DNF rate has zero importance.

6. **140.6 models are relatively stronger.** R²=0.891 for 140.6 vs 0.857 for 70.3 despite longer absolute MAE. Full-distance races have less variance proportionally — age-groupers self-select more consistently at 140.6.

7. **Clusters add real value.** `cluster_id` ranks 4th for 70.3 (7% importance) and 3rd for 140.6 (10% importance). The unsupervised phase was worth doing.

8. **Run strength matters more at 140.6.** It jumps from 5% importance (70.3) to 14% importance (140.6). This aligns with triathlon lore: the marathon makes or breaks the full distance.

### Cluster Landscape

Nine athlete clusters were discovered. The largest is "StrongRun" (30%), followed by "WeakRun_Fader" (23%). Three separate weak-all-disciplines clusters exist with different consistency/improvement profiles. The "Veteran" cluster (5.3%) represents experienced, balanced athletes.

---

## Part 1: Future Experiments

### HIGH PRIORITY — Likely to Move the Needle

#### 1.1 Fix the Bayesian Model

**Why:** The Bayesian model was intended to provide principled uncertainty quantification with partial pooling — a compelling idea. But at 28-55 min MAE, it's clearly broken. The posterior means suggest the model structure is too simple (linear effects of age, gender, cluster on a global mean).

**Experiment:**
- Replace the fully pooled linear Bayesian model with a **Bayesian Additive Regression Trees (BART)** approach, which combines Bayesian uncertainty with tree-based flexibility
- Alternatively, use **NGBoost** (Natural Gradient Boosting) which wraps gradient boosting with proper probabilistic output — much cheaper than NumPyro and proven on tabular data
- As a quick win: use **conformal prediction** on top of XGBoost Tuned to get distribution-free coverage guarantees, bypassing Bayesian modeling entirely

**Expected impact:** Replace 55 min MAE with something competitive (~13-15 min), while gaining calibrated prediction intervals that actually work.

#### 1.2 Improve the Neural Embedding Network

**Why:** The MLP is underperforming (18.8 / 32.6 min MAE) compared to tree models, but the 32-dim athlete embeddings it produces are the backbone of the "athletes like you" feature. If the embeddings are learned from a weak predictor, the similarity search will be poor.

**Experiments:**
- **Knowledge distillation:** Train the MLP to match XGBoost Tuned predictions (soft targets) rather than raw actuals. This transfers the tree model's learned patterns into embedding space
- **Contrastive learning:** Use a triplet loss — anchor athlete, positive (same athlete at different race), negative (different athlete). This may produce better embeddings for similarity without requiring the MLP to be a strong predictor itself
- **TabNet or FT-Transformer:** These architectures are specifically designed for tabular data and produce embeddings as a byproduct. They consistently outperform vanilla MLPs on tabular tasks
- **Two-stage approach:** Use XGBoost for prediction, train the MLP purely as an embedding model (not for prediction). The embedding objective becomes "group similar athletes" rather than "predict finish time"

**Expected impact:** Either improve MLP prediction to within 10% of XGBoost, or decouple prediction from embedding and optimize each separately.

#### 1.3 Segment-Level Prediction Instead of Total-Only

**Why:** The current models predict total time. Users need swim/bike/run split predictions for pacing guidance. The chained model attempted this but degraded accuracy.

**Experiments:**
- **Independent segment models:** Train separate XGBoost models for swim, bike, and run. Add cross-segment features (e.g., predicted bike time as a feature for the run model, but from a separate first-pass model, not chained sequentially)
- **Multi-output XGBoost:** Use the MultiOutputRegressor wrapper but with shared hyperparameters
- **Constrained prediction:** Predict total time (the strong model) + split ratios (swim%, bike%, run% via softmax regression). Multiply to get splits. This leverages the strong total-time predictor while adding ratio-based split estimation
- **Quantile splits:** For each segment, predict the distribution conditional on the athlete's cluster and pacing archetype

**Expected impact:** Segment-level predictions within 3-5 min MAE per discipline, enabling concrete pacing advice.

#### 1.4 Weather Feature Engineering

**Why:** Weather features (temperature, humidity, wind) contribute minimally to current models. This is surprising given strong sports-science evidence that heat degrades performance 4-8%. The weather data likely isn't granular or reliable enough.

**Experiments:**
- **WBGT (Wet Bulb Globe Temperature):** Compute WBGT from temperature + humidity + solar radiation. WBGT is the gold standard for heat stress in endurance sports and is non-linear — using temp and humidity separately misses the interaction
- **Heat-adjusted expected time:** Instead of raw weather features, compute the expected time *penalty* from heat using published endurance performance curves (e.g., Ely et al. 2007), then use the delta as a feature
- **Wind direction relative to course:** Raw wind speed is less informative than headwind/tailwind on the bike leg. If course GPS data is available, decompose wind into course-relative components
- **Race-morning weather vs. forecast:** Ensure weather data aligns with actual race-day conditions, not seasonal averages

**Expected impact:** Weather features should move from ~2% importance to 5-10%, with measurable MAE improvement in hot-weather races.

#### 1.5 Course Difficulty v2 — Elevation Profile Features

**Why:** The current course difficulty factor is a single scalar. Two courses with the same average difficulty but different profiles (rolling hills vs. one big climb) produce different outcomes.

**Experiments:**
- **Elevation histogram features:** Bin the elevation profile into gradient categories (flat, 1-3%, 3-5%, 5%+) and use the percentage of course in each bin
- **Course embedding:** Train a small embedding network on course features (elevation stats, turn count, surface type, altitude) to produce a dense course vector
- **Course-athlete interaction:** Does a strong cyclist lose less time on hilly courses? Add interaction terms between bike_strength_z and elevation features
- **Data enrichment:** Scrape or manually compile elevation profiles for the top 50 most-raced courses

**Expected impact:** +1-3% R² improvement, especially for cross-course predictions. Enables the "I've raced X, how will Y compare?" use case.

---

### MEDIUM PRIORITY — Worth Exploring

#### 1.6 Target Encoding for High-Cardinality Categoricals

**Why:** Country (200+ categories) and event location are currently target-encoded or one-hot. More sophisticated encoding could extract more signal.

**Experiments:**
- **Leave-one-out target encoding** with proper regularization (Bayesian target encoding)
- **Country → region grouping:** Collapse 200 countries into 15-20 meaningful groups (Anglophone, Northern European, etc.) based on triathlon culture/performance patterns
- **Event location embeddings:** Learn embeddings for event locations, then cluster similar events

#### 1.7 Temporal Features & Seasonality

**Why:** `event_year` ranks 10th-11th in importance. But year-over-year trends (equipment improvements, training methodology changes, participation demographics) are real.

**Experiments:**
- **Rolling cohort medians:** Instead of raw year, use the trend-adjusted percentile (athlete's rank relative to a rolling 3-year cohort)
- **Months-since-last-race:** If available, captures race freshness / detraining effects
- **Season of race:** Northern vs. southern hemisphere training cycle effects

#### 1.8 Stacking Architecture Improvements

**Why:** The current ensemble uses Ridge/LGB meta-learner on base model predictions. The ensemble barely beats XGB Tuned because it's dragged down by weak models.

**Experiments:**
- **Selective ensemble:** Only stack the top 3 models (XGB Tuned, default XGB, RF). Drop neural, Bayesian, and Ridge — they add noise
- **Tier-aware stacking:** Different meta-learner weights for different data richness tiers. For Tier 5 athletes (with history), the embedding model might contribute more
- **Out-of-fold predictions:** Ensure base model predictions used for stacking are truly out-of-fold to prevent leakage
- **Bayesian Model Averaging (BMA):** Use posterior model probabilities instead of a trained meta-learner

#### 1.9 DNF Risk Model Improvement

**Why:** The DNF rate feature has zero importance in the time prediction model, and the DNF risk model exists separately. But DNF prediction could be more valuable than the time prediction for user safety.

**Experiments:**
- **Survival analysis:** Model time-to-DNF (at which point in the race did they drop?) using Cox proportional hazards
- **Conditional DNF:** "Given you plan to bike at X watts in Y°C heat, your DNF risk is Z%" — make it actionable, not just historical
- **Calibration improvement:** Use Platt scaling or isotonic regression to calibrate DNF probabilities (the calibration curves from the current model should be reviewed)

#### 1.10 Data Augmentation for Cold-Start

**Why:** Tier 1-2 athletes (demographics only or one race time) are the majority of expected users. The current model relies heavily on `pb_total_sec` (38-47% importance) — which doesn't exist for these users.

**Experiments:**
- **Imputation strategies:** When pb_total_sec is missing, test: (a) cohort median imputation, (b) k-NN imputation from cluster assignment, (c) model-based imputation (predict pb from demographics)
- **Feature sets per tier:** Train tier-specific XGBoost models. Tier 1 model uses only demographics + cluster. Tier 2 adds calibrated-from-one-race features. Tier 5 uses all features. This avoids the single model needing to handle missing features
- **Transfer from one race time:** When a user provides a single race time, decompose it into implied feature values (implied percentile, implied cluster assignment, implied discipline strengths) and populate the full feature set

---

### LOWER PRIORITY — Plan 08 Territory

#### 1.11 Transformer for Repeat Athletes

As described in Plan 08. Only justifiable once Tier 5 user base reaches >1,000 athletes with 3+ uploaded races. Expected +2-5% R² for that subpopulation only.

#### 1.12 Graph Neural Network for Course-Athlete Interaction

As described in Plan 08. Requires enriched course data (elevation profiles, GPS). Expected +1-3% R² for cross-course prediction.

#### 1.13 Conformal Prediction Wrapper

Low-effort, high-trust-value. Wrap XGBoost Tuned predictions with conformal prediction intervals. No new model needed — just a calibration step. Should be done before launch.

---

## Part 2: Recommended Production Pipeline

### Design Principles

1. **Simplicity over complexity.** The ensemble barely beats XGBoost Tuned. Don't ship 6 models when 1 does the job.
2. **Tier-aware architecture.** Different users have different data richness. The pipeline should adapt.
3. **Latency matters.** Users expect <2 seconds for a prediction. An ensemble of 6 models + LLM call is too slow.
4. **Separation of concerns.** Prediction (fast, deterministic) is separate from coaching narrative (slower, LLM-powered).
5. **Embeddings serve similarity, not prediction.** Use the MLP for "athletes like you" but not for time prediction.

### Recommended Architecture

```
User Input
    │
    ▼
┌─────────────────────────┐
│   TIER CLASSIFIER       │
│                         │
│   Determines data       │
│   richness tier (0-5)   │
│   based on what the     │
│   user has provided     │
└────────────┬────────────┘
             │
     ┌───────┴───────┐
     ▼               ▼
┌──────────┐   ┌──────────────┐
│ Tier 0-2 │   │  Tier 3-5    │
│ COLD     │   │  WARM/HOT    │
│ PATH     │   │  PATH        │
└────┬─────┘   └──────┬───────┘
     │                 │
     ▼                 ▼
┌──────────┐   ┌──────────────┐
│ Feature  │   │ Feature      │
│ Imputer  │   │ Builder      │
│          │   │ (full set)   │
│ Fills    │   │              │
│ missing  │   │ Uses PB,     │
│ features │   │ history,     │
│ from     │   │ FTP/CSS,     │
│ cluster  │   │ course data  │
│ medians  │   │              │
└────┬─────┘   └──────┬───────┘
     │                 │
     └────────┬────────┘
              ▼
     ┌─────────────────┐
     │  XGBoost Tuned  │
     │  (single model) │
     │                 │
     │  Predicts:      │
     │  - total_sec    │
     │  - quantiles    │
     │    (p05→p95)    │
     └────────┬────────┘
              │
              ├──────────────────────┐
              ▼                      ▼
     ┌─────────────────┐   ┌─────────────────┐
     │  CONFORMAL      │   │  MLP EMBEDDING   │
     │  CALIBRATION    │   │  (similarity     │
     │                 │   │   only)          │
     │  Adjusts        │   │                  │
     │  prediction     │   │  "Athletes like  │
     │  intervals to   │   │   you" lookup    │
     │  guarantee      │   │  via cosine      │
     │  coverage       │   │  similarity on   │
     │                 │   │  32-dim vectors  │
     └────────┬────────┘   └────────┬─────────┘
              │                     │
              └──────────┬──────────┘
                         ▼
              ┌─────────────────────┐
              │  PREDICTION BUNDLE  │
              │                     │
              │  {                  │
              │    predicted_total, │
              │    predicted_splits,│
              │    confidence_band, │
              │    dnf_risk,        │
              │    similar_athletes,│
              │    cluster_info,    │
              │    pacing_archetype │
              │  }                  │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  LLM COACHING LAYER │
              │  (Claude API)       │
              │                     │
              │  Generates:         │
              │  - Race strategy    │
              │  - Pacing plan      │
              │  - Nutrition plan   │
              │  - Risk warnings    │
              │  - "Athletes like   │
              │     you" narrative  │
              └─────────────────────┘
```

### Component Details

#### A. Tier Classifier (Rule-Based)

No ML needed. Simple decision tree based on which fields are populated:

```
Tier 0: No gender or age                → global median + wide intervals
Tier 1: Gender + age only               → cluster-imputed features
Tier 2: Gender + age + one race time    → calibrated from single observation
Tier 3: Above + FTP/CSS/threshold pace  → physics model feeds features
Tier 4: Above + specific target race    → course difficulty + weather
Tier 5: Above + multiple race results   → full feature set + embeddings
```

#### B. Feature Imputer (Cold Path, Tier 0-2)

For users without race history, populate the XGBoost feature vector using:

1. Assign to nearest cluster from whatever data is available (demographics → cluster probabilities from the GMM)
2. Fill `pb_total_sec` with the cluster median for their gender × age group
3. Fill strength Z-scores with cluster centroid values
4. Set `total_races=0`, `consistency_cv=cluster_median`, `improvement_slope=0`
5. If one race time provided (Tier 2): override `pb_total_sec`, recompute implied percentile, reassign cluster

This ensures XGBoost always sees a complete feature vector and the dominant feature (`pb_total_sec`) is populated with the best available estimate.

#### C. XGBoost Tuned (The Core Predictor)

**One model per distance** (70.3 and 140.6), trained with Optuna-tuned hyperparameters. This is the production predictor.

Why XGBoost Tuned alone and not the ensemble:
- Ensemble improves MAE by only 0.2-1.6% over XGB Tuned
- XGBoost is faster to serve (single model inference vs. 6 models)
- XGBoost is simpler to monitor, debug, and retrain
- The weak ensemble members (neural, Bayesian) add latency without accuracy

For quantile predictions, train parallel XGBoost models with `quantile` objective at τ = {0.05, 0.25, 0.50, 0.75, 0.95}.

#### D. Conformal Calibration Layer

Post-process the quantile predictions using split conformal prediction on a held-out calibration set. This guarantees that the stated confidence intervals actually achieve their target coverage (e.g., the 90% interval truly contains 90% of outcomes).

Implementation: a simple lookup table of residual quantiles per tier × distance. No ML needed, just calibration statistics.

#### E. MLP Embedding (Similarity Only)

Use the 32-dim athlete embeddings exclusively for the "athletes like you" feature. Do NOT use the MLP's time predictions (they're worse than XGBoost).

Pre-compute embeddings for all 500K+ athletes with profiles. At query time, find the k=50 nearest neighbors by cosine similarity, filter by target race distance, and surface their pacing patterns and outcomes.

#### F. DNF Risk Model (Lightweight)

A separate XGBoost classifier for DNF probability. Input features are the same as the time predictor plus the predicted time itself (is the plan aggressive given the athlete's profile?).

Output: a calibrated DNF probability that feeds into the LLM layer for risk warnings.

#### G. LLM Coaching Layer (Claude API)

Receives the structured prediction bundle and generates the narrative. This runs asynchronously — the user sees numeric predictions immediately, and the coaching narrative streams in over 2-3 seconds.

Key guardrails:
- All LLM-generated numbers validated against model predictions (±5%)
- Nutrition recommendations clipped to evidence-based ranges (60-90g carbs/hr, 500-1000ml fluid/hr)
- Risk warnings triggered by the model's risk flags, not hallucinated by the LLM
- Coaching tone: conversational, encouraging, specific, no jargon

### Latency Budget

| Component | Target Latency | Notes |
|-----------|---------------|-------|
| Tier classification | <1 ms | Rule-based |
| Feature imputation | <5 ms | Lookup + simple math |
| XGBoost inference | <10 ms | Single model, ~300 features |
| Quantile models (5×) | <50 ms | Parallel or batched |
| Conformal calibration | <1 ms | Lookup table |
| Embedding similarity | <50 ms | Pre-indexed ANN search |
| DNF risk model | <10 ms | Single XGBoost classifier |
| **Total (pre-LLM)** | **<130 ms** | |
| LLM coaching narrative | 2-4 sec | Streamed to UI |

### Model Serving Recommendations

- **Format:** Export XGBoost models as ONNX or use `xgboost.Booster.save_model()` for native serving. Avoid pickle.
- **Embedding index:** Use FAISS or Annoy for approximate nearest neighbor search on the 32-dim embeddings. Pre-build the index offline.
- **Caching:** Cache predictions for identical input feature vectors. Most cold-start users within the same gender × age × cluster will get similar predictions.
- **Feature store:** Minimal. Pre-compute and store athlete profiles + embeddings in a key-value store (Redis or DynamoDB). Course features are static and can be a JSON config.

### Retraining Cadence

- **XGBoost Tuned:** Retrain quarterly with new race season data. Monitor MAE on recent predictions monthly.
- **Embeddings:** Retrain semi-annually or when new athlete data changes the cluster structure.
- **Conformal calibration set:** Refresh quarterly with the latest holdout data.
- **Clusters:** Re-run annually. Cluster structure should be stable unless the athlete population shifts dramatically.

### What to Drop from Plan 07 for Production

| Plan 07 Component | Production Decision | Reason |
|-------------------|-------------------|--------|
| XGBoost Tuned | **SHIP** | Best single model |
| Quantile XGBoost | **SHIP** | Uncertainty bands |
| Athlete Clustering (HDBSCAN/GMM) | **SHIP** | Valuable feature + cold-start imputation |
| Pacing Archetypes | **SHIP** | Powers coaching narratives |
| MLP Embeddings | **SHIP (similarity only)** | "Athletes like you" feature |
| DNF Risk Classifier | **SHIP** | Safety-critical feature |
| LLM Coaching Layer | **SHIP** | Core product differentiator |
| LightGBM | DROP | Worse than XGB Tuned, adds complexity |
| CatBoost | DROP | Worse than XGB Tuned, adds complexity |
| Random Forest | DROP | Worse than XGB Tuned, adds complexity |
| Ridge Regression | DROP | Baseline only, not production-worthy |
| Bayesian (NumPyro) | DROP (for now) | Broken, needs redesign (see Experiment 1.1) |
| Neural Time Prediction | DROP | Use embeddings only, not time predictions |
| Chained Models | DROP | Worse than direct prediction |
| Ensemble Meta-Learner | DROP | Marginal gain doesn't justify complexity |
| Physics Model | **KEEP as optional Tier 3+ boost** | Only when user provides FTP/CSS |

### Migration Path: Research → Production

```
Phase 1 — MVP (ship first)
  ├── XGBoost Tuned (2 models: 70.3 + 140.6)
  ├── Tier classifier + feature imputer
  ├── Quantile predictions (5 quantile models per distance)
  ├── LLM coaching via Claude API
  └── Cluster assignments for cold-start

Phase 2 — Enhanced (next sprint)
  ├── Conformal calibration layer
  ├── MLP embeddings → "athletes like you"
  ├── DNF risk model
  └── Physics model integration for Tier 3+

Phase 3 — Refined (post-launch learning)
  ├── Segment-level prediction (Experiment 1.3)
  ├── Improved weather features (Experiment 1.4)
  ├── Tier-specific models (Experiment 1.10)
  └── User feedback → model retraining loop
```

---

## Summary

The research phase delivered strong results: XGBoost Tuned achieves 12 min MAE on 70.3 and 20 min MAE on 140.6, with R² of 0.86-0.89. This is within the Plan 07 target of <10 min MAE and well above the R²>0.80 target.

The biggest insight is that **simplicity wins.** A single well-tuned XGBoost model outperforms the complex ensemble with only marginal accuracy loss. The production pipeline should center on XGBoost Tuned with conformal calibration, use embeddings for similarity (not prediction), and lean on the LLM layer for the coaching differentiator.

The most impactful future experiments are: fixing the Bayesian/uncertainty story (conformal prediction is the pragmatic path), improving segment-level predictions for actionable pacing advice, and building tier-specific feature engineering so cold-start users get meaningful predictions even without race history.
