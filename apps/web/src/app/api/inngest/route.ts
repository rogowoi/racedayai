import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generatePlanFn } from "@/inngest/functions/generate-plan";
import { predictRaceTimeFn } from "@/inngest/functions/predict-race-time";

export const maxDuration = 300;

const handler = serve({
  client: inngest,
  functions: [generatePlanFn, predictRaceTimeFn],
});

export const { GET, POST, PUT } = handler;
