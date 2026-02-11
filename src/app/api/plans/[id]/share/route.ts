import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import crypto from "crypto";

export async function POST(
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
      include: { athlete: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    if (plan.athlete.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check tier — sharing is Pro/Unlimited only
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { plan: true },
    });

    if (!user || user.plan !== "unlimited") {
      return NextResponse.json(
        { error: "Plan sharing requires a Pro subscription." },
        { status: 403 }
      );
    }

    // Return existing token if already shared
    if (plan.shareToken) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      return NextResponse.json({
        shareUrl: `${baseUrl}/share/${plan.shareToken}`,
        shareToken: plan.shareToken,
      });
    }

    // Generate new 12-char hex token
    const shareToken = crypto.randomBytes(6).toString("hex");

    await prisma.racePlan.update({
      where: { id },
      data: { shareToken },
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({
      shareUrl: `${baseUrl}/share/${shareToken}`,
      shareToken,
    });
  } catch (error) {
    console.error("Share error:", error);
    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}
