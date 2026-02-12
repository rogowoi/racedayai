import { NextRequest, NextResponse } from "next/server";
import { searchRaces } from "@/lib/race-registry";

/**
 * GET /api/races/search?q=dubai&limit=8
 *
 * Typeahead search for races in the curated registry.
 * No auth required — public data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 20);

  const results = searchRaces(query, limit);

  return NextResponse.json({
    races: results.map(({ race, score }) => ({
      id: race.id,
      name: race.name,
      series: race.series,
      distanceCategory: race.distanceCategory,
      location: race.location,
      country: race.country,
      latitude: race.latitude,
      longitude: race.longitude,
      swimDistanceM: race.swimDistanceM,
      bikeDistanceM: race.bikeDistanceM,
      runDistanceM: race.runDistanceM,
      bikeElevationGainM: race.bikeElevationGainM,
      runElevationGainM: race.runElevationGainM,
      hasGpx: !!(race.gpx.bikeUrl || race.gpx.runUrl),
      stats: race.stats,
      typicalMonth: race.typicalMonth,
      score,
    })),
    query,
  });
}
