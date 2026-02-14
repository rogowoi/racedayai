import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPlanUsage } from "@/lib/plan-limits";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { canCreate: false, needsAuth: true },
      { status: 401 },
    );
  }

  const usage = await getPlanUsage(userId);

  if (!usage) {
    return NextResponse.json(
      { canCreate: false, error: "User not found" },
      { status: 404 },
    );
  }

  const canCreate = usage.isUnlimited || usage.plansUsed < usage.plansLimit;

  return NextResponse.json({
    canCreate,
    usage: {
      plan: usage.plan,
      plansUsed: usage.plansUsed,
      plansLimit: usage.isUnlimited ? "Unlimited" : usage.plansLimit,
      isUnlimited: usage.isUnlimited,
    },
  });
}
