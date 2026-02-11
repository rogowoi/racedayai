"use server";

import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { sendWelcomeEmail } from "@/lib/email";
import { redirect } from "next/navigation";

export async function loginWithStrava() {
  await signIn("strava", { redirectTo: "/wizard" });
}

export async function loginWithCredentials(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/wizard",
  });
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user and athlete profile in a transaction
  let userId: string;
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
      },
    });
    userId = user.id;

    // Create associated Athlete profile
    await tx.athlete.create({
      data: {
        userId: user.id,
      },
    });
  });

  // Send welcome email (non-blocking)
  await sendWelcomeEmail(name || email, email);

  // Auto sign-in after successful registration
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/onboarding",
  });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
