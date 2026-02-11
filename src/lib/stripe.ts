import Stripe from "stripe";

// Validate required environment variables
const requiredEnvVars = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_SEASON_ANNUAL_PRICE_ID: process.env.STRIPE_SEASON_ANNUAL_PRICE_ID,
  STRIPE_SEASON_MONTHLY_PRICE_ID: process.env.STRIPE_SEASON_MONTHLY_PRICE_ID,
  STRIPE_UNLIMITED_ANNUAL_PRICE_ID: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID,
  STRIPE_UNLIMITED_MONTHLY_PRICE_ID: process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables for Stripe: ${missingVars.join(", ")}\n` +
    `Please check your .env file and ensure all Stripe configuration is set.`
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

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
    priceId: null,
    monthlyPriceId: null,
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
    priceId: process.env.STRIPE_SEASON_ANNUAL_PRICE_ID,
    monthlyPriceId: process.env.STRIPE_SEASON_MONTHLY_PRICE_ID,
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
    priceId: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID,
    monthlyPriceId: process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID,
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
