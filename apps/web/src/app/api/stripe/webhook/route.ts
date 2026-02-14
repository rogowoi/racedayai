import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { resetPlanCount } from "@/lib/plan-limits";
import { trackServerEvent } from "@/lib/posthog-server";
import { AnalyticsEvent } from "@/lib/analytics";
import { PLANS } from "@/lib/plans";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;

        if (userId && plan) {
          // Update user with subscription info and reset plan count
          await prisma.user.update({
            where: { id: userId },
            data: {
              plan,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
            },
          });

          // Reset plan count to start fresh season
          await resetPlanCount(userId);

          // Track successful checkout
          const planData = PLANS[plan as keyof typeof PLANS];
          trackServerEvent(userId, AnalyticsEvent.CHECKOUT_COMPLETED, {
            plan,
            amount: session.amount_total ? session.amount_total / 100 : planData?.annualPrice || 0,
          }).catch(() => {});

          console.log(`User ${userId} upgraded to ${plan}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });

        if (user) {
          const isActive =
            subscription.status === "active" ||
            subscription.status === "trialing";

          const plan = isActive
            ? (subscription.metadata?.plan ?? "season")
            : "free";

          await prisma.user.update({
            where: { id: user.id },
            data: {
              plan,
              stripeSubscriptionId: subscription.id,
            },
          });

          console.log(
            `User ${user.id} subscription updated: ${subscription.status} -> ${plan}`
          );
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true, plan: true },
        });

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan: "free",
            stripeSubscriptionId: null,
          },
        });

        // Track subscription cancellation
        if (user) {
          trackServerEvent(user.id, AnalyticsEvent.SUBSCRIPTION_CANCELLED, {
            plan: user.plan,
          }).catch(() => {});
        }

        console.log(`Subscription deleted for customer ${customerId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
