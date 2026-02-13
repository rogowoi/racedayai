import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkCanCreatePlan, incrementPlanCount, getPlanUsage } from "@/lib/plan-limits";
import { inngest } from "@/inngest/client";
import { parsePace } from "@/lib/engine/generate-plan-core";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in to generate a race plan." },
      { status: 401 },
    );
  }

  // Check plan limits
  const canCreate = await checkCanCreatePlan(userId);
  if (!canCreate) {
    const usage = await getPlanUsage(userId);
    return NextResponse.json(
      {
        error: `Plan limit reached (${usage?.plansUsed}/${usage?.plansLimit} plans used). Upgrade to create more plans.`,
      },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const { fitnessData, raceData, rwgpsCourseData, gpxFileKey } = body;

  if (!fitnessData || !raceData) {
    return NextResponse.json(
      { error: "Missing required fields. Please complete all wizard steps." },
      { status: 400 },
    );
  }

  try {
    // Upsert athlete profile
    await prisma.athlete.upsert({
      where: { userId },
      update: {
        ftpWatts: (fitnessData as Record<string, unknown>).ftp as number | null,
        weightKg: (fitnessData as Record<string, unknown>).weight as number | null,
        thresholdPaceSec: parsePace((fitnessData as Record<string, unknown>).thresholdPace as string | null),
        cssPer100mSec: parsePace((fitnessData as Record<string, unknown>).css as string | null),
        experienceLevel: ((fitnessData as Record<string, unknown>).experienceLevel as string) || "intermediate",
      },
      create: {
        userId,
        ftpWatts: (fitnessData as Record<string, unknown>).ftp as number | null,
        weightKg: (fitnessData as Record<string, unknown>).weight as number | null,
        thresholdPaceSec: parsePace((fitnessData as Record<string, unknown>).thresholdPace as string | null),
        cssPer100mSec: parsePace((fitnessData as Record<string, unknown>).css as string | null),
        experienceLevel: ((fitnessData as Record<string, unknown>).experienceLevel as string) || "intermediate",
      },
    });

    // Create placeholder course
    const rd = raceData as Record<string, unknown>;
    const course = await prisma.raceCourse.create({
      data: {
        raceName: rd.name as string,
        distanceCategory: rd.distanceCategory as string,
      },
    });

    // Create pending plan
    const raceDate = rd.date ? new Date(rd.date as string) : new Date();
    const athlete = await prisma.athlete.findUniqueOrThrow({
      where: { userId },
    });

    const plan = await prisma.racePlan.create({
      data: {
        athleteId: athlete.id,
        courseId: course.id,
        raceDate,
        status: "pending",
        gpxFileKey: (gpxFileKey as string) || null,
        generationInput: {
          userId,
          planId: "", // will be set below
          fitnessData,
          raceData,
          rwgpsCourseData: rwgpsCourseData || null,
        },
      },
    });

    // Update generationInput with the actual planId
    await prisma.racePlan.update({
      where: { id: plan.id },
      data: {
        generationInput: {
          userId,
          planId: plan.id,
          fitnessData,
          raceData,
          rwgpsCourseData: rwgpsCourseData || null,
        },
      },
    });

    // Increment plan count optimistically
    await incrementPlanCount(userId);

    // Send Inngest event to start background generation
    await inngest.send({
      name: "plan/generate.requested",
      data: { planId: plan.id, userId },
    });

    return NextResponse.json({ planId: plan.id });
  } catch (err) {
    console.error("[generate-plan] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong while creating your plan. Please try again." },
      { status: 500 },
    );
  }
}
