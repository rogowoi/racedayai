export type NutritionSegment = "swim" | "t1" | "bike" | "t2" | "run";

export type NutritionTimelineEntry = {
  elapsedMinutes: number; // Minutes from race start
  segment: NutritionSegment;
  action: string; // "Take 1 gel (25g carbs)", "Drink 250ml", etc.
  carbsG: number;
  fluidMl: number;
  sodiumMg: number;
};

export type SegmentNutrition = {
  segment: NutritionSegment;
  durationMin: number;
  carbsPerHour: number;
  sodiumPerHour: number;
  fluidPerHour: number;
  totalCarbs: number;
  totalFluid: number;
  totalSodium: number;
  notes: string[];
};

export type NutritionPlan = {
  carbsPerHour: number;
  sodiumPerHour: number;
  fluidPerHour: number;
  notes: string[];
  // Segmented nutrition data (backward compatible)
  segments?: SegmentNutrition[];
  timeline?: NutritionTimelineEntry[];
  totalCarbs?: number;
  totalFluid?: number;
  totalSodium?: number;
};

export function calculateNutrition(
  weightKg: number,
  durationHours: number,
  temperatureC: number,
  sweatRate?: number, // Optional custom sweat rate
): NutritionPlan {
  // CABOHYDRATES
  // Base: 60g/hr for endurance
  // > 2 hours: 70-80g/hr
  // > 4 hours: 80-90g/hr (gut training required)
  let carbs = 50;
  if (durationHours > 1.5) carbs = 60;
  if (durationHours > 3) carbs = 80;
  if (durationHours > 5) carbs = 90; // Elite level intake

  // Limit based on weight (approx 1g/kg/hr is a safe upper limit for some, but 90g is common max)
  // Actually, gut absorption is independent of body weight mostly (transporters).
  // So we stick to duration-based logic.

  // FLUID & SODIUM
  // Base fluid: 500ml/hr
  let fluid = 500;
  if (temperatureC > 20) fluid = 750;
  if (temperatureC > 28) fluid = 1000;

  // Custom sweat rate override
  if (sweatRate) {
    // Target 80% replacement
    fluid = Math.min(1200, Math.round(sweatRate * 0.8));
  }

  // Sodium
  // Base: 400mg/L of sweat
  // Hot weather increases concentration and rate
  let sodium = 500;
  if (temperatureC > 25) sodium = 800;
  if (temperatureC > 30) sodium = 1000;

  // Notes
  const notes = [];
  if (carbs >= 90) notes.push("Requires gut training to tolerate 90g/hr.");
  if (temperatureC > 30)
    notes.push("Extreme heat: Pre-load execution with sodium.");

  return {
    carbsPerHour: carbs,
    sodiumPerHour: sodium,
    fluidPerHour: fluid,
    notes,
  };
}

// ── Segmented Nutrition Calculator ──────────────────────────

export function calculateSegmentedNutrition(params: {
  swimDurationMin: number;
  bikeDurationMin: number;
  runDurationMin: number;
  temperatureC: number;
  carbsPerHour: number;
  sodiumPerHour: number;
  fluidPerHour: number;
  distanceCategory: string; // "sprint" | "olympic" | "70.3" | "140.6"
}): {
  segments: SegmentNutrition[];
  timeline: NutritionTimelineEntry[];
  totalCarbs: number;
  totalFluid: number;
  totalSodium: number;
} {
  const {
    swimDurationMin,
    bikeDurationMin,
    runDurationMin,
    temperatureC,
    carbsPerHour,
    sodiumPerHour,
    fluidPerHour,
    distanceCategory,
  } = params;

  const totalDurationMin = swimDurationMin + bikeDurationMin + runDurationMin;
  const isShortRace =
    distanceCategory === "sprint" || totalDurationMin < 90;

  const T1_DURATION = 3;
  const T2_DURATION = 2;

  const segments: SegmentNutrition[] = [];
  const timeline: NutritionTimelineEntry[] = [];

  // ── Swim Segment ──────────────────────────────────────
  segments.push({
    segment: "swim",
    durationMin: swimDurationMin,
    carbsPerHour: 0,
    sodiumPerHour: 0,
    fluidPerHour: 0,
    totalCarbs: 0,
    totalFluid: 0,
    totalSodium: 0,
    notes: ["No nutrition during swim", "Pre-race: 500ml with electrolytes 2hr before start"],
  });

  // ── T1 Segment ────────────────────────────────────────
  const t1Fluid = isShortRace ? 0 : Math.round(fluidPerHour / 8); // Quick sip
  const t1Sodium = isShortRace ? 0 : Math.round(sodiumPerHour / 8);
  segments.push({
    segment: "t1",
    durationMin: T1_DURATION,
    carbsPerHour: 0,
    sodiumPerHour: 0,
    fluidPerHour: 0,
    totalCarbs: 0,
    totalFluid: t1Fluid,
    totalSodium: t1Sodium,
    notes: t1Fluid > 0 ? ["Quick sip of electrolyte drink"] : ["Fast transition, no intake"],
  });

  if (t1Fluid > 0) {
    timeline.push({
      elapsedMinutes: Math.round(swimDurationMin + 1),
      segment: "t1",
      action: `Sip electrolyte drink (${t1Fluid}ml)`,
      carbsG: 0,
      fluidMl: t1Fluid,
      sodiumMg: t1Sodium,
    });
  }

  // ── Bike Segment ──────────────────────────────────────
  const bikeStartMin = swimDurationMin + T1_DURATION;
  const bikeCarbsPerHour = carbsPerHour;
  const bikeFluidPerHour = fluidPerHour;
  const bikeSodiumPerHour = sodiumPerHour;

  const bikeTotalCarbs = Math.round((bikeCarbsPerHour * bikeDurationMin) / 60);
  const bikeTotalFluid = Math.round((bikeFluidPerHour * bikeDurationMin) / 60);
  const bikeTotalSodium = Math.round((bikeSodiumPerHour * bikeDurationMin) / 60);

  const bikeNotes: string[] = [];
  if (temperatureC > 25) bikeNotes.push("Hot conditions: prioritize fluid intake");
  if (bikeCarbsPerHour >= 80) bikeNotes.push("High carb rate: use glucose+fructose gels");

  segments.push({
    segment: "bike",
    durationMin: bikeDurationMin,
    carbsPerHour: bikeCarbsPerHour,
    sodiumPerHour: bikeSodiumPerHour,
    fluidPerHour: bikeFluidPerHour,
    totalCarbs: bikeTotalCarbs,
    totalFluid: bikeTotalFluid,
    totalSodium: bikeTotalSodium,
    notes: bikeNotes.length > 0 ? bikeNotes : ["Primary fueling window"],
  });

  // Generate bike timeline entries
  if (isShortRace) {
    // Sprint: minimal fueling — one gel and one fluid
    if (bikeDurationMin > 20) {
      timeline.push({
        elapsedMinutes: Math.round(bikeStartMin + 15),
        segment: "bike",
        action: "Take 1 gel (25g carbs)",
        carbsG: 25,
        fluidMl: 0,
        sodiumMg: 0,
      });
      timeline.push({
        elapsedMinutes: Math.round(bikeStartMin + 20),
        segment: "bike",
        action: `Drink ${Math.round(fluidPerHour / 4)}ml water`,
        carbsG: 0,
        fluidMl: Math.round(fluidPerHour / 4),
        sodiumMg: Math.round(sodiumPerHour / 4),
      });
    }
  } else {
    // Longer races: gel every gelIntervalMin, fluid every 15 min
    const gelIntervalMin = Math.max(15, Math.round((25 / bikeCarbsPerHour) * 60));
    const fluidIntervalMin = 15;
    const fluidPerIntake = Math.round(bikeFluidPerHour / 4); // ~250ml per intake
    const sodiumPerFluidIntake = Math.round(bikeSodiumPerHour / 4);

    // Build bike timeline by iterating through bike duration
    let nextGelMin = 15; // First gel at 15 min into bike
    let nextFluidMin = 15; // First fluid at 15 min into bike

    // Offset fluid slightly so it doesn't always collide with gel
    if (gelIntervalMin <= 20) {
      nextFluidMin = 8; // Stagger when intervals are close
    }

    const bikeEndMin = bikeDurationMin - 5; // Stop fueling 5 min before T2
    let bikeMinute = Math.min(nextGelMin, nextFluidMin);

    while (bikeMinute <= bikeEndMin) {
      const isGelTime = bikeMinute >= nextGelMin;
      const isFluidTime = bikeMinute >= nextFluidMin;

      if (isGelTime && isFluidTime) {
        // Combined entry
        timeline.push({
          elapsedMinutes: Math.round(bikeStartMin + bikeMinute),
          segment: "bike",
          action: `Take 1 gel (25g carbs) + drink ${fluidPerIntake}ml electrolyte`,
          carbsG: 25,
          fluidMl: fluidPerIntake,
          sodiumMg: sodiumPerFluidIntake,
        });
        nextGelMin = bikeMinute + gelIntervalMin;
        nextFluidMin = bikeMinute + fluidIntervalMin;
      } else if (isGelTime) {
        timeline.push({
          elapsedMinutes: Math.round(bikeStartMin + bikeMinute),
          segment: "bike",
          action: "Take 1 gel (25g carbs)",
          carbsG: 25,
          fluidMl: 0,
          sodiumMg: 0,
        });
        nextGelMin = bikeMinute + gelIntervalMin;
      } else if (isFluidTime) {
        timeline.push({
          elapsedMinutes: Math.round(bikeStartMin + bikeMinute),
          segment: "bike",
          action: `Drink ${fluidPerIntake}ml electrolyte (${sodiumPerFluidIntake}mg sodium)`,
          carbsG: 0,
          fluidMl: fluidPerIntake,
          sodiumMg: sodiumPerFluidIntake,
        });
        nextFluidMin = bikeMinute + fluidIntervalMin;
      }

      // Advance to next event
      bikeMinute = Math.min(nextGelMin, nextFluidMin);
    }
  }

  // ── T2 Segment ────────────────────────────────────────
  const t2StartMin = bikeStartMin + bikeDurationMin;
  const t2Carbs = isShortRace ? 0 : 25;
  segments.push({
    segment: "t2",
    durationMin: T2_DURATION,
    carbsPerHour: 0,
    sodiumPerHour: 0,
    fluidPerHour: 0,
    totalCarbs: t2Carbs,
    totalFluid: 0,
    totalSodium: 0,
    notes: t2Carbs > 0 ? ["Last gel before run"] : ["Fast transition"],
  });

  if (t2Carbs > 0) {
    timeline.push({
      elapsedMinutes: Math.round(t2StartMin),
      segment: "t2",
      action: "Last gel before run (25g carbs)",
      carbsG: 25,
      fluidMl: 0,
      sodiumMg: 0,
    });
  }

  // ── Run Segment ───────────────────────────────────────
  const runStartMin = t2StartMin + T2_DURATION;
  const runCarbsPerHour = Math.round(carbsPerHour * 0.7); // ~70% of bike rate
  const runFluidPerHour = Math.round(fluidPerHour * 0.8); // Slightly less than bike
  const runSodiumPerHour = sodiumPerHour; // Keep sodium the same

  const runTotalCarbs = Math.round((runCarbsPerHour * runDurationMin) / 60);
  const runTotalFluid = Math.round((runFluidPerHour * runDurationMin) / 60);
  const runTotalSodium = Math.round((runSodiumPerHour * runDurationMin) / 60);

  const runNotes: string[] = [];
  if (temperatureC > 25) runNotes.push("Take water at every aid station");
  runNotes.push("Reduce intake if experiencing GI distress");

  segments.push({
    segment: "run",
    durationMin: runDurationMin,
    carbsPerHour: runCarbsPerHour,
    sodiumPerHour: runSodiumPerHour,
    fluidPerHour: runFluidPerHour,
    totalCarbs: runTotalCarbs,
    totalFluid: runTotalFluid,
    totalSodium: runTotalSodium,
    notes: runNotes,
  });

  // Generate run timeline entries
  if (!isShortRace) {
    const runGelIntervalMin = 30; // Gels every ~30 min on run
    const runFluidIntervalMin = 15; // Aid stations every ~15 min
    const runFluidPerIntake = Math.round(runFluidPerHour / 4);
    const runSodiumPerIntake = Math.round(runSodiumPerHour / 4);

    let nextRunGelMin = 20; // First run gel at 20 min in
    let nextRunFluidMin = 10; // First aid station at 10 min in

    const runEndMin = runDurationMin - 5;
    let runMinute = Math.min(nextRunGelMin, nextRunFluidMin);

    while (runMinute <= runEndMin) {
      const isGelTime = runMinute >= nextRunGelMin;
      const isFluidTime = runMinute >= nextRunFluidMin;

      if (isGelTime && isFluidTime) {
        timeline.push({
          elapsedMinutes: Math.round(runStartMin + runMinute),
          segment: "run",
          action: `Take 1 gel (25g carbs) + sip water at aid station`,
          carbsG: 25,
          fluidMl: runFluidPerIntake,
          sodiumMg: runSodiumPerIntake,
        });
        nextRunGelMin = runMinute + runGelIntervalMin;
        nextRunFluidMin = runMinute + runFluidIntervalMin;
      } else if (isGelTime) {
        timeline.push({
          elapsedMinutes: Math.round(runStartMin + runMinute),
          segment: "run",
          action: "Take 1 gel (25g carbs)",
          carbsG: 25,
          fluidMl: 0,
          sodiumMg: 0,
        });
        nextRunGelMin = runMinute + runGelIntervalMin;
      } else if (isFluidTime) {
        timeline.push({
          elapsedMinutes: Math.round(runStartMin + runMinute),
          segment: "run",
          action: `Sip water at aid station (~${runFluidPerIntake}ml)`,
          carbsG: 0,
          fluidMl: runFluidPerIntake,
          sodiumMg: runSodiumPerIntake,
        });
        nextRunFluidMin = runMinute + runFluidIntervalMin;
      }

      runMinute = Math.min(nextRunGelMin, nextRunFluidMin);
    }
  }

  // ── Totals ────────────────────────────────────────────
  const totalCarbs =
    bikeTotalCarbs + t2Carbs + runTotalCarbs;
  const totalFluid =
    t1Fluid + bikeTotalFluid + runTotalFluid;
  const totalSodium =
    t1Sodium + bikeTotalSodium + runTotalSodium;

  return { segments, timeline, totalCarbs, totalFluid, totalSodium };
}
