import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  getStravaActivities,
  extractFitnessMetrics,
  StravaTokenData,
} from "@/lib/strava";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get athlete record with Strava token
    const athlete = await prisma.athlete.findUnique({
      where: { userId: session.user.id },
    });

    if (!athlete || !athlete.stravaToken) {
      return NextResponse.json(
        { error: "Strava not connected" },
        { status: 400 }
      );
    }

    // Parse the stored token data
    const tokenData = athlete.stravaToken as unknown as StravaTokenData;
    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: "Invalid Strava token" },
        { status: 400 }
      );
    }

    // Fetch recent activities from Strava
    const activities = await getStravaActivities(tokenData.access_token, 20);

    // Extract fitness metrics from activities
    const metrics = extractFitnessMetrics(activities);

    // Update athlete record with new metrics
    const updatedAthlete = await prisma.athlete.update({
      where: { id: athlete.id },
      data: {
        ftpWatts: metrics.ftpWatts,
        thresholdPaceSec: metrics.thresholdPaceSec,
        cssPer100mSec: metrics.cssPer100mSec,
        maxHr: metrics.maxHr,
      },
    });

    return NextResponse.json({
      success: true,
      metrics: {
        ftpWatts: updatedAthlete.ftpWatts,
        thresholdPaceSec: updatedAthlete.thresholdPaceSec,
        cssPer100mSec: updatedAthlete.cssPer100mSec,
        maxHr: updatedAthlete.maxHr,
      },
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
