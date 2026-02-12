import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/ridewithgps/search?q=ironman+dubai+bike&limit=10
 *
 * Proxy search to RideWithGPS. Returns matching trips/routes
 * with distance, elevation, and metadata for the user to pick from.
 * No auth required — RWGPS search is public.
 */

interface RwgpsResult {
  type: "trip" | "route";
  trip?: RwgpsItem;
  route?: RwgpsItem;
}

interface RwgpsItem {
  id: number;
  name: string;
  distance: number; // meters
  elevation_gain: number;
  elevation_loss: number;
  first_lat: number;
  first_lng: number;
  last_lat: number;
  last_lng: number;
  locality?: string;
  administrative_area?: string;
  country_code?: string;
  terrain?: string;
  difficulty?: string;
  created_at?: string;
  updated_at?: string;
  user?: { id: number; name: string };
  track_type?: string;
  activity_type?: string;
  description?: string;
  likes_count?: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20);
  const offset = parseInt(searchParams.get("offset") || "0");

  if (!query.trim()) {
    return NextResponse.json({ results: [], query: "", total: 0 });
  }

  try {
    const rwgpsUrl = new URL("https://ridewithgps.com/find/search.json");
    rwgpsUrl.searchParams.set("search[keywords]", query);
    rwgpsUrl.searchParams.set("search[limit]", String(limit));
    rwgpsUrl.searchParams.set("search[offset]", String(offset));

    const response = await fetch(rwgpsUrl.toString(), {
      headers: {
        "User-Agent": "RaceDayAI/1.0",
        Accept: "application/json",
      },
      // Cache for 1 hour — RWGPS results don't change fast
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "RideWithGPS search failed", status: response.status },
        { status: 502 },
      );
    }

    const data = await response.json();
    const rawResults: RwgpsResult[] = data.results || [];

    // Map to a cleaner format
    const results = rawResults
      .map((r) => {
        const item = r.type === "route" ? r.route : r.trip;
        if (!item) return null;

        return {
          id: item.id,
          type: r.type,
          name: item.name,
          distanceM: Math.round(item.distance),
          elevationGainM: Math.round(item.elevation_gain),
          elevationLossM: Math.round(item.elevation_loss || 0),
          startLat: item.first_lat,
          startLng: item.first_lng,
          locality: item.locality || null,
          region: item.administrative_area || null,
          country: item.country_code || null,
          terrain: item.terrain || null,
          difficulty: item.difficulty || null,
          trackType: item.track_type || null,
          userName: item.user?.name || null,
          // Build the GPX download URL
          gpxUrl:
            r.type === "route"
              ? `https://ridewithgps.com/routes/${item.id}.gpx?sub_format=track`
              : `https://ridewithgps.com/trips/${item.id}.gpx`,
          viewUrl:
            r.type === "route"
              ? `https://ridewithgps.com/routes/${item.id}`
              : `https://ridewithgps.com/trips/${item.id}`,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      results,
      query,
      total: data.results_count || results.length,
    });
  } catch (error) {
    console.error("RideWithGPS search error:", error);
    return NextResponse.json(
      { error: "Failed to search RideWithGPS" },
      { status: 500 },
    );
  }
}
