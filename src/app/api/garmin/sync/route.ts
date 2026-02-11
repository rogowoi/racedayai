import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  ensureValidToken,
  getGarminActivities,
  getGarminDailies,
  getGarminBodyCompositions,
  extractGarminFitnessMetrics,
  GarminTokenData,
} from "@/lib/garmin";
import { NextResponse } from "next/server";

/**
 * POST /api/garmin/sync
 * Fetches 90 days of Garmin data (activities, dailies, body composition),
 * extracts fitness metrics, and updates the athlete profile.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const athlete = await prisma.athlete.findUnique({
      where: { userId: session.user.id },
    });

    if (!athlete || !athlete.garminToken) {
      return NextResponse.json(
        { error: "Garmin not connected" },
        { status: 400 }
      );
    }

    const tokenData = athlete.garminToken as unknown as GarminTokenData;
    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: "Invalid Garmin token" },
        { status: 400 }
      );
    }

    // Refresh token if needed
    const { token, refreshed } = await ensureValidToken(tokenData);
    if (refreshed) {
      await prisma.athlete.update({
        where: { id: athlete.id },
        data: {
          garminToken: {
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            expires_at: token.expires_at,
            token_type: token.token_type,
          },
        },
      });
    }

    // Fetch 90 days of data in parallel
    const now = Math.floor(Date.now() / 1000);
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60;

    const [activities, dailies, bodyComps] = await Promise.all([
      getGarminActivities(token.access_token, ninetyDaysAgo, now),
      getGarminDailies(token.access_token, ninetyDaysAgo, now),
      getGarminBodyCompositions(token.access_token, ninetyDaysAgo, now),
    ]);

    const metrics = extractGarminFitnessMetrics(activities, dailies, bodyComps);

    // Only update fields where Garmin returned data (preserve other sources)
    const updateData: Record<string, unknown> = {};
    if (metrics.thresholdPaceSec !== null)
      updateData.thresholdPaceSec = metrics.thresholdPaceSec;
    if (metrics.cssPer100mSec !== null)
      updateData.cssPer100mSec = metrics.cssPer100mSec;
    if (metrics.maxHr !== null) updateData.maxHr = metrics.maxHr;
    if (metrics.restingHr !== null) updateData.restingHr = metrics.restingHr;
    if (metrics.weightKg !== null) updateData.weightKg = metrics.weightKg;
    if (metrics.ftpWatts !== null) updateData.ftpWatts = metrics.ftpWatts;

    const updatedAthlete = await prisma.athlete.update({
      where: { id: athlete.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      metrics: {
        ftpWatts: updatedAthlete.ftpWatts,
        thresholdPaceSec: updatedAthlete.thresholdPaceSec,
        cssPer100mSec: updatedAthlete.cssPer100mSec,
        maxHr: updatedAthlete.maxHr,
        restingHr: updatedAthlete.restingHr,
        weightKg: updatedAthlete.weightKg
          ? Number(updatedAthlete.weightKg)
          : null,
      },
      activitiesProcessed: activities.length,
      source: "garmin",
    });
  } catch (error) {
    console.error("Garmin sync error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to sync Garmin data",
      },
      { status: 500 }
    );
  }
}
