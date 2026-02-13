import { auth } from "@/auth";
import {
  generatePKCEChallenge,
  buildAuthorizationUrl,
  isGarminConfigured,
} from "@/lib/garmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * GET /api/garmin/auth
 * Initiates the Garmin OAuth2 PKCE flow by generating a challenge,
 * storing the verifier in a secure cookie, and redirecting to Garmin.
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (!isGarminConfigured()) {
    return NextResponse.redirect(
      new URL("/wizard?garmin_error=not_configured", baseUrl)
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  // Generate PKCE challenge and CSRF state
  const { codeVerifier, codeChallenge } = generatePKCEChallenge();
  const state = crypto.randomBytes(16).toString("hex");

  // Store verifier + state in httpOnly cookie (10 minute TTL)
  const cookieStore = await cookies();
  cookieStore.set(
    "garmin_oauth_state",
    JSON.stringify({ codeVerifier, state }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    }
  );

  const authUrl = buildAuthorizationUrl(codeChallenge, state);
  return NextResponse.redirect(authUrl);
}
