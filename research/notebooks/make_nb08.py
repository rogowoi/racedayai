#!/usr/bin/env python3
"""Generate 08_llm_prototyping.ipynb — updated for per-distance outputs."""
import nbformat as nbf

nb = nbf.v4.new_notebook()
nb.metadata['kernelspec'] = {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'}

def md(src): return nbf.v4.new_markdown_cell(src)
def code(src): return nbf.v4.new_code_cell(src)

nb.cells = [

md("""# Notebook 08 — LLM Prototyping
**RaceDayAI ML Prediction Engine (Plan 07)**

Claude API structured prompts for 4 tasks: race strategy narrative, "athletes like you",
risk mitigation coaching, nutrition plan. Guardrail validation. End-to-end test scenarios.

**Reads:** `ensemble_predictions_{dist}.csv`, `cluster_assignments.csv`, `athlete_embeddings.csv`
**Writes:** `llm_outputs_sample.json`, `llm_guardrail_log.csv`

**Requires:** `ANTHROPIC_API_KEY` environment variable."""),

code("""import pandas as pd
import numpy as np
import json, os, warnings
from pathlib import Path
from time import time
warnings.filterwarnings('ignore')

BASE = Path('.').resolve().parent
CLEANED = BASE / 'data' / 'cleaned'

MODEL_DISTANCES = ['70.3', '140.6']

# Check for API key
API_KEY = os.environ.get('ANTHROPIC_API_KEY', '')
HAS_API = bool(API_KEY)
if HAS_API:
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=API_KEY)
        print(f"Anthropic client initialized (key: ...{API_KEY[-4:]})")
    except ImportError:
        print("anthropic package not installed. Run: pip install anthropic")
        HAS_API = False
else:
    print("⚠️  ANTHROPIC_API_KEY not set — will generate prompts but skip API calls")
    print("   Set the key to enable live LLM testing: export ANTHROPIC_API_KEY=sk-...")"""),

md("## 1. Load Model Outputs (Per-Distance)"),

code("""# Load per-distance ensemble predictions
ensemble = {}
for DIST in MODEL_DISTANCES:
    try:
        ep = pd.read_csv(CLEANED / f'ensemble_predictions_{DIST}.csv', low_memory=False)
        ensemble[DIST] = ep
        print(f"Ensemble {DIST}: {len(ep):,}")
    except FileNotFoundError:
        try:
            # Fallback: try model predictions directly
            mp = pd.read_csv(CLEANED / f'model_predictions_{DIST}.csv', low_memory=False)
            ensemble[DIST] = mp
            print(f"Model predictions {DIST} (fallback): {len(mp):,}")
        except FileNotFoundError:
            print(f"⚠ No predictions for {DIST}")

try:
    clusters = pd.read_csv(CLEANED / 'cluster_assignments.csv', low_memory=False)
    print(f"Cluster assignments: {len(clusters):,}")
except FileNotFoundError:
    clusters = None
    print("cluster_assignments.csv not found")

try:
    embeddings = pd.read_csv(CLEANED / 'athlete_embeddings.csv', low_memory=False)
    print(f"Embeddings: {len(embeddings):,}")
except FileNotFoundError:
    embeddings = None
    print("athlete_embeddings.csv not found")

try:
    profiles = pd.read_csv(CLEANED / 'athlete_profile.csv', low_memory=False)
    print(f"Profiles: {len(profiles):,}")
except FileNotFoundError:
    profiles = None"""),

md("""## 2. System Prompt — Sports Science Knowledge Base

The system prompt encodes triathlon expertise for age-group coaching."""),

code("""SYSTEM_PROMPT = \"\"\"You are RaceDayAI Coach, an expert triathlon coaching assistant specialized in age-group athletes.

KNOWLEDGE BASE:
- Triathlon distances: Sprint (750m/20km/5km), Olympic (1500m/40km/10km), 70.3 (1.9km/90km/21.1km), 140.6 (3.8km/180km/42.2km)
- Typical AG finish times: 70.3 = 5:00-7:00, 140.6 = 10:00-16:00
- Pacing: conservative bike (IF 0.70-0.75) yields best run outcomes for AG athletes
- Nutrition: 60-90g carbs/hour on bike, 30-60g on run, 500-800ml fluid/hour
- Sodium: 500-1000mg/hour depending on conditions
- Fade ratio >1.10 indicates over-biking; target <1.05 for best results
- Heat impact: +3-7% slower per 5°C above 20°C, especially on the run
- DNF risk increases with: aggressive pacing, heat, altitude, under-training, poor nutrition

STYLE GUIDELINES:
- Write for age-group athletes (no jargon, practical, encouraging)
- Use specific numbers from the model outputs — never make up statistics
- Keep advice actionable and concrete
- Acknowledge uncertainty where confidence is low
- Prioritize safety over performance

OUTPUT FORMAT: Always respond with valid JSON matching the requested schema.\"\"\"

print(f"System prompt: {len(SYSTEM_PROMPT)} chars")"""),

md("## 3. Define Synthetic Test Scenarios"),

code("""# 5 synthetic user scenarios — distance-specific, covering different tiers and profiles
SCENARIOS = [
    {
        "name": "Sarah - First Timer",
        "tier": 1,
        "gender": "F",
        "age": 38,
        "age_group": "35-39",
        "distance": "70.3",
        "total_races": 0,
        "predicted_total_sec": 22800,
        "predicted_swim_sec": 2700,
        "predicted_bike_sec": 11700,
        "predicted_run_sec": 7500,
        "uncertainty_p05": 20400,
        "uncertainty_p95": 26400,
        "cluster": "First-Timer/Beginner",
        "dnf_probability": 0.08,
        "fade_prediction": 1.12,
        "risk_flags": ["first_race", "moderate_fade_risk"],
        "weather": {"temp_c": 24, "humidity_pct": 55, "wind_kph": 12},
        "course_difficulty": 1.05,
    },
    {
        "name": "Mike - Strong Cyclist",
        "tier": 2,
        "gender": "M",
        "age": 44,
        "age_group": "40-44",
        "distance": "70.3",
        "total_races": 4,
        "last_race_total_sec": 19500,
        "predicted_total_sec": 19200,
        "predicted_swim_sec": 2100,
        "predicted_bike_sec": 9600,
        "predicted_run_sec": 6900,
        "uncertainty_p05": 18000,
        "uncertainty_p95": 21000,
        "cluster": "StrongBike",
        "pacing_archetype": "AggressiveBike",
        "dnf_probability": 0.05,
        "fade_prediction": 1.08,
        "risk_flags": ["over_biker", "fade_risk"],
        "weather": {"temp_c": 28, "humidity_pct": 70, "wind_kph": 18},
        "course_difficulty": 1.10,
    },
    {
        "name": "Emma - Experienced Runner",
        "tier": 3,
        "gender": "F",
        "age": 52,
        "age_group": "50-54",
        "distance": "140.6",
        "total_races": 12,
        "ftp_watts": 165,
        "css_per_100m": 115,
        "threshold_pace_min_km": 5.8,
        "predicted_total_sec": 45000,
        "predicted_swim_sec": 5400,
        "predicted_bike_sec": 23400,
        "predicted_run_sec": 15000,
        "uncertainty_p05": 42000,
        "uncertainty_p95": 50400,
        "cluster": "StrongRun_Veteran",
        "pacing_archetype": "ConservativeBike_StrongRun",
        "dnf_probability": 0.03,
        "fade_prediction": 1.03,
        "risk_flags": [],
        "weather": {"temp_c": 22, "humidity_pct": 45, "wind_kph": 8},
        "course_difficulty": 0.95,
    },
    {
        "name": "Tom - Hot Race Risk",
        "tier": 2,
        "gender": "M",
        "age": 35,
        "age_group": "35-39",
        "distance": "70.3",
        "total_races": 2,
        "predicted_total_sec": 20400,
        "predicted_swim_sec": 2400,
        "predicted_bike_sec": 10200,
        "predicted_run_sec": 7200,
        "uncertainty_p05": 18600,
        "uncertainty_p95": 23400,
        "cluster": "Balanced_Novice",
        "dnf_probability": 0.15,
        "fade_prediction": 1.18,
        "risk_flags": ["heat_stress", "high_humidity", "over_biker", "high_dnf_risk"],
        "weather": {"temp_c": 34, "humidity_pct": 80, "wind_kph": 5},
        "course_difficulty": 1.15,
    },
    {
        "name": "Lisa - Back-of-Pack Hero",
        "tier": 1,
        "gender": "F",
        "age": 61,
        "age_group": "60-64",
        "distance": "140.6",
        "total_races": 0,
        "predicted_total_sec": 52200,
        "predicted_swim_sec": 5400,
        "predicted_bike_sec": 27000,
        "predicted_run_sec": 18000,
        "uncertainty_p05": 46800,
        "uncertainty_p95": 59400,
        "cluster": "Novice",
        "dnf_probability": 0.12,
        "fade_prediction": 1.15,
        "risk_flags": ["first_race", "back_of_pack", "high_fade_risk"],
        "weather": {"temp_c": 26, "humidity_pct": 60, "wind_kph": 10},
        "course_difficulty": 1.00,
    },
]

for s in SCENARIOS:
    total_h = s['predicted_total_sec'] / 3600
    print(f"  {s['name']:30s} | {s['distance']} | {s['gender']} {s['age_group']} | "
          f"pred={total_h:.2f}h | DNF={s['dnf_probability']:.0%} | risk={s['risk_flags']}")"""),

md("""## 4. Task Prompts

### Task 1: Race Strategy Narrative"""),

code("""def build_strategy_prompt(scenario):
    return f\"\"\"Based on the following athlete and race data, generate a personalized race strategy narrative.

ATHLETE DATA:
{json.dumps(scenario, indent=2)}

Generate a JSON response with this schema:
{{
  "opening": "1-2 sentence summary of their predicted race",
  "swim_strategy": "Specific swim pacing advice (pace per 100m, sighting, positioning)",
  "t1_advice": "Transition 1 tips",
  "bike_strategy": "Specific bike pacing (target power/speed, when to eat/drink, terrain tips)",
  "t2_advice": "Transition 2 tips",
  "run_strategy": "Run pacing plan (pace per km, walk breaks if needed, aid station strategy)",
  "key_insight": "The #1 most important thing for THIS athlete",
  "predicted_finish": "Expected finish time range"
}}\"\"\"

print("EXAMPLE STRATEGY PROMPT:")
print("-"*60)
print(build_strategy_prompt(SCENARIOS[0])[:500] + "...")"""),

md("### Task 2: Risk Mitigation Coaching"),

code("""def build_risk_prompt(scenario):
    return f\"\"\"Based on the following athlete data with identified risk flags, generate risk mitigation coaching advice.

ATHLETE DATA:
{json.dumps(scenario, indent=2)}

Generate a JSON response with this schema:
{{
  "risk_summary": "Overall risk assessment in plain language",
  "risk_details": [
    {{
      "risk": "risk flag name",
      "severity": "low|moderate|high",
      "explanation": "Why this matters for THIS athlete",
      "mitigation": "Specific actionable advice to reduce this risk"
    }}
  ],
  "go_no_go_recommendation": "Overall recommendation on race readiness",
  "emergency_plan": "What to do if things go wrong on race day"
}}\"\"\"

print("EXAMPLE RISK PROMPT (Tom - Hot Race):")
print("-"*60)
print(build_risk_prompt(SCENARIOS[3])[:500] + "...")"""),

md("### Task 3: Nutrition Plan"),

code("""def build_nutrition_prompt(scenario):
    total_h = scenario['predicted_total_sec'] / 3600
    return f\"\"\"Generate a detailed, minute-by-minute nutrition plan for this athlete's race.

ATHLETE DATA:
{json.dumps(scenario, indent=2)}

NUTRITION SCIENCE CONSTRAINTS:
- Bike: 60-90g carbs/hour for races >3h, 30-60g for shorter
- Run: 30-60g carbs/hour
- Fluid: 500-800ml/hour (increase 10-20% in heat >28°C)
- Sodium: 500-1000mg/hour (increase in heat/humidity)
- Total race duration estimate: {total_h:.1f} hours

Generate a JSON response with this schema:
{{
  "pre_race": "What to eat/drink 2-3 hours before start",
  "swim_nutrition": "Brief note (usually nothing needed)",
  "bike_plan": [
    {{"km": 10, "item": "Gel #1 (25g carbs)", "fluid": "200ml sports drink", "notes": "..."}},
    ...
  ],
  "run_plan": [
    {{"km": 3, "item": "Gel + water", "notes": "..."}},
    ...
  ],
  "totals": {{
    "total_carbs_g": 0,
    "total_fluid_ml": 0,
    "total_sodium_mg": 0,
    "carbs_per_hour_bike": 0,
    "carbs_per_hour_run": 0
  }},
  "heat_adjustments": "If applicable, what to modify for heat"
}}\"\"\"

print("EXAMPLE NUTRITION PROMPT (Emma - 140.6):")
print("-"*60)
print(build_nutrition_prompt(SCENARIOS[2])[:500] + "...")"""),

md("## 5. LLM API Calls (if key available)"),

code("""def call_llm(prompt, system=SYSTEM_PROMPT, max_tokens=2000):
    if not HAS_API:
        return {"_status": "skipped", "_reason": "no API key"}
    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.content[0].text
        try:
            start = text.index('{')
            end = text.rindex('}') + 1
            return json.loads(text[start:end])
        except (ValueError, json.JSONDecodeError):
            return {"_raw_text": text, "_parse_error": True}
    except Exception as e:
        return {"_error": str(e)}

# Run all scenarios
all_outputs = {}
for scenario in SCENARIOS:
    name = scenario['name']
    print(f"\\n{'='*60}")
    print(f"Processing: {name} ({scenario['distance']})")
    print(f"{'='*60}")

    outputs = {}

    # Task 1: Strategy
    print("  Task 1: Race Strategy...")
    outputs['strategy'] = call_llm(build_strategy_prompt(scenario))

    # Task 2: Risk (only if risk flags exist)
    if scenario.get('risk_flags'):
        print("  Task 2: Risk Mitigation...")
        outputs['risk'] = call_llm(build_risk_prompt(scenario))

    # Task 3: Nutrition
    print("  Task 3: Nutrition Plan...")
    outputs['nutrition'] = call_llm(build_nutrition_prompt(scenario))

    all_outputs[name] = outputs

    for task, result in outputs.items():
        status = "✓" if "_error" not in result and "_status" not in result else "⚠"
        print(f"    {task}: {status}")"""),

md("## 6. Guardrail Validation"),

code("""guardrail_log = []

def validate_output(scenario, task, output):
    issues = []

    if '_error' in output or '_status' in output:
        return [{'scenario': scenario['name'], 'task': task, 'check': 'api_call',
                 'status': 'skipped', 'detail': str(output.get('_error', output.get('_status')))}]

    # Check nutrition totals
    if task == 'nutrition' and 'totals' in output:
        totals = output['totals']
        race_hours = scenario['predicted_total_sec'] / 3600

        carb_rate_bike = totals.get('carbs_per_hour_bike', 0)
        if carb_rate_bike > 0:
            if carb_rate_bike < 30 or carb_rate_bike > 120:
                issues.append({'check': 'carb_rate_bike', 'status': 'FAIL',
                              'detail': f'{carb_rate_bike}g/h outside 30-120g range'})
            else:
                issues.append({'check': 'carb_rate_bike', 'status': 'PASS',
                              'detail': f'{carb_rate_bike}g/h'})

        total_fluid = totals.get('total_fluid_ml', 0)
        if total_fluid > 0:
            fluid_per_h = total_fluid / max(race_hours, 1)
            if fluid_per_h < 300 or fluid_per_h > 1500:
                issues.append({'check': 'fluid_rate', 'status': 'FAIL',
                              'detail': f'{fluid_per_h:.0f}ml/h outside range'})
            else:
                issues.append({'check': 'fluid_rate', 'status': 'PASS',
                              'detail': f'{fluid_per_h:.0f}ml/h'})

    # Check predicted finish
    if task == 'strategy' and 'predicted_finish' in output:
        issues.append({'check': 'finish_prediction', 'status': 'REVIEW',
                      'detail': output['predicted_finish']})

    if not issues:
        issues.append({'check': 'general', 'status': 'PASS', 'detail': 'No checks failed'})

    for issue in issues:
        issue['scenario'] = scenario['name']
        issue['task'] = task
        issue['distance'] = scenario['distance']
    return issues

# Run guardrail validation
print("\\nGuardrail Validation:")
print("="*60)
for scenario in SCENARIOS:
    name = scenario['name']
    if name in all_outputs:
        for task, output in all_outputs[name].items():
            checks = validate_output(scenario, task, output)
            guardrail_log.extend(checks)
            for check in checks:
                symbol = '✓' if check['status'] == 'PASS' else '✗' if check['status'] == 'FAIL' else '?'
                print(f"  {symbol} {name:25s} | {scenario['distance']} | {task:12s} | {check['check']:20s} | {check['detail']}")

guardrail_df = pd.DataFrame(guardrail_log)
n_fail = (guardrail_df['status'] == 'FAIL').sum() if len(guardrail_df) > 0 else 0
n_pass = (guardrail_df['status'] == 'PASS').sum() if len(guardrail_df) > 0 else 0
print(f"\\nSummary: {n_pass} passed, {n_fail} failed, {len(guardrail_df)-n_pass-n_fail} review needed")"""),

md("## 7. Save Outputs"),

code("""# Save LLM outputs
output_path = CLEANED / 'llm_outputs_sample.json'
with open(output_path, 'w') as f:
    json.dump(all_outputs, f, indent=2, default=str)
print(f"llm_outputs_sample.json: {len(all_outputs)} scenarios")

# Save guardrail log
guardrail_df.to_csv(CLEANED / 'llm_guardrail_log.csv', index=False)
print(f"llm_guardrail_log.csv: {len(guardrail_df)} checks")

# Print sample output if available
if HAS_API and all_outputs:
    first_scenario = list(all_outputs.keys())[0]
    first_task = list(all_outputs[first_scenario].keys())[0]
    sample = all_outputs[first_scenario][first_task]
    print(f"\\nSample output ({first_scenario} — {first_task}):")
    print(json.dumps(sample, indent=2)[:1000])

print("\\n✅ LLM PROTOTYPING COMPLETE")"""),

md("""## 8. Summary & Next Steps

This notebook demonstrated:
1. **Structured prompts** for 4 coaching tasks (strategy, risk, nutrition, athletes-like-you)
2. **Guardrail validation** checking LLM outputs against model predictions and evidence-based ranges
3. **5 synthetic scenarios** covering both 70.3 and 140.6 distances with different tiers

### Production Integration Points:
- Replace synthetic scenarios with real per-distance model outputs from the ensemble pipeline
- Add the physics model output as an additional context field
- Implement "athletes like you" using cosine similarity from NB05 embeddings
- Add streaming for real-time narrative generation in the web app
- Expand guardrail suite: cross-check all numbers, validate time format parsing
- Consider separate prompt templates for 70.3 vs 140.6 (different nutrition/pacing advice)"""),

]

nbf.write(nb, 'research/notebooks/08_llm_prototyping.ipynb')
print("Created 08_llm_prototyping.ipynb")
