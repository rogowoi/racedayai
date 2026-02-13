/**
 * Garmin Health API client for fetching athlete data and activities
 * Uses Garmin Connect Developer Program Health API + Activity API
 * Auth: OAuth 2.0 with PKCE
 *
 * Endpoints:
 *   Auth:   https://apis.garmin.com/tools/oauth2/authorizeUser
 *   Token:  https://diauth.garmin.com/di-oauth2-service/oauth/token
 *   Data:   https://healthapi.garmin.com/wellness-api/rest/
 */

import crypto from "crypto";

// ─── Constants ───────────────────────────────────────────────────

const GARMIN_AUTH_URL = "https://apis.garmin.com/tools/oauth2/authorizeUser";
const GARMIN_TOKEN_URL =
  "https://diauth.garmin.com/di-oauth2-service/oauth/token";
const GARMIN_API_BASE = "https://healthapi.garmin.com/wellness-api/rest";
const MAX_QUERY_WINDOW_SECONDS = 86400; // 24 hours — Garmin's per-request limit

// ─── Types ───────────────────────────────────────────────────────

export interface GarminTokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in seconds
  token_type: string;
}

export interface GarminActivity {
  activityId: number;
  activityType: string; // RUNNING, CYCLING, LAP_SWIMMING, OPEN_WATER_SWIMMING, etc.
  durationInSeconds: number;
  distanceInMeters: number;
  averageSpeedInMetersPerSecond: number;
  averagePaceInMinutesPerKilometer?: number;
  averageHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;
  averageBikeCadenceInRoundsPerMinute?: number;
  averageRunCadenceInStepsPerMinute?: number;
  totalElevationGainInMeters?: number;
  startTimeInSeconds: number;
  startTimeOffsetInSeconds?: number;
  activeKilocalories?: number;
}

export interface GarminDailySummary {
  calendarDate: string;
  restingHeartRateInBeatsPerMinute?: number;
  maxHeartRateInBeatsPerMinute?: number;
  averageHeartRateInBeatsPerMinute?: number;
  steps?: number;
}

export interface GarminBodyComposition {
  calendarDate: string;
  weightInGrams?: number;
  bmi?: number;
  muscleMassInGrams?: number;
  bodyFatPercentage?: number;
}

export interface GarminFitnessMetrics {
  ftpWatts: number | null;
  thresholdPaceSec: number | null;
  cssPer100mSec: number | null;
  maxHr: number | null;
  restingHr: number | null;
  weightKg: number | null;
}

// ─── Configuration ───────────────────────────────────────────────

/**
 * Check whether Garmin OAuth credentials are configured
 */
export function isGarminConfigured(): boolean {
  return !!(
    process.env.GARMIN_CLIENT_ID && process.env.GARMIN_CLIENT_SECRET
  );
}

function getRedirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/garmin/callback`;
}

// ─── PKCE Helpers ────────────────────────────────────────────────

/**
 * Generate PKCE code_verifier and code_challenge (S256)
 */
export function generatePKCEChallenge(): {
  codeVerifier: string;
  codeChallenge: string;
} {
  // code_verifier: 43-128 chars from [A-Z, a-z, 0-9, -, ., _, ~]
  const codeVerifier = crypto.randomBytes(32).toString("base64url");

  // code_challenge: SHA-256 hash of verifier, base64url-encoded
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");

  return { codeVerifier, codeChallenge };
}

/**
 * Build the Garmin OAuth2 authorization URL
 */
export function buildAuthorizationUrl(
  codeChallenge: string,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: process.env.GARMIN_CLIENT_ID!,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    scope: "ACTIVITY_EXPORT WELLNESS_EXPORT BODY_COMPOSITION_EXPORT",
  });

  return `${GARMIN_AUTH_URL}?${params.toString()}`;
}

// ─── Token Management ────────────────────────────────────────────

/**
 * Exchange an authorization code for access and refresh tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<GarminTokenData> {
  const response = await fetch(GARMIN_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
      client_id: process.env.GARMIN_CLIENT_ID!,
      client_secret: process.env.GARMIN_CLIENT_SECRET!,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Garmin token exchange failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 7776000), // Default 90 days
    token_type: data.token_type || "Bearer",
  };
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<GarminTokenData> {
  const response = await fetch(GARMIN_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GARMIN_CLIENT_ID!,
      client_secret: process.env.GARMIN_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Garmin token refresh failed (${response.status}): ${errorText}`
    );
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 7776000),
    token_type: data.token_type || "Bearer",
  };
}

/**
 * Ensure the token is valid, refreshing if within 5 minutes of expiry
 */
export async function ensureValidToken(
  tokenData: GarminTokenData
): Promise<{ token: GarminTokenData; refreshed: boolean }> {
  const now = Math.floor(Date.now() / 1000);
  const bufferSeconds = 300; // 5 minutes

  if (tokenData.expires_at > now + bufferSeconds) {
    return { token: tokenData, refreshed: false };
  }

  const refreshed = await refreshAccessToken(tokenData.refresh_token);
  return { token: refreshed, refreshed: true };
}

// ─── Data Fetching ───────────────────────────────────────────────

/**
 * Fetch data from a Garmin wellness endpoint in 24-hour chunks
 * Garmin limits each request to a max 24-hour upload time window
 */
async function fetchGarminChunked<T>(
  endpoint: string,
  accessToken: string,
  startSeconds: number,
  endSeconds: number
): Promise<T[]> {
  const results: T[] = [];
  let windowStart = startSeconds;

  while (windowStart < endSeconds) {
    const windowEnd = Math.min(
      windowStart + MAX_QUERY_WINDOW_SECONDS,
      endSeconds
    );

    const url = `${GARMIN_API_BASE}/${endpoint}?uploadStartTimeInSeconds=${windowStart}&uploadEndTimeInSeconds=${windowEnd}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        results.push(...data);
      }
    } else if (response.status === 401) {
      throw new Error("Garmin token expired or revoked");
    }
    // For other errors (429, 500, etc.), skip the chunk and continue

    windowStart = windowEnd;
  }

  return results;
}

/**
 * Fetch recent activities from Garmin
 */
export async function getGarminActivities(
  accessToken: string,
  startSeconds: number,
  endSeconds: number
): Promise<GarminActivity[]> {
  return fetchGarminChunked<GarminActivity>(
    "activities",
    accessToken,
    startSeconds,
    endSeconds
  );
}

/**
 * Fetch daily summaries from Garmin
 */
export async function getGarminDailies(
  accessToken: string,
  startSeconds: number,
  endSeconds: number
): Promise<GarminDailySummary[]> {
  return fetchGarminChunked<GarminDailySummary>(
    "dailies",
    accessToken,
    startSeconds,
    endSeconds
  );
}

/**
 * Fetch body composition data from Garmin
 */
export async function getGarminBodyCompositions(
  accessToken: string,
  startSeconds: number,
  endSeconds: number
): Promise<GarminBodyComposition[]> {
  return fetchGarminChunked<GarminBodyComposition>(
    "bodyCompositions",
    accessToken,
    startSeconds,
    endSeconds
  );
}

// ─── Metrics Extraction ──────────────────────────────────────────

/**
 * Extract triathlon fitness metrics from Garmin data
 * Mirrors the Strava extraction logic in src/lib/strava.ts
 */
export function extractGarminFitnessMetrics(
  activities: GarminActivity[],
  dailies: GarminDailySummary[],
  bodyCompositions: GarminBodyComposition[]
): GarminFitnessMetrics {
  const metrics: GarminFitnessMetrics = {
    ftpWatts: null,
    thresholdPaceSec: null,
    cssPer100mSec: null,
    maxHr: null,
    restingHr: null,
    weightKg: null,
  };

  // ── FTP: Not available via Garmin Health API ──
  // Garmin doesn't expose power meter data through the Health/Activity API.
  // Users should enter FTP manually or sync from Strava.
  metrics.ftpWatts = null;

  // ── Threshold Pace: from fastest runs ──
  const runActivities = activities.filter(
    (a) => a.activityType === "RUNNING" && a.distanceInMeters > 0
  );
  if (runActivities.length > 0) {
    const sortedRuns = [...runActivities].sort(
      (a, b) => b.averageSpeedInMetersPerSecond - a.averageSpeedInMetersPerSecond
    );
    const topRuns = sortedRuns.slice(0, 3);
    const paces = topRuns.map((run) => {
      if (run.averagePaceInMinutesPerKilometer) {
        // Convert from decimal minutes/km to seconds/km
        return Math.round(run.averagePaceInMinutesPerKilometer * 60);
      }
      // Calculate from speed: pace (sec/km) = 1000 / speed (m/s)
      return Math.round(1000 / run.averageSpeedInMetersPerSecond);
    });
    metrics.thresholdPaceSec =
      Math.round(paces.reduce((a, b) => a + b, 0) / paces.length);
  }

  // ── CSS: from fastest swims ──
  const swimActivities = activities.filter(
    (a) =>
      (a.activityType === "LAP_SWIMMING" ||
        a.activityType === "OPEN_WATER_SWIMMING") &&
      a.distanceInMeters > 0 &&
      a.averageSpeedInMetersPerSecond > 0
  );
  if (swimActivities.length > 0) {
    const sortedSwims = [...swimActivities].sort(
      (a, b) => b.averageSpeedInMetersPerSecond - a.averageSpeedInMetersPerSecond
    );
    const topSwims = sortedSwims.slice(0, 3);
    const cssPaces = topSwims.map((swim) =>
      Math.round(100 / swim.averageSpeedInMetersPerSecond)
    );
    metrics.cssPer100mSec =
      Math.round(cssPaces.reduce((a, b) => a + b, 0) / cssPaces.length);
  }

  // ── Max HR: highest across all activities ──
  const heartRates = activities
    .filter((a) => a.maxHeartRateInBeatsPerMinute && a.maxHeartRateInBeatsPerMinute > 0)
    .map((a) => a.maxHeartRateInBeatsPerMinute!);
  if (heartRates.length > 0) {
    metrics.maxHr = Math.max(...heartRates);
  }

  // ── Resting HR: most recent daily summary ──
  const dailiesWithRhr = dailies
    .filter((d) => d.restingHeartRateInBeatsPerMinute && d.restingHeartRateInBeatsPerMinute > 0)
    .sort((a, b) => b.calendarDate.localeCompare(a.calendarDate));
  if (dailiesWithRhr.length > 0) {
    metrics.restingHr = dailiesWithRhr[0].restingHeartRateInBeatsPerMinute!;
  }

  // ── Weight: most recent body composition ──
  const bodyCompsWithWeight = bodyCompositions
    .filter((bc) => bc.weightInGrams && bc.weightInGrams > 0)
    .sort((a, b) => b.calendarDate.localeCompare(a.calendarDate));
  if (bodyCompsWithWeight.length > 0) {
    metrics.weightKg = Number(
      (bodyCompsWithWeight[0].weightInGrams! / 1000).toFixed(1)
    );
  }

  return metrics;
}
