import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { checkCanCreatePlan, incrementPlanCount, getPlanUsage } from "@/lib/plan-limits";
import { inngest } from "@/inngest/client";
import { parsePace } from "@/lib/engine/generate-plan-core";
import { trackServerEvent } from "@/lib/posthog-server";
import { AnalyticsEvent } from "@/lib/analytics";

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

    // Track paywall shown
    trackServerEvent(userId, AnalyticsEvent.PAYWALL_SHOWN, {
      plansUsed: usage?.plansUsed || 0,
      plansLimit: usage?.plansLimit || 0,
      triggerPoint: "wizard_submit",
    }).catch(() => {});

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

  const { fitnessData, raceData, quizData, rwgpsCourseData, gpxFileKey, ignoreDuplicate } = body;

  if (!fitnessData || !raceData) {
    return NextResponse.json(
      { error: "Missing required fields. Please complete all wizard steps." },
      { status: 400 },
    );
  }

  try {
    // Check for duplicate plans (same race name and date)
    if (!ignoreDuplicate) {
      const rd = raceData as Record<string, unknown>;
      const raceDate = rd.date ? new Date(rd.date as string) : new Date();

      // Get athlete to check for existing plans
      const athlete = await prisma.athlete.findUnique({
        where: { userId },
        include: {
          racePlans: {
            where: {
              raceDate: {
                gte: new Date(raceDate.getFullYear(), raceDate.getMonth(), raceDate.getDate()),
                lt: new Date(raceDate.getFullYear(), raceDate.getMonth(), raceDate.getDate() + 1),
              },
              course: {
                raceName: rd.name as string,
              },
            },
          },
        },
      });

      if (athlete && athlete.racePlans.length > 0) {
        return NextResponse.json(
          {
            error: "duplicate",
            message: `You already have a plan for ${rd.name} on ${raceDate.toLocaleDateString()}. Creating a duplicate will use another plan slot.`,
            existingPlanId: athlete.racePlans[0].id,
          },
          { status: 409 },
        );
      }
    }

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
          quizData: quizData || null,
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
          quizData: quizData || null,
          rwgpsCourseData: rwgpsCourseData || null,
        },
      },
    });

    // Increment plan count optimistically
    await incrementPlanCount(userId);

    // Track plan generation requested
    trackServerEvent(userId, AnalyticsEvent.PLAN_GENERATION_REQUESTED, {
      planId: plan.id,
      distance: rd.distanceCategory,
      hasGpx: !!gpxFileKey || !!rwgpsCourseData,
      hasFtp: !!(fitnessData as Record<string, unknown>).ftp,
    }).catch(() => {});

    // Send Inngest event to start background generation
    await inngest.send({
      name: "plan/generate.requested",
      data: { planId: plan.id, userId },
    });

    return NextResponse.json({ planId: plan.id });
  } catch (err) {
    console.error("[generate-plan] Error:", err);

    // Track generation failure
    trackServerEvent(userId, AnalyticsEvent.PLAN_GENERATION_FAILED, {
      error: err instanceof Error ? err.message : "Unknown error",
    }).catch(() => {});

    return NextResponse.json(
      { error: "Something went wrong while creating your plan. Please try again." },
      { status: 500 },
    );
  }
}
