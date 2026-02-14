# Plan 08: Advanced Models — Future Computationally Expensive Approaches

> **Prerequisite:** These approaches come AFTER Plan 07 is validated. They require the cleaned data pipeline, working ensemble, and proven baseline from the initial modeling phase. Don't start here.

---

## 1. Transformer Sequence Model for Repeat Athletes

### Why

For athletes with 3+ race results, their performance trajectory over time contains signal that a flat feature set can't capture: improvement curves, seasonal patterns, taper effects, how they respond to different courses, whether they're declining or peaking. A Transformer's self-attention can weight recent races vs. historical ones, naturally.

### Architecture

```
Race History Sequence (per athlete, chronological):
[Race₁, Race₂, ..., Raceₙ] → predict Raceₙ₊₁

Each Raceᵢ token:
  - Athlete embedding (from MLP in Plan 07, frozen)
  - Race embedding (distance + course difficulty + weather)
  - Time features (swim, bike, run, total — normalized)
  - Positional encoding (race sequence number)
  - Time encoding (days since first race)

Transformer Encoder (4 layers, 4 heads, dim=64):
  → Self-attention over race history
  → Captures improvement trends, consistency, distance adaptation

Output head:
  → Dense → [predicted swim, bike, run, total for next race]
  → With aleatoric uncertainty (predict mean + log_variance)
```

### Training Data

Filter to athletes with ≥3 races in TriStat + CoachCox (~150K athletes). Hold out most recent race per athlete for validation.

### Why Wait

- Needs the cleaned `athlete_race.csv` and `athlete_profile.csv` from Plan 07's ETL
- Needs to prove the MLP embeddings work first (Plan 07 Phase 4)
- Compute cost: ~4-8 hours of GPU training per experiment
- Only benefits users at Tier 5 (those with uploaded race history) — currently <5% of expected traffic
- The XGBoost ensemble in Plan 07 may already handle this adequately via `improvement_slope` and `consistency_cv` features

### Expected Improvement

+2-5% R² over the Plan 07 ensemble for repeat athletes (3+ races). Minimal improvement for cold-start users.

---

## 2. Graph Neural Network for Course-Athlete Interaction

### Why

The sparsity problem: most athletes have raced only 1-3 of the 195+ courses in our data. A GNN can propagate information through the bipartite graph of athletes↔courses. "Athletes similar to you who raced Course X finished in Y time" — but computed via learned message passing, not simple nearest-neighbor lookup.

### Graph Structure

```
Athlete nodes: embedding from MLP (dim 32)
Course nodes: course difficulty, elevation profile, weather averages
Edges: athlete raced course (edge weight = finish time)

Bipartite graph: ~500K athlete nodes, ~195 course nodes, ~4.9M edges
```

### Method

GraphSAGE or GAT for edge regression (predict finish time given athlete node + course node).

### Why Wait

- Requires frozen MLP embeddings (Plan 07)
- Requires a course feature set that goes beyond just difficulty factor (elevation profile, typical weather, sea level, etc.) — data we don't have yet
- GNN frameworks (DGL, PyG) add significant complexity to the stack
- The existing `course_difficulty` feature in XGBoost may capture 80%+ of this signal already
- Most age-groupers race at 1-3 local events — the cold-start problem applies to courses too

### Expected Improvement

+1-3% R² for cross-course prediction. Most valuable for: "I've raced at X, now I'm doing Y for the first time — how will it compare?"

---

## 3. Fine-Tuned LLM for Race Coaching

### Why

The Plan 07 LLM layer uses prompt engineering with Claude API. A fine-tuned model could produce more consistent, domain-specific coaching narratives with lower latency and cost. It could also learn from user feedback over time (RLHF on coaching quality ratings).

### Approach

1. **Data collection phase:** Gather user ratings on generated race plans (thumbs up/down + free-text feedback)
2. **Synthetic preference data:** Generate multiple race plans for the same scenario with different prompts, rank them with sports science experts
3. **Fine-tuning:** DPO (Direct Preference Optimization) on a smaller model (e.g., Llama 3 8B) using the preference data
4. **Deployment:** Self-hosted fine-tuned model for cost optimization, Claude API as fallback

### Why Wait

- Need real user feedback first (can't fine-tune on synthetic preferences alone)
- Prompt engineering may be "good enough" for launch
- Fine-tuning infrastructure (GPU training, model hosting) is a significant ops burden
- Anthropic may release better models that make fine-tuning unnecessary
- Priority: get the ML predictions right first, then optimize the narrative layer

### Expected Improvement

Lower latency (local inference vs API), lower cost per prediction, more consistent coaching tone, ability to learn from user feedback.

---

## 4. Conformal Prediction & Calibration

### Why

ML models often produce overconfident prediction intervals. Conformal prediction provides distribution-free coverage guarantees: "I promise that 90% of actual finish times fall within this interval."

### Methods

1. **Split conformal prediction:** Use a calibration set to compute residual quantiles, then wrap any point predictor with a guaranteed-coverage interval
2. **Conformalized quantile regression:** Apply conformal correction to the quantile forest from Plan 07
3. **Temperature scaling:** On neural network outputs
4. **Isotonic regression:** On quantile forest outputs
5. **Reliability diagrams:** Evaluate predicted vs observed quantiles

### Why Wait

- Needs the full ensemble to be built first (Plan 07 complete)
- Calibration is a polish step — the raw prediction quality matters more at this stage
- The Bayesian model in Plan 07 already provides principled intervals
- Can be added as a post-processing step without changing the model architecture

### Expected Improvement

Better calibrated uncertainty bands. Users trust the system more when "90% confidence interval" actually captures 90% of outcomes.

---

## 5. Automated Retraining & Model Monitoring

### Why

As new race seasons produce fresh data and user behavior drifts, models need periodic retraining.

### Components

- **Data drift detection:** Compare new race time distributions to training data
- **Prediction monitoring:** Track MAE/MAPE on recent predictions vs actual results
- **Automated retraining trigger:** When drift exceeds threshold, retrain pipeline
- **A/B testing framework:** Compare old vs new model on live traffic
- **Model versioning:** Track which model version produced each prediction

### Why Wait

- No live traffic yet — nothing to monitor
- Manual retraining on a quarterly cadence is fine initially
- MLOps infrastructure (MLflow, Airflow, etc.) is significant overhead
- Focus on getting a good model first, operationalize later

---

## 6. Implementation Priority (When To Start Each)

```
Plan 07 complete (initial modeling validated)
  │
  ├── Immediate (first live user feedback):
  │   └── Conformal Prediction (Section 4) — low effort, high trust value
  │
  ├── After 1,000+ users with race history uploaded:
  │   └── Transformer Sequence Model (Section 1) — enough Tier 5 users to justify
  │
  ├── After user feedback ratings collected:
  │   └── Fine-Tuned LLM (Section 3) — need preference data first
  │
  ├── After course data enriched (elevation, weather):
  │   └── GNN Course-Athlete (Section 2) — need better course features
  │
  └── After first model refresh:
      └── Automated Retraining (Section 5) — once process is proven manually
```
