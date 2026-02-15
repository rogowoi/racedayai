import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { deleteGpxFiles } from "@/lib/r2";

export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.confirmation !== "DELETE") {
      return NextResponse.json(
        { error: "Please type DELETE to confirm account deletion." },
        { status: 400 }
      );
    }

    // Load user with nested data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        stripeSubscriptionId: true,
        athletes: {
          select: {
            racePlans: {
              select: { gpxFileKey: true },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Cancel Stripe subscription if exists
    if (user.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      } catch (error) {
        console.error("Error cancelling Stripe subscription:", error);
        // Continue with deletion even if Stripe cancellation fails
      }
    }

    // Collect all non-null GPX file keys and delete from R2
    const gpxKeys: string[] = [];
    if (user.athletes) {
      for (const plan of user.athletes.racePlans) {
        if (plan.gpxFileKey) {
          gpxKeys.push(plan.gpxFileKey);
        }
      }
    }

    if (gpxKeys.length > 0) {
      try {
        await deleteGpxFiles(gpxKeys);
      } catch (error) {
        console.error("Error deleting GPX files:", error);
        // Continue with deletion even if R2 cleanup fails
      }
    }

    // Delete verification tokens
    if (user.email) {
      await prisma.verificationToken.deleteMany({
        where: { identifier: user.email },
      });
    }

    // Delete user (cascades everything else)
    await prisma.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account." },
      { status: 500 }
    );
  }
}
