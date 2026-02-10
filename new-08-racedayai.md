# RaceDayAI — Your AI Race Execution Coach

> Enter your fitness data + race details → get a personalized race-day execution plan with pacing, nutrition, hydration, and real-time weather adjustments. The tool triathletes wish existed on race morning.

## Quick Reference

| Field | Value |
|-------|-------|
| **Repo** | `racedayai` |
| **Domain** | racedayai.com or racedaycoach.com (verify on Namecheap) |
| **Vercel subdomain** | racedayai.vercel.app (free) |
| **Stack** | Next.js 14 + Tailwind + shadcn/ui (frontend), Python serverless (algorithms) |
| **AI** | Claude 3.5 Sonnet ($0.005/plan for narrative + adjustments) |
| **APIs** | Garmin Connect (free, OAuth2), Strava (free, 200 req/15min), Open-Meteo (free weather) |
| **DB** | PostgreSQL (Supabase free) |
| **Monthly cost** | $10-25/mo |
| **Build time** | 3 weeks |
| **Break-even** | 8 subscribers ($4.99/mo) or ~100 annual ($39/yr) |
| **Viability** | YES — Race execution is the unowned gap between training apps and race day |
| **Priority** | P1 — Different audience/model from SaaS projects, high virality potential |

---

## Why Build This

Every triathlete trains for months but walks into race morning with a vague plan scribbled on their arm. Training apps (Runna, TriDot, TrainingPeaks) get you TO the start line. Nothing gets you FROM the start line to the finish line intelligently.

The race-day execution gap is massive:
- **Pacing**: Most age-groupers go out too fast on the bike, blow up on the run. Optimal pacing requires course profile analysis, wind data, and honest fitness assessment.
- **Nutrition**: Bonking is the #1 DNF reason in long-course triathlon. Calorie/sodium/hydration needs vary by temperature, humidity, altitude, and individual sweat rate.
- **Weather**: A 10F temperature increase requires 3-5% effort reduction. Nobody does this math on race morning.
- **Transitions**: T1/T2 execution can save 2-5 minutes with a proper plan.

Runna was acquired by Strava for ~$40M ARR — but Runna is TRAINING only, RUNNING only. TriDot has IRONMAN partnership but focuses on training periodization. Nobody owns race-day execution.

**Your data science skills are the moat** — pacing algorithms, nutrition models, weather adjustments, and finish time prediction are all data problems.

---

## Competitors & Why We Win

| Competitor | Pricing | Focus | Status | Their Weakness |
|------------|---------|-------|--------|----------------|
| **Runna** | $9.99-$14.99/mo (was $102/yr) | Running training plans | Acquired by Strava (Apr 2025), ~$40M ARR | Running only. Training only. No race execution. No triathlon. |
| **TriDot** | $29-199/mo | AI triathlon training | Active, IRONMAN partner | Training periodization focus. Race-day features are basic/manual. |
| **TrainingPeaks** | $9.95-$19.95/mo | Training logs + plans | Active, dominant | Coach platform, not athlete-facing AI. No race execution. |
| **MOTTIV** | $11.99/mo (annual) | Triathlon training | Active | Training plans only. Good content but no race-day AI. |
| **80/20 Endurance** | $10-15/mo | Polarized training | Active | Methodology-specific training. No race execution. |
| **RaceDay App** | Free/subscription | Race logistics | Last update Apr 2024 | Basic checklists. No pacing/nutrition AI. Appears abandoned. |
| **TRIQ** | — | Triathlon AI | **DEAD (Nov 2025)** | Discontinued — created market gap |
| **Best Bike Split** | $49-99/yr | Bike power planning | Active | Bike-only. No swim, no run, no nutrition, no weather integration. |

**Our angle:** The ONLY tool that combines course-specific pacing + personalized nutrition + real-time weather adjustments + transition planning into one race-day execution plan. Training apps stop at the start line. We start there.

**The real competitor is "I'll figure it out on race day" (the arm-scribble plan).**

---

## MVP Scope

### Week 1: Core Algorithms + Data Ingestion

**Fitness Data Integration:**
- Garmin Connect OAuth2 (free for developers)
  - FTP (Functional Threshold Power) for cycling
  - Threshold pace / recent run performances
  - Resting HR, Max HR, HR zones
  - Recent activity history (training load estimation)
- Strava OAuth2 (free, 200 req/15min, 2000/day)
  - Recent activities + performance data
  - Segment times for course-specific estimation
- Manual entry fallback (for athletes without devices)
  - Recent race times, estimated FTP, threshold pace

**Race Setup:**
- Race selection: name, date, location, distance (Sprint/Olympic/70.3/140.6/custom)
- GPX file upload for course profile (bike + run courses)
- Auto-fetch weather forecast (Open-Meteo API, free, no key required)

**Pacing Engine (Python serverless):**
```python
# Bike Pacing — FTP-based with course profile
def calculate_bike_pacing(ftp, course_gpx, race_distance, conditions):
    # Intensity factors by distance
    IF_MAP = {
        'sprint': (0.85, 0.95),    # 20km bike
        'olympic': (0.80, 0.90),    # 40km bike
        '70.3': (0.72, 0.82),       # 90km bike
        '140.6': (0.68, 0.76),      # 180km bike
    }

    base_if = IF_MAP[race_distance]
    target_power = ftp * base_if[1]  # aggressive end for fit athletes

    # Adjust for heat (dew point method)
    dew_point = calculate_dew_point(conditions['temp_c'], conditions['humidity'])
    if dew_point > 15.5:  # ~60F dew point
        heat_factor = 1 - (0.03 * (dew_point - 15.5) / 5)  # ~3% per 5C above threshold
        target_power *= heat_factor

    # Adjust for altitude
    if conditions['altitude_m'] > 1500:
        alt_factor = 1 - (0.077 * (conditions['altitude_m'] - 1500) / 1000)
        target_power *= alt_factor

    # Segment-by-segment power targets from GPX elevation profile
    segments = parse_gpx_segments(course_gpx, segment_length_km=1)
    for seg in segments:
        if seg.gradient > 3:  # uphill
            seg.target_power = target_power * 1.05  # slight push uphill
        elif seg.gradient < -3:  # downhill
            seg.target_power = target_power * 0.85  # recover downhill
        else:
            seg.target_power = target_power

    return segments, target_power

# Run Pacing — threshold-based with negative split strategy
def calculate_run_pacing(threshold_pace, race_distance, conditions, bike_fatigue):
    # Run-off-bike factor (legs are fatigued from cycling)
    FATIGUE_MAP = {
        'sprint': 0.97,     # minimal fatigue
        'olympic': 0.95,
        '70.3': 0.90,       # significant bike fatigue
        '140.6': 0.85,      # major fatigue factor
    }

    adjusted_pace = threshold_pace / FATIGUE_MAP[race_distance]

    # Negative split: first half conservative, second half push
    first_half_pace = adjusted_pace * 1.03   # 3% slower
    second_half_pace = adjusted_pace * 0.97  # 3% faster

    # Heat adjustment (same dew point method)
    # Altitude adjustment (same formula)

    return {
        'target_pace': adjusted_pace,
        'first_half': first_half_pace,
        'second_half': second_half_pace,
        'walk_breaks': race_distance in ['140.6'] and threshold_pace > 330,  # >5:30/km
    }

# Swim Pacing — CSS-based
def calculate_swim_pacing(css_per_100m, race_distance, conditions):
    # Critical Swim Speed = threshold pace in pool
    DISTANCE_FACTOR = {
        'sprint': 1.05,    # 750m — can push harder
        'olympic': 1.08,   # 1500m
        '70.3': 1.12,      # 1900m — must conserve
        '140.6': 1.15,     # 3800m — very conservative
    }

    # Open water adds 8-15% to pool pace
    open_water_factor = 1.10  # 10% default, adjustable

    # Wetsuit gives ~5% speed boost
    wetsuit_factor = 0.95 if conditions.get('wetsuit_legal') else 1.0

    target_pace = css_per_100m * DISTANCE_FACTOR[race_distance] * open_water_factor * wetsuit_factor

    return target_pace
```

**Nutrition Engine:**
```python
def calculate_nutrition_plan(body_weight_kg, race_distance, conditions, intensity):
    # Calorie burn estimation
    CALORIES_PER_HOUR = {
        'swim': body_weight_kg * 8,    # ~600-700 cal/hr for 80kg
        'bike': body_weight_kg * 9,     # ~700-800 cal/hr
        'run': body_weight_kg * 10,     # ~800-900 cal/hr
    }

    # Carb intake targets (modern sports science)
    CARBS_PER_HOUR = {
        'sprint': (30, 40),       # 1-1.5hr race — minimal
        'olympic': (40, 60),      # 2-3hr race
        '70.3': (60, 80),         # 4-6hr race — gut training required
        '140.6': (80, 100),       # 8-17hr race — max absorption
    }

    # Sodium requirements (mg/hr) — increases with heat
    base_sodium = 500  # mg/hr baseline
    if conditions['temp_c'] > 25:
        sodium_per_hour = base_sodium + (conditions['temp_c'] - 25) * 50  # +50mg per degree C
    else:
        sodium_per_hour = base_sodium

    # Hydration (ml/hr)
    base_fluid = 500  # ml/hr
    if conditions['temp_c'] > 25:
        fluid_per_hour = base_fluid + (conditions['temp_c'] - 25) * 100  # +100ml per degree C
    elif conditions['temp_c'] < 15:
        fluid_per_hour = base_fluid * 0.8  # reduce in cold
    else:
        fluid_per_hour = base_fluid

    # Caffeine timing strategy
    caffeine_plan = {
        'sprint': None,  # too short
        'olympic': {'timing': 'pre-race', 'dose_mg': body_weight_kg * 3},
        '70.3': {
            'pre_race': body_weight_kg * 2,  # ~160mg for 80kg
            'bike_last_30min': body_weight_kg * 1.5,  # ~120mg
        },
        '140.6': {
            'pre_race': body_weight_kg * 1.5,
            'bike_hour_3': body_weight_kg * 1,
            'run_start': body_weight_kg * 1.5,
            'run_hour_2': body_weight_kg * 1,  # if needed
        },
    }

    # Build timeline: what to eat/drink at each aid station
    # Gel timing: every 20-30 min on bike, every 30-45 min on run
    # Favor 2:1 glucose:fructose ratio for 90g/hr absorption

    return {
        'carbs_per_hour': CARBS_PER_HOUR[race_distance],
        'sodium_per_hour': sodium_per_hour,
        'fluid_per_hour': fluid_per_hour,
        'caffeine': caffeine_plan[race_distance],
        'gel_schedule': build_gel_timeline(race_distance, intensity),
    }
```

**Weather Integration:**
```python
def get_race_weather(lat, lon, race_date):
    # Open-Meteo API — free, no key required
    # Hourly forecast: temp, humidity, wind speed/direction, precipitation
    url = f"https://api.open-meteo.com/v1/forecast"
    params = {
        'latitude': lat,
        'longitude': lon,
        'hourly': 'temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation_probability',
        'start_date': race_date,
        'end_date': race_date,
    }
    # Returns hourly conditions → map to race segments
    # Calculate dew point for heat adjustment
    # Wind direction + course GPX → headwind/tailwind per segment
```

### Week 2: Race Plan Generator + Frontend

**Race Plan Output:**
- AI-generated narrative plan (Claude 3.5 Sonnet):
  - "Your bike target: 195W average (73% FTP). Push to 210W on the three major climbs at km 23, 47, and 68. Back off to 175W on descents."
  - "Nutrition: Take a gel every 25 minutes on the bike starting at km 15. Switch to cola + pretzels at run aid stations if gels become hard to stomach."
  - "Warning: Forecast shows 31C at race start. Reduce bike power by 5% and increase sodium intake to 800mg/hr."
- PDF download (printable race plan — arm band / top tube format)
- Mobile-optimized view (quick reference during pre-race)

**Finish Time Predictor:**
```python
def predict_finish_time(athlete, race, conditions):
    # Swim time
    swim_pace = calculate_swim_pacing(athlete.css, race.distance, conditions)
    swim_time = (race.swim_distance_m / 100) * swim_pace

    # T1 estimate
    t1 = estimate_transition(race.distance, athlete.experience, 'T1')
    # Sprint: 1-2min, Olympic: 2-3min, 70.3: 3-5min, 140.6: 5-8min

    # Bike time (from segment analysis)
    segments, target_power = calculate_bike_pacing(athlete.ftp, race.bike_gpx, race.distance, conditions)
    bike_time = sum(seg.estimated_time for seg in segments)

    # T2 estimate
    t2 = estimate_transition(race.distance, athlete.experience, 'T2')

    # Run time
    run_plan = calculate_run_pacing(athlete.threshold_pace, race.distance, conditions, bike_fatigue=True)
    run_time = race.run_distance_m / (1000 / run_plan['target_pace'])

    total = swim_time + t1 + bike_time + t2 + run_time

    return {
        'total': total,
        'swim': swim_time,
        't1': t1,
        'bike': bike_time,
        't2': t2,
        'run': run_time,
        'confidence_range': (total * 0.95, total * 1.08),  # -5% to +8%
    }
```

**Frontend:**
- Landing page: "Stop guessing on race day"
- Before/after: arm-scribble plan vs. AI-generated race execution plan
- Race setup wizard (3 steps): connect fitness data → enter race details → get plan
- Results dashboard:
  - Finish time prediction with confidence range
  - Pacing chart (power/pace over course profile)
  - Nutrition timeline (visual: gel/drink/salt markers over time)
  - Weather impact summary
  - Transition checklists
- Download: PDF race plan (print-friendly), mobile quick-reference card

### Week 3: Polish + Launch

- Garmin Connect IQ data field (shows target power/pace during race) — v1.5 stretch goal
- 10 example race plans across popular courses (IRONMAN Kona, 70.3 Dubai, local sprints)
- SEO pages: "IRONMAN [location] race plan", "triathlon pacing calculator"
- Integration with race calendars (pull course GPX from race websites)
- Beta test with 20+ triathletes (Reddit r/triathlon recruitment)

### OUT (v1)
- Training plan generation (Runna/TriDot territory — don't compete)
- Live race tracking / real-time adjustments (requires mobile app — v2)
- Social features / leaderboards
- Coach marketplace
- Indoor training / Zwift integration
- Multi-sport beyond triathlon (marathon, ultra — v2)

---

## Key Screens

```
Landing ("Stop guessing on race day")
  ├─ Before/After:
  │   Before: Arm scribble "bike 180W, run 5:30, gel every 30min"
  │   After: [Beautiful multi-page race plan with charts]
  │
  ├─ "Used by athletes at IRONMAN, 70.3, and local sprints"
  │
  └─→ Race Setup Wizard:
       Step 1: Connect Fitness Data
       │   ├─ [Connect Garmin] [Connect Strava] [Enter Manually]
       │   ├─ Auto-detected: FTP 267W, Threshold Pace 4:45/km, CSS 1:42/100m
       │   └─ Recent training load: ████████░░ 82 CTL (well-trained)
       │
       Step 2: Race Details
       │   ├─ Race: "IRONMAN 70.3 Dubai" [or custom]
       │   ├─ Date: March 7, 2026
       │   ├─ Distance: [Sprint] [Olympic] [✓ 70.3] [140.6]
       │   ├─ Course GPX: [Upload] or [Auto-fetch from race site]
       │   └─ Goal: [Finish strong] [PR attempt] [Just finish]
       │
       Step 3: Generate Plan
            └─→ Loading (animated):
                 "Analyzing course profile..."
                 "Calculating optimal power targets..."
                 "Building nutrition timeline..."
                 "Checking weather forecast..."
                      └─→ Race Plan Dashboard
                           ├─ 🏁 Predicted Finish: 5:12:00 (range: 4:57 - 5:38)
                           │
                           ├─ 🏊 Swim Plan:
                           │   Target pace: 1:52/100m (32:00 total)
                           │   "Start wide right, settle into rhythm by 200m"
                           │
                           ├─ 🚴 Bike Plan:
                           │   Target power: 195W avg (73% FTP)
                           │   [Power over elevation chart — colored zones]
                           │   Climbs: km23 (210W), km47 (205W), km68 (200W)
                           │
                           ├─ 🏃 Run Plan:
                           │   First half: 5:05/km | Second half: 4:55/km
                           │   "Walk aid stations for first 3km, then run through"
                           │
                           ├─ 🍌 Nutrition Timeline:
                           │   [Visual timeline with gel/drink/salt markers]
                           │   Bike: gel every 25min, 750ml/hr, 600mg sodium/hr
                           │   Run: cola + pretzel at odd aid stations, gel at even
                           │
                           ├─ 🌡️ Weather Impact:
                           │   "31°C forecast. Power reduced 5%. Sodium increased to 800mg/hr."
                           │   "Headwind km 30-45. Expect slower segment, don't chase watts."
                           │
                           ├─ ✅ Transition Checklists:
                           │   T1: Helmet → sunglasses → shoes → go (target: 3:00)
                           │   T2: Rack bike → shoes → hat → number belt → go (target: 2:00)
                           │
                           └─ Actions:
                                ├─ [Download PDF Race Plan]
                                ├─ [Mobile Quick Card]
                                ├─ [Adjust Goals] [Regenerate]
                                └─ [Share Plan]
```

---

## Architecture

```
[Athlete connects Garmin/Strava OR enters data manually]
  → OAuth2 flow → fetch fitness metrics (FTP, threshold pace, CSS, HR zones)
  → Store athlete profile in Supabase

[Athlete enters race details + uploads GPX]
  → Parse GPX with gpxpy (Python): elevation profile, distances, gradients
  → Fetch weather: Open-Meteo API (lat/lon from GPX, race date)
  → Cache course data by race name + year

[Generate Race Plan — Python serverless]
  → Parallel computation:
      ├─ Swim pacing (CSS + distance + conditions)
      ├─ Bike pacing (FTP + course GPX + weather + altitude)
      ├─ Run pacing (threshold + distance + conditions + bike fatigue)
      ├─ Nutrition plan (weight + distance + temp + humidity)
      ├─ Finish time prediction (all disciplines + transitions)
      └─ Weather impact analysis (heat/wind/altitude adjustments)
  → Claude 3.5 Sonnet: generate narrative race plan
      "Turn raw numbers into coach-like advice"
  → Generate PDF (race plan card format)
  → Store plan in Supabase
  → Return: plan data + PDF link + preview
```

---

## Database Schema

```sql
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  garmin_connected BOOLEAN DEFAULT false,
  garmin_token JSONB,
  strava_connected BOOLEAN DEFAULT false,
  strava_token JSONB,
  ftp_watts INT,                    -- Functional Threshold Power
  threshold_pace_sec INT,           -- per km (e.g., 285 = 4:45/km)
  css_per_100m_sec INT,            -- Critical Swim Speed (e.g., 102 = 1:42)
  max_hr INT,
  resting_hr INT,
  weight_kg DECIMAL(5,1),
  experience_level VARCHAR,         -- beginner, intermediate, advanced, elite
  sweat_rate_ml_hr INT,            -- optional: known sweat rate
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE race_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_name VARCHAR NOT NULL,
  race_year INT,
  distance_category VARCHAR NOT NULL,  -- sprint, olympic, 70.3, 140.6
  location VARCHAR,
  latitude DECIMAL(9,6),
  longitude DECIMAL(9,6),
  swim_distance_m INT,
  bike_distance_m INT,
  run_distance_m INT,
  bike_gpx_url TEXT,
  run_gpx_url TEXT,
  bike_elevation_gain_m INT,
  run_elevation_gain_m INT,
  course_notes TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE race_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID REFERENCES athletes(id),
  course_id UUID REFERENCES race_courses(id),
  race_date DATE NOT NULL,
  goal_type VARCHAR DEFAULT 'finish_strong',  -- finish_strong, pr_attempt, just_finish

  -- Conditions at generation time
  weather_data JSONB,              -- {temp_c, humidity, wind_speed, wind_dir, dew_point}
  altitude_m INT,

  -- Generated plan
  swim_plan JSONB,                 -- {target_pace, total_time, strategy}
  bike_plan JSONB,                 -- {target_power, segments[], total_time}
  run_plan JSONB,                  -- {target_pace, first_half, second_half, total_time}
  nutrition_plan JSONB,            -- {carbs_hr, sodium_hr, fluid_hr, timeline[]}
  transition_plan JSONB,           -- {t1_target, t2_target, checklists}

  -- Predictions
  predicted_finish_sec INT,
  confidence_low_sec INT,
  confidence_high_sec INT,
  predicted_splits JSONB,          -- {swim, t1, bike, t2, run}

  -- AI narrative
  narrative_plan TEXT,             -- Claude-generated coach advice
  weather_warnings TEXT[],

  -- Output
  pdf_url TEXT,
  share_token VARCHAR(12) UNIQUE,

  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_plans_athlete ON race_plans(athlete_id, race_date DESC);
CREATE INDEX idx_courses_name ON race_courses(race_name, race_year);
CREATE INDEX idx_plans_share ON race_plans(share_token);
```

---

## API Integrations

### Garmin Connect (Primary fitness data source)
- **Auth**: OAuth2 (free for developers)
- **Key endpoints**:
  - Daily summaries (HR, steps, training load)
  - Activity details (power, pace, HR per activity)
  - User profile (weight, max HR, resting HR)
  - FTP history (if set on device)
- **Rate limits**: Reasonable for individual use
- **Limitation**: No official public API — use Garmin Connect IQ SDK or community libraries

### Strava (Secondary / social)
- **Auth**: OAuth2 (free)
- **Rate limits**: 200 requests per 15 minutes, 2000 per day
- **Key endpoints**:
  - `GET /athlete` — profile info
  - `GET /athlete/activities` — recent activities with summary stats
  - `GET /activities/{id}/streams` — detailed time-series data (HR, power, pace)
  - `GET /segments/{id}` — segment efforts for course-specific data
- **Limitation**: Detailed streams require per-activity fetch

### Open-Meteo (Weather)
- **Auth**: None required (free, open-source)
- **Endpoint**: `https://api.open-meteo.com/v1/forecast`
- **Data**: Hourly temp, humidity, wind speed/direction, precipitation, UV index
- **Range**: 16-day forecast (sufficient for race planning)
- **Rate limits**: Very generous for free tier

### GPX Parsing
- **Library**: `gpxpy` (Python)
- **Extracts**: Latitude, longitude, elevation, distance between points
- **Computes**: Gradient per segment, total elevation gain/loss, course profile visualization

---

## Pricing

| Feature | Free | Racer ($4.99/mo or $39/yr) | Team ($9.99/mo or $79/yr) |
|---------|------|---------------------------|--------------------------|
| Race plans/month | 1 | Unlimited | Unlimited |
| Distances | Sprint + Olympic | All (incl. 70.3, 140.6) | All |
| Garmin/Strava sync | Manual only | Auto-sync | Auto-sync |
| Weather integration | Basic (temp only) | Full (wind, humidity, dew point) | Full |
| Nutrition plan | Basic calories | Full (carbs, sodium, caffeine, timeline) | Full |
| GPX course upload | ✗ | ✓ | ✓ |
| PDF race plan | ✗ | ✓ | ✓ |
| Plan history | Last 1 | All | All |
| Share plan with coach | ✗ | ✓ | ✓ |
| Multiple athletes | ✗ | ✗ | Up to 5 (coaches/clubs) |

**Value story:** A triathlon coach charges $100-200 for a race-day plan. Most age-groupers can't afford or access a coach. RaceDayAI gives you a coach-quality execution plan for $39/year — less than one race entry fee. And it updates automatically when the weather forecast changes.

---

## Growth Strategy (18-Month GTM Playbook)

### Phase 1: Organic Foundation (Months 1-3, $0-500)

**Reddit r/triathlon (204K members) — PRIMARY CHANNEL:**
- Weekly "Race Report" format posts showing AI-generated plans vs. actual results
- Answer every "What pace should I target?" and "How much should I eat?" thread with genuine advice + soft mention
- Create genuinely useful posts: "I analyzed 500 IRONMAN finishes — here's what the data says about pacing"
- AMA: "I built an AI race execution tool — roast my pacing algorithms"

**YouTube (long-form education):**
- "How to pace your first 70.3" — educational content with tool demo at end
- Course preview videos: "IRONMAN [Location] Course Analysis + AI Race Plan"
- "I tested my AI race plan at [race] — here's what happened" (personal use case)

**TikTok/Instagram Reels (short-form viral):**
- Race day morning: "My AI coach says..." + race footage + results
- Before/after: arm scribble vs. AI plan
- "Things your AI race coach knows that you don't" series

### Phase 2: Community Building (Months 4-8, $2,500-4,000)

**Podcast appearances ($0):**
- Target: Triathlon Taren, That Triathlon Show, IMTalk, Purple Patch
- Pitch: "The data science behind optimal race pacing" (education-first)

**Micro-influencer partnerships ($500-2,000):**
- 10-20 age-group triathletes with 5K-50K followers
- Free lifetime access + $50-100 per authentic review post
- Focus: real race-day usage content, not scripted ads

**Race expo partnerships ($1,000-2,000):**
- Set up at 2-3 local triathlon expos
- "Get your free race plan" booth — generate plans live
- QR codes on handouts → free tier conversion

### Phase 3: Paid Acquisition (Months 9-14, $6,500-12,000)

**Google Ads ($2,000-5,000):**
- Keywords: "triathlon race plan", "IRONMAN pacing calculator", "70.3 nutrition plan"
- Long-tail: "[Race name] pacing strategy"
- Estimated CPC: $0.50-1.50 (niche, low competition)

**Instagram/Facebook Ads ($2,000-4,000):**
- Lookalike audiences from existing users
- Retargeting website visitors
- Pre-race season push (Jan-Mar for spring races)

**Ambassador program ($2,500-3,000):**
- 50 ambassadors across age groups, distances, and regions
- Free access + 30% revenue share on referrals
- Content requirements: 1 post per month minimum
- Modeled after Runna's successful ambassador approach

### Phase 4: Scale + Partnerships (Months 15-18, $5,000-10,000)

**Race organizer partnerships:**
- "Official Race Planning Partner" — embedded tool on race website
- Revenue share on athlete conversions
- Start with regional races, scale to IRONMAN-licensed events

**Tri club partnerships:**
- Bulk pricing for clubs (Team tier)
- Co-branded plans with club logos

**Target outcomes by Month 18:**
- 15,000-30,000 registered users
- 800-2,000 paid subscribers
- $3,000-8,000 MRR

---

## Top 3 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Runna/Strava adds triathlon + race execution | Direct competition from $40M ARR company | They're running-only DNA. Adding triathlon is a pivot, not an iteration. Adding race execution is a second pivot. We'll have 12+ months head start. Also: Strava acquires for TRAINING data, not race-day. |
| Athletes don't trust AI pacing advice | Low conversion / high churn | Show the math transparently. Publish the algorithms. Let athletes adjust all parameters. Add "confidence range" to every prediction. Post-race comparison feature to build trust over time. |
| Garmin Connect API access is unreliable | Can't get fitness data | Strava as backup. Manual entry as fallback. Most serious triathletes have Strava. Also explore TrainingPeaks API (widely used by coached athletes). |

---

## Build Checklist

### Week 1: Core Algorithms + Data Ingestion
- [ ] Next.js setup + race setup wizard (3-step form)
- [ ] Garmin Connect OAuth2 integration (fetch FTP, threshold pace, HR)
- [ ] Strava OAuth2 integration (fetch activities, power/pace data)
- [ ] Manual entry form (FTP, threshold pace, CSS, weight)
- [ ] GPX file parser (gpxpy — elevation profile, gradients, distances)
- [ ] Open-Meteo weather API integration
- [ ] Bike pacing algorithm (FTP-based, course-adjusted, heat/altitude)
- [ ] Run pacing algorithm (threshold-based, fatigue-adjusted, negative split)
- [ ] Swim pacing algorithm (CSS-based, open water + wetsuit factors)
- [ ] Nutrition engine (carbs/sodium/hydration/caffeine by distance + conditions)
- [ ] Finish time predictor (all disciplines + transitions + confidence range)
- [ ] Supabase schema setup

### Week 2: Race Plan Generator + Frontend
- [ ] Claude 3.5 Sonnet integration (narrative plan generation)
- [ ] PDF race plan generator (printable card format)
- [ ] Landing page ("Stop guessing on race day")
- [ ] Race plan dashboard (splits, pacing chart, nutrition timeline)
- [ ] Course profile visualization (elevation + power targets overlay)
- [ ] Weather impact display
- [ ] Transition checklists
- [ ] Share page with OG meta image
- [ ] Auth (magic link) + Stripe billing

### Week 3: Polish + Launch
- [ ] 10 example race plans across popular courses
- [ ] SEO pages: "IRONMAN [location] race plan", "triathlon pacing calculator"
- [ ] Mobile-optimized quick reference view
- [ ] Post-race comparison feature (predicted vs. actual — builds trust)
- [ ] Deploy to Vercel
- [ ] Beta test with 20 triathletes from r/triathlon
- [ ] Launch on Reddit r/triathlon + Slowtwitch + TriTalk
- [ ] YouTube launch video: "I built an AI race coach"
- [ ] Product Hunt: "AI race execution coach for triathletes"
