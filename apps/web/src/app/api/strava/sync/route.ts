import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  getStravaActivities,
  getStravaProfile,
  getStravaZones,
  getValidStravaToken,
  extractFitnessMetrics,
  StravaTokenData,
} from "@/lib/strava";
import { refineMetricsWithLLM } from "@/lib/strava-insights";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const athlete = await prisma.athlete.findUnique({
      where: { userId: session.user.id },
    });

    if (!athlete || !athlete.stravaToken) {
      return NextResponse.json(
        { error: "Strava not connected" },
        { status: 400 }
      );
    }

    const tokenData = athlete.stravaToken as unknown as StravaTokenData;
    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: "Invalid Strava token" },
        { status: 400 }
      );
    }

    // Refresh token if needed
    const accessToken = await getValidStravaToken(athlete.id, tokenData);

    // Fetch profile, zones, and activities in parallel
    const [profile, zones, activities] = await Promise.all([
      getStravaProfile(accessToken).catch(() => null),
      getStravaZones(accessToken).catch(() => ({})),
      getStravaActivities(accessToken),
    ]);

    // Math-based estimation
    const mathMetrics = extractFitnessMetrics(activities, zones, profile);

    // LLM refinement (graceful fallback if unavailable)
    const refined = await refineMetricsWithLLM(activities, mathMetrics);

    // Update athlete record with refined metrics
    await prisma.athlete.update({
      where: { id: athlete.id },
      data: {
        ftpWatts: refined.ftpWatts,
        thresholdPaceSec: refined.thresholdPaceSec,
        cssPer100mSec: refined.cssPer100mSec,
        maxHr: refined.maxHr,
        ...(mathMetrics.weightKg != null && { weightKg: mathMetrics.weightKg }),
      },
    });

    return NextResponse.json({
      success: true,
      metrics: {
        ftpWatts: refined.ftpWatts,
        ftpSource: mathMetrics.ftpSource,
        ftpConfidence: refined.ftpConfidence,
        thresholdPaceSec: refined.thresholdPaceSec,
        paceConfidence: refined.paceConfidence,
        cssPer100mSec: refined.cssPer100mSec,
        cssConfidence: refined.cssConfidence,
        maxHr: refined.maxHr,
        weightKg: mathMetrics.weightKg,
        gender: mathMetrics.gender,
        hasPowerMeter: mathMetrics.hasPowerMeter,
      },
      coachingInsight: refined.coachingInsight,
      activitiesProcessed: activities.length,
    });
  } catch (error) {
    console.error("Strava sync error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to sync Strava data",
      },
      { status: 500 }
    );
  }
}
