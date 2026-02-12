/**
 * Client-safe plan configuration.
 * This file contains NO server-side env vars or Stripe imports,
 * so it can be safely imported by "use client" components.
 */

export const PLANS = {
  free: {
    name: "Free",
    maxPlansPerSeason: 1,
    features: [
      "1 race plan",
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
      "PDF export with race-day cards",
      "GPX course upload + elevation analysis",
      "Weather integration with forecasts",
      "Strava OAuth auto-import",
    ],
    annualPrice: 39,
    monthlyPrice: 4.99,
  },
  unlimited: {
    name: "Unlimited",
    maxPlansPerSeason: Infinity,
    features: [
      "Unlimited race plans",
      "AI-generated race strategy narrative",
      "Advanced weather warnings",
      "Share plans via public link",
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
