/**
 * Inngest function: ML-powered race time prediction
 *
 * Predicts race time with segment breakdown and intensities using trained XGBoost models.
 */

import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db";
import { predictRaceTime } from "@/lib/ml/predict";
import type { Distance, UserInput } from "@/lib/ml/types";

export const predictRaceTimeFn = inngest.createFunction(
  {
    id: "predict-race-time",
    retries: 1,
  },
  { event: "prediction/race-time.requested" },
  async ({ event, step }) => {
    const { userId, planId, distance } = event.data as {
      userId: string;
      planId: string;
      distance: Distance;
    };

    // Step 1: Load athlete profile from DB
    const athlete = await step.run("load-athlete", async () => {
      const athleteRecord = await prisma.athlete.findUnique({
        where: { userId },
      });

      if (!athleteRecord) {
        throw new Error(`Athlete not found for user: ${userId}`);
      }

      return athleteRecord;
    });

    // Step 2: Load prior race history (optional)
    const priorRaces = await step.run("load-race-history", async () => {
      // TODO: Query race history from DB
      // For now, return empty array
      return [] as { distance: Distance; time: number }[];
    });

    // Step 3: Run ML prediction
    const prediction = await step.run("predict", async () => {
      const input: UserInput = {
        gender: undefined, // TODO: Add gender field to Athlete model
        age: undefined, // TODO: Add age field to Athlete model
        ftp: athlete.ftpWatts || undefined,
        weight: athlete.weightKg ? Number(athlete.weightKg) : undefined,
        css: athlete.cssPer100mSec || undefined,
        thresholdPace: athlete.thresholdPaceSec || undefined,
        priorRaces,
      };

      return predictRaceTime(input, distance);
    });

    // Step 4: Save prediction to DB using existing schema fields
    await step.run("save-prediction", async () => {
      await prisma.racePlan.update({
        where: { id: planId },
        data: {
          predictedFinishSec: Math.round(prediction.totalSeconds),
          confidenceLowSec: Math.round(prediction.quantiles.p05),
          confidenceHighSec: Math.round(prediction.quantiles.p95),
          predictedSplits: prediction.segments as any, // Json type
        },
      });
    });

    return prediction;
  }
);
