import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { stripe, getStripePriceId } from "@/lib/stripe";
import { PLANS, type PlanKey } from "@/lib/plans";
import { prisma } from "@/lib/db";
import { trackServerEvent } from "@/lib/posthog-server";
import { AnalyticsEvent } from "@/lib/analytics";

/**
 * Derive the app base URL from request headers instead of relying on
 * NEXT_PUBLIC_APP_URL (which is inlined at build time by webpack and
 * can silently become `undefined` if not present during the build).
 */
function getBaseUrl(headersList: Headers): string {
  const host = headersList.get("host") ?? headersList.get("x-forwarded-host");
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  // Fallback to env var (trimmed) or hardcoded production URL
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://racedayai.com"
  );
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { plan: string };
    const plan = body.plan as PlanKey;

    if (!PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (plan === "free") {
      return NextResponse.json(
        { error: "Cannot checkout for free plan" },
        { status: 400 }
      );
    }

    const priceId = getStripePriceId(plan as "season" | "unlimited");

    // Get amount for tracking
    const planPrice = PLANS[plan].annualPrice;

    // Track checkout started
    trackServerEvent(session.user.id, AnalyticsEvent.CHECKOUT_STARTED, {
      plan,
      billing: "annual",
      amount: planPrice,
    }).catch(() => {});

    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: session.user.name ?? undefined,
        metadata: {
          userId: session.user.id,
        },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Build return URLs from the actual request origin
    const headersList = await headers();
    const baseUrl = getBaseUrl(headersList);
    const successUrl = `${baseUrl}/dashboard/settings?billing=success`;
    const cancelUrl = `${baseUrl}/dashboard/settings?billing=cancelled`;

    // Check for existing active subscription to handle upgrades via proration
    if (customerId) {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const existingSub = subscriptions.data[0];
        const existingItem = existingSub.items.data[0];

        // Update the subscription with the new price (prorate automatically)
        await stripe.subscriptions.update(existingSub.id, {
          items: [
            {
              id: existingItem.id,
              price: priceId,
            },
          ],
          proration_behavior: "create_prorations",
          metadata: {
            userId: session.user.id,
            plan,
          },
        });

        return NextResponse.json({ url: successUrl });
      }
    }

    // No existing subscription — create a new checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: session.user.id,
        plan,
      },
      subscription_data: {
        metadata: {
          userId: session.user.id,
          plan,
        },
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Checkout error:", error);

    // Track checkout failure
    if (session?.user?.id) {
      trackServerEvent(session.user.id, AnalyticsEvent.CHECKOUT_FAILED, {
        error: error instanceof Error ? error.message : "Unknown error",
      }).catch(() => {});
    }

    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
