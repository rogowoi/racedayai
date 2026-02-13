/**
 * Consistency validation for predictions
 *
 * Ensures time and intensity are mathematically consistent:
 * - Swim: pace × distance = time
 * - Bike: watts → speed → time
 * - Run: pace × distance = time
 */

import type { SegmentPrediction, Distance, ModelMetadata } from "./types";

/**
 * Estimate watts from speed using simplified physics
 */
function speedToWatts(
  speedKmh: number,
  weightKg: number = 75,
  crr: number = 0.005,
  cda: number = 0.35
): number {
  const speedMs = speedKmh / 3.6;

  // Rolling resistance: Crr * weight * g * v
  const rollingWatts = crr * weightKg * 9.81 * speedMs;

  // Aerodynamic drag: 0.5 * Cda * rho * v^3
  const aeroWatts = 0.5 * cda * 1.225 * Math.pow(speedMs, 3);

  return rollingWatts + aeroWatts;
}

/**
 * Validate swim consistency
 */
export function validateSwimConsistency(
  segments: SegmentPrediction,
  distanceM: number
): {
  isValid: boolean;
  error: number;
  message?: string;
} {
  const { seconds, pacePer100m } = segments.swim;

  // Calculate implied time from pace
  const impliedSeconds = (pacePer100m * distanceM) / 100;

  // Calculate relative error
  const error = Math.abs(impliedSeconds - seconds) / seconds;

  const isValid = error < 0.05; // 5% tolerance

  return {
    isValid,
    error,
    message: isValid
      ? undefined
      : `Swim time/pace inconsistency: ${(error * 100).toFixed(1)}% error`,
  };
}

/**
 * Validate bike consistency
 */
export function validateBikeConsistency(
  segments: SegmentPrediction,
  distanceKm: number,
  weightKg: number = 75
): {
  isValid: boolean;
  error: number;
  message?: string;
} {
  const { seconds, avgWatts } = segments.bike;

  // Calculate speed from time
  const actualSpeedKmh = distanceKm / (seconds / 3600);

  // Calculate implied watts from speed
  const impliedWatts = speedToWatts(actualSpeedKmh, weightKg);

  // Calculate relative error
  const error = Math.abs(impliedWatts - avgWatts) / avgWatts;

  const isValid = error < 0.20; // 20% tolerance (physics model is approximate)

  return {
    isValid,
    error,
    message: isValid
      ? undefined
      : `Bike power/time inconsistency: ${(error * 100).toFixed(1)}% error (${impliedWatts.toFixed(0)}W vs ${avgWatts.toFixed(0)}W)`,
  };
}

/**
 * Validate run consistency
 */
export function validateRunConsistency(
  segments: SegmentPrediction,
  distanceKm: number
): {
  isValid: boolean;
  error: number;
  message?: string;
} {
  const { seconds, avgPacePerKm } = segments.run;

  // Calculate implied time from pace
  const impliedSeconds = avgPacePerKm * 60 * distanceKm;

  // Calculate relative error
  const error = Math.abs(impliedSeconds - seconds) / seconds;

  const isValid = error < 0.05; // 5% tolerance

  return {
    isValid,
    error,
    message: isValid
      ? undefined
      : `Run time/pace inconsistency: ${(error * 100).toFixed(1)}% error`,
  };
}

/**
 * Validate all segments
 */
export function validateConsistency(
  segments: SegmentPrediction,
  distance: Distance,
  metadata: ModelMetadata,
  weightKg?: number
): {
  isValid: boolean;
  errors: string[];
} {
  const distanceConfig = metadata.distance_configs[distance];
  const errors: string[] = [];

  // Validate swim
  const swimResult = validateSwimConsistency(
    segments,
    distanceConfig.swim_distance_m
  );
  if (!swimResult.isValid && swimResult.message) {
    errors.push(swimResult.message);
  }

  // Validate bike
  const bikeResult = validateBikeConsistency(
    segments,
    distanceConfig.bike_distance_km,
    weightKg
  );
  if (!bikeResult.isValid && bikeResult.message) {
    errors.push(bikeResult.message);
  }

  // Validate run
  const runResult = validateRunConsistency(
    segments,
    distanceConfig.run_distance_km
  );
  if (!runResult.isValid && runResult.message) {
    errors.push(runResult.message);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that segments sum to total time
 */
export function validateSegmentSum(
  segments: SegmentPrediction,
  totalSeconds: number
): {
  isValid: boolean;
  error: number;
  message?: string;
} {
  const segmentSum =
    segments.swim.seconds +
    segments.bike.seconds +
    segments.run.seconds +
    segments.transitions.t1 +
    segments.transitions.t2;

  const error = Math.abs(segmentSum - totalSeconds) / totalSeconds;

  const isValid = error < 0.02; // 2% tolerance

  return {
    isValid,
    error,
    message: isValid
      ? undefined
      : `Segment sum doesn't match total: ${segmentSum.toFixed(0)}s vs ${totalSeconds.toFixed(0)}s (${(error * 100).toFixed(1)}% error)`,
  };
}
