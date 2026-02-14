import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Load plan and verify ownership
    const plan = await prisma.racePlan.findUnique({
      where: { id },
      include: {
        athlete: true,
        course: true,
      },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (plan.athlete.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse and validate request body
    const body = await req.json();
    const { raceName } = body;

    if (!raceName || typeof raceName !== "string") {
      return NextResponse.json(
        { error: "Race name is required" },
        { status: 400 }
      );
    }

    const trimmedName = raceName.trim();

    if (trimmedName.length === 0) {
      return NextResponse.json(
        { error: "Race name cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmedName.length > 200) {
      return NextResponse.json(
        { error: "Race name must be less than 200 characters" },
        { status: 400 }
      );
    }

    // Update the course raceName
    await prisma.raceCourse.update({
      where: { id: plan.courseId },
      data: { raceName: trimmedName },
    });

    // Return updated plan data
    const updatedPlan = await prisma.racePlan.findUnique({
      where: { id },
      include: {
        course: true,
        athlete: true,
      },
    });

    return NextResponse.json({
      success: true,
      plan: {
        id: updatedPlan!.id,
        raceName: updatedPlan!.course.raceName,
      },
    });
  } catch (error) {
    console.error("Rename plan error:", error);
    return NextResponse.json(
      { error: "Failed to rename plan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      { error: "Please sign in to delete a race plan." },
      { status: 401 }
    );
  }

  const { id: planId } = await params;

  try {
    // Find the plan and verify ownership
    const plan = await prisma.racePlan.findUnique({
      where: { id: planId },
      include: {
        athlete: {
          select: {
            userId: true,
          },
        },
      },
    });

    // Return 404 if plan doesn't exist or user doesn't own it
    if (!plan || plan.athlete.userId !== userId) {
      return NextResponse.json(
        { error: "Plan not found or you don't have permission to delete it." },
        { status: 404 }
      );
    }

    // Delete the plan
    await prisma.racePlan.delete({
      where: { id: planId },
    });

    return NextResponse.json(
      { success: true, message: "Plan deleted successfully." },
      { status: 200 }
    );
  } catch (err) {
    console.error("[delete-plan] Error:", err);
    return NextResponse.json(
      { error: "Something went wrong while deleting the plan. Please try again." },
      { status: 500 }
    );
  }
}
