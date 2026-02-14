# RaceDayAI: Data-Driven Transformation Plan

**From Heuristic Rules to Statistical Models**

February 2026 | Version 1.0

---

## 1. Executive Summary

RaceDayAI currently generates race plans using hardcoded heuristic rules (fixed intensity factors, step-function nutrition models, simple fatigue multipliers). While functional, these rules have no empirical validation, ignore individual variance, and cannot improve over time. This plan outlines a phased transformation to make the product genuinely data-driven, backed by real race results from hundreds of thousands of finishers.

The core thesis: by ingesting 840,000+ publicly available Ironman 70.3 race records (and scraping additional full-distance and Challenge Family results), we can build regression models that predict realistic finish times, validate our pacing recommendations against actual performance distributions, and give users confidence intervals rather than single-point estimates.

**What changes for the user:**

- Predictions grounded in real data from athletes who match their profile (age, gender, distance)
- Confidence bands showing the range of likely outcomes (e.g., 70th-90th percentile for their cohort)
- Pacing split recommendations derived from actual race-day split distributions, not textbook IF values
- A credibility layer: "Based on analysis of 12,847 athletes in your age group at similar distances"

---

## 2. Current State: Where the Heuristics Fall Short

An honest audit of the current pacing and nutrition engines reveals several areas where hardcoded rules diverge from empirical reality.

### 2.1 Bike Pacing Engine

The current engine uses fixed Intensity Factor (IF) thresholds by distance bucket: Sprint = 0.92, Olympic = 0.88, 70.3 = 0.78, 140.6 = 0.70. The speed estimate uses a crude cubic-root heuristic: `Speed = 5.8 * Power^(1/3)`.

**Issues identified:**

- IF values are single-point estimates with no variance modeling. A 25-year-old elite and a 55-year-old beginner both get IF=0.78 for a 70.3 bike leg.
- The speed formula ignores CdA (aerodynamic drag area), rolling resistance, rider weight, wind, and altitude. Errors of 15-20% are plausible.
- Elevation adjustment is a binary 2% reduction if steepness > 10 m/km. Real courses have varied profiles requiring gradient-weighted power models.
- No drafting consideration for non-draft-legal vs draft-legal races.

### 2.2 Run Pacing Engine

Uses step-function fatigue factors based on bike TSS: TSS>250 = +10%, TSS>200 = +8%, TSS>150 = +5%, else +2%. A separate binary distance factor adds +10% for marathon distance.

**Issues identified:**

- The TSS-to-fatigue relationship is not linear and these thresholds are arbitrary. Real fatigue depends on muscle glycogen depletion, heat accumulation, and pacing strategy.
- No modeling of positive/negative splits. Most age-groupers slow by 8-15% in the second half of an Ironman marathon, but the model assumes even pacing.
- No temperature or humidity adjustment on run pace despite the run being the most heat-affected discipline.

### 2.3 Swim Pacing Engine

Applies a flat +2% over CSS for standard distance, +5% for distances over 2,000m. No consideration of open-water factors.

**Issues identified:**

- Ignores wetsuit advantage (typically 5-8% speed improvement), water temperature effects, and current/chop conditions.
- CSS measured in a pool is a poor predictor of open-water performance without correction factors for sighting, drafting, and mass starts.

### 2.4 Nutrition Model

Uses duration-based step functions for carbs (50/60/80/90 g/hr) and temperature-based steps for fluids (500/750/1000 ml/hr) and sodium (500/800/1000 mg/hr).

**Issues identified:**

- Does not account for body weight in carb recommendations. A 55kg female and 95kg male receive identical guidance.
- Humidity is not factored into fluid/sodium calculations despite being as important as temperature for sweat rate.
- No consideration of race intensity: a higher-IF bike effort increases caloric burn and sweat rate significantly.

---

## 3. Available Data Sources

Three tiers of data are available, ranging from immediately usable to requiring engineering effort.

### 3.1 Tier 1: Immediately Available (Kaggle)

| Attribute | Details |
|-----------|---------|
| **Dataset** | Ironman 70.3 Race Data 2004-2020 |
| **Records** | 840,075 individual race results |
| **License** | CC0 Public Domain (free, no restrictions) |
| **Fields** | Gender, AgeGroup, AgeBand (8-85), Country, EventYear, EventLocation (195+ venues), SwimTime, TransitionTime, BikeTime, RunTime |
| **Quality** | Pre-cleaned, 9.41/10 usability score. Originally scraped from ironman.com. |
| **Limitation** | Half-distance only. No full Ironman (140.6). No power/pace data (only times). |

This dataset alone enables: split ratio analysis (swim:bike:run proportions by age/gender), finish time distribution modeling, fade rate analysis (how much slower is the run relative to standalone run fitness), and course-specific benchmarking across 195+ venues.

### 3.2 Tier 2: Scrapeable with Engineering (Ironman.com + Challenge Family)

The Kaggle dataset was originally scraped from ironman.com, proving it is technically feasible. For full Ironman distance results and post-2020 data, we would need to build or adapt a scraper.

**Recommended tools:**

| Tool | Type | Cost | Best For |
|------|------|------|----------|
| **Firecrawl** | SaaS API | Free tier + paid | AI-powered structured extraction from JS-heavy sites. 81K GitHub stars. |
| **Crawl4AI** | Open-source | Free | LLM-friendly crawler, Apache 2.0 license. 60K+ stars. Handles JS rendering. |
| **Scrapy + Splash** | Framework | Free | Production-grade pipeline for ongoing scraping schedules. |

**Legal note:** Race times are factual data and generally not copyrightable. However, athlete PII (names) should be stripped during ingestion. We recommend anonymization at the scraping stage, retaining only: gender, age/age-group, country, split times, event, and year.

### 3.3 Tier 3: User-Contributed Data (Strava/Garmin Integration)

RaceDayAI already has OAuth integrations with Strava and Garmin. With user consent, we can build a longitudinal dataset of training load (weekly TSS, volume) mapped to race outcomes. This is the highest-value data because it connects inputs (training) to outputs (race performance) at the individual level.

- Strava API: Recent activities, FTP estimates, pace data, HR data
- Garmin API: Activities, daily summaries, body composition, resting HR
- RaceDayAI internal: Plan vs. actual comparisons (if users report their results)

---

## 4. Proposed Statistical Models

We propose five models, each replacing or augmenting a specific heuristic in the current engine. Models are ordered by implementation priority and impact.

### 4.1 Model 1: Finish Time Distribution by Cohort

**Purpose: Replace single-point time estimates with distributional predictions.**

Instead of telling a user "your estimated bike time is 2:47:00", we tell them "athletes in your cohort (Male, 35-39, 70.3) have a median bike split of 2:45 with a 25th-75th percentile range of 2:31-3:04. Based on your FTP, you are projected at the 68th percentile."

**Method:**

1. Segment the 840K Kaggle records by Gender x AgeGroup x Distance. This yields cohort-level distributions for swim, bike, run, and total time.
2. Fit parametric distributions (log-normal is typical for race times) to each cohort. Store distribution parameters (mu, sigma) in a lookup table.
3. Map user fitness inputs to a percentile within their cohort distribution. For example: FTP of 250W for a Male 35-39 maps to approximately the 72nd percentile of bike splits.
4. Return the predicted time plus confidence interval (e.g., 80% CI) rather than a point estimate.

*Data required: Kaggle dataset (available now). No scraping needed.*

*Complexity: Low-Medium. Core analysis can be done in Python (scipy.stats, pandas). Results stored as a JSON lookup.*

### 4.2 Model 2: Split Ratio Regression

**Purpose: Replace hardcoded intensity factors with data-derived split proportions.**

Current IF values (0.78 for 70.3 bike, etc.) are not grounded in data. Instead, we can compute the actual ratio of swim:bike:run splits from race data and use these as pacing targets.

**Method:**

1. For each race record, compute split ratios: BikeTime/TotalTime, RunTime/TotalTime, SwimTime/TotalTime.
2. Analyze how these ratios vary by: finishing percentile (fast vs slow finishers pace differently), age group, gender, and course (hilly vs flat venues).
3. Key insight to validate: Do faster finishers have lower bike:run ratios (i.e., they pace the bike more conservatively and run faster)? This is the conventional wisdom but has rarely been proven at scale.
4. Build a regression: `SplitRatio = f(TargetPercentile, AgeGroup, Gender, CourseProfile)`. Use this to recommend how aggressively to pace each leg.

*Data required: Kaggle dataset. Enhanced with course elevation data from GPX files if available.*

*Complexity: Medium. Requires quantile regression or gradient boosting.*

### 4.3 Model 3: Run Fade Predictor

**Purpose: Replace the arbitrary TSS-based fatigue factors with an empirically-derived fade model.**

The current model applies a flat percentage slowdown based on bike TSS. In reality, "fade" (the ratio of second-half run pace to first-half run pace) depends on multiple interacting factors.

**Method:**

1. Where split-level data is available (requiring scraping of more granular results), compute fade rates for each athlete: `FadeRate = SecondHalfRunPace / FirstHalfRunPace`.
2. If only total run time is available (Kaggle), use the ratio of RunTime to expected standalone run time (derived from CSS or threshold pace) as a proxy for accumulated fatigue.
3. Model fade as a function of: bike intensity (BikeTime relative to cohort), total race duration, temperature at race venue, and athlete experience level (approximated by finishing percentile).
4. Output: A predicted fade curve that adjusts target run pace by segment (e.g., first 5K, middle section, final 5K).

*Data required: Kaggle dataset for aggregate analysis. Weather data can be joined by matching EventLocation + EventYear to historical Open-Meteo records.*

*Complexity: Medium-High. Requires joining external weather data and building a multivariate regression.*

### 4.4 Model 4: Weather Impact Quantifier

**Purpose: Move from rule-of-thumb temperature adjustments to empirically measured weather impacts.**

The current nutrition model uses step-function adjustments (>20C = 750ml, >28C = 1000ml). But real impact of heat on performance and hydration needs is continuous and nonlinear.

**Method:**

1. Match each race in the Kaggle dataset to historical weather data (temperature, humidity, wind) using the Open-Meteo historical API, keyed by EventLocation and EventYear.
2. Build a regression of `FinishTime ~ BasePerformance + Temperature + Humidity + Wind`, controlling for course and athlete demographics.
3. Quantify: "Each additional degree C above 20C adds X minutes to the median 70.3 finish time." And: "Humidity above 70% adds an additional Y% to the temperature effect."
4. Apply these coefficients to the user's specific race-day forecast to adjust both pacing targets and nutrition recommendations.

*Data required: Kaggle dataset + Open-Meteo historical weather API (free, no auth).*

*Complexity: Medium. The weather join is the main engineering task.*

### 4.5 Model 5: Personalized Predictor (Phase 3, ML)

**Purpose: Use individual training data to provide personalized predictions that go beyond cohort averages.**

This is the most ambitious model and depends on having a critical mass of users who connect Strava/Garmin and later report their race results.

**Method:**

1. Collect training features from connected users: weekly TSS, long ride/run durations, FTP trajectory, threshold pace trajectory, volume ramp rate, taper pattern.
2. Collect outcome data: actual race splits (entered manually or parsed from Strava race activity).
3. Train a gradient boosting model (XGBoost/LightGBM): `RaceTime = f(TrainingLoad, FitnessMetrics, Demographics, CourseProfile, Weather)`.
4. Start with the cohort models (Models 1-4) as priors and blend with individual predictions as data accumulates (Bayesian updating).

*Data required: User-contributed data via Strava/Garmin + race result reporting. Minimum viable: ~500 user-race pairs to begin training.*

*Complexity: High. Requires data pipeline, feature engineering, model training infrastructure, and ongoing retraining.*

---

## 5. Implementation Roadmap

Three phases, each delivering standalone value. Each phase builds on the previous but is independently shippable.

### Phase 1: Foundation (Weeks 1-4)

**Goal: Ingest the Kaggle dataset, build cohort distributions, and ship the first data-backed features.**

| Week | Deliverable | Owner | Model |
|------|-------------|-------|-------|
| 1 | Download Kaggle dataset. Clean and load into PostgreSQL (new `race_results` table). Build ETL script. | Claude + Mykyta | Infrastructure |
| 2 | Build cohort distribution analysis in Python. Compute percentile tables for all Gender x AgeGroup segments. Export as JSON lookup. | Claude + Mykyta | Model 1 |
| 3 | Integrate lookup into the pacing engine. Add confidence intervals to plan output. Update the plan display page to show ranges. | Claude + Mykyta | Model 1 |
| 4 | Build split ratio analysis (Model 2). Update bike/run pacing recommendations. Add "Based on N athletes" credibility badge to plans. | Claude + Mykyta | Model 2 |

*Phase 1 output: Users see distributional predictions with confidence bands, split recommendations backed by real race data, and credibility badges showing sample sizes.*

### Phase 2: Enrichment (Weeks 5-10)

**Goal: Scrape additional race data, join weather data, build the fade and weather models.**

| Week | Deliverable | Owner | Model |
|------|-------------|-------|-------|
| 5-6 | Build Ironman.com scraper using Firecrawl or Crawl4AI. Target full-distance (140.6) results and 2021-2025 half-distance results. Anonymize and load. | Mykyta + Claude | Infrastructure |
| 7 | Join historical weather data to all race records using Open-Meteo API (free). Build the weather impact regression (Model 4). | Claude + Mykyta | Model 4 |
| 8-9 | Build run fade predictor (Model 3). Integrate weather coefficients and fade curves into the pacing engine. Update nutrition model with continuous (not step-function) temperature/humidity adjustments. | Claude + Mykyta | Models 3 + 4 |
| 10 | Ship updated plans with weather-adjusted pacing, fade curve visualization, and improved nutrition. Add Challenge Family results scraper. | Claude + Mykyta | All Phase 2 |

*Phase 2 output: Full-distance Ironman predictions, weather-adjusted pacing, fade curve visualizations, continuous nutrition model. Dataset grows to 1M+ records.*

### Phase 3: Personalization (Weeks 11-16+)

**Goal: Build the individual-level ML model and create a feedback loop where user outcomes improve the system.**

| Week | Deliverable | Owner | Model |
|------|-------------|-------|-------|
| 11-12 | Build "Report Your Results" feature. Users enter actual race splits post-race, or we auto-detect race activities from Strava. Store in `plan_outcomes` table. | Mykyta + Claude | Infrastructure |
| 13-14 | Build training load feature extraction pipeline (weekly TSS, volume trends, taper detection) from Strava/Garmin data. Store as `athlete_training_features`. | Claude + Mykyta | Model 5 Prep |
| 15-16 | Train XGBoost/LightGBM model once 500+ user-race pairs accumulated. Implement Bayesian blending: (cohort prior + individual prediction). A/B test against cohort-only model. | Claude + Mykyta | Model 5 |

---

## 6. Technical Architecture

### 6.1 Data Pipeline

The data ingestion pipeline follows a staged approach to keep the existing Next.js/PostgreSQL stack intact while adding statistical capabilities.

**Database additions (Prisma schema):**

- `race_results` — Stores raw race result records (gender, age_group, age, country, event_year, event_location, swim_time_sec, bike_time_sec, run_time_sec, transition_time_sec, total_time_sec, source)
- `cohort_distributions` — Pre-computed distribution parameters per cohort (gender, age_group, distance, discipline, mu, sigma, n, p10, p25, p50, p75, p90)
- `weather_records` — Historical weather matched to race events (event_location, event_year, temp_c, humidity_pct, wind_kph, conditions)
- `plan_outcomes` — User-reported actual race results linked to their plan (plan_id, actual_swim, actual_bike, actual_run, actual_total, weather_conditions)
- `athlete_training_features` — Extracted training metrics per athlete per time period (athlete_id, period_start, weekly_tss_avg, long_ride_hrs, long_run_km, ftp_trend, volume_trend)

### 6.2 Model Serving Strategy

Models 1-4 are lightweight enough to serve directly from pre-computed lookup tables stored in PostgreSQL or as JSON files. No ML inference server is needed for the first two phases.

| Model | Serving Method | Latency | Recompute Frequency |
|-------|---------------|---------|-------------------|
| Cohort Distributions | JSON lookup in API | < 5ms | Monthly or on new data |
| Split Ratios | JSON lookup in API | < 5ms | Monthly |
| Fade Predictor | Regression coefficients | < 10ms | Quarterly |
| Weather Impact | Regression coefficients | < 10ms | Annually |
| Personalized (ML) | ONNX model or API | < 100ms | Weekly retrain |

### 6.3 Integration with Existing Engine

The current `pacing.ts` and `nutrition.ts` files will be refactored, not replaced. The approach is to wrap the existing heuristic engines with a statistical layer:

1. The heuristic engine runs first and produces a baseline estimate (backward compatible).
2. The statistical layer looks up the user's cohort distribution and maps their fitness inputs to a percentile.
3. If the statistical prediction and heuristic diverge significantly (>15%), the statistical model takes precedence but the heuristic is logged for monitoring.
4. Confidence intervals are always shown alongside point estimates.
5. A feature flag controls rollout: start with statistical results shown as "beta insights" alongside existing predictions, then promote to primary.

---

## 7. Collaboration Plan: What We Build Together

The intent is to work iteratively: I prepare data analysis and model prototypes, you review, we discuss and refine, then integrate into the product.

| Task | Claude Does | Mykyta Reviews/Owns |
|------|-----------|-------------------|
| **Data ingestion** | Write ETL scripts, Prisma migrations, data cleaning | Review schema, approve data sources |
| **Statistical analysis** | Build Jupyter notebooks for EDA, distribution fitting, regression | Review findings, validate assumptions, steer direction |
| **Model development** | Prototype models in Python, evaluate accuracy, generate lookup tables | Evaluate model outputs against domain knowledge, test edge cases |
| **Engine integration** | Refactor pacing.ts / nutrition.ts, add statistical layer, write tests | Code review, integration testing, UX decisions |
| **Scraper development** | Build Firecrawl/Crawl4AI scripts, handle parsing edge cases | Choose target races/years, legal review, rate limit decisions |
| **Frontend updates** | Add confidence interval displays, cohort charts, credibility badges | UX/design decisions, brand alignment |

---

## 8. Immediate Next Steps

If you approve this plan, here is exactly what we do in the first working session:

1. Download the Kaggle Ironman 70.3 dataset (840K records, CC0 license, ~70MB CSV).
2. Load it into the project workspace and run initial exploratory data analysis: distributions by age/gender, split ratios, time trends over years.
3. Fit log-normal distributions to swim/bike/run times for each Gender x AgeGroup cohort.
4. Build the percentile mapping function: given a user's FTP, CSS, and threshold pace, estimate their position within their cohort distribution.
5. Prototype the updated pacing engine output showing: point estimate + 80% confidence interval + sample size badge.
6. Write the Prisma migration for the `race_results` and `cohort_distributions` tables.

---

*Ready when you are. Let's make this data-driven.*
