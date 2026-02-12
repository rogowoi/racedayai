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

/**
 * Server-only: resolve a Stripe price ID for a given plan + billing period.
 */
export function getStripePriceId(
  plan: "season" | "unlimited",
  billing: "monthly" | "annual" = "annual",
): string {
  const map: Record<string, string | undefined> = {
    "season-annual": process.env.STRIPE_SEASON_ANNUAL_PRICE_ID,
    "season-monthly": process.env.STRIPE_SEASON_MONTHLY_PRICE_ID,
    "unlimited-annual": process.env.STRIPE_UNLIMITED_ANNUAL_PRICE_ID,
    "unlimited-monthly": process.env.STRIPE_UNLIMITED_MONTHLY_PRICE_ID,
  };

  const priceId = map[`${plan}-${billing}`];
  if (!priceId) {
    throw new Error(`No Stripe price ID configured for ${plan}-${billing}`);
  }
  return priceId;
}
