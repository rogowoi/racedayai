import {
  type NutritionProduct,
  type ProductStack,
  type ProductSlot,
  selectProductStack,
} from "@/lib/engine/nutrition-products";

export type NutritionSegment = "swim" | "t1" | "bike" | "t2" | "run";

export type NutritionTimelineEntry = {
  elapsedMinutes: number; // Minutes from race start
  segment: NutritionSegment;
  action: string; // "Take 1 gel (25g carbs)", "Drink 250ml", etc.
  carbsG: number;
  fluidMl: number;
  sodiumMg: number;
  // Enhanced fields (backward compatible)
  productName?: string;
  isCaffeinated?: boolean;
  caffeineMg?: number;
  coachNote?: string; // LLM-generated (paid plans only)
};

export type KeyMoment = {
  elapsedMinutes: number;
  label: string; // "First gel", "Caffeine gel", "Last before T2"
  productName?: string;
  isCaffeinated?: boolean;
  coachNote?: string; // LLM-generated (paid plans only)
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
  // Condensed view data (backward compatible)
  cadence?: {
    gelIntervalMin: number;
    gelProduct: string;
    gelCarbsG: number;
    fluidIntervalMin: number;
    fluidAmountMl: number;
  };
  keyMoments?: KeyMoment[];
};

// ── Enhanced Nutrition Plan Sections ──────────────────────────

export type BikeSetupGuide = {
  topTubeGels: { product: string; count: number; caffeinated: boolean }[];
  btaBottle: { contents: string; carbsG: number } | null;
  rearBottles: { count: number; contents: string };
  totalGelsOnBike: number;
  philosophy: string;
  prose?: string; // LLM-generated (paid plans only)
};

export type TransitionBagItem = {
  item: string;
  reason: string;
};

export type TransitionBags = {
  t1: TransitionBagItem[];
  t2: TransitionBagItem[];
  notes: string[];
};

export type CaffeineStrategy = {
  totalBudgetMg: number;
  athleteWeightKg: number;
  mgPerKg: number;
  hits: {
    segment: NutritionSegment;
    elapsedMinutes: number;
    productName: string;
    caffeineMg: number;
    note: string;
  }[];
  totalPlannedMg: number;
  notes: string[];
};

export type PreRaceBreakfast = {
  timingHours: number;
  carbTargetG: number;
  mealSuggestions: string[];
  fluidMl: number;
  notes: string[];
};

export type ProTip = {
  title: string;
  description: string;
  segment?: NutritionSegment;
};

export type SelectedProducts = {
  primaryGelId: string;
  caffeinatedGelId: string;
  drinkMixId?: string;
  earlyBikeSolidId?: string;
};

export type ShoppingListItem = {
  productName: string;
  quantity: number;
  category: string;
  note?: string;
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
  // Enhanced strategy sections (backward compatible)
  bikeSetup?: BikeSetupGuide;
  transitionBags?: TransitionBags;
  caffeineStrategy?: CaffeineStrategy;
  preRaceBreakfast?: PreRaceBreakfast;
  proTips?: ProTip[];
  selectedProducts?: SelectedProducts;
  productRecommendations?: NutritionProduct[];
  shoppingList?: ShoppingListItem[];
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
  t1DurationMin?: number;
  t2DurationMin?: number;
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
    t1DurationMin,
    t2DurationMin,
  } = params;

  const totalDurationMin = swimDurationMin + bikeDurationMin + runDurationMin;
  const isShortRace =
    distanceCategory === "sprint" || totalDurationMin < 90;

  const T1_DURATION = t1DurationMin ?? 3;
  const T2_DURATION = t2DurationMin ?? 2;

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

// ── Build Full Nutrition Strategy ────────────────────────────
// Orchestrator that combines base calculations, product selection,
// condensed cadence/key moments, bike setup, transitions, caffeine,
// pre-race breakfast, and pro tips into a complete NutritionPlan.

export function buildNutritionStrategy(params: {
  swimDurationMin: number;
  bikeDurationMin: number;
  runDurationMin: number;
  temperatureC: number;
  carbsPerHour: number;
  sodiumPerHour: number;
  fluidPerHour: number;
  distanceCategory: string;
  t1DurationMin?: number;
  t2DurationMin?: number;
  athleteWeightKg: number;
  experienceLevel: string;
  productOverrides?: Partial<Record<ProductSlot, string>>;
}): NutritionPlan {
  const {
    swimDurationMin,
    bikeDurationMin,
    runDurationMin,
    temperatureC,
    carbsPerHour,
    sodiumPerHour,
    fluidPerHour,
    distanceCategory,
    t1DurationMin,
    t2DurationMin,
    athleteWeightKg,
    experienceLevel,
    productOverrides,
  } = params;

  const totalDurationHours =
    (swimDurationMin + bikeDurationMin + runDurationMin) / 60;
  const T1 = t1DurationMin ?? 3;
  const T2 = t2DurationMin ?? 2;

  // 1. Get base segmented timeline (existing logic)
  const segmented = calculateSegmentedNutrition({
    swimDurationMin,
    bikeDurationMin,
    runDurationMin,
    temperatureC,
    carbsPerHour,
    sodiumPerHour,
    fluidPerHour,
    distanceCategory,
    t1DurationMin: T1,
    t2DurationMin: T2,
  });

  // 2. Select products based on athlete profile
  const products = selectProductStack({
    carbsPerHour,
    distanceCategory,
    experienceLevel,
    totalDurationHours,
    temperatureC,
    athleteWeightKg,
    overrides: productOverrides,
  });

  const primaryGel = products.primaryGel!.primary;
  const cafGel = products.caffeinatedGel?.primary ?? null;
  const drinkMix = products.drinkMix?.primary ?? null;
  const solid = products.earlyBikeSolid?.primary ?? null;

  // 3. Enrich timeline entries with product names
  const enrichedTimeline = enrichTimeline(
    segmented.timeline,
    primaryGel,
    cafGel,
    swimDurationMin + T1,
    bikeDurationMin,
  );

  // 4. Build cadence + key moments for each segment
  const enrichedSegments = buildEnrichedSegments(
    segmented.segments,
    enrichedTimeline,
    primaryGel,
    cafGel,
    fluidPerHour,
    swimDurationMin,
    T1,
    bikeDurationMin,
    T2,
  );

  // 5. Build bike setup
  const bikeSetup = buildBikeSetup(
    enrichedTimeline,
    primaryGel,
    cafGel,
    drinkMix,
    solid,
    distanceCategory,
  );

  // 6. Build transition bags
  const transitionBags = buildTransitionBags(
    distanceCategory,
    primaryGel,
    cafGel,
  );

  // 7. Build caffeine strategy
  const caffeineStrategy = cafGel
    ? buildCaffeineStrategy(
        athleteWeightKg,
        cafGel,
        swimDurationMin,
        T1,
        bikeDurationMin,
        T2,
        runDurationMin,
        distanceCategory,
      )
    : undefined;

  // 8. Build pre-race breakfast
  const preRaceBreakfast = buildPreRaceBreakfast(
    totalDurationHours,
    distanceCategory,
  );

  // 9. Build pro tips
  const proTips = buildProTips(distanceCategory, temperatureC, carbsPerHour);

  // 10. Build selected products record
  const selectedProducts: SelectedProducts = {
    primaryGelId: primaryGel.id,
    caffeinatedGelId: cafGel?.id ?? primaryGel.id,
    drinkMixId: drinkMix?.id,
    earlyBikeSolidId: solid?.id,
  };

  // Collect all recommended products for display
  const productRecommendations: NutritionProduct[] = [];
  for (const slot of ["primaryGel", "caffeinatedGel", "drinkMix", "earlyBikeSolid"] as ProductSlot[]) {
    const selection = products[slot];
    if (selection) {
      productRecommendations.push(selection.primary);
      productRecommendations.push(...selection.alternatives);
    }
  }
  // Deduplicate by id
  const seen = new Set<string>();
  const uniqueProducts = productRecommendations.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // 11. Build shopping list
  const shoppingList = buildShoppingList(
    bikeSetup,
    enrichedTimeline,
    caffeineStrategy,
    primaryGel,
    cafGel,
    drinkMix,
    solid,
  );

  return {
    carbsPerHour,
    sodiumPerHour,
    fluidPerHour,
    notes: segmented.segments
      .flatMap((s) => s.notes)
      .filter((n) => n !== "No nutrition during swim" && n !== "Primary fueling window"),
    segments: enrichedSegments,
    timeline: enrichedTimeline,
    totalCarbs: segmented.totalCarbs,
    totalFluid: segmented.totalFluid,
    totalSodium: segmented.totalSodium,
    bikeSetup,
    transitionBags,
    caffeineStrategy,
    preRaceBreakfast,
    proTips,
    selectedProducts,
    productRecommendations: uniqueProducts,
    shoppingList,
  };
}

// ── Timeline Enrichment ──────────────────────────────────────

function enrichTimeline(
  timeline: NutritionTimelineEntry[],
  primaryGel: NutritionProduct,
  cafGel: NutritionProduct | null,
  bikeStartMin: number,
  bikeDurationMin: number,
): NutritionTimelineEntry[] {
  // Find the midpoint of the bike to place caffeine
  const bikeMidpointAbsolute = bikeStartMin + bikeDurationMin * 0.6;

  let caffeineUsed = false;

  return timeline.map((entry) => {
    const isGelEntry = entry.carbsG > 0 && entry.action.includes("gel");

    if (!isGelEntry) {
      // Fluid-only entry — update action text with product context
      return {
        ...entry,
        action: entry.action
          .replace(/electrolyte/g, "from bottle")
          .replace(/water at aid station/g, "water/sports drink at aid station"),
      };
    }

    // Gel entry — assign product name
    const useCaffeine =
      cafGel &&
      !caffeineUsed &&
      entry.segment === "bike" &&
      entry.elapsedMinutes >= bikeMidpointAbsolute;

    if (useCaffeine && cafGel) {
      caffeineUsed = true;
      return {
        ...entry,
        action: `${cafGel.displayName} (${cafGel.carbsG}g carbs + ${cafGel.caffeineMg}mg caffeine)`,
        carbsG: cafGel.carbsG,
        productName: cafGel.displayName,
        isCaffeinated: true,
        caffeineMg: cafGel.caffeineMg,
      };
    }

    return {
      ...entry,
      action: `${primaryGel.displayName} (${primaryGel.carbsG}g carbs)`,
      carbsG: primaryGel.carbsG,
      productName: primaryGel.displayName,
      isCaffeinated: false,
    };
  });
}

// ── Enriched Segments with Cadence + Key Moments ─────────────

function buildEnrichedSegments(
  segments: SegmentNutrition[],
  timeline: NutritionTimelineEntry[],
  primaryGel: NutritionProduct,
  cafGel: NutritionProduct | null,
  fluidPerHour: number,
  swimDurationMin: number,
  t1DurationMin: number,
  bikeDurationMin: number,
  t2DurationMin: number,
): SegmentNutrition[] {
  return segments.map((seg) => {
    const segEntries = timeline.filter((t) => t.segment === seg.segment);

    if (seg.segment === "swim" || seg.segment === "t1" || seg.segment === "t2") {
      // Non-fueling segments — add key moments if there are entries
      if (segEntries.length > 0) {
        return {
          ...seg,
          keyMoments: segEntries.map((e) => ({
            elapsedMinutes: e.elapsedMinutes,
            label: e.action,
            productName: e.productName,
            isCaffeinated: e.isCaffeinated,
          })),
        };
      }
      return seg;
    }

    // Bike or Run — build cadence + key moments
    const gelEntries = segEntries.filter((e) => e.carbsG > 0);
    const fluidEntries = segEntries.filter((e) => e.fluidMl > 0 && e.carbsG === 0);

    // Calculate gel interval from entries
    let gelIntervalMin = 20; // default
    if (gelEntries.length >= 2) {
      const intervals = [];
      for (let i = 1; i < gelEntries.length; i++) {
        intervals.push(gelEntries[i].elapsedMinutes - gelEntries[i - 1].elapsedMinutes);
      }
      gelIntervalMin = Math.round(
        intervals.reduce((a, b) => a + b, 0) / intervals.length,
      );
    }

    let fluidIntervalMin = 15;
    if (fluidEntries.length >= 2) {
      const intervals = [];
      for (let i = 1; i < fluidEntries.length; i++) {
        intervals.push(fluidEntries[i].elapsedMinutes - fluidEntries[i - 1].elapsedMinutes);
      }
      fluidIntervalMin = Math.round(
        intervals.reduce((a, b) => a + b, 0) / intervals.length,
      );
    }

    const fluidAmountMl =
      fluidEntries.length > 0
        ? Math.round(fluidEntries.reduce((sum, e) => sum + e.fluidMl, 0) / fluidEntries.length)
        : Math.round(fluidPerHour / 4);

    const cadence = {
      gelIntervalMin,
      gelProduct: primaryGel.displayName,
      gelCarbsG: primaryGel.carbsG,
      fluidIntervalMin,
      fluidAmountMl,
    };

    // Build key moments — only notable entries
    const keyMoments: KeyMoment[] = [];

    if (seg.segment === "bike") {
      // First gel
      if (gelEntries.length > 0) {
        keyMoments.push({
          elapsedMinutes: gelEntries[0].elapsedMinutes,
          label: `First gel — ${primaryGel.displayName}`,
          productName: primaryGel.displayName,
        });
      }

      // Caffeine gel
      const cafEntry = gelEntries.find((e) => e.isCaffeinated);
      if (cafEntry && cafGel) {
        keyMoments.push({
          elapsedMinutes: cafEntry.elapsedMinutes,
          label: `Caffeine gel — ${cafGel.displayName} (${cafGel.caffeineMg}mg)`,
          productName: cafGel.displayName,
          isCaffeinated: true,
        });
      }

      // Last gel before T2
      if (gelEntries.length > 1) {
        const lastGel = gelEntries[gelEntries.length - 1];
        keyMoments.push({
          elapsedMinutes: lastGel.elapsedMinutes,
          label: `Last gel before T2 — eat this before you dismount`,
          productName: lastGel.productName,
          isCaffeinated: lastGel.isCaffeinated,
        });
      }
    }

    if (seg.segment === "run") {
      const runStartMin = swimDurationMin + t1DurationMin + bikeDurationMin + t2DurationMin;

      // First run gel
      if (gelEntries.length > 0) {
        keyMoments.push({
          elapsedMinutes: gelEntries[0].elapsedMinutes,
          label: `First run gel — walk the aid station, take it easy`,
          productName: primaryGel.displayName,
        });
      }

      // Midpoint reminder
      if (gelEntries.length >= 3) {
        const midIdx = Math.floor(gelEntries.length / 2);
        keyMoments.push({
          elapsedMinutes: gelEntries[midIdx].elapsedMinutes,
          label: `Halfway through the run — stay on your schedule`,
          productName: gelEntries[midIdx].productName,
        });
      }

      // Late run: flat coke option
      if (seg.durationMin > 80 && gelEntries.length > 0) {
        const lateMin = runStartMin + Math.round(seg.durationMin * 0.75);
        keyMoments.push({
          elapsedMinutes: lateMin,
          label: `If gels feel hard to take — flat Coke at the aid station works great`,
        });
      }
    }

    return { ...seg, cadence, keyMoments };
  });
}

// ── Bike Setup Guide ─────────────────────────────────────────

function buildBikeSetup(
  timeline: NutritionTimelineEntry[],
  primaryGel: NutritionProduct,
  cafGel: NutritionProduct | null,
  drinkMix: NutritionProduct | null,
  solid: NutritionProduct | null,
  distanceCategory: string,
): BikeSetupGuide {
  const bikeGelEntries = timeline.filter(
    (e) => e.segment === "bike" && e.carbsG > 0,
  );

  const regularGelCount = bikeGelEntries.filter((e) => !e.isCaffeinated).length;
  const cafGelCount = bikeGelEntries.filter((e) => e.isCaffeinated).length;

  const topTubeGels: BikeSetupGuide["topTubeGels"] = [];
  if (regularGelCount > 0) {
    topTubeGels.push({
      product: primaryGel.displayName,
      count: regularGelCount,
      caffeinated: false,
    });
  }
  if (cafGelCount > 0 && cafGel) {
    topTubeGels.push({
      product: cafGel.displayName,
      count: cafGelCount,
      caffeinated: true,
    });
  }

  const btaBottle = drinkMix
    ? {
        contents: `500ml ${drinkMix.displayName}`,
        carbsG: drinkMix.carbsG,
      }
    : null;

  const rearBottles = {
    count: distanceCategory === "140.6" ? 2 : 1,
    contents: drinkMix ? "Plain water" : "Electrolyte mix",
  };

  const totalGelsOnBike = regularGelCount + cafGelCount;

  return {
    topTubeGels,
    btaBottle,
    rearBottles,
    totalGelsOnBike,
    philosophy: "Carry only what you need on the bike. Use aid stations on the run.",
  };
}

// ── Transition Bags ──────────────────────────────────────────

function buildTransitionBags(
  distanceCategory: string,
  primaryGel: NutritionProduct,
  cafGel: NutritionProduct | null,
): TransitionBags {
  const isShort = distanceCategory === "sprint" || distanceCategory === "olympic";

  const t1: TransitionBagItem[] = [
    { item: "Helmet + sunglasses", reason: "Pre-attached to bike in most races" },
    { item: "Bike shoes (if not clipped in)", reason: "Pre-attach to pedals if possible" },
  ];

  if (!isShort) {
    t1.push({
      item: "Nutrition already on bike",
      reason: "Gels taped to top tube, bottles mounted — nothing to grab here",
    });
  }

  const t2: TransitionBagItem[] = [
    { item: "Run shoes + race belt", reason: "Essentials only" },
  ];

  if (!isShort) {
    t2.push({
      item: `2× ${primaryGel.displayName}`,
      reason: "Tuck into waistband or race belt for the run",
    });
    if (cafGel && distanceCategory !== "olympic") {
      t2.push({
        item: `1× ${cafGel.displayName}`,
        reason: "Caffeinated gel for mid-run boost",
      });
    }
    t2.push({
      item: "Visor or cap",
      reason: "Sun protection on the run",
    });
  }

  const notes: string[] = [];
  if (distanceCategory === "sprint" || distanceCategory === "olympic") {
    notes.push("Short races usually don't have transition bags — gear is at your rack spot.");
  } else {
    notes.push("Check your race logistics — some races use bags, others use open racks.");
  }

  return { t1, t2, notes };
}

// ── Caffeine Strategy ────────────────────────────────────────

function buildCaffeineStrategy(
  weightKg: number,
  cafGel: NutritionProduct,
  swimMin: number,
  t1Min: number,
  bikeMin: number,
  t2Min: number,
  runMin: number,
  distanceCategory: string,
): CaffeineStrategy {
  const mgPerKg = 4; // Conservative middle of 3-6 range
  const totalBudgetMg = Math.round(mgPerKg * weightKg);
  const cafPerGel = cafGel.caffeineMg;

  const bikeStart = swimMin + t1Min;
  const runStart = bikeStart + bikeMin + t2Min;

  const hits: CaffeineStrategy["hits"] = [];

  // First caffeine: ~60% through the bike
  const firstCafMin = Math.round(bikeStart + bikeMin * 0.6);
  hits.push({
    segment: "bike",
    elapsedMinutes: firstCafMin,
    productName: cafGel.displayName,
    caffeineMg: cafPerGel,
    note: "First caffeine hit — will kick in ~20 min into the run",
  });

  // Second caffeine: early run (if budget allows and race is long enough)
  if (
    cafPerGel * 2 <= totalBudgetMg &&
    (distanceCategory === "70.3" || distanceCategory === "140.6")
  ) {
    const secondCafMin = Math.round(runStart + runMin * 0.3);
    hits.push({
      segment: "run",
      elapsedMinutes: secondCafMin,
      productName: cafGel.displayName,
      caffeineMg: cafPerGel,
      note: "Second caffeine boost for the back half of the run",
    });
  }

  // Third caffeine: late run for 140.6 only
  if (
    distanceCategory === "140.6" &&
    cafPerGel * 3 <= totalBudgetMg
  ) {
    const thirdCafMin = Math.round(runStart + runMin * 0.65);
    hits.push({
      segment: "run",
      elapsedMinutes: thirdCafMin,
      productName: cafGel.displayName,
      caffeineMg: cafPerGel,
      note: "Final caffeine push — or grab a Coke at the aid station",
    });
  }

  const totalPlannedMg = hits.reduce((sum, h) => sum + h.caffeineMg, 0);

  const notes: string[] = [
    `Budget: ${totalBudgetMg}mg total (${mgPerKg}mg/kg × ${weightKg}kg)`,
    "Morning coffee counts toward your budget (~100-200mg)",
    "Caffeine peaks in blood ~45-60 min after ingestion",
  ];

  if (totalPlannedMg > totalBudgetMg * 0.8) {
    notes.push("This plan uses most of your caffeine budget — skip morning coffee if possible");
  }

  return {
    totalBudgetMg,
    athleteWeightKg: weightKg,
    mgPerKg,
    hits,
    totalPlannedMg,
    notes,
  };
}

// ── Pre-Race Breakfast ───────────────────────────────────────

function buildPreRaceBreakfast(
  totalDurationHours: number,
  distanceCategory: string,
): PreRaceBreakfast {
  let timingHours = 2.5;
  let carbTargetG = 150;

  if (distanceCategory === "sprint") {
    timingHours = 2;
    carbTargetG = 100;
  } else if (distanceCategory === "olympic") {
    timingHours = 2;
    carbTargetG = 120;
  } else if (distanceCategory === "140.6") {
    timingHours = 3;
    carbTargetG = 200;
  }

  return {
    timingHours,
    carbTargetG,
    fluidMl: 500,
    mealSuggestions: [
      `White rice with fried egg and soy sauce (~${Math.round(carbTargetG * 0.9)}g carbs)`,
      `2 slices white toast with honey + banana (~${Math.round(carbTargetG * 0.8)}g carbs)`,
      `Oatmeal with brown sugar and banana (~${Math.round(carbTargetG * 0.85)}g carbs)`,
      `Bagel with jam + sports drink (~${Math.round(carbTargetG * 0.75)}g carbs)`,
    ],
    notes: [
      "Only eat foods you've tested in training — nothing new on race day",
      "Avoid high fiber and dairy the morning of",
      `Sip ${500}ml water with electrolytes — stop drinking 30 min before start`,
    ],
  };
}

// ── Pro Tips ─────────────────────────────────────────────────

const ALL_PRO_TIPS: (ProTip & {
  minDistance?: string;
  minTempC?: number;
  minCarbs?: number;
})[] = [
  {
    title: "Pre-open gel packets",
    description:
      "Tear the tops off your gels before taping them to the top tube. One less thing to fumble at 35 km/h.",
    segment: "bike",
    minDistance: "olympic",
  },
  {
    title: "Write your fuel schedule on tape",
    description:
      "Stick a strip of tape on your stem with your gel times. When your brain is foggy at hour 3, you won't remember the plan.",
    segment: "bike",
    minDistance: "70.3",
  },
  {
    title: "Alternate gel flavors",
    description:
      "Flavor fatigue is real after 3 hours. Mix citrus and neutral flavors — your brain will thank you.",
    minDistance: "70.3",
  },
  {
    title: "The flat Coke trick",
    description:
      "Late in the run, if gels make you gag, flat Coke from the aid station gives you sugar + caffeine. It's a legit pro strategy.",
    segment: "run",
    minDistance: "70.3",
  },
  {
    title: "Never mix gels with carb drink",
    description:
      "Gels + plain water, or sports drink alone. Combining them overloads your gut and causes cramping.",
  },
  {
    title: "Walk through every aid station",
    description:
      "10 seconds walking to properly drink is faster than bonking at mile 10 from missed nutrition.",
    segment: "run",
    minDistance: "olympic",
  },
  {
    title: "Ice in your trisuit",
    description:
      "In hot races, grab ice from aid stations and stuff it down the back of your suit. Cooling your core buys you pace.",
    minTempC: 28,
  },
  {
    title: "Start fueling early on the bike",
    description:
      "Don't wait until you feel hungry — by then you're 30 minutes behind. Eat by the clock, not by feel.",
    segment: "bike",
  },
  {
    title: "Test everything in training",
    description:
      "The #1 cause of race-day GI problems is trying new products. Every gel, every drink mix — battle-tested only.",
  },
  {
    title: "Check race-provided nutrition",
    description:
      "Look up what's at aid stations on the race website. Train with those products, or carry your own and only take water.",
    minDistance: "olympic",
  },
];

const DISTANCE_ORDER = ["sprint", "olympic", "70.3", "140.6"];

function buildProTips(
  distanceCategory: string,
  temperatureC: number,
  carbsPerHour: number,
): ProTip[] {
  const distIdx = DISTANCE_ORDER.indexOf(distanceCategory);

  return ALL_PRO_TIPS.filter((tip) => {
    if (tip.minDistance) {
      const minIdx = DISTANCE_ORDER.indexOf(tip.minDistance);
      if (distIdx < minIdx) return false;
    }
    if (tip.minTempC && temperatureC < tip.minTempC) return false;
    if (tip.minCarbs && carbsPerHour < tip.minCarbs) return false;
    return true;
  }).map(({ minDistance, minTempC, minCarbs, ...tip }) => tip);
}

// ── Shopping List ────────────────────────────────────────────

function buildShoppingList(
  bikeSetup: BikeSetupGuide,
  timeline: NutritionTimelineEntry[],
  caffeineStrategy: CaffeineStrategy | undefined,
  primaryGel: NutritionProduct,
  cafGel: NutritionProduct | null,
  drinkMix: NutritionProduct | null,
  solid: NutritionProduct | null,
): ShoppingListItem[] {
  const items: ShoppingListItem[] = [];

  // Primary gel: bike count + run count
  const bikeRegularCount =
    bikeSetup.topTubeGels
      .filter((g) => !g.caffeinated)
      .reduce((sum, g) => sum + g.count, 0);
  const runRegularCount = timeline.filter(
    (e) => e.segment === "run" && e.carbsG > 0 && !e.isCaffeinated,
  ).length;
  const totalRegular = bikeRegularCount + runRegularCount;
  if (totalRegular > 0) {
    const parts: string[] = [];
    if (bikeRegularCount > 0) parts.push(`${bikeRegularCount} bike`);
    if (runRegularCount > 0) parts.push(`${runRegularCount} run`);
    items.push({
      productName: primaryGel.displayName,
      quantity: totalRegular,
      category: "gel",
      note: parts.join(" + "),
    });
  }

  // Caffeinated gel
  if (cafGel && cafGel.id !== primaryGel.id) {
    const bikeCafCount =
      bikeSetup.topTubeGels
        .filter((g) => g.caffeinated)
        .reduce((sum, g) => sum + g.count, 0);
    const runCafCount = caffeineStrategy
      ? caffeineStrategy.hits.filter((h) => h.segment === "run").length
      : 0;
    const totalCaf = bikeCafCount + runCafCount;
    if (totalCaf > 0) {
      const parts: string[] = [];
      if (bikeCafCount > 0) parts.push(`${bikeCafCount} bike`);
      if (runCafCount > 0) parts.push(`${runCafCount} run`);
      items.push({
        productName: cafGel.displayName,
        quantity: totalCaf,
        category: "caffeine_gel",
        note: parts.join(" + "),
      });
    }
  }

  // Drink mix
  if (drinkMix && bikeSetup.btaBottle) {
    items.push({
      productName: drinkMix.displayName,
      quantity: 1,
      category: "drink_mix",
      note: "BTA bottle",
    });
  }

  // Early bike solid
  if (solid) {
    items.push({
      productName: solid.displayName,
      quantity: 1,
      category: "bar",
      note: "first 30 min on bike",
    });
  }

  return items;
}
