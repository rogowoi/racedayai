// ── Nutrition Product Catalog ─────────────────────────────────
// Static curated catalog of popular triathlon nutrition products.
// Used by buildNutritionStrategy to recommend products based on
// athlete profile, race conditions, and experience level.

export type ProductCategory = "gel" | "gel_caf" | "drink_mix" | "bar" | "chew";

export type NutritionProduct = {
  id: string;
  brand: string;
  name: string;
  displayName: string;
  category: ProductCategory;
  carbsG: number;
  caffeineMg: number;
  sodiumMg: number;
  servingWeightG: number;
  isGlucoseFructose: boolean;
  notes: string;
  tags: string[]; // "budget" | "gentle" | "high-carb" | "natural" | "high-sodium" | "isotonic"
};

// ── Gels (Regular) ───────────────────────────────────────────

export const GELS: NutritionProduct[] = [
  {
    id: "maurten-100",
    brand: "Maurten",
    name: "Gel 100",
    displayName: "Maurten 100",
    category: "gel",
    carbsG: 25,
    caffeineMg: 0,
    sodiumMg: 20,
    servingWeightG: 40,
    isGlucoseFructose: true,
    notes: "Hydrogel — very easy on the stomach. Pro gold standard.",
    tags: ["gentle"],
  },
  {
    id: "maurten-160",
    brand: "Maurten",
    name: "Gel 160",
    displayName: "Maurten 160",
    category: "gel",
    carbsG: 40,
    caffeineMg: 0,
    sodiumMg: 30,
    servingWeightG: 65,
    isGlucoseFructose: true,
    notes: "40g carbs per gel — fewer packets needed for high carb targets.",
    tags: ["high-carb", "gentle"],
  },
  {
    id: "neversecond-c30",
    brand: "Neversecond",
    name: "C30",
    displayName: "Neversecond C30",
    category: "gel",
    carbsG: 30,
    caffeineMg: 0,
    sodiumMg: 200,
    servingWeightG: 60,
    isGlucoseFructose: true,
    notes: "High sodium, smooth isotonic gel. Popular with pro triathletes.",
    tags: ["high-sodium", "isotonic"],
  },
  {
    id: "sis-beta-fuel-gel",
    brand: "SiS",
    name: "Beta Fuel Gel",
    displayName: "SiS Beta Fuel",
    category: "gel",
    carbsG: 40,
    caffeineMg: 0,
    sodiumMg: 12,
    servingWeightG: 60,
    isGlucoseFructose: true,
    notes: "40g carbs, liquid texture. 1:0.8 ratio for max absorption.",
    tags: ["high-carb", "isotonic"],
  },
  {
    id: "sis-go-isotonic",
    brand: "SiS",
    name: "GO Isotonic",
    displayName: "SiS GO Isotonic",
    category: "gel",
    carbsG: 22,
    caffeineMg: 0,
    sodiumMg: 10,
    servingWeightG: 60,
    isGlucoseFructose: false,
    notes: "Budget isotonic gel — no water needed to consume.",
    tags: ["budget", "isotonic"],
  },
  {
    id: "gu-original",
    brand: "GU",
    name: "Energy Gel",
    displayName: "GU Original",
    category: "gel",
    carbsG: 22,
    caffeineMg: 0,
    sodiumMg: 55,
    servingWeightG: 32,
    isGlucoseFructose: false,
    notes: "Classic gel, huge flavor variety. Compact packet.",
    tags: ["budget"],
  },
  {
    id: "gu-roctane",
    brand: "GU",
    name: "Roctane",
    displayName: "GU Roctane",
    category: "gel",
    carbsG: 21,
    caffeineMg: 0,
    sodiumMg: 125,
    servingWeightG: 32,
    isGlucoseFructose: false,
    notes: "BCAAs + high sodium. Premium GU for long-course racing.",
    tags: ["high-sodium"],
  },
  {
    id: "precision-pf30",
    brand: "Precision Fuel",
    name: "PF 30",
    displayName: "Precision Fuel PF 30",
    category: "gel",
    carbsG: 30,
    caffeineMg: 0,
    sodiumMg: 0,
    servingWeightG: 51,
    isGlucoseFructose: true,
    notes: "Zero sodium by design — pair with separate electrolyte products.",
    tags: [],
  },
  {
    id: "nduranz-nrgy-45",
    brand: "Nduranz",
    name: "Nrgy Gel 45",
    displayName: "Nduranz Nrgy 45",
    category: "gel",
    carbsG: 45,
    caffeineMg: 0,
    sodiumMg: 220,
    servingWeightG: 75,
    isGlucoseFructose: true,
    notes: "Highest carb per gel on the market. 1:0.8 ratio.",
    tags: ["high-carb", "high-sodium"],
  },
  {
    id: "high5-energy-gel",
    brand: "HIGH5",
    name: "Energy Gel",
    displayName: "HIGH5 Gel",
    category: "gel",
    carbsG: 23,
    caffeineMg: 0,
    sodiumMg: 20,
    servingWeightG: 40,
    isGlucoseFructose: false,
    notes: "Budget gel with real fruit juice. Popular in Europe.",
    tags: ["budget"],
  },
  {
    id: "huma-original",
    brand: "Huma",
    name: "Chia Energy Gel",
    displayName: "Huma Gel",
    category: "gel",
    carbsG: 22,
    caffeineMg: 0,
    sodiumMg: 105,
    servingWeightG: 44,
    isGlucoseFructose: true,
    notes: "Real food based with chia seeds. All natural.",
    tags: ["natural", "high-sodium"],
  },
  {
    id: "honey-stinger",
    brand: "Honey Stinger",
    name: "Organic Energy Gel",
    displayName: "Honey Stinger",
    category: "gel",
    carbsG: 24,
    caffeineMg: 0,
    sodiumMg: 50,
    servingWeightG: 32,
    isGlucoseFructose: false,
    notes: "Honey-based, organic. Gentle and familiar taste.",
    tags: ["natural", "gentle"],
  },
];

// ── Gels (Caffeinated) ──────────────────────────────────────

export const CAFFEINATED_GELS: NutritionProduct[] = [
  {
    id: "maurten-caf-100",
    brand: "Maurten",
    name: "Gel 100 Caf 100",
    displayName: "Maurten Caf 100",
    category: "gel_caf",
    carbsG: 25,
    caffeineMg: 100,
    sodiumMg: 20,
    servingWeightG: 40,
    isGlucoseFructose: true,
    notes: "Hydrogel + 100mg caffeine. Save for second half of bike or run.",
    tags: ["gentle"],
  },
  {
    id: "neversecond-c30-plus",
    brand: "Neversecond",
    name: "C30+",
    displayName: "Neversecond C30+",
    category: "gel_caf",
    carbsG: 30,
    caffeineMg: 75,
    sodiumMg: 200,
    servingWeightG: 60,
    isGlucoseFructose: true,
    notes: "Isotonic + 75mg caffeine. High sodium.",
    tags: ["high-sodium", "isotonic"],
  },
  {
    id: "sis-beta-fuel-nootropics",
    brand: "SiS",
    name: "Beta Fuel +Nootropics",
    displayName: "SiS Beta Fuel +Nootropics",
    category: "gel_caf",
    carbsG: 40,
    caffeineMg: 200,
    sodiumMg: 12,
    servingWeightG: 60,
    isGlucoseFructose: true,
    notes: "200mg caffeine — strongest caffeinated gel. Use sparingly.",
    tags: ["high-carb"],
  },
  {
    id: "gu-roctane-cold-brew",
    brand: "GU",
    name: "Roctane Cold Brew Coffee",
    displayName: "GU Roctane Cold Brew",
    category: "gel_caf",
    carbsG: 21,
    caffeineMg: 70,
    sodiumMg: 125,
    servingWeightG: 32,
    isGlucoseFructose: false,
    notes: "70mg caffeine + BCAAs + high sodium.",
    tags: ["high-sodium"],
  },
  {
    id: "precision-pf30-caf",
    brand: "Precision Fuel",
    name: "PF 30 Caffeine",
    displayName: "Precision Fuel PF 30 Caf",
    category: "gel_caf",
    carbsG: 30,
    caffeineMg: 100,
    sodiumMg: 0,
    servingWeightG: 51,
    isGlucoseFructose: true,
    notes: "100mg caffeine, zero sodium.",
    tags: [],
  },
  {
    id: "clif-shot-double-espresso",
    brand: "Clif",
    name: "Shot Double Espresso",
    displayName: "Clif Shot Espresso",
    category: "gel_caf",
    carbsG: 24,
    caffeineMg: 100,
    sodiumMg: 40,
    servingWeightG: 34,
    isGlucoseFructose: false,
    notes: "Budget caffeinated gel. 100mg from green tea extract.",
    tags: ["budget"],
  },
];

// ── Drink Mixes ──────────────────────────────────────────────

export const DRINK_MIXES: NutritionProduct[] = [
  {
    id: "maurten-320",
    brand: "Maurten",
    name: "Drink Mix 320",
    displayName: "Maurten 320",
    category: "drink_mix",
    carbsG: 80,
    caffeineMg: 0,
    sodiumMg: 200,
    servingWeightG: 80,
    isGlucoseFructose: true,
    notes: "80g carbs per 500ml. Hydrogel tech. Gold standard race mix.",
    tags: ["high-carb", "gentle"],
  },
  {
    id: "maurten-320-caf",
    brand: "Maurten",
    name: "Drink Mix 320 Caf 100",
    displayName: "Maurten 320 Caf",
    category: "drink_mix",
    carbsG: 80,
    caffeineMg: 100,
    sodiumMg: 250,
    servingWeightG: 83,
    isGlucoseFructose: true,
    notes: "Hydrogel + caffeine. For late-race bottles.",
    tags: ["high-carb", "gentle"],
  },
  {
    id: "sis-beta-fuel-80",
    brand: "SiS",
    name: "Beta Fuel 80",
    displayName: "SiS Beta Fuel 80",
    category: "drink_mix",
    carbsG: 80,
    caffeineMg: 0,
    sodiumMg: 460,
    servingWeightG: 84,
    isGlucoseFructose: true,
    notes: "80g carbs + very high sodium (460mg). Great for hot races.",
    tags: ["high-carb", "high-sodium"],
  },
  {
    id: "neversecond-c90",
    brand: "Neversecond",
    name: "C90",
    displayName: "Neversecond C90",
    category: "drink_mix",
    carbsG: 90,
    caffeineMg: 0,
    sodiumMg: 200,
    servingWeightG: 94,
    isGlucoseFructose: true,
    notes: "90g carbs per bottle — highest carb mix. Clean taste.",
    tags: ["high-carb"],
  },
  {
    id: "tailwind-endurance",
    brand: "Tailwind",
    name: "Endurance Fuel",
    displayName: "Tailwind Endurance",
    category: "drink_mix",
    carbsG: 50,
    caffeineMg: 0,
    sodiumMg: 606,
    servingWeightG: 54,
    isGlucoseFructose: false,
    notes: "All-in-one fuel. Mild taste that doesn't get sickening over hours.",
    tags: ["gentle", "high-sodium"],
  },
  {
    id: "skratch-super-hc",
    brand: "Skratch Labs",
    name: "Super High-Carb",
    displayName: "Skratch Super HC",
    category: "drink_mix",
    carbsG: 50,
    caffeineMg: 0,
    sodiumMg: 200,
    servingWeightG: 53,
    isGlucoseFructose: false,
    notes: "Cluster dextrin — very gentle at high concentrations.",
    tags: ["gentle"],
  },
  {
    id: "precision-pf60",
    brand: "Precision Fuel",
    name: "PF 60 Carb & Electrolyte",
    displayName: "Precision PF 60",
    category: "drink_mix",
    carbsG: 30,
    caffeineMg: 0,
    sodiumMg: 500,
    servingWeightG: 36,
    isGlucoseFructose: true,
    notes: "Highest sodium drink mix (500mg). Great for salty sweaters.",
    tags: ["high-sodium"],
  },
];

// ── Bars / Solids ────────────────────────────────────────────

export const BARS: NutritionProduct[] = [
  {
    id: "maurten-solid-225",
    brand: "Maurten",
    name: "Solid 225",
    displayName: "Maurten Solid 225",
    category: "bar",
    carbsG: 42,
    caffeineMg: 0,
    sodiumMg: 260,
    servingWeightG: 60,
    isGlucoseFructose: false,
    notes: "Oat + rice base. Soft, splits in half. Low fiber.",
    tags: ["gentle"],
  },
  {
    id: "clif-bar",
    brand: "Clif",
    name: "Bar",
    displayName: "Clif Bar",
    category: "bar",
    carbsG: 44,
    caffeineMg: 0,
    sodiumMg: 200,
    servingWeightG: 68,
    isGlucoseFructose: false,
    notes: "Widely available. Higher fiber — better at easy early effort.",
    tags: ["budget"],
  },
  {
    id: "sis-go-bar",
    brand: "SiS",
    name: "GO Energy Bar",
    displayName: "SiS GO Bar",
    category: "bar",
    carbsG: 44,
    caffeineMg: 0,
    sodiumMg: 50,
    servingWeightG: 65,
    isGlucoseFructose: false,
    notes: "Soft baked, low fat. Easy to chew on the bike.",
    tags: [],
  },
  {
    id: "powerbar-energize",
    brand: "PowerBar",
    name: "Energize Original",
    displayName: "PowerBar Energize",
    category: "bar",
    carbsG: 39,
    caffeineMg: 0,
    sodiumMg: 210,
    servingWeightG: 55,
    isGlucoseFructose: true,
    notes: "2:1 ratio, high sodium. Easy to chew.",
    tags: ["high-sodium"],
  },
];

// ── Chews ────────────────────────────────────────────────────

export const CHEWS: NutritionProduct[] = [
  {
    id: "clif-bloks",
    brand: "Clif",
    name: "Bloks",
    displayName: "Clif Bloks",
    category: "chew",
    carbsG: 48,
    caffeineMg: 0,
    sodiumMg: 140,
    servingWeightG: 60,
    isGlucoseFructose: false,
    notes: "6 pieces per sleeve. Easy to portion 2-3 at a time.",
    tags: ["budget"],
  },
  {
    id: "sis-beta-fuel-chews",
    brand: "SiS",
    name: "Beta Fuel Chews",
    displayName: "SiS Beta Fuel Chews",
    category: "chew",
    carbsG: 46,
    caffeineMg: 0,
    sodiumMg: 50,
    servingWeightG: 60,
    isGlucoseFructose: true,
    notes: "1:0.8 ratio snap-off blocks. High carb per pack.",
    tags: ["high-carb"],
  },
  {
    id: "gu-chews",
    brand: "GU",
    name: "Energy Chews",
    displayName: "GU Chews",
    category: "chew",
    carbsG: 44,
    caffeineMg: 0,
    sodiumMg: 80,
    servingWeightG: 60,
    isGlucoseFructose: false,
    notes: "16 small pieces per bag. Multiple flavors.",
    tags: ["budget"],
  },
  {
    id: "skratch-chews",
    brand: "Skratch Labs",
    name: "Energy Chews",
    displayName: "Skratch Chews",
    category: "chew",
    carbsG: 38,
    caffeineMg: 0,
    sodiumMg: 100,
    servingWeightG: 50,
    isGlucoseFructose: false,
    notes: "Real fruit, soft drop shape. Natural ingredients.",
    tags: ["natural", "gentle"],
  },
];

// ── Catalog Lookup ───────────────────────────────────────────

export const ALL_PRODUCTS: NutritionProduct[] = [
  ...GELS,
  ...CAFFEINATED_GELS,
  ...DRINK_MIXES,
  ...BARS,
  ...CHEWS,
];

export function getProductById(id: string): NutritionProduct | undefined {
  return ALL_PRODUCTS.find((p) => p.id === id);
}

// ── Athlete-Profile-Aware Product Selection ──────────────────

export type ProductSlot = "primaryGel" | "caffeinatedGel" | "drinkMix" | "earlyBikeSolid";

export type ProductSelection = {
  primary: NutritionProduct;
  alternatives: NutritionProduct[];
};

export type ProductStack = Record<ProductSlot, ProductSelection | null>;

export function selectProductStack(params: {
  carbsPerHour: number;
  distanceCategory: string;
  experienceLevel: string;
  totalDurationHours: number;
  temperatureC: number;
  athleteWeightKg: number;
  overrides?: Partial<Record<ProductSlot, string>>; // product IDs to force
}): ProductStack {
  const {
    carbsPerHour,
    distanceCategory,
    experienceLevel,
    totalDurationHours,
    temperatureC,
    overrides,
  } = params;

  const isShort = distanceCategory === "sprint" || totalDurationHours < 1.5;
  const isLong = distanceCategory === "140.6" || totalDurationHours > 6;
  const isHot = temperatureC > 28;
  const needsHighCarb = carbsPerHour >= 70;
  const needsGlucoseFructose = carbsPerHour > 60;

  // ── Primary Gel ─────────────────────────────────────────
  let primaryGel: ProductSelection;

  if (overrides?.primaryGel) {
    const forced = getProductById(overrides.primaryGel);
    if (forced) {
      primaryGel = { primary: forced, alternatives: [] };
    } else {
      primaryGel = pickPrimaryGel(experienceLevel, needsHighCarb, isHot, needsGlucoseFructose);
    }
  } else {
    primaryGel = pickPrimaryGel(experienceLevel, needsHighCarb, isHot, needsGlucoseFructose);
  }

  // ── Caffeinated Gel ─────────────────────────────────────
  let caffeinatedGel: ProductSelection | null = null;

  if (!isShort) {
    if (overrides?.caffeinatedGel) {
      const forced = getProductById(overrides.caffeinatedGel);
      if (forced) {
        caffeinatedGel = { primary: forced, alternatives: [] };
      } else {
        caffeinatedGel = pickCaffeinatedGel(experienceLevel, primaryGel.primary.brand);
      }
    } else {
      caffeinatedGel = pickCaffeinatedGel(experienceLevel, primaryGel.primary.brand);
    }
  }

  // ── Drink Mix ───────────────────────────────────────────
  let drinkMix: ProductSelection | null = null;

  if (!isShort && distanceCategory !== "sprint") {
    if (overrides?.drinkMix) {
      const forced = getProductById(overrides.drinkMix);
      if (forced) {
        drinkMix = { primary: forced, alternatives: [] };
      } else {
        drinkMix = pickDrinkMix(experienceLevel, isHot, needsHighCarb);
      }
    } else {
      drinkMix = pickDrinkMix(experienceLevel, isHot, needsHighCarb);
    }
  }

  // ── Early Bike Solid ────────────────────────────────────
  let earlyBikeSolid: ProductSelection | null = null;

  if (isLong || (distanceCategory === "70.3" && totalDurationHours > 4.5)) {
    if (overrides?.earlyBikeSolid) {
      const forced = getProductById(overrides.earlyBikeSolid);
      if (forced) {
        earlyBikeSolid = { primary: forced, alternatives: [] };
      } else {
        earlyBikeSolid = pickEarlyBikeSolid(experienceLevel);
      }
    } else {
      earlyBikeSolid = pickEarlyBikeSolid(experienceLevel);
    }
  }

  return { primaryGel, caffeinatedGel, drinkMix, earlyBikeSolid };
}

// ── Internal Selection Helpers ───────────────────────────────

function pickPrimaryGel(
  experience: string,
  needsHighCarb: boolean,
  isHot: boolean,
  needsGlucoseFructose: boolean,
): ProductSelection {
  const m100 = GELS.find((g) => g.id === "maurten-100")!;
  const m160 = GELS.find((g) => g.id === "maurten-160")!;
  const c30 = GELS.find((g) => g.id === "neversecond-c30")!;
  const sisBF = GELS.find((g) => g.id === "sis-beta-fuel-gel")!;
  const guRoctane = GELS.find((g) => g.id === "gu-roctane")!;
  const honeyS = GELS.find((g) => g.id === "honey-stinger")!;

  switch (experience) {
    case "beginner":
      // Gentle gels, smaller carb per serving
      if (isHot) {
        // Hot race beginner: gentle + some sodium
        return { primary: m100, alternatives: [honeyS, c30] };
      }
      return { primary: m100, alternatives: [honeyS, GELS.find((g) => g.id === "sis-go-isotonic")!] };

    case "advanced":
      // High carb density, fewer packets
      if (isHot) {
        return { primary: sisBF, alternatives: [m160, c30] };
      }
      if (needsHighCarb) {
        return { primary: m160, alternatives: [sisBF, GELS.find((g) => g.id === "nduranz-nrgy-45")!] };
      }
      return { primary: sisBF, alternatives: [m160, c30] };

    default: // "intermediate"
      if (isHot) {
        // Hot: prioritize high-sodium gels
        return { primary: c30, alternatives: [guRoctane, m100] };
      }
      if (needsGlucoseFructose) {
        return { primary: c30, alternatives: [m100, sisBF] };
      }
      return { primary: m100, alternatives: [c30, GELS.find((g) => g.id === "gu-original")!] };
  }
}

function pickCaffeinatedGel(
  experience: string,
  primaryBrand: string,
): ProductSelection {
  const mCaf = CAFFEINATED_GELS.find((g) => g.id === "maurten-caf-100")!;
  const c30p = CAFFEINATED_GELS.find((g) => g.id === "neversecond-c30-plus")!;
  const guCB = CAFFEINATED_GELS.find((g) => g.id === "gu-roctane-cold-brew")!;
  const sisCaf = CAFFEINATED_GELS.find((g) => g.id === "sis-beta-fuel-nootropics")!;
  const clifCaf = CAFFEINATED_GELS.find((g) => g.id === "clif-shot-double-espresso")!;

  // Try to match the same brand family as the primary gel
  if (primaryBrand === "Maurten") {
    return { primary: mCaf, alternatives: [c30p, guCB] };
  }
  if (primaryBrand === "Neversecond") {
    return { primary: c30p, alternatives: [mCaf, guCB] };
  }
  if (primaryBrand === "SiS") {
    return { primary: sisCaf, alternatives: [mCaf, c30p] };
  }

  // Default by experience
  if (experience === "beginner") {
    return { primary: mCaf, alternatives: [clifCaf, guCB] };
  }
  if (experience === "advanced") {
    return { primary: sisCaf, alternatives: [mCaf, c30p] };
  }
  return { primary: mCaf, alternatives: [c30p, guCB] };
}

function pickDrinkMix(
  experience: string,
  isHot: boolean,
  needsHighCarb: boolean,
): ProductSelection {
  const m320 = DRINK_MIXES.find((d) => d.id === "maurten-320")!;
  const sisBF = DRINK_MIXES.find((d) => d.id === "sis-beta-fuel-80")!;
  const c90 = DRINK_MIXES.find((d) => d.id === "neversecond-c90")!;
  const tailwind = DRINK_MIXES.find((d) => d.id === "tailwind-endurance")!;
  const skratch = DRINK_MIXES.find((d) => d.id === "skratch-super-hc")!;
  const pf60 = DRINK_MIXES.find((d) => d.id === "precision-pf60")!;

  if (isHot) {
    // Hot conditions: prioritize high-sodium mixes
    return { primary: sisBF, alternatives: [pf60, m320] };
  }

  switch (experience) {
    case "beginner":
      return { primary: tailwind, alternatives: [skratch, m320] };
    case "advanced":
      if (needsHighCarb) {
        return { primary: c90, alternatives: [m320, sisBF] };
      }
      return { primary: m320, alternatives: [c90, sisBF] };
    default:
      return { primary: m320, alternatives: [sisBF, tailwind] };
  }
}

function pickEarlyBikeSolid(experience: string): ProductSelection {
  const mSolid = BARS.find((b) => b.id === "maurten-solid-225")!;
  const clifBar = BARS.find((b) => b.id === "clif-bar")!;
  const sisBar = BARS.find((b) => b.id === "sis-go-bar")!;

  switch (experience) {
    case "beginner":
      return { primary: clifBar, alternatives: [sisBar, mSolid] };
    case "advanced":
      return { primary: mSolid, alternatives: [sisBar] };
    default:
      return { primary: mSolid, alternatives: [clifBar, sisBar] };
  }
}
