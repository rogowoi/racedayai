import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generatePlanFn } from "@/inngest/functions/generate-plan";

export const maxDuration = 300;

const handler = serve({
  client: inngest,
  functions: [generatePlanFn],
});

export const { GET, POST, PUT } = handler;
