"use server";

import { signIn, signOut } from "@/auth";

export async function loginWithStrava() {
  await signIn("strava", { redirectTo: "/wizard" });
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
