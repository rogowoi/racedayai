import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { plan: string; billing: "monthly" | "annual" };
    const plan = body.plan as PlanKey;
    const billing = body.billing ?? "annual";

    if (!PLANS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planConfig = PLANS[plan];
    const priceId = billing === "monthly" ? planConfig.monthlyPriceId : planConfig.priceId;

    if (!priceId) {
      return NextResponse.json(
        { error: "Plan does not support billing" },
        { status: 400 }
      );
    }

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

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?billing=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?billing=cancelled`,
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
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
