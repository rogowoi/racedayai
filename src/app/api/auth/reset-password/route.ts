import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

const RESET_TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // For security, we don't reveal whether the user exists or not
    if (!user) {
      return NextResponse.json(
        { message: "If a user with this email exists, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY);

    // Store the reset token in the VerificationToken table
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: resetToken,
        },
      },
      update: {
        expires: expiresAt,
      },
      create: {
        identifier: email,
        token: resetToken,
        expires: expiresAt,
      },
    });

    // Construct the reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send the reset email
    await sendPasswordResetEmail(email, resetToken, resetUrl);

    return NextResponse.json(
      { message: "If a user with this email exists, a reset link has been sent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
