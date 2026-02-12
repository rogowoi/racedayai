/**
 * RaceDayAI – Run Fade Prediction Model
 * ======================================
 *
 * Predicts run slowdown based on bike intensity:
 *   1. Lookup table of run fade ratios by gender × age group × bike intensity
 *   2. Predict pace degradation from bike effort
 *   3. Recommend run pacing adjustments for planned bike intensity
 *
 * Data from:
 *   - fade-model.json: lookup table of predicted run_fade ratios
 */

import type { Gender, AgeGroup } from "./statistics";

// ── Types ──────────────────────────────────────────────────────

export interface FadePrediction {
  /** Expected pace slowdown as a percentage (0-100) */
  paceSlowdownPct: number;

  /** Expected absolute time loss in seconds */
  estimatedTimeAddedSec: number;

  /** Confidence interval (if available) */
  confidenceInterval: {
    lower: number; // more optimistic
    upper: number; // more pessimistic
  } | null;
}

interface FadeModel {
  lookup_table: Record<string, Record<string, number>>;
}

// ── Defaults & Fallbacks ───────────────────────────────────────

/**
 * Default fade % if no model data available.
 * Conservative estimate: expect 0.8-1% fade per 0.05 IF units.
 */
const DEFAULT_FADE_PCT = 2.0; // percent

// ── Lazy-loaded model ──────────────────────────────────────────

let fadeModel: FadeModel | null = null;

async function loadFadeModel(): Promise<FadeModel | null> {
  if (fadeModel !== null) return fadeModel;
  try {
    const data = await import("@/data/fade-model.json");
    fadeModel = data.default as any;
    return fadeModel;
  } catch {
    return null;
  }
}

// ── Helpers ────────────────────────────────────────────────────

function getCohortKey(gender: Gender, ageGroup: AgeGroup): string {
  return `${gender}_${ageGroup}`;
}

/**
 * Get fade % for a cohort and bike intensity ratio.
 * Finds the closest intensity bucket in the lookup table.
 */
async function getFadePercentage(
  gender: Gender,
  ageGroup: AgeGroup,
  bikeIntensityRatio: number, // e.g., 0.78 for 70.3, >1.0 = harder than cohort median
): Promise<number> {
  const model = await loadFadeModel();
  if (!model?.lookup_table) return DEFAULT_FADE_PCT;

  const key = getCohortKey(gender, ageGroup);
  const cohortData = model.lookup_table[key];

  if (!cohortData) return DEFAULT_FADE_PCT;

  // Find closest intensity bucket
  const buckets = Object.keys(cohortData).map(Number).sort((a, b) => a - b);
  if (buckets.length === 0) return DEFAULT_FADE_PCT;

  let closestBucket = buckets[0];
  let minDist = Math.abs(buckets[0] - bikeIntensityRatio);

  for (const bucket of buckets) {
    const dist = Math.abs(bucket - bikeIntensityRatio);
    if (dist < minDist) {
      minDist = dist;
      closestBucket = bucket;
    }
  }

  // The lookup table stores run_fade ratio, not slowdown %
  // A value of 1.0 = no fade, 1.1 = 10% slower, 0.9 = 10% faster
  // Format bucket key to match JSON (e.g., "0.80", "1.05")
  const bucketKey = closestBucket.toFixed(2);
  const fadeRatio = cohortData[bucketKey];
  if (!fadeRatio) return DEFAULT_FADE_PCT;

  // Convert ratio to percentage slowdown
  // If fadeRatio = 1.1, that's 10% slower = (1.1 - 1.0) * 100 = 10%
  const slowdownPct = Math.max(0, (fadeRatio - 1.0) * 100);

  return Math.round(slowdownPct * 10) / 10;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Predict how much the run will slow down based on bike intensity ratio.
 *
 * bikeIntensityRatio: normalized intensity (1.0 = cohort median for gender/age)
 * gender: athlete gender
 * ageGroup: age group cohort
 *
 * Returns predicted fade as percentage (0-100) and absolute time loss.
 */
export async function predictFade(
  bikeIntensityRatio: number,
  gender: Gender,
  ageGroup: AgeGroup,
): Promise<FadePrediction> {
  const fadePercent = await getFadePercentage(gender, ageGroup, bikeIntensityRatio);

  // Clamp to reasonable range (0-30% fade is realistic)
  const clampedFade = Math.min(30, Math.max(0, fadePercent));

  // For a 21.1km run at ~6 min/km (360 sec/km) = ~7596 sec total
  // Every 1% pace slowdown adds ~76 sec
  const baseRunSec = 21.1 * 6 * 60; // ~7596 sec for ~6 min/km
  const estimatedTimeAdded = Math.round((baseRunSec * clampedFade) / 100);

  // Confidence interval: ±2% around prediction (data has good fit)
  const confidence = 2;

  return {
    paceSlowdownPct: Math.round(clampedFade * 10) / 10,
    estimatedTimeAddedSec: estimatedTimeAdded,
    confidenceInterval: {
      lower: Math.max(0, Math.round((clampedFade - confidence) * 10) / 10),
      upper: Math.min(30, Math.round((clampedFade + confidence) * 10) / 10),
    },
  };
}

/**
 * Get recommended run pacing adjustment given a planned bike IF/intensity.
 *
 * bikePlanIF: planned Intensity Factor on the bike (0.7-0.9)
 * gender: athlete gender
 * ageGroup: age group cohort
 *
 * Returns the expected slowdown % for the run.
 */
export async function getRecommendedRunAdjustment(
  bikePlanIF: number,
  gender: Gender,
  ageGroup: AgeGroup,
): Promise<number> {
  // Rough conversion: IF is already a normalized intensity ratio
  // 0.7-0.9 range maps to cohort intensity ratios
  // Use IF directly as intensity ratio approximation
  const prediction = await predictFade(bikePlanIF, gender, ageGroup);
  return prediction.paceSlowdownPct;
}
