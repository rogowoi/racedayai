import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { exchangeCodeForTokens } from "@/lib/garmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /api/garmin/callback?code=...&state=...
 * Handles the Garmin OAuth2 redirect after user consent.
 * Validates CSRF state, exchanges code for tokens, and saves to athlete profile.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;

  // Handle Garmin-side errors (user denied, etc.)
  if (error) {
    return NextResponse.redirect(
      new URL(`/wizard?garmin_error=${encodeURIComponent(error)}`, baseUrl)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/wizard?garmin_error=missing_params", baseUrl)
    );
  }

  // Retrieve and validate the PKCE state cookie
  const cookieStore = await cookies();
  const oauthStateCookie = cookieStore.get("garmin_oauth_state");
  if (!oauthStateCookie?.value) {
    return NextResponse.redirect(
      new URL("/wizard?garmin_error=state_expired", baseUrl)
    );
  }

  let storedState: { codeVerifier: string; state: string };
  try {
    storedState = JSON.parse(oauthStateCookie.value);
  } catch {
    return NextResponse.redirect(
      new URL("/wizard?garmin_error=invalid_state", baseUrl)
    );
  }

  if (storedState.state !== state) {
    return NextResponse.redirect(
      new URL("/wizard?garmin_error=state_mismatch", baseUrl)
    );
  }

  // Verify user is authenticated
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", baseUrl));
  }

  try {
    // Exchange authorization code for tokens
    const tokenData = await exchangeCodeForTokens(
      code,
      storedState.codeVerifier
    );

    // Find or create athlete record
    let athlete = await prisma.athlete.findUnique({
      where: { userId: session.user.id },
    });

    if (!athlete) {
      athlete = await prisma.athlete.create({
        data: { userId: session.user.id },
      });
    }

    // Save Garmin tokens
    await prisma.athlete.update({
      where: { id: athlete.id },
      data: {
        garminConnected: true,
        garminToken: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          token_type: tokenData.token_type,
        },
      },
    });

    // Clean up the state cookie
    cookieStore.delete("garmin_oauth_state");

    return NextResponse.redirect(
      new URL("/wizard?garmin_connected=true", baseUrl)
    );
  } catch (err) {
    console.error("Garmin token exchange error:", err);
    return NextResponse.redirect(
      new URL("/wizard?garmin_error=token_exchange_failed", baseUrl)
    );
  }
}
