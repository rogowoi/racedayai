import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

/**
 * POST /api/garmin/disconnect
 * Removes the Garmin connection from the athlete profile.
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.athlete.update({
      where: { userId: session.user.id },
      data: {
        garminConnected: false,
        garminToken: Prisma.DbNull,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Garmin disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Garmin" },
      { status: 500 }
    );
  }
}
