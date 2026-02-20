import { xai } from "@/lib/xai";

interface NarrativeInput {
  raceName: string;
  distanceCategory: string;
  raceDate: string;
  weatherTempC: number;
  weatherHumidity: number;
  swimPacePer100m: string;
  bikeTargetPower: number;
  bikeSpeedKph: number;
  runTargetPace: string;
  carbsPerHour: number;
  fluidPerHour: number;
  predictedFinish: string;
  elevationGainM?: number;
  athleteWeight?: number;
  statisticalInsights?: {
    cohortSize?: number;
    percentilePlacement?: string;
    fasterThanPct?: number;
    confidenceRange?: string;
    recommendedSplitBike?: number;
    recommendedSplitRun?: number;
    courseInfo?: {
      courseName?: string;
      difficulty?: string;
      medianFinishSec?: number;
    };
    fadeInfo?: {
      paceSlowdownPct?: number;
      estimatedTimeAddedSec?: number;
    };
    weatherImpact?: {
      combinedImpactPct?: number;
      riskLevel?: string;
    };
    trendInfo?: {
      adjustmentSec?: number;
      targetYear?: number;
      segmentTrends?: { swim: string; bike: string; run: string };
    };
  };
}

export async function generateRaceNarrative(
  input: NarrativeInput
): Promise<string | null> {
  if (!xai) return null;

  // Helper to format seconds to HH:MM:SS
  const formatTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const prompt = `You are an experienced triathlon coach writing a race-day strategy brief for an athlete.

Race: ${input.raceName} (${input.distanceCategory.toUpperCase()})
Date: ${input.raceDate}
Weather: ${input.weatherTempC}°C, ${input.weatherHumidity}% humidity
${input.elevationGainM ? `Bike Elevation: ${input.elevationGainM}m gain` : ""}

Targets:
- Swim: ${input.swimPacePer100m}/100m
- Bike: ${input.bikeTargetPower}W at ${input.bikeSpeedKph} km/h
- Run: ${input.runTargetPace}/km
- Nutrition: ${input.carbsPerHour}g carbs/hr, ${input.fluidPerHour}ml fluid/hr
- Predicted Finish: ${input.predictedFinish}
${input.statisticalInsights ? `
Data-Driven Insights (from ${input.statisticalInsights.cohortSize?.toLocaleString()} similar athletes):
- Predicted placement: ${input.statisticalInsights.percentilePlacement ?? "N/A"} (faster than ${input.statisticalInsights.fasterThanPct ?? "?"}% of similar athletes)
- Finish time range (80% confidence): ${input.statisticalInsights.confidenceRange ?? "N/A"}
- Optimal bike split: ~${input.statisticalInsights.recommendedSplitBike ?? "?"}% of total time
- Optimal run split: ~${input.statisticalInsights.recommendedSplitRun ?? "?"}% of total time
${input.statisticalInsights.courseInfo ? `
Course-Specific Context:
- Course: ${input.statisticalInsights.courseInfo.courseName ?? "N/A"}
- Difficulty: ${input.statisticalInsights.courseInfo.difficulty ?? "N/A"} (may be more challenging than typical 70.3)
- Median finish time at this venue: ${input.statisticalInsights.courseInfo.medianFinishSec ? formatTime(input.statisticalInsights.courseInfo.medianFinishSec) : "N/A"}` : ""}
${input.statisticalInsights.fadeInfo ? `
Run Fade Prediction:
- Based on your bike intensity plan, expect the run to slow ~${input.statisticalInsights.fadeInfo.paceSlowdownPct ?? "?"}% vs fresh legs
- This adds approximately ${input.statisticalInsights.fadeInfo.estimatedTimeAddedSec ?? "?"} seconds to your predicted run time
- Prepare mental strategies and pacing discipline for this expected fatigue` : ""}
${input.statisticalInsights.weatherImpact ? `
Weather Impact Prediction:
- Forecasted conditions will add approximately ${Math.abs(input.statisticalInsights.weatherImpact.combinedImpactPct ?? 0)}% ${input.statisticalInsights.weatherImpact.combinedImpactPct && input.statisticalInsights.weatherImpact.combinedImpactPct > 0 ? "slowdown" : "speedup"} to your time
- Risk Level: ${input.statisticalInsights.weatherImpact.riskLevel ?? "unknown"}
- Adjust nutrition and hydration strategy accordingly` : ""}
${input.statisticalInsights.trendInfo ? `
Year-Based Performance Trend:
- Race year (${input.statisticalInsights.trendInfo.targetYear}): Athletes are trending ${input.statisticalInsights.trendInfo.adjustmentSec && input.statisticalInsights.trendInfo.adjustmentSec < 0 ? "faster" : "slower"} than the 2004-2020 dataset median
- Adjustment: ${input.statisticalInsights.trendInfo.adjustmentSec ?? 0} seconds from historical baseline
- Segment trends: Swim (${input.statisticalInsights.trendInfo.segmentTrends?.swim ?? "?"}), Bike (${input.statisticalInsights.trendInfo.segmentTrends?.bike ?? "?"}), Run (${input.statisticalInsights.trendInfo.segmentTrends?.run ?? "?"})` : ""}` : ""}

Write a 300-500 word race execution strategy narrative. Cover:
1. Pre-race mindset and warmup approach
2. Swim strategy (pacing, sighting, positioning)
3. T1 transition priorities
4. Bike execution (power management, nutrition timing, terrain awareness)
5. T2 transition priorities
6. Run strategy (pacing discipline, nutrition, mental tactics) - especially accounting for any expected fatigue
7. Final push and finish

Be specific with the numbers provided. Write in second person ("you"). Be motivational but realistic. No headers or bullet points — write flowing prose paragraphs.`;

  try {
    const completion = await xai.chat.completions.create({
      model: "grok-3-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || null;
  } catch {
    return null;
  }
}

// ── Nutrition Coaching (Structured Output) ───────────────────

interface NutritionCoachingInput {
  raceName: string;
  distanceCategory: string;
  weatherTempC: number;
  primaryGelName: string;
  caffeinatedGelName: string;
  drinkMixName?: string;
  bikeDurationMin: number;
  runDurationMin: number;
  carbsPerHour: number;
  bikeGelCount: number;
  runGelCount: number;
}

export interface NutritionCoachingOutput {
  bikeKeyMomentNotes: string[];
  runKeyMomentNotes: string[];
  bikeSetupProse: string;
  proTips: { title: string; description: string }[];
  raceDayMantra: string;
}

export async function generateNutritionCoaching(
  input: NutritionCoachingInput,
): Promise<NutritionCoachingOutput | null> {
  if (!xai) return null;

  const prompt = `You are an experienced triathlon coach giving race-day nutrition advice to a friend. Write like you're texting them the morning before their race — casual, practical, no BS.

Race: ${input.raceName} (${input.distanceCategory.toUpperCase()})
Weather: ${input.weatherTempC}°C
Bike: ${input.bikeDurationMin} min, ${input.bikeGelCount} gels planned
Run: ${input.runDurationMin} min, ${input.runGelCount} gels planned
Nutrition: ${input.carbsPerHour}g carbs/hr
Products: ${input.primaryGelName} (main gel), ${input.caffeinatedGelName} (caffeine gel)${input.drinkMixName ? `, ${input.drinkMixName} (in bottle)` : ""}

Return a JSON object with exactly this structure:
{
  "bikeKeyMomentNotes": [
    "coach note for first gel on bike (casual, ~20 words)",
    "coach note for caffeine gel moment (casual, ~20 words)",
    "coach note for last gel before T2 (casual, ~20 words)"
  ],
  "runKeyMomentNotes": [
    "coach note for first run gel (casual, ~20 words)",
    "coach note for run midpoint (casual, ~20 words)",
    "coach note for late run option (casual, ~20 words)"
  ],
  "bikeSetupProse": "One paragraph (under 80 words) about how to set up the bike with nutrition — mention specific product names, where to tape gels, bottle placement",
  "proTips": [
    { "title": "short title (3-5 words)", "description": "practical tip in 1-2 sentences" },
    { "title": "short title", "description": "practical tip in 1-2 sentences" },
    { "title": "short title", "description": "practical tip in 1-2 sentences" }
  ],
  "raceDayMantra": "A short motivational one-liner to remember during the race"
}

Guidelines:
- Reference specific product names (${input.primaryGelName}, ${input.caffeinatedGelName})
- Be specific about timing
- Include practical lifehacks
- Write in second person ("you")
- Keep it casual and human`;

  try {
    const completion = await xai.chat.completions.create({
      model: "grok-3-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as NutritionCoachingOutput;
    if (!parsed.bikeKeyMomentNotes || !parsed.runKeyMomentNotes || !parsed.bikeSetupProse) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
