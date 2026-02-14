/**
 * Client-safe plan configuration.
 * This file contains NO server-side env vars or Stripe imports,
 * so it can be safely imported by "use client" components.
 */

export const PLANS = {
  free: {
    name: "Starter",
    maxPlansPerSeason: 1,
    features: [
      "1 race plan (any distance)",
      "Basic pacing + nutrition",
      "Manual fitness entry",
      "View online only",
    ],
    annualPrice: 0,
    monthlyPrice: 0,
  },
  season: {
    name: "Season Pass",
    maxPlansPerSeason: 6,
    features: [
      "6 race plans per season",
      "Full weather integration",
      "GPX course upload + elevation analysis",
      "PDF race-day card (print & go)",
      "Strava auto-import",
      "AI race strategy narrative",
    ],
    annualPrice: 39,
    monthlyPrice: 4.99,
  },
  unlimited: {
    name: "Pro",
    maxPlansPerSeason: Infinity,
    features: [
      "Unlimited race plans",
      "Everything in Season Pass",
      "Share plans via public link",
      "Priority support",
    ],
    annualPrice: 99,
    monthlyPrice: 12.99,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanLimits(plan: string) {
  return PLANS[plan as PlanKey] ?? PLANS.free;
}

export function isPaidPlan(plan: string): boolean {
  return plan === "season" || plan === "unlimited";
}

export function getAnnualSavingsPercent(plan: PlanKey): number | null {
  const config = PLANS[plan];
  if (config.monthlyPrice <= 0) return null;

  const annualFromMonthly = config.monthlyPrice * 12;
  const savingsPct = ((annualFromMonthly - config.annualPrice) / annualFromMonthly) * 100;
  return Math.round(savingsPct);
}

export function getAnnualSavingsLabel(plan: PlanKey): string | null {
  const savingsPct = getAnnualSavingsPercent(plan);
  if (savingsPct === null || savingsPct <= 0) return null;
  return `Save ${savingsPct}%`;
}
