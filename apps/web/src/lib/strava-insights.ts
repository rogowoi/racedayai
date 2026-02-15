/**
 * LLM-powered refinement of Strava fitness metrics.
 * Uses xAI/Grok to act as a triathlon coach reviewing raw training data
 * and math-based estimates, adding confidence levels and coaching insight.
 */

import { xai } from "@/lib/xai";
import type { StravaActivity, FitnessMetrics } from "@/lib/strava";

// ─── Types ──────────────────────────────────────────────────────

export interface LLMRefinedMetrics {
  ftpWatts: number | null;
  ftpConfidence: "high" | "medium" | "low";
  thresholdPaceSec: number | null;
  paceConfidence: "high" | "medium" | "low";
  cssPer100mSec: number | null;
  cssConfidence: "high" | "medium" | "low";
  maxHr: number | null;
  coachingInsight: string;
}

// ─── Activity Summarization ─────────────────────────────────────

function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/km`;
}

function formatSwimPace(secPer100m: number): string {
  const min = Math.floor(secPer100m / 60);
  const sec = Math.round(secPer100m % 60);
  return `${min}:${sec.toString().padStart(2, "0")}/100m`;
}

function summarizeActivities(activities: StravaActivity[]): string {
  const rides = activities.filter(
    (a) => a.sport_type === "Ride" || a.type === "Ride"
  );
  const runs = activities.filter(
    (a) => a.sport_type === "Run" || a.type === "Run"
  );
  const swims = activities.filter(
    (a) => a.sport_type === "Swim" || a.type === "Swim"
  );

  const lines: string[] = [];

  lines.push(
    `Training summary (last 12 weeks): ${activities.length} total activities — ${rides.length} rides, ${runs.length} runs, ${swims.length} swims.`
  );

  // Ride details (top 10 most relevant)
  if (rides.length > 0) {
    lines.push("\nBike rides:");
    const sortedRides = [...rides]
      .sort(
        (a, b) =>
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )
      .slice(0, 10);
    for (const r of sortedRides) {
      const distKm = (r.distance / 1000).toFixed(1);
      const durationMin = Math.round(r.moving_time / 60);
      const watts = r.weighted_average_watts
        ? `${r.weighted_average_watts}W weighted`
        : r.average_watts
          ? `${r.average_watts}W avg`
          : "no power";
      const hr = r.average_heartrate ? `, ${Math.round(r.average_heartrate)}bpm avg` : "";
      const powerSrc = r.device_watts ? " (power meter)" : " (estimated)";
      lines.push(
        `  ${r.start_date.slice(0, 10)}: ${distKm}km, ${durationMin}min, ${watts}${r.weighted_average_watts ? powerSrc : ""}${hr}`
      );
    }
  }

  // Run details (top 10)
  if (runs.length > 0) {
    lines.push("\nRuns:");
    const sortedRuns = [...runs]
      .sort(
        (a, b) =>
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )
      .slice(0, 10);
    for (const r of sortedRuns) {
      const distKm = (r.distance / 1000).toFixed(1);
      const durationMin = Math.round(r.moving_time / 60);
      const pace =
        r.average_speed > 0 ? formatPace(1000 / r.average_speed) : "N/A";
      const hr = r.average_heartrate ? `, ${Math.round(r.average_heartrate)}bpm avg` : "";
      lines.push(
        `  ${r.start_date.slice(0, 10)}: ${distKm}km, ${durationMin}min, ${pace}${hr}`
      );
    }
  }

  // Swim details (top 10)
  if (swims.length > 0) {
    lines.push("\nSwims:");
    const sortedSwims = [...swims]
      .sort(
        (a, b) =>
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
      )
      .slice(0, 10);
    for (const s of sortedSwims) {
      const distM = Math.round(s.distance);
      const durationMin = Math.round(s.moving_time / 60);
      const pace =
        s.average_speed > 0
          ? formatSwimPace(100 / s.average_speed)
          : "N/A";
      lines.push(
        `  ${s.start_date.slice(0, 10)}: ${distM}m, ${durationMin}min, ${pace}`
      );
    }
  }

  return lines.join("\n");
}

// ─── LLM Refinement ────────────────────────────────────────────

/**
 * Refine math-based estimates using LLM coaching analysis.
 * Returns adjusted estimates with confidence levels and a coaching insight.
 * Falls back to math-only estimates if LLM is unavailable or fails.
 */
export async function refineMetricsWithLLM(
  activities: StravaActivity[],
  mathMetrics: FitnessMetrics
): Promise<LLMRefinedMetrics> {
  // Default: return math estimates with low-medium confidence
  const fallback: LLMRefinedMetrics = {
    ftpWatts: mathMetrics.ftpWatts,
    ftpConfidence: mathMetrics.ftpSource === "zones" ? "high" : mathMetrics.ftpWatts ? "medium" : "low",
    thresholdPaceSec: mathMetrics.thresholdPaceSec,
    paceConfidence: mathMetrics.thresholdPaceSec ? "medium" : "low",
    cssPer100mSec: mathMetrics.cssPer100mSec,
    cssConfidence: mathMetrics.cssPer100mSec ? "medium" : "low",
    maxHr: mathMetrics.maxHr,
    coachingInsight: "",
  };

  if (!xai || !activities || activities.length === 0) {
    return fallback;
  }

  const activitySummary = summarizeActivities(activities);

  const mathSummary = [
    `FTP: ${mathMetrics.ftpWatts ? `${mathMetrics.ftpWatts}W (source: ${mathMetrics.ftpSource})` : "not available"}`,
    `Threshold pace: ${mathMetrics.thresholdPaceSec ? formatPace(mathMetrics.thresholdPaceSec) : "not available"}`,
    `CSS: ${mathMetrics.cssPer100mSec ? formatSwimPace(mathMetrics.cssPer100mSec) : "not available"}`,
    `Max HR: ${mathMetrics.maxHr ? `${mathMetrics.maxHr}bpm` : "not available"}`,
    `Power meter: ${mathMetrics.hasPowerMeter ? "yes" : "no"}`,
  ].join("\n");

  const prompt = `You are an experienced triathlon coach analyzing an athlete's recent training data to validate and refine their fitness metric estimates.

TRAINING DATA:
${activitySummary}

MATH-BASED ESTIMATES:
${mathSummary}

Your task:
1. Review the math estimates against the raw training data patterns
2. Adjust any estimate that seems off based on the data (e.g., if FTP estimate seems too high/low relative to actual ride powers)
3. Assign confidence per metric: "high" (strong data support), "medium" (reasonable estimate), "low" (limited data or uncertain)
4. Write a 1-2 sentence coaching insight about this athlete's current fitness

IMPORTANT RULES:
- Only adjust estimates within ±15% of the math values. Do not make large changes.
- If a math estimate is null, you may provide one ONLY if the data clearly supports it
- For FTP from zones (source: "zones"), keep it as-is with high confidence — the athlete configured it
- Be conservative — it's better to slightly underestimate than overestimate thresholds

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "ftpWatts": <number or null>,
  "ftpConfidence": "<high|medium|low>",
  "thresholdPaceSec": <number or null>,
  "paceConfidence": "<high|medium|low>",
  "cssPer100mSec": <number or null>,
  "cssConfidence": "<high|medium|low>",
  "maxHr": <number or null>,
  "coachingInsight": "<1-2 sentences>"
}`;

  try {
    const completion = await xai.chat.completions.create({
      model: "grok-3-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return fallback;

    // Parse JSON from response (strip markdown fences if present)
    const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);

    // Clamp LLM adjustments to ±15% of math values
    const result: LLMRefinedMetrics = {
      ftpWatts: clampAdjustment(parsed.ftpWatts, mathMetrics.ftpWatts),
      ftpConfidence: validateConfidence(parsed.ftpConfidence),
      thresholdPaceSec: clampAdjustment(
        parsed.thresholdPaceSec,
        mathMetrics.thresholdPaceSec
      ),
      paceConfidence: validateConfidence(parsed.paceConfidence),
      cssPer100mSec: clampAdjustment(
        parsed.cssPer100mSec,
        mathMetrics.cssPer100mSec
      ),
      cssConfidence: validateConfidence(parsed.cssConfidence),
      maxHr:
        typeof parsed.maxHr === "number" && parsed.maxHr > 0
          ? Math.round(parsed.maxHr)
          : mathMetrics.maxHr,
      coachingInsight:
        typeof parsed.coachingInsight === "string"
          ? parsed.coachingInsight.slice(0, 300)
          : "",
    };

    return result;
  } catch (error) {
    console.error("LLM metric refinement failed, using math estimates:", error);
    return fallback;
  }
}

// ─── Helpers ────────────────────────────────────────────────────

function clampAdjustment(
  llmValue: unknown,
  mathValue: number | null
): number | null {
  if (typeof llmValue !== "number" || llmValue <= 0) return mathValue;
  if (mathValue === null) return Math.round(llmValue);

  // Clamp to ±15% of math value
  const lower = mathValue * 0.85;
  const upper = mathValue * 1.15;
  return Math.round(Math.max(lower, Math.min(upper, llmValue)));
}

function validateConfidence(
  val: unknown
): "high" | "medium" | "low" {
  if (val === "high" || val === "medium" || val === "low") return val;
  return "medium";
}
