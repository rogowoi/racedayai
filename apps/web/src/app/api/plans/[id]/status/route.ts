import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const STALE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const plan = await prisma.racePlan.findUnique({
    where: { id },
    select: {
      status: true,
      errorMessage: true,
      createdAt: true,
      weatherData: true,
      swimPlan: true,
      bikePlan: true,
      runPlan: true,
      nutritionPlan: true,
      statisticalContext: true,
      narrativePlan: true,
    },
  });

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Stale check: if generating for too long, report as failed
  if (
    plan.status === "generating" &&
    Date.now() - plan.createdAt.getTime() > STALE_TIMEOUT_MS
  ) {
    await prisma.racePlan.update({
      where: { id },
      data: {
        status: "failed",
        errorMessage: "Generation timed out. Please try again.",
      },
    });
    return NextResponse.json({
      status: "failed",
      errorMessage: "Generation timed out. Please try again.",
      progress: {},
    });
  }

  // Build progress indicators based on which fields are populated
  const progress = {
    weather: !!plan.weatherData,
    pacing: !!plan.swimPlan && !!plan.bikePlan && !!plan.runPlan,
    nutrition: !!plan.nutritionPlan,
    statistics: !!plan.statisticalContext,
    narrative: !!plan.narrativePlan,
  };

  return NextResponse.json({
    status: plan.status,
    errorMessage: plan.errorMessage,
    progress,
  });
}
