import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { buildNutritionStrategy } from "@/lib/engine/nutrition";
import type { NutritionPlan } from "@/lib/engine/nutrition";
import type { ProductSlot } from "@/lib/engine/nutrition-products";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const plan = await prisma.racePlan.findUnique({
      where: { id },
      include: {
        athlete: true,
        course: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (plan.athlete.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { primaryGelId, caffeinatedGelId, drinkMixId, earlyBikeSolidId } =
      body as Partial<Record<string, string>>;

    // Extract durations from existing plan data
    const swimPlan = plan.swimPlan as { estimatedTimeMin?: number } | null;
    const bikePlan = plan.bikePlan as { durationMinutes?: number } | null;
    const runPlan = plan.runPlan as { estimatedTimeMin?: number } | null;
    const weather = plan.weatherData as { tempC?: number } | null;
    const transition = plan.transitionPlan as {
      t1Sec?: number;
      t2Sec?: number;
    } | null;
    const existingNutrition = plan.nutritionPlan as NutritionPlan | null;

    const swimDurationMin = swimPlan?.estimatedTimeMin ?? 35;
    const bikeDurationMin = bikePlan?.durationMinutes ?? 168;
    const runDurationMin = runPlan?.estimatedTimeMin ?? 110;
    const temperatureC = weather?.tempC ?? 20;
    const t1Min = transition?.t1Sec ? transition.t1Sec / 60 : 3;
    const t2Min = transition?.t2Sec ? transition.t2Sec / 60 : 2;

    // Build product overrides
    const overrides: Partial<Record<ProductSlot, string>> = {};
    if (primaryGelId) overrides.primaryGel = primaryGelId;
    if (caffeinatedGelId) overrides.caffeinatedGel = caffeinatedGelId;
    if (drinkMixId) overrides.drinkMix = drinkMixId;
    if (earlyBikeSolidId) overrides.earlyBikeSolid = earlyBikeSolidId;

    const nutrition = buildNutritionStrategy({
      swimDurationMin,
      bikeDurationMin,
      runDurationMin,
      temperatureC,
      carbsPerHour: existingNutrition?.carbsPerHour ?? 60,
      sodiumPerHour: existingNutrition?.sodiumPerHour ?? 500,
      fluidPerHour: existingNutrition?.fluidPerHour ?? 500,
      distanceCategory: plan.course.distanceCategory,
      t1DurationMin: t1Min,
      t2DurationMin: t2Min,
      athleteWeightKg: Number(plan.athlete.weightKg) || 75,
      experienceLevel: plan.athlete.experienceLevel || "intermediate",
      productOverrides: overrides,
    });

    // Preserve any existing LLM-generated prose/notes from the original plan
    if (existingNutrition?.bikeSetup?.prose && nutrition.bikeSetup) {
      nutrition.bikeSetup.prose = existingNutrition.bikeSetup.prose;
    }

    await prisma.racePlan.update({
      where: { id },
      data: {
        nutritionPlan: JSON.parse(
          JSON.stringify(nutrition),
        ) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true, nutrition });
  } catch (error) {
    console.error("Recompute nutrition error:", error);
    return NextResponse.json(
      { error: "Failed to recompute nutrition" },
      { status: 500 },
    );
  }
}
