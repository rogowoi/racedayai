# Plan 10: Production Prediction Engine — Implementation Plan

> **Context:** This plan builds the production prediction pipeline based on all findings from the research phase (Plan 07 notebooks 01-08). Speed is not a constraint, so the full ensemble is in play. The system must cover all four distances: Sprint, Olympic, 70.3, and 140.6.

---

## Data Inventory by Distance

| Distance | Records | Unique Athletes (est.) | Status |
|----------|---------|----------------------|--------|
| 70.3 | 2,198,944 | ~300K | Models trained, validated |
| 140.6 | 1,558,226 | ~200K | Models trained, validated |
| Olympic | 257,249 | ~80K | **Not yet modeled** |
| Sprint | 109,443 | ~40K | **Not yet modeled** |
| 100km | 454 | ~400 | Too small — skip |

Olympic has enough data for full model training. Sprint is smaller but viable with careful regularization and transfer learning from other distances.

---

## Phase 1: Extend Data Pipeline to All Distances

### Step 1.1 — Validate Olympic & Sprint Data Quality

**Input:** `athlete_race.csv` filtered to `event_distance IN ('olympic', 'sprint')`

**Tasks:**
1. Run the same anomaly detection rules (Appendix A from Plan 07) on Olympic and Sprint records
2. Check split ratio distributions — Olympic and Sprint have different expected ratios than 70.3/140.6 (shorter swim %, higher run %)
3. Verify time ranges are sensible:
   - Sprint: total 60-180 min, swim 8-30 min, bike 25-75 min, run 15-50 min
   - Olympic: total 100-300 min, swim 15-45 min, bike 50-120 min, run 30-80 min
4. Flag and remove records outside these bounds
5. Check source distribution — which datasets contribute Olympic/Sprint records? (Likely TriStat primarily)

**Output:** Updated `anomaly_flags.csv` with Olympic/Sprint records included

**Estimated effort:** 2-3 hours

### Step 1.2 — Rebuild Athlete Profiles with All Distances

**Input:** Full `athlete_race.csv` (all distances)

**Tasks:**
1. Re-run the athlete profile computation from `01_etl.ipynb` but include Olympic/Sprint races in the athlete history
2. Add new profile features:
   - `distances_raced` — list of distances this athlete has completed (e.g., `['sprint', 'olympic', '70.3']`)
   - `pb_total_sec_sprint`, `pb_total_sec_olympic` — per-distance personal bests
   - `cross_distance_factor` — ratio of athlete's 70.3 time to their Olympic time (when both exist). This is a powerful predictor for cross-distance transfer
3. For athletes who have raced multiple distances, compute distance-transfer coefficients:
   - Olympic-to-70.3 ratio (expected ~2.1-2.4x)
   - Sprint-to-Olympic ratio (expected ~1.8-2.2x)
   - These become features AND validation tools

**Output:** Updated `athlete_profile.csv` with cross-distance features

**Estimated effort:** 4-6 hours

### Step 1.3 — Re-run Clustering with All Distances

**Input:** Updated `athlete_profile.csv`

**Tasks:**
1. Re-run the HDBSCAN/GMM clustering from `02_unsupervised.ipynb` but include athletes whose only races are Olympic/Sprint
2. These athletes should fall into existing clusters (the cluster features — strength Z-scores, consistency, experience — are distance-agnostic)
3. Validate: do Olympic-only athletes distribute across clusters similarly to 70.3/140.6 athletes? If not, consider distance as a clustering feature
4. Re-run pacing archetype discovery per distance (split ratios differ by distance)

**Output:** Updated `cluster_assignments.csv` and `pacing_archetypes.csv`

**Estimated effort:** 3-4 hours

---

## Phase 2: Train Models for All Distances

### Step 2.1 — Train XGBoost Tuned (4 models)

**Input:** Full feature set from `athlete_race.csv` + `athlete_profile.csv` + `cluster_assignments.csv`

**Tasks:**
1. Train one XGBoost model per distance: Sprint, Olympic, 70.3, 140.6
2. Use the same feature set as the research phase:
   ```
   Features: pb_total_sec, gender_enc, age_band, cluster_id,
             run_strength_z, bike_strength_z, swim_strength_z,
             total_races, country_enc, consistency_cv, year,
             improvement_slope, dnf_rate
   ```
3. For Sprint and Olympic, add `cross_distance_factor` as a feature when the athlete has raced at another distance
4. Hyperparameter tuning with Optuna (same protocol as research):
   - 5-fold CV grouped by athlete_hash
   - 80/10/10 split stratified by gender × age_band
   - Early stopping on validation RMSE
5. For Sprint (109K records): use stronger regularization — increase `min_child_weight`, `lambda`, `alpha`. Consider `subsample=0.8` to prevent overfitting on the smaller dataset
6. Record all metrics: MAE (sec + min), MAPE, R² on test set

**Expected performance (hypothesis):**
| Distance | Expected MAE (min) | Expected R² | Notes |
|----------|-------------------|-------------|-------|
| Sprint | 3-5 | 0.75-0.85 | Smaller dataset, shorter races = tighter distribution |
| Olympic | 5-8 | 0.80-0.87 | Decent data, moderate variance |
| 70.3 | 12 | 0.86 | Proven from research |
| 140.6 | 20 | 0.89 | Proven from research |

**Output:** 4 XGBoost model files + evaluation metrics CSV

**Estimated effort:** 6-8 hours (mostly waiting for Optuna tuning)

### Step 2.2 — Train Quantile Models (4 distances × 5 quantiles)

**Input:** Same feature set as Step 2.1

**Tasks:**
1. For each distance, train 5 XGBoost models with `objective='reg:quantile'` at τ = {0.05, 0.25, 0.50, 0.75, 0.95}
2. Use the same hyperparameters as the point prediction model (Step 2.1) with minor adjustments for quantile loss
3. Validate quantile crossing: ensure p05 < p25 < p50 < p75 < p95 for all predictions. If crossing occurs, apply isotonic regression post-hoc to enforce monotonicity
4. Evaluate coverage: does the 90% interval (p05–p95) actually contain 90% of test actuals?

**Output:** 20 quantile model files (4 distances × 5 quantiles) + coverage evaluation

**Estimated effort:** 4-5 hours

### Step 2.3 — Train LightGBM and Random Forest (Support Models)

**Why:** Since speed isn't a constraint, the ensemble is viable. LightGBM and RF are the next-best models after XGBoost Tuned. Including them in the ensemble may recover the 1-2% gain that was dismissed in Plan 09.

**Input:** Same feature set

**Tasks:**
1. Train LightGBM and Random Forest for each distance (8 models total)
2. Use Optuna tuning for LightGBM, grid search for RF
3. Record predictions on the held-out validation fold (these become meta-features for the ensemble)
4. Do NOT train CatBoost, Ridge, or the broken Bayesian model — they don't add value

**Output:** 8 model files + out-of-fold predictions

**Estimated effort:** 4-5 hours

### Step 2.4 — Retrain MLP Embedding Network (All Distances)

**Input:** Full `athlete_race.csv` (all 4.1M records across all distances)

**Tasks:**
1. Retrain the PyTorch MLP from `05_embeddings.ipynb` on all distances
2. Add `event_distance` as an embedding input (already in the architecture but may need retraining)
3. The MLP is used for embeddings only (not prediction) — train with the multi-task loss but evaluate embedding quality via:
   - Nearest-neighbor retrieval: "does the same athlete's races cluster together in embedding space?"
   - Cross-distance transfer: "are an athlete's Sprint and 70.3 embeddings close?"
4. Export updated embeddings for all athletes

**Output:** Updated `athlete_embeddings.csv`, `embedding_model.pt`

**Estimated effort:** 3-4 hours (training ~30 min on CPU, rest is validation)

### Step 2.5 — Train DNF Risk Models

**Input:** CoachCox dataset (has `finish_status` field) — filter to each distance

**Tasks:**
1. Train one XGBoost classifier per distance for DNF prediction
2. Features: same as time prediction + predicted_total_sec (from Step 2.1) + course_attrition_rate
3. Calibrate probabilities using Platt scaling on held-out set
4. Evaluate: ROC-AUC, precision-recall, calibration curves
5. Note: Sprint/Olympic may have very low DNF rates (<2%), making the classifier less useful for those distances. Evaluate whether it's worth shipping for shorter distances

**Output:** 4 DNF classifier model files + calibration parameters

**Estimated effort:** 3-4 hours

### Step 2.6 — Build Ensemble Meta-Learner

**Input:** Out-of-fold predictions from XGBoost Tuned, LightGBM, RF (Step 2.1-2.3)

**Tasks:**
1. For each distance, train a Ridge regression meta-learner that combines:
   ```
   meta_features = [
       xgb_tuned_prediction,
       lgb_prediction,
       rf_prediction,
       xgb_quantile_p50,
       xgb_quantile_iqr,     # p75 - p25 (spread signal)
       n_prior_races,         # data richness indicator
       input_tier,            # 0-5 tier level
   ]
   ```
2. Use out-of-fold predictions only (not in-sample) to prevent leakage
3. Compare ensemble Ridge vs. ensemble LightGBM (as in research phase)
4. Evaluate: does the ensemble beat XGBoost Tuned alone? By how much per distance?
5. If the ensemble doesn't beat XGB Tuned on Sprint/Olympic (likely due to smaller data), fall back to XGB Tuned alone for those distances

**Output:** 4 meta-learner models + ensemble evaluation metrics

**Estimated effort:** 3-4 hours

---

## Phase 3: Cross-Distance Transfer System

### Step 3.1 — Distance Transfer Model

**Why:** A user might say "I ran a 2:45 Olympic last month, what will my 70.3 be?" This is a core use case that the single-distance models can't handle directly.

**Input:** Athletes with races at multiple distances (estimated 50-100K athletes)

**Tasks:**
1. Build a dataset of paired observations: same athlete, different distances
2. For each pair, compute the time ratio (e.g., 70.3_total / olympic_total)
3. Model the ratio as a function of: athlete features (age, gender, discipline strengths, cluster), source distance, target distance
4. Train a small XGBoost regressor to predict the ratio
5. At inference: user provides one race time → predict ratio → multiply to get target distance prediction → use as `pb_total_sec` in the main model

**Transfer matrix (expected medians, to be validated):**
| From → To | Sprint | Olympic | 70.3 | 140.6 |
|-----------|--------|---------|------|-------|
| Sprint | 1.0 | ~2.0 | ~4.5 | ~9.5 |
| Olympic | ~0.5 | 1.0 | ~2.2 | ~4.8 |
| 70.3 | ~0.22 | ~0.45 | 1.0 | ~2.15 |
| 140.6 | ~0.11 | ~0.21 | ~0.47 | 1.0 |

Note: These ratios vary significantly by athlete type. A strong swimmer's ratio will differ from a strong runner's. The model captures this.

**Output:** Distance transfer model + validated transfer ratios

**Estimated effort:** 4-5 hours

### Step 3.2 — Unified Cold-Start Feature Imputer

**Why:** A Sprint athlete with no 70.3 history needs a `pb_total_sec` estimate for the 70.3 model. The transfer model from Step 3.1 provides this.

**Input:** Transfer model + cluster centroids + cohort medians per distance

**Tasks:**
1. Build the imputation logic for each tier:
   ```
   Tier 0 (no info):
     → pb_total_sec = cohort_median[gender][age_band][target_distance]
     → all strength z-scores = 0 (cluster centroid of largest cluster)

   Tier 1 (gender + age):
     → Assign to nearest cluster via 2-3 screening questions
     → pb_total_sec = cluster_median[cluster][gender][age_band][target_distance]
     → strength z-scores = cluster_centroid values

   Tier 2 (one race time, possibly different distance):
     → If same distance: pb_total_sec = that time
     → If different distance: apply transfer model to convert
     → Recompute implied percentile → refine cluster assignment
     → Fill strength z-scores from implied performance

   Tier 3 (fitness metrics — FTP/CSS/threshold):
     → Use physics model (Plan 06) to estimate segment times
     → Convert to implied total → treat as Tier 2 with high confidence
     → Add physics_prediction as ensemble feature

   Tier 4 (specific target race):
     → Add course_difficulty, weather features
     → Narrow uncertainty based on course-specific calibration

   Tier 5 (multiple race results):
     → Full feature set populated from history
     → Embedding-based similarity enabled
   ```
2. Implement as a deterministic function: `impute_features(user_input, tier) → feature_vector`
3. Validate by simulating each tier on the test set:
   - For Tier 2 validation: take athletes with 70.3 + Olympic races, hide the 70.3, use Olympic time to predict 70.3 via transfer model, compare to actual
   - For Tier 1 validation: hide everything, use only demographics, measure MAE

**Output:** Feature imputation module with validated accuracy per tier

**Estimated effort:** 6-8 hours

---

## Phase 4: Conformal Calibration

### Step 4.1 — Split Conformal Prediction

**Input:** Held-out calibration set (10% of data, separate from train/val/test)

**Tasks:**
1. For each distance, compute residuals on the calibration set: `residual = actual - predicted`
2. Compute the empirical quantiles of the absolute residuals at each confidence level (80%, 90%, 95%)
3. Store as a simple lookup table:
   ```
   calibration_table[distance][confidence_level] = residual_quantile
   ```
4. At inference: `prediction_interval = prediction ± calibration_table[distance][confidence]`
5. Validate coverage on a separate test set: the 90% interval should contain ~90% of actuals
6. Stratify by tier: cold-start users will have wider intervals than Tier 5 users. Compute separate calibration tables per tier if coverage varies significantly

**Output:** Calibration lookup tables per distance × tier

**Estimated effort:** 2-3 hours

### Step 4.2 — Quantile Calibration

**Input:** Quantile model predictions (Step 2.2) on calibration set

**Tasks:**
1. For each quantile τ, check: what fraction of actuals fall below the τ-quantile prediction?
2. If miscalibrated (e.g., the p25 prediction actually has 30% of actuals below it), apply isotonic regression to correct
3. Store calibration mapping: `calibrated_quantile = isotonic_transform(raw_quantile)`

**Output:** Isotonic calibration functions per distance × quantile

**Estimated effort:** 2-3 hours

---

## Phase 5: Segment-Level Prediction

### Step 5.1 — Split Ratio Predictor

**Why:** Users need swim/bike/run split predictions for pacing. Rather than chaining models (which degrades accuracy), predict total time (strong model) then predict split ratios separately, and multiply.

**Input:** All race records with split times

**Tasks:**
1. For each distance, compute split ratios: `swim_pct = swim_sec / total_sec`, etc.
2. Train a multi-output XGBoost to predict `[swim_pct, bike_pct, run_pct]` from the same athlete features
3. At inference: `predicted_swim_sec = predicted_total_sec × predicted_swim_pct`
4. Validate: compare split MAE from this approach vs. the chained model (Step 2.1 research)
5. Add pacing archetype as a feature: a "Conservative Bike / Strong Run" athlete will have different ratios than an "Aggressive Bike / Heavy Fade"

**Alternative approach if ratio prediction isn't accurate enough:**
- Train independent XGBoost models per segment (swim, bike, run) with `predicted_total_sec` as a feature
- Constrain: `predicted_swim + predicted_bike + predicted_run ≈ predicted_total` (allow small residual for transitions)

**Output:** Split ratio models or independent segment models per distance

**Estimated effort:** 4-6 hours

---

## Phase 6: Physics Model Integration (Tier 3+)

### Step 6.1 — Wire Physics Model as Ensemble Feature

**Input:** Physics model from Plan 06 (`bike-physics.ts`, enhanced swim/run)

**Tasks:**
1. For users who provide FTP/CSS/threshold pace, run the physics model to generate `physics_predicted_total_sec`
2. Add this as an additional feature to the ensemble meta-learner
3. Retrain the meta-learner with `physics_prediction` as an optional feature (set to NaN/0 when not available)
4. Validate: does adding physics prediction improve MAE for Tier 3+ users?
5. If physics provides significant lift for Tier 3+, create a separate meta-learner variant that includes it

**Output:** Updated ensemble meta-learner with physics integration

**Estimated effort:** 3-4 hours

---

## Phase 7: LLM Coaching Layer

### Step 7.1 — Structured Prompt Template

**Input:** Prediction bundle (total time, splits, quantiles, DNF risk, similar athletes, cluster, pacing archetype)

**Tasks:**
1. Design the JSON schema for the prediction bundle that feeds the LLM:
   ```json
   {
     "athlete": {
       "tier": 2,
       "gender": "M",
       "age_group": "40-44",
       "cluster": "WeakRun_Fader",
       "pacing_archetype": "Aggressive Bike",
       "strengths": { "swim": 0.3, "bike": 0.8, "run": -0.5 },
       "prior_races": 3
     },
     "prediction": {
       "total_sec": 19800,
       "swim_sec": 2100,
       "bike_sec": 9720,
       "run_sec": 6600,
       "t1_sec": 180,
       "t2_sec": 120,
       "quantiles": { "p05": 17200, "p25": 18500, "p50": 19800, "p75": 21200, "p95": 23500 },
       "confidence": "moderate"
     },
     "risk": {
       "dnf_probability": 0.08,
       "flags": ["run_fade_risk", "heat_stress"],
       "fade_prediction_pct": 12
     },
     "race": {
       "name": "Ironman 70.3 Marbella",
       "distance": "70.3",
       "course_difficulty": 1.15,
       "temperature_c": 31,
       "humidity_pct": 65
     },
     "similar_athletes": {
       "count": 847,
       "median_total": 19500,
       "pacing_pattern": "conservative bike athletes finished 3% faster"
     }
   }
   ```
2. Write the system prompt for Claude API that:
   - Defines the coaching persona (experienced age-group coach, not sport scientist)
   - Sets tone (encouraging, practical, no jargon)
   - Specifies output sections: race strategy, pacing targets, nutrition plan, risk warnings, "athletes like you"
   - Includes guardrail rules (numbers must match model predictions ±5%, nutrition within evidence ranges)
3. Write 3-5 few-shot examples of good race plans for different athlete types and distances
4. Test with 20+ diverse scenarios across all 4 distances and validate output quality

**Output:** Prompt template + few-shot examples + validation results

**Estimated effort:** 8-10 hours (prompt engineering is iterative)

### Step 7.2 — Distance-Specific Coaching Nuances

**Tasks:**
1. Sprint-specific coaching: emphasis on pacing discipline (people go too hard), brick transition, no nutrition needed beyond water
2. Olympic-specific: moderate nutrition (gels on bike), run off the bike, draft-legal vs. non-drafting pacing differences
3. 70.3-specific: nutrition planning, bike conservation for the half marathon, heat management
4. 140.6-specific: detailed nutrition schedule, marathon-specific pacing, mental strategy for hours 8-12, special needs bag planning
5. Encode distance-specific rules in the prompt template so the LLM generates appropriate advice

**Output:** Distance-specific prompt additions

**Estimated effort:** 3-4 hours

---

## Phase 8: Production Export & Serving

### Step 8.1 — Model Export

**Tasks:**
1. Export all XGBoost models in ONNX format for cross-platform serving:
   - 4 point prediction models (Sprint, Olympic, 70.3, 140.6)
   - 20 quantile models (4 distances × 5 quantiles)
   - 4 DNF classifiers
   - 4 split ratio models
   - 1 distance transfer model
   - 4 ensemble meta-learners
   - **Total: ~37 model files**
2. Export MLP embedding model as ONNX (from PyTorch)
3. Export all lookup tables as JSON:
   - Conformal calibration tables
   - Isotonic calibration functions
   - Cluster centroids
   - Cohort medians per distance × gender × age_band
   - Feature imputation defaults
4. Export the FAISS index for embedding similarity search
5. Version all artifacts with a timestamp and git hash

**Output:** Model artifact bundle ready for deployment

**Estimated effort:** 4-5 hours

### Step 8.2 — Inference Pipeline Code

**Tasks:**
1. Write the prediction function that orchestrates the full pipeline:
   ```
   function predict(user_input):
     tier = classify_tier(user_input)
     features = impute_features(user_input, tier)

     # Core predictions (per distance)
     xgb_pred = xgb_model[distance].predict(features)
     lgb_pred = lgb_model[distance].predict(features)
     rf_pred = rf_model[distance].predict(features)

     # Ensemble
     meta_features = [xgb_pred, lgb_pred, rf_pred, ...]
     if tier >= 3 and physics_available:
       meta_features.append(physics_prediction)
     ensemble_pred = meta_learner[distance].predict(meta_features)

     # Quantiles + calibration
     quantiles = {q: quantile_model[distance][q].predict(features) for q in [5,25,50,75,95]}
     quantiles = calibrate_quantiles(quantiles, distance, tier)

     # Splits
     split_ratios = split_model[distance].predict(features)
     splits = {seg: ensemble_pred * ratio for seg, ratio in split_ratios}

     # DNF risk
     dnf_features = features + [ensemble_pred]
     dnf_prob = dnf_model[distance].predict_proba(dnf_features)

     # Similar athletes
     if tier >= 2:
       embedding = mlp_model.embed(features)
       similar = faiss_index.search(embedding, k=50)

     # Bundle
     return PredictionBundle(ensemble_pred, splits, quantiles, dnf_prob, similar)
   ```
2. Write unit tests for each component
3. Write integration tests for end-to-end scenarios per tier and distance

**Output:** Production inference code + test suite

**Estimated effort:** 10-12 hours

### Step 8.3 — Validation & Backtesting

**Tasks:**
1. Run the full backtesting protocol from Plan 07 Section 11.2 on all 4 distances
2. Evaluate stratified performance:
   - By tier (0-5): cold-start vs. data-rich
   - By distance: Sprint, Olympic, 70.3, 140.6
   - By finish bracket: fast, mid-pack, back-of-pack
   - By gender and age group
3. Specifically validate cross-distance transfer (Step 3.1):
   - Take athletes with both Olympic and 70.3 results
   - Hide the 70.3 result, predict from Olympic time only
   - Compare accuracy to Tier 1 (demographics only) baseline
4. Compute the "progressive improvement" metric: how much does MAE improve as we go from Tier 0 → Tier 5?
5. Generate a comprehensive evaluation report with charts

**Output:** Evaluation report with performance tables and charts

**Estimated effort:** 6-8 hours

---

## Phase 9: Sprint and Olympic Specific Considerations

### 9.1 — Sprint Distance Handling

**Challenges:**
- Only 109K records — ~20x smaller than 70.3
- Draft-legal racing in many Sprint events changes bike dynamics
- Race times are short (60-120 min) so absolute error must be proportionally smaller
- Many Sprint athletes are true beginners with no prior races

**Mitigations:**
1. **Transfer learning:** Pre-train on the full 4.1M record dataset with distance as a feature, then fine-tune on Sprint-only data. XGBoost doesn't natively support fine-tuning, so instead: use the full-dataset model as a feature generator (its predictions become a meta-feature for the Sprint-specific model)
2. **Regularization:** Stronger regularization than 70.3/140.6 models to prevent overfitting
3. **Cold-start is the norm:** Most Sprint athletes are beginners. The Tier 1 imputation must be especially good for Sprint. Consider a Sprint-specific screening question: "Is this your first triathlon?"
4. **Transitions matter more:** T1+T2 can be 5-10% of total Sprint time vs. 1-2% for 140.6. Model transition times explicitly for Sprint

### 9.2 — Olympic Distance Handling

**Challenges:**
- 257K records is decent but still 8x smaller than 70.3
- Olympic has more variance in race format (draft-legal vs. non-drafting, varying swim distances)
- Some Olympic records may include relay events (filter these out — 29 records flagged as `olympic-relay`)

**Mitigations:**
1. **Same transfer learning approach as Sprint**
2. **Draft-legal flag:** If detectable from event metadata, add as a feature (draft-legal bike is ~2-3 min faster)
3. **Cross-distance signal:** Many Olympic athletes also race 70.3. The cross-distance transfer model (Step 3.1) is especially valuable here

---

## Implementation Schedule

| Phase | Description | Depends On | Effort | Calendar |
|-------|-------------|-----------|--------|----------|
| **1** | Extend data pipeline (Olympic/Sprint) | — | 10-15 hrs | Week 1 |
| **2** | Train all models (4 distances) | Phase 1 | 25-30 hrs | Week 2-3 |
| **3** | Cross-distance transfer system | Phase 2 | 10-13 hrs | Week 3 |
| **4** | Conformal calibration | Phase 2 | 4-6 hrs | Week 3 |
| **5** | Segment-level prediction | Phase 2 | 4-6 hrs | Week 4 |
| **6** | Physics model integration | Phase 2 | 3-4 hrs | Week 4 |
| **7** | LLM coaching layer | Phase 5 | 11-14 hrs | Week 4-5 |
| **8** | Production export & serving | Phase 2-7 | 20-25 hrs | Week 5-6 |
| **9** | Sprint/Olympic specific tuning | Phase 2 | 4-6 hrs | Week 3 |
| | **Total** | | **~90-120 hrs** | **~6 weeks** |

### Critical Path

```
Phase 1 (data) → Phase 2 (models) → Phase 3 (transfer) ─┐
                                   → Phase 4 (calibration)├→ Phase 8 (production)
                                   → Phase 5 (segments) ──┤
                                   → Phase 6 (physics) ───┤
                                   → Phase 9 (Sprint/Oly) ┘
                                   → Phase 7 (LLM) ──────→ Phase 8 (production)
```

Phases 3, 4, 5, 6, 7, 9 can run in parallel after Phase 2 completes.

---

## Final Model Inventory

| Component | Count | Purpose |
|-----------|-------|---------|
| XGBoost Tuned (point prediction) | 4 | Core predictor per distance |
| XGBoost Quantile | 20 | Uncertainty bands (5 quantiles × 4 distances) |
| LightGBM | 4 | Ensemble member |
| Random Forest | 4 | Ensemble member |
| Ensemble Meta-Learner (Ridge) | 4 | Combines base models |
| Split Ratio Predictor | 4 | Swim/bike/run split estimation |
| DNF Risk Classifier | 4 | Finish probability |
| Distance Transfer Model | 1 | Cross-distance prediction |
| MLP Embedding Network | 1 | "Athletes like you" similarity |
| FAISS Similarity Index | 1 | Fast nearest-neighbor lookup |
| Conformal Calibration Tables | 4 | Coverage guarantee |
| Isotonic Calibration Functions | 20 | Quantile correction |
| Cluster Centroids | 1 | Cold-start imputation |
| Cohort Medians | 1 | Tier 0-1 fallback |
| **Total model artifacts** | **~72** | |

---

## Success Criteria

| Metric | Sprint | Olympic | 70.3 | 140.6 |
|--------|--------|---------|------|-------|
| MAE (min) | <5 | <8 | <12 | <20 |
| MAPE | <5% | <5% | <5% | <4% |
| R² | >0.75 | >0.80 | >0.85 | >0.88 |
| 90% coverage | 88-92% | 88-92% | 88-92% | 88-92% |
| DNF AUC | >0.70 | >0.70 | >0.75 | >0.75 |
| Cold-start MAE (Tier 1) | <8 | <12 | <18 | <30 |
| Transfer MAE (Tier 2, cross-distance) | <6 | <10 | <15 | <25 |

These targets are based on the research phase results (70.3 and 140.6 already meet them) and proportional scaling for shorter distances.
