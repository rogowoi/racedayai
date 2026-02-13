import { NextRequest, NextResponse } from "next/server";
import { getRaceById } from "@/lib/race-registry";
import { parseGpx } from "@/lib/engine/gpx";

/**
 * GET /api/races/[id]/gpx?segment=bike
 *
 * Fetch and parse GPX course data for a registry race.
 * Returns parsed CourseData (distance, elevation, points) if available.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const segment = request.nextUrl.searchParams.get("segment") || "bike";

  const race = getRaceById(id);
  if (!race) {
    return NextResponse.json({ error: "Race not found" }, { status: 404 });
  }

  const gpxUrl =
    segment === "run" ? race.gpx.runUrl : race.gpx.bikeUrl;

  if (!gpxUrl) {
    return NextResponse.json({
      available: false,
      raceId: id,
      segment,
      message: "No GPX file available for this race course yet.",
      // Return the known elevation/distance from registry as fallback
      fallback: {
        bikeDistanceM: race.bikeDistanceM,
        runDistanceM: race.runDistanceM,
        bikeElevationGainM: race.bikeElevationGainM,
        runElevationGainM: race.runElevationGainM,
      },
    });
  }

  try {
    // Fetch the GPX file from the stored URL
    const response = await fetch(gpxUrl, {
      headers: { "User-Agent": "RaceDayAI/1.0" },
    });

    if (!response.ok) {
      return NextResponse.json({
        available: false,
        raceId: id,
        segment,
        message: `Failed to fetch GPX: ${response.status}`,
        fallback: {
          bikeDistanceM: race.bikeDistanceM,
          runDistanceM: race.runDistanceM,
          bikeElevationGainM: race.bikeElevationGainM,
          runElevationGainM: race.runElevationGainM,
        },
      });
    }

    const gpxText = await response.text();
    const courseData = parseGpx(gpxText);

    return NextResponse.json({
      available: true,
      raceId: id,
      segment,
      source: race.gpx.source,
      courseData: {
        totalDistanceM: courseData.totalDistanceM,
        elevationGainM: courseData.elevationGainM,
        pointCount: courseData.points.length,
        // Don't send all points in the response (too large)
        // Send a sampled subset for visualization
        samplePoints: samplePoints(courseData.points, 100),
      },
    });
  } catch (error) {
    return NextResponse.json({
      available: false,
      raceId: id,
      segment,
      message: "Error fetching GPX data",
      fallback: {
        bikeDistanceM: race.bikeDistanceM,
        runDistanceM: race.runDistanceM,
        bikeElevationGainM: race.bikeElevationGainM,
        runElevationGainM: race.runElevationGainM,
      },
    });
  }
}

/** Sample N evenly-spaced points from an array */
function samplePoints<T>(points: T[], n: number): T[] {
  if (points.length <= n) return points;
  const step = points.length / n;
  const sampled: T[] = [];
  for (let i = 0; i < n; i++) {
    sampled.push(points[Math.floor(i * step)]);
  }
  return sampled;
}
