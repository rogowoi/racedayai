import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email } = body;

    const updates: { name?: string | null; email?: string } = {};

    // Validate name
    if (name !== undefined) {
      const trimmedName = typeof name === "string" ? name.trim() : "";
      if (trimmedName.length > 100) {
        return NextResponse.json(
          { error: "Name must be 100 characters or less." },
          { status: 400 }
        );
      }
      updates.name = trimmedName || null;
    }

    // Validate email
    if (email !== undefined) {
      const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        return NextResponse.json(
          { error: "Please enter a valid email address." },
          { status: 400 }
        );
      }

      // Check uniqueness
      const existing = await prisma.user.findUnique({
        where: { email: trimmedEmail },
      });

      if (existing && existing.id !== session.user.id) {
        return NextResponse.json(
          { error: "This email is already in use." },
          { status: 409 }
        );
      }

      updates.email = trimmedEmail;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update." },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: updates,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile." },
      { status: 500 }
    );
  }
}
