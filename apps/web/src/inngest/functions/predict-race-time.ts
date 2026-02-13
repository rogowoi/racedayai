/**
 * Inngest function: ML-powered race time prediction
 *
 * Predicts race time with segment breakdown and intensities using trained XGBoost models.
 */

import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
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
      const athleteRecord = await db.athlete.findUnique({
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
      return [];
    });

    // Step 3: Run ML prediction
    const prediction = await step.run("predict", async () => {
      const input: UserInput = {
        gender: athlete.gender as "M" | "F" | undefined,
        age: athlete.age || undefined,
        ftp: athlete.ftp || undefined,
        weight: athlete.weight || undefined,
        css: athlete.css || undefined,
        thresholdPace: athlete.thresholdPace || undefined,
        priorRaces,
      };

      return predictRaceTime(input, distance);
    });

    // Step 4: Save prediction to DB
    await step.run("save-prediction", async () => {
      await db.racePlan.update({
        where: { id: planId },
        data: {
          mlPrediction: prediction as any, // Prisma Json type
        },
      });
    });

    return prediction;
  }
);
