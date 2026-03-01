import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "30", 10);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const steps = [
    "quiz_0",
    "quiz_1",
    "quiz_2",
    "wizard_1",
    "wizard_2",
    "wizard_3",
    "plan_generated",
  ];

  const results = await Promise.all(
    steps.map(async (step) => {
      const [viewed, completed, skipped] = await Promise.all([
        prisma.funnelEvent.count({
          where: {
            step,
            action: "viewed",
            createdAt: { gte: since },
          },
        }),
        prisma.funnelEvent.count({
          where: {
            step,
            action: "completed",
            createdAt: { gte: since },
          },
        }),
        prisma.funnelEvent.count({
          where: {
            step,
            action: "skipped",
            createdAt: { gte: since },
          },
        }),
      ]);

      return { step, viewed, completed, skipped };
    })
  );

  // Total unique sessions in the period
  const sessionGroups = await prisma.funnelEvent.groupBy({
    by: ["sessionId"],
    where: { createdAt: { gte: since } },
  });

  return NextResponse.json({
    steps: results,
    totalSessions: sessionGroups.length,
    periodDays: days,
  });
}
