import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Require the current session user to be an admin.
 * Returns the session if authorized, or a 403 NextResponse if not.
 */
export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }

  if (!session.user.isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), session: null };
  }

  return { error: null, session };
}
