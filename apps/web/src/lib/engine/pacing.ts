export type PacingInput = {
  ftp: number;
  courseDistanceKm: number; // e.g. 90 for 70.3
  elevationGainM: number;
  userWeightKg: number;
};

export type PacingOutput = {
  targetPower: number; // Watts
  targetSpeedKph: number; // Estimated
  intensityFactor: number;
  tss: number;
  durationMinutes: number;
};

export function calculateBikePacing(input: PacingInput): PacingOutput {
  const { ftp, courseDistanceKm, elevationGainM, userWeightKg } = input;

  // Determine race type based on distance roughly
  let intensityFactor = 0.7; // Default to Iron distance

  if (courseDistanceKm < 25) {
    // Sprint (20k)
    intensityFactor = 0.92;
  } else if (courseDistanceKm < 50) {
    // Olympic (40k)
    intensityFactor = 0.88;
  } else if (courseDistanceKm < 100) {
    // 70.3 (90k)
    intensityFactor = 0.78;
  } else {
    // 140.6 (180k)
    intensityFactor = 0.7;
  }

  // Adjust for elevation (simplified: hillier courses mean slightly lower NP target to save legs,
  // or higher variability. For steady state average, usually slightly lower to avoid burning matches)
  // Actually, VI (Variability Index) increases, but average power (AP) might drop to keep NP constant.
  // Implementation: We target AP here.
  const steepness = elevationGainM / courseDistanceKm; // m/km
  if (steepness > 10) {
    intensityFactor -= 0.02; // Reduce target by 2% for very hilly courses
  }

  const targetPower = Math.round(ftp * intensityFactor);

  // Estimate speed (Simple physics model)
  // Power = 0.5 * rho * CdA * v^3 + Crr * mass * g * v + slope * mass * g * v
  // Solving for v is hard analytically, we'll use a heuristic table or simplified formula.
  // v = (P / k)^(1/3) roughly on flat.

  // Base speed for 200W flat = ~32kph for age grouper?
  // 150W = 28kph
  // 300W = 38kph
  // Formula: Speed = 1.5 * (Power/Weight)^0.5 ... very rough.

  // Better heuristic for triathlete on TT bike:
  // Speed (kph) approx = 5.8 * Power^(1/3)
  // 150W -> ~30.8 kph
  // 200W -> ~33.9 kph
  // 250W -> ~36.5 kph
  let estimatedSpeed = 5.8 * Math.pow(targetPower, 0.333);

  if (steepness > 10) estimatedSpeed *= 0.9; // Slower on hills

  const durationHours = courseDistanceKm / estimatedSpeed;
  const tss = 100 * durationHours * (intensityFactor * intensityFactor);

  return {
    targetPower,
    targetSpeedKph: Math.round(estimatedSpeed * 10) / 10,
    intensityFactor,
    tss: Math.round(tss),
    durationMinutes: Math.round(durationHours * 60),
  };
}

export function calculateRunPacing(
  thresholdPaceSec: number, // sec/km
  distanceKm: number,
  bikeTss: number,
): { targetPaceSec: number; estimatedTimeMin: number } {
  // Impact of bike fatigue
  let fatigueFactor = 1.0;
  if (bikeTss > 250)
    fatigueFactor = 1.1; // +10% slower
  else if (bikeTss > 200) fatigueFactor = 1.08;
  else if (bikeTss > 150) fatigueFactor = 1.05;
  else fatigueFactor = 1.02;

  // Impact of distance
  let distanceFactor = 1.0;
  if (distanceKm > 21.1) distanceFactor = 1.1; // Marathon fade risk

  const targetPaceSec = Math.round(
    thresholdPaceSec * fatigueFactor * distanceFactor,
  );
  const estimatedTimeMin = Math.round((targetPaceSec * distanceKm) / 60);

  return {
    targetPaceSec,
    estimatedTimeMin,
  };
}

export function calculateSwimPacing(
  cssPer100m: number, // seconds
  distanceM: number,
): { targetPaceSec: number; estimatedTimeMin: number } {
  // Swim is usually slightly slower than CSS for long distance
  let factor = 1.02; // +2% slower
  if (distanceM > 2000) factor = 1.05;

  const targetPaceSec = Math.round(cssPer100m * factor);
  const estimatedTimeMin = Math.round(((targetPaceSec / 100) * distanceM) / 60);

  return {
    targetPaceSec, // per 100m
    estimatedTimeMin,
  };
}
