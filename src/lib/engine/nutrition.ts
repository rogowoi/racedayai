export type NutritionPlan = {
  carbsPerHour: number;
  sodiumPerHour: number;
  fluidPerHour: number;
  notes: string[];
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
