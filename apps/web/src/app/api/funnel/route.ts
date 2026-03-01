import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

const VALID_STEPS = new Set([
  "quiz_0",
  "quiz_1",
  "quiz_2",
  "wizard_1",
  "wizard_2",
  "wizard_3",
  "plan_generated",
]);
const VALID_ACTIONS = new Set(["viewed", "completed", "skipped"]);

export async function POST(req: Request) {
  let body: {
    sessionId: string;
    step: string;
    action: string;
    value?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { sessionId, step, action, value } = body;

  if (!sessionId || !step || !action) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!VALID_STEPS.has(step) || !VALID_ACTIONS.has(action)) {
    return NextResponse.json(
      { error: "Invalid step or action" },
      { status: 400 }
    );
  }

  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?.id ?? null;
  } catch {
    // Anonymous is fine
  }

  await prisma.funnelEvent.create({
    data: {
      sessionId,
      userId,
      step,
      action,
      value: value ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
