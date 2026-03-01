import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { resetPlanCount } from "@/lib/plan-limits";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const { plan, resetCounter } = body as {
    plan?: "free" | "season" | "unlimited";
    resetCounter?: boolean;
  };

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Update plan tier if provided
  if (plan && ["free", "season", "unlimited"].includes(plan)) {
    await prisma.user.update({
      where: { id },
      data: { plan },
    });
  }

  // Reset the season counter if requested
  if (resetCounter) {
    await resetPlanCount(id);
  }

  // Return updated user
  const updated = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      plansCreatedThisSeason: true,
      seasonStartDate: true,
    },
  });

  return NextResponse.json({ user: updated });
}
