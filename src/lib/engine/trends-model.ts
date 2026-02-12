/**
 * RaceDayAI – Performance Trends Model
 * =====================================
 *
 * Analyzes year-over-year performance trends in triathlon racing.
 * Accounts for how athletes' predicted times should shift based on
 * the race year relative to the dataset baseline.
 *
 * Data from:
 *   - performance-trends.json: overall and cohort-specific trend coefficients
 *   - Coverage: 50,000 IRONMAN 70.3 records from 2004-2020
 */

import type { Gender, AgeGroup } from "./statistics";

// ── Types ──────────────────────────────────────────────────────

export interface TrendAdjustment {
  /** Positive = add time (slower era), negative = subtract (faster era) */
  adjustmentSec: number;

  /** Percentage change vs dataset median year */
  adjustmentPct: number;

  /** Raw sec/year coefficient used */
  yearCoefficient: number;

  /** e.g. "Based on 6096 records" or "Low confidence (< 100 records)" */
  confidenceNote: string;

  /** Midpoint of dataset (2012) */
  baselineYear: number;

  /** The race year */
  targetYear: number;
}

export interface TrendContext {
  overall: TrendAdjustment;
  cohortSpecific: TrendAdjustment | null;
  segmentTrends: {
    swim: { secPerYear: number; direction: string };
    bike: { secPerYear: number; direction: string };
    run: { secPerYear: number; direction: string };
  };
}

interface PerformanceTrendsData {
  metadata: {
    years_range: string;
    total_records: number;
  };
  overall_trend: {
    year_coefficient: number;
    intercept: number;
    r2_score: number;
    pct_change_per_year: number;
  };
  segment_trends: {
    swim: { year_coefficient: number; trend: string };
    bike: { year_coefficient: number; trend: string };
    run: { year_coefficient: number; trend: string };
  };
  yearly_medians: Record<string, { median_sec: number }>;
  cohort_trends: Record<
    string,
    { year_coefficient: number; trend: string; n_records: number }
  >;
}

// ── Constants ──────────────────────────────────────────────────

const BASELINE_YEAR = 2012; // Midpoint of 2004-2020 dataset
const MIN_RECORDS_FOR_CONFIDENCE = 100;

// ── Lazy-loaded model ──────────────────────────────────────────

let trendsData: PerformanceTrendsData | null = null;

async function loadTrends(): Promise<PerformanceTrendsData | null> {
  if (trendsData !== null) return trendsData;
  try {
    const data = await import("@/data/performance-trends.json");
    trendsData = data.default as any;
    return trendsData;
  } catch {
    return null;
  }
}

// ── Helpers ────────────────────────────────────────────────────

function getCohortKey(gender: Gender, ageGroup: AgeGroup): string {
  return `${gender}_${ageGroup}`;
}

/**
 * Calculate year adjustment in seconds for a given target year.
 *
 * Negative coefficient (e.g., -6.04 sec/year) means athletes are getting faster.
 * For a race in 2026 vs baseline 2012, that's 14 years × (-6.04) = -84.6 seconds.
 * The adjustment is applied to a prediction based on historical data:
 *   - Positive adjustment = slower era (add time)
 *   - Negative adjustment = faster era (subtract time)
 */
function calculateAdjustment(
  yearCoefficient: number,
  targetYear: number,
  baselineYear: number,
): number {
  const yearDelta = targetYear - baselineYear;
  return yearDelta * yearCoefficient;
}

// ── Public API ─────────────────────────────────────────────────

/**
 * Get year adjustment for a target race year.
 * Optionally includes cohort-specific coefficient if available.
 *
 * The dataset baseline is 2012. For a 2026 race, that's 14 years forward.
 * Overall adjustment = 14 × (-6.04) = -84.6 seconds (getting faster).
 *
 * If cohort-specific trend exists with >100 records, also compute that.
 */
export async function getYearAdjustment(
  targetYear: number,
  gender?: Gender,
  ageGroup?: AgeGroup,
): Promise<TrendContext> {
  const data = await loadTrends();

  // Overall adjustment (always available)
  const overallCoeff = data?.overall_trend.year_coefficient ?? 0;
  const overallAdjustmentSec = calculateAdjustment(
    overallCoeff,
    targetYear,
    BASELINE_YEAR,
  );

  // Estimate percentage change based on dataset median at baseline
  const baselineMedianSec = data?.yearly_medians["2012"]?.median_sec ?? 20787;
  const overallAdjustmentPct =
    (overallAdjustmentSec / baselineMedianSec) * 100;

  const overall: TrendAdjustment = {
    adjustmentSec: Math.round(overallAdjustmentSec * 10) / 10,
    adjustmentPct: Math.round(overallAdjustmentPct * 100) / 100,
    yearCoefficient: Math.round(overallCoeff * 10000) / 10000,
    confidenceNote: `Based on ${data?.metadata.total_records?.toLocaleString() ?? "??"} records`,
    baselineYear: BASELINE_YEAR,
    targetYear,
  };

  // Cohort-specific adjustment (if available)
  let cohortSpecific: TrendAdjustment | null = null;
  if (gender && ageGroup && data?.cohort_trends) {
    const cohortKey = getCohortKey(gender, ageGroup);
    const cohortData = data.cohort_trends[cohortKey];

    if (cohortData && cohortData.n_records >= MIN_RECORDS_FOR_CONFIDENCE) {
      const cohortCoeff = cohortData.year_coefficient;
      const cohortAdjustmentSec = calculateAdjustment(
        cohortCoeff,
        targetYear,
        BASELINE_YEAR,
      );
      const cohortAdjustmentPct =
        (cohortAdjustmentSec / baselineMedianSec) * 100;

      cohortSpecific = {
        adjustmentSec: Math.round(cohortAdjustmentSec * 10) / 10,
        adjustmentPct: Math.round(cohortAdjustmentPct * 100) / 100,
        yearCoefficient: Math.round(cohortCoeff * 10000) / 10000,
        confidenceNote: `Based on ${cohortData.n_records.toLocaleString()} records`,
        baselineYear: BASELINE_YEAR,
        targetYear,
      };
    }
  }

  // Segment trends
  const segmentTrends = {
    swim: {
      secPerYear: data?.segment_trends.swim.year_coefficient ?? 0,
      direction: data?.segment_trends.swim.trend ?? "unknown",
    },
    bike: {
      secPerYear: data?.segment_trends.bike.year_coefficient ?? 0,
      direction: data?.segment_trends.bike.trend ?? "unknown",
    },
    run: {
      secPerYear: data?.segment_trends.run.year_coefficient ?? 0,
      direction: data?.segment_trends.run.trend ?? "unknown",
    },
  };

  return {
    overall,
    cohortSpecific,
    segmentTrends,
  };
}

/**
 * Convenience function: adjust a prediction for target year.
 * Takes a prediction based on historical data and adjusts it forward/backward.
 *
 * Uses cohort-specific coefficient if available (with >100 records),
 * falls back to overall.
 */
export async function adjustPredictionForYear(
  predictedSec: number,
  targetYear: number,
  gender?: Gender,
  ageGroup?: AgeGroup,
): Promise<number> {
  const trend = await getYearAdjustment(targetYear, gender, ageGroup);

  // Use cohort-specific if available, otherwise overall
  const adjustment =
    trend.cohortSpecific?.adjustmentSec ?? trend.overall.adjustmentSec;

  return Math.round(predictedSec + adjustment);
}

/**
 * Get median finish time for a specific year from the dataset.
 *
 * Returns null if the year is not in the dataset.
 */
export async function getYearlyMedian(year: number): Promise<number | null> {
  const data = await loadTrends();
  const yearStr = year.toString();

  if (data?.yearly_medians[yearStr]) {
    return data.yearly_medians[yearStr].median_sec;
  }

  return null;
}
