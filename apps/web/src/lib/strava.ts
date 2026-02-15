/**
 * Strava API client for fetching athlete data and activities
 * Uses Strava API v3: https://www.strava.com/api/v3
 */

import { prisma } from "@/lib/db";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

// ─── Types ──────────────────────────────────────────────────────

interface StravaAthlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  profile_medium: string;
  profile: string;
  city: string;
  state: string;
  country: string;
  sex: string;
  summit: boolean;
  created_at: string;
  updated_at: string;
  badge_type_id: number;
  weight: number;
  friend: string;
  follower: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: string;
  start_date: string;
  timezone: string;
  utc_offset: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  has_heartrate: boolean;
  polyline_map?: {
    id: string;
    summary_polyline: string;
    resource_state: number;
  };
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  flagged: boolean;
  workout_type?: number;
  upload_id?: number;
  resource_state: number;
  external_id: string;
}

interface StravaZoneRange {
  min: number;
  max: number;
}

interface StravaZones {
  heart_rate?: {
    custom_zones: boolean;
    zones: StravaZoneRange[];
  };
  power?: {
    zones: StravaZoneRange[];
  };
}

export interface StravaTokenData {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
}

export interface FitnessMetrics {
  ftpWatts: number | null;
  ftpSource: "zones" | "power_data" | null;
  thresholdPaceSec: number | null;
  cssPer100mSec: number | null;
  maxHr: number | null;
  weightKg: number | null;
  gender: "M" | "F" | null;
  activitiesAnalyzed: number;
  hasPowerMeter: boolean;
}

// ─── Token Refresh ──────────────────────────────────────────────

/**
 * Get a valid Strava access token, refreshing if expired.
 * Updates the DB with the new token if refreshed.
 */
export async function getValidStravaToken(
  athleteId: string,
  tokenData: StravaTokenData
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // If token is still valid (with 5-minute buffer), return as-is
  if (tokenData.expires_at && tokenData.expires_at > now + 300) {
    return tokenData.access_token;
  }

  // Token expired or about to expire — refresh it
  if (!tokenData.refresh_token) {
    throw new Error("No refresh token available — user must re-authenticate with Strava");
  }

  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: tokenData.refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Strava token refresh failed: ${response.status} ${response.statusText}`);
  }

  const newToken = await response.json();
  const updatedTokenData: StravaTokenData = {
    access_token: newToken.access_token,
    refresh_token: newToken.refresh_token,
    expires_at: newToken.expires_at,
    token_type: newToken.token_type || "Bearer",
  };

  // Persist the refreshed token
  await prisma.athlete.update({
    where: { id: athleteId },
    data: { stravaToken: updatedTokenData as any },
  });

  return updatedTokenData.access_token;
}

// ─── API Endpoints ──────────────────────────────────────────────

/**
 * Fetch athlete profile from Strava API
 */
export async function getStravaProfile(
  accessToken: string
): Promise<StravaAthlete> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch athlete HR and power zones from Strava API
 */
export async function getStravaZones(
  accessToken: string
): Promise<StravaZones> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete/zones`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    // Zones may not be available for all athletes — return empty
    return {};
  }

  return response.json();
}

/**
 * Fetch recent activities from Strava API (last 12 weeks, up to 100)
 */
export async function getStravaActivities(
  accessToken: string,
  perPage = 100
): Promise<StravaActivity[]> {
  // Fetch activities from the last 12 weeks
  const twelveWeeksAgo = Math.floor(Date.now() / 1000) - 12 * 7 * 24 * 60 * 60;

  const response = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?per_page=${perPage}&page=1&after=${twelveWeeksAgo}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ─── Metric Estimation ──────────────────────────────────────────

/**
 * Calculate recency weight for an activity.
 * Activities in the last 4 weeks get 2x weight, older ones get 1x.
 */
function recencyWeight(startDate: string): number {
  const activityDate = new Date(startDate).getTime();
  const fourWeeksAgo = Date.now() - 4 * 7 * 24 * 60 * 60 * 1000;
  return activityDate >= fourWeeksAgo ? 2 : 1;
}

/**
 * Compute a weighted average given values and weights.
 */
function weightedAverage(values: number[], weights: number[]): number {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) return 0;
  const sum = values.reduce((acc, val, i) => acc + val * weights[i], 0);
  return sum / totalWeight;
}

/**
 * Extract FTP from Strava power zones.
 * Zone 4 lower bound = FTP (standard power zone model).
 */
function extractFtpFromZones(zones: StravaZones): number | null {
  if (!zones.power?.zones || zones.power.zones.length < 4) return null;

  // Zone 4 (0-indexed: index 3) lower bound = FTP
  const zone4 = zones.power.zones[3];
  if (zone4?.min && zone4.min > 50) {
    return zone4.min;
  }
  return null;
}

/**
 * Estimate FTP from ride power data with smart filtering.
 */
function estimateFtpFromRides(activities: StravaActivity[]): {
  ftp: number | null;
  hasPowerMeter: boolean;
} {
  const bikeRides = activities.filter(
    (a) =>
      (a.sport_type === "Ride" || a.type === "Ride") &&
      a.moving_time > 30 * 60 && // > 30 minutes
      a.weighted_average_watts &&
      a.weighted_average_watts > 0 &&
      a.device_watts === true // Real power meter data only
  );

  if (bikeRides.length === 0) {
    // Check if there are any rides with power (even short ones) to detect power meter
    const anyPowerRide = activities.some(
      (a) =>
        (a.sport_type === "Ride" || a.type === "Ride") &&
        a.device_watts === true &&
        a.weighted_average_watts &&
        a.weighted_average_watts > 0
    );
    return { ftp: null, hasPowerMeter: anyPowerRide };
  }

  // Sort by weighted power descending, take top 5
  const topRides = [...bikeRides]
    .sort((a, b) => (b.weighted_average_watts || 0) - (a.weighted_average_watts || 0))
    .slice(0, 5);

  const powers = topRides.map((a) => a.weighted_average_watts!);
  const weights = topRides.map((a) => recencyWeight(a.start_date));

  // Weighted average of top rides' normalized power ≈ 95% of FTP
  // This is closer to 20-min power than the old mean/0.85 approach
  const avgPower = weightedAverage(powers, weights);
  const ftp = Math.round(avgPower / 0.95);

  return { ftp, hasPowerMeter: true };
}

/**
 * Estimate threshold run pace from activities with smart filtering.
 */
function estimateThresholdPace(
  activities: StravaActivity[],
  maxHr: number | null
): number | null {
  const runs = activities.filter(
    (a) =>
      (a.sport_type === "Run" || a.type === "Run") &&
      a.distance >= 3000 && // 3km minimum
      a.distance <= 15000 && // 15km maximum
      a.moving_time > 15 * 60 && // > 15 minutes
      a.average_speed > 0
  );

  let qualifying = runs;

  // If we have HR data and max HR, prefer hard efforts (avg HR > 85% max)
  if (maxHr && maxHr > 0) {
    const hardRuns = runs.filter(
      (a) => a.average_heartrate && a.average_heartrate > maxHr * 0.85
    );
    if (hardRuns.length >= 3) {
      qualifying = hardRuns;
    }
  }

  // Fallback: relax distance filter if too few qualifying runs
  if (qualifying.length < 3) {
    qualifying = activities.filter(
      (a) =>
        (a.sport_type === "Run" || a.type === "Run") &&
        a.distance >= 2000 &&
        a.distance <= 21000 &&
        a.moving_time > 10 * 60 &&
        a.average_speed > 0
    );
  }

  if (qualifying.length === 0) return null;

  // Sort by speed descending, take top 5
  const topRuns = [...qualifying]
    .sort((a, b) => b.average_speed - a.average_speed)
    .slice(0, 5);

  const paces = topRuns.map((a) => 1000 / a.average_speed); // sec/km
  const weights = topRuns.map((a) => recencyWeight(a.start_date));

  return Math.round(weightedAverage(paces, weights));
}

/**
 * Estimate CSS (Critical Swim Speed) from swim activities.
 */
function estimateCss(activities: StravaActivity[]): number | null {
  let swims = activities.filter(
    (a) =>
      (a.sport_type === "Swim" || a.type === "Swim") &&
      a.distance >= 200 && // 200m minimum (pool set)
      a.distance <= 2000 && // 2000m maximum
      a.moving_time > 3 * 60 && // > 3 minutes
      a.average_speed > 0
  );

  // Fallback: use all swims if too few qualifying
  if (swims.length < 3) {
    swims = activities.filter(
      (a) =>
        (a.sport_type === "Swim" || a.type === "Swim") &&
        a.distance > 0 &&
        a.average_speed > 0
    );
  }

  if (swims.length === 0) return null;

  // Sort by speed descending, take top 5
  const topSwims = [...swims]
    .sort((a, b) => b.average_speed - a.average_speed)
    .slice(0, 5);

  const paces = topSwims.map((a) => 100 / a.average_speed); // sec/100m
  const weights = topSwims.map((a) => recencyWeight(a.start_date));

  return Math.round(weightedAverage(paces, weights));
}

/**
 * Extract max heart rate from ALL activity types.
 */
function extractMaxHr(activities: StravaActivity[]): number | null {
  const heartRates = activities
    .filter((a) => a.max_heartrate && a.max_heartrate > 0)
    .map((a) => a.max_heartrate!);

  if (heartRates.length === 0) return null;
  return Math.max(...heartRates);
}

// ─── Main Extraction ────────────────────────────────────────────

/**
 * Extract fitness metrics from activities and optional power zones.
 * Uses smart filtering: distance, duration, recency weighting, and HR awareness.
 */
export function extractFitnessMetrics(
  activities: StravaActivity[],
  zones?: StravaZones,
  profile?: StravaAthlete | null
): FitnessMetrics {
  const metrics: FitnessMetrics = {
    ftpWatts: null,
    ftpSource: null,
    thresholdPaceSec: null,
    cssPer100mSec: null,
    maxHr: null,
    weightKg: null,
    gender: null,
    activitiesAnalyzed: activities?.length ?? 0,
    hasPowerMeter: false,
  };

  if (!activities || activities.length === 0) {
    return metrics;
  }

  // Max HR first (used by threshold pace estimation)
  metrics.maxHr = extractMaxHr(activities);

  // FTP: prefer zones, fallback to ride data
  if (zones) {
    const zoneFtp = extractFtpFromZones(zones);
    if (zoneFtp) {
      metrics.ftpWatts = zoneFtp;
      metrics.ftpSource = "zones";
      metrics.hasPowerMeter = true;
    }
  }

  if (!metrics.ftpWatts) {
    const { ftp, hasPowerMeter } = estimateFtpFromRides(activities);
    if (ftp) {
      metrics.ftpWatts = ftp;
      metrics.ftpSource = "power_data";
    }
    metrics.hasPowerMeter = hasPowerMeter;
  }

  // Threshold pace (uses maxHr for HR-aware filtering)
  metrics.thresholdPaceSec = estimateThresholdPace(activities, metrics.maxHr);

  // CSS
  metrics.cssPer100mSec = estimateCss(activities);

  // Weight and gender from profile
  if (profile) {
    if (profile.weight && profile.weight > 0) {
      metrics.weightKg = Math.round(profile.weight * 10) / 10;
    }
    if (profile.sex === "M" || profile.sex === "F") {
      metrics.gender = profile.sex;
    }
  }

  return metrics;
}
