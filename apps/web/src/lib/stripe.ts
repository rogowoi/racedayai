import Stripe from "stripe";

// Re-export client-safe plan config so existing server-side
// imports from "@/lib/stripe" still work without changes.
export { PLANS, getPlanLimits, isPaidPlan } from "./plans";
export type { PlanKey } from "./plans";

// --------------- Server-only code below ---------------

// Validate required environment variables (server only)
const requiredEnvVars = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  STRIPE_SEASON_ANNUAL_PRICE_ID: process.env.STRIPE_SEASON_ANNUAL_PRICE_ID,
  STRIPE_UNLIMITED_ANNUAL_PRICE_ID: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID,
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

/**
 * Server-only: resolve a Stripe annual price ID for a given plan.
 */
export function getStripePriceId(
  plan: "season" | "unlimited",
): string {
  const map: Record<string, string | undefined> = {
    season: process.env.STRIPE_SEASON_ANNUAL_PRICE_ID,
    unlimited: process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID,
  };

  const priceId = map[plan];
  if (!priceId) {
    throw new Error(`No Stripe annual price ID configured for ${plan}`);
  }
  return priceId;
}
