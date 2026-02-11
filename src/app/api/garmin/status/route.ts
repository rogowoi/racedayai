import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isGarminConfigured } from "@/lib/garmin";
import { NextResponse } from "next/server";

/**
 * GET /api/garmin/status
 * Returns the Garmin connection status for the authenticated user.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const athlete = await prisma.athlete.findUnique({
      where: { userId: session.user.id },
      select: { garminConnected: true },
    });

    return NextResponse.json({
      configured: isGarminConfigured(),
      connected: athlete?.garminConnected ?? false,
    });
  } catch (error) {
    console.error("Garmin status error:", error);
    return NextResponse.json(
      { error: "Failed to get Garmin status" },
      { status: 500 }
    );
  }
}
