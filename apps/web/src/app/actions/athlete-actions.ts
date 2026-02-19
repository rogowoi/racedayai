"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export interface AthleteMetricsData {
  ftp: number | null;
  thresholdPace: string | null; // "min:sec" format
  css: string | null; // "min:sec" format
  weight: number | null;
  maxHr: number | null;
  gender: "M" | "F" | null;
  stravaConnected: boolean;
  hasSyncedMetrics: boolean;
}

/**
 * Convert seconds to "min:sec" string format for the wizard.
 */
function secsToMinSec(totalSec: number): string {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Fetch athlete metrics for the wizard auto-population.
 * Returns metrics in wizard-compatible formats.
 */
export async function getAthleteMetrics(): Promise<AthleteMetricsData | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const athlete = await prisma.athlete.findUnique({
    where: { userId: session.user.id },
  });

  if (!athlete) return null;

  const hasSyncedMetrics = !!(
    athlete.ftpWatts ||
    athlete.thresholdPaceSec ||
    athlete.cssPer100mSec
  );

  return {
    ftp: athlete.ftpWatts,
    thresholdPace: athlete.thresholdPaceSec
      ? secsToMinSec(athlete.thresholdPaceSec)
      : null,
    css: athlete.cssPer100mSec
      ? secsToMinSec(athlete.cssPer100mSec)
      : null,
    weight: athlete.weightKg ? Number(athlete.weightKg) : null,
    maxHr: athlete.maxHr,
    gender: (athlete.gender === "M" || athlete.gender === "F") ? athlete.gender : null,
    stravaConnected: athlete.stravaConnected,
    hasSyncedMetrics,
  };
}
