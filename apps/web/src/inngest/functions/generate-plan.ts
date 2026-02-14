import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db";
import {
  prepareStep,
  computeStep,
  narrativeStep,
  type GeneratePlanInput,
} from "@/lib/engine/generate-plan-core";
import { decrementPlanCount } from "@/lib/plan-limits";
import { trackServerEvent } from "@/lib/posthog-server";
import { AnalyticsEvent } from "@/lib/analytics";

export const generatePlanFn = inngest.createFunction(
  {
    id: "generate-race-plan",
    retries: 1,
    onFailure: async ({ event, error }) => {
      const { planId, userId } = event.data.event.data as {
        planId: string;
        userId: string;
      };
      // Mark plan as failed and roll back plan count
      await prisma.racePlan.update({
        where: { id: planId },
        data: {
          status: "failed",
          errorMessage: "Plan generation failed. Please try again.",
        },
      });
      await decrementPlanCount(userId);

      // Track failure
      trackServerEvent(userId, AnalyticsEvent.PLAN_GENERATION_FAILED, {
        planId,
        error: error.message || "Unknown error",
      }).catch(() => {});
    },
  },
  { event: "plan/generate.requested" },
  async ({ event, step }) => {
    const { planId, userId } = event.data as {
      planId: string;
      userId: string;
    };

    // Load the stored generation input
    const plan = await step.run("load-input", async () => {
      const p = await prisma.racePlan.findUniqueOrThrow({
        where: { id: planId },
        select: { generationInput: true, gpxFileKey: true },
      });
      return p;
    });

    const input: GeneratePlanInput = {
      ...(plan.generationInput as Omit<
        GeneratePlanInput,
        "gpxFileKey"
      >),
      gpxFileKey: plan.gpxFileKey,
    };

    // Step 1: Resolve course data + fetch weather
    const prepareResult = await step.run("prepare", async () => {
      return await prepareStep(input);
    });

    // Step 2: Run pacing, nutrition, and statistical engines
    const computeResult = await step.run("compute", async () => {
      return await computeStep(input, prepareResult);
    });

    // Step 3: Generate AI narrative + finalize
    await step.run("narrative", async () => {
      return await narrativeStep(input, prepareResult, computeResult);
    });

    // Track successful completion
    await step.run("track-completion", async () => {
      trackServerEvent(userId, AnalyticsEvent.PLAN_GENERATION_COMPLETED, {
        planId,
        distance: (input.raceData as { distanceCategory?: string }).distanceCategory,
      }).catch(() => {});
    });

    return { planId, status: "completed" };
  },
);
