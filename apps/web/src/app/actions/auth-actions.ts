"use server";

import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { sendWelcomeEmail } from "@/lib/email";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

export async function loginWithStrava() {
  await signIn("strava", { redirectTo: "/wizard" });
}

export async function loginWithCredentials(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return { error: "Invalid email or password." };
      }
    }
    // Re-throw redirect errors (signIn throws NEXT_REDIRECT)
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    return { error: "Something went wrong. Please try again." };
  }

  redirect("/wizard");
}

export async function signUp(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "An account with this email already exists. Try signing in instead." };
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user and athlete profile in a transaction
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
        },
      });

      // Create associated Athlete profile
      await tx.athlete.create({
        data: {
          userId: user.id,
        },
      });
    });
  } catch {
    return { error: "Could not create your account. Please try again." };
  }

  // Send welcome email (non-blocking, don't await)
  sendWelcomeEmail(name || email, email).catch(() => {});

  // Auto sign-in after successful registration
  try {
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    // Re-throw redirect errors
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) {
      throw error;
    }
    // If sign-in fails after creation, send them to login
    redirect("/login");
  }

  // If the user chose a paid plan during signup, send them to settings
  // with an auto-upgrade param so checkout triggers immediately.
  const plan = formData.get("plan") as string | null;
  const billing = formData.get("billing") as string | null;

  if (plan && (plan === "season" || plan === "unlimited")) {
    const billingParam = billing === "monthly" ? "monthly" : "annual";
    redirect(`/dashboard/settings?upgrade=${plan}&billing=${billingParam}`);
  }

  redirect("/onboarding");
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
