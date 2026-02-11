/**
 * Strava API client for fetching athlete data and activities
 * Uses Strava API v3: https://www.strava.com/api/v3
 */

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

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

interface StravaActivity {
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

interface FitnessMetrics {
  ftpWatts: number | null;
  thresholdPaceSec: number | null;
  cssPer100mSec: number | null;
  maxHr: number | null;
}

export interface StravaTokenData {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
}

/**
 * Fetch athlete profile from Strava API
 */
export async function getStravaProfile(
  accessToken: string
): Promise<StravaAthlete> {
  const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Strava API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Fetch recent activities from Strava API
 */
export async function getStravaActivities(
  accessToken: string,
  perPage = 10
): Promise<StravaActivity[]> {
  const response = await fetch(
    `${STRAVA_API_BASE}/athlete/activities?per_page=${perPage}&page=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Strava API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Extract fitness metrics from activities
 * Analyzes power data for FTP estimate, pace for threshold pace, and swim speed for CSS
 */
export function extractFitnessMetrics(activities: StravaActivity[]): FitnessMetrics {
  const metrics: FitnessMetrics = {
    ftpWatts: null,
    thresholdPaceSec: null,
    cssPer100mSec: null,
    maxHr: null,
  };

  if (!activities || activities.length === 0) {
    return metrics;
  }

  // Extract bike metrics (FTP estimate from weighted average watts)
  const bikeActivities = activities.filter(
    (a) => a.sport_type === "Ride" || a.type === "Ride"
  );
  if (bikeActivities.length > 0) {
    // Use weighted average watts from recent ride as FTP estimate
    // This is conservative - actual FTP would be 95% of 20-min power
    const weightedPowers = bikeActivities
      .filter((a) => a.weighted_average_watts && a.weighted_average_watts > 0)
      .map((a) => a.weighted_average_watts || 0);

    if (weightedPowers.length > 0) {
      // Take average of recent rides' weighted power, scale to FTP estimate
      const avgWeightedPower =
        weightedPowers.reduce((a, b) => a + b, 0) / weightedPowers.length;
      // Conservative estimate: assume this is ~85% of FTP
      metrics.ftpWatts = Math.round(avgWeightedPower / 0.85);
    }

    // Extract max heart rate from bike rides
    const maxHr = Math.max(
      ...bikeActivities
        .filter((a) => a.max_heartrate)
        .map((a) => a.max_heartrate || 0)
    );
    if (maxHr > 0) {
      metrics.maxHr = maxHr;
    }
  }

  // Extract run metrics (threshold pace from faster runs)
  const runActivities = activities.filter(
    (a) => a.sport_type === "Run" || a.type === "Run"
  );
  if (runActivities.length > 0) {
    // Find faster runs (could be threshold pace efforts)
    // Sort by average speed descending
    const sortedRuns = [...runActivities].sort(
      (a, b) => b.average_speed - a.average_speed
    );

    // Take 3 fastest runs and average them for threshold pace
    const recentFastRuns = sortedRuns.slice(0, 3);
    const avgSpeeds = recentFastRuns
      .filter((a) => a.distance > 0)
      .map((a) => a.average_speed);

    if (avgSpeeds.length > 0) {
      // Average speed in m/s
      const avgSpeed = avgSpeeds.reduce((a, b) => a + b, 0) / avgSpeeds.length;
      // Convert to pace per km in seconds
      // pace (sec/km) = 1000 / speed (m/s)
      const pacePerKm = 1000 / avgSpeed;
      metrics.thresholdPaceSec = Math.round(pacePerKm);
    }
  }

  // Extract swim metrics (CSS from recent swims)
  const swimActivities = activities.filter(
    (a) => a.sport_type === "Swim" || a.type === "Swim"
  );
  if (swimActivities.length > 0) {
    // Average the fastest swims for CSS estimate
    const sortedSwims = [...swimActivities].sort(
      (a, b) => b.average_speed - a.average_speed
    );
    const recentFastSwims = sortedSwims.slice(0, 3);
    const avgSpeeds = recentFastSwims
      .filter((a) => a.distance > 0)
      .map((a) => a.average_speed);

    if (avgSpeeds.length > 0) {
      // Average speed in m/s
      const avgSpeed = avgSpeeds.reduce((a, b) => a + b, 0) / avgSpeeds.length;
      // Convert to pace per 100m in seconds
      // pace (sec/100m) = 100 / speed (m/s)
      const cssPace = 100 / avgSpeed;
      metrics.cssPer100mSec = Math.round(cssPace);
    }
  }

  return metrics;
}
