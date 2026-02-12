import { NextRequest, NextResponse } from "next/server";
import { parseGpx } from "@/lib/engine/gpx";

/**
 * GET /api/ridewithgps/gpx?id=12345&type=route
 *
 * Fetch and parse GPX from a RideWithGPS trip or route.
 * Proxied to avoid CORS issues. Returns parsed course data.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "trip"; // "trip" or "route"

  if (!id) {
    return NextResponse.json(
      { error: "Missing id parameter" },
      { status: 400 },
    );
  }

  // Validate id is numeric
  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { error: "Invalid id format" },
      { status: 400 },
    );
  }

  const gpxUrl =
    type === "route"
      ? `https://ridewithgps.com/routes/${id}.gpx?sub_format=track`
      : `https://ridewithgps.com/trips/${id}.gpx`;

  try {
    const response = await fetch(gpxUrl, {
      headers: {
        "User-Agent": "RaceDayAI/1.0",
      },
    });

    if (!response.ok) {
      // RWGPS may require auth for some GPX downloads
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json({
          available: false,
          error: "auth_required",
          message:
            "This GPX file requires a RideWithGPS account. Try a different route.",
          viewUrl: `https://ridewithgps.com/${type}s/${id}`,
        });
      }
      return NextResponse.json(
        {
          available: false,
          error: "fetch_failed",
          message: `Failed to fetch GPX: ${response.status}`,
        },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") || "";
    // RWGPS might redirect to login page if auth required
    if (contentType.includes("text/html")) {
      return NextResponse.json({
        available: false,
        error: "auth_required",
        message:
          "This GPX file requires a RideWithGPS account. Try a different route.",
        viewUrl: `https://ridewithgps.com/${type}s/${id}`,
      });
    }

    const gpxText = await response.text();

    // Verify it's actually GPX content
    if (!gpxText.includes("<gpx") && !gpxText.includes("<trk")) {
      return NextResponse.json({
        available: false,
        error: "invalid_gpx",
        message: "The response was not a valid GPX file.",
      });
    }

    const courseData = parseGpx(gpxText);

    return NextResponse.json({
      available: true,
      source: "ridewithgps",
      rwgpsId: parseInt(id),
      rwgpsType: type,
      courseData: {
        name: courseData.name,
        totalDistanceM: courseData.totalDistanceM,
        elevationGainM: courseData.elevationGainM,
        pointCount: courseData.points.length,
        samplePoints: samplePoints(courseData.points, 100),
      },
    });
  } catch (error) {
    console.error("RideWithGPS GPX fetch error:", error);
    return NextResponse.json(
      { available: false, error: "fetch_error", message: "Error fetching GPX data" },
      { status: 500 },
    );
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
