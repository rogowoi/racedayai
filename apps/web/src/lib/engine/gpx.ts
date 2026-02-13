import { XMLParser } from "fast-xml-parser";

export type GpxPoint = {
  lat: number;
  lon: number;
  ele: number;
  time?: string;
  distFromStart: number; // accumulated distance in meters
};

export type CourseData = {
  name?: string;
  totalDistanceM: number;
  elevationGainM: number;
  points: GpxPoint[];
};

export function parseGpx(gpxContent: string): CourseData {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const result = parser.parse(gpxContent);

  const trk = result.gpx?.trk;
  const name = trk?.name || "Unknown Course";

  // Handle single or multiple segments
  let segments = [];
  if (Array.isArray(trk?.trkseg)) {
    segments = trk.trkseg;
  } else if (trk?.trkseg) {
    segments = [trk.trkseg];
  }

  // Flatten points
  let rawPoints: any[] = [];
  segments.forEach((seg: any) => {
    if (Array.isArray(seg.trkpt)) {
      rawPoints = rawPoints.concat(seg.trkpt);
    } else if (seg.trkpt) {
      rawPoints.push(seg.trkpt);
    }
  });

  // Process points
  let totalDistance = 0;
  let elevationGain = 0;
  const points: GpxPoint[] = [];

  for (let i = 0; i < rawPoints.length; i++) {
    const pt = rawPoints[i];
    const lat = parseFloat(pt["@_lat"]);
    const lon = parseFloat(pt["@_lon"]);
    const ele = parseFloat(pt.ele || 0);

    let dist = 0;
    if (i > 0) {
      const prev = points[i - 1];
      dist = haversine(prev.lat, prev.lon, lat, lon);
      totalDistance += dist;

      const eleDiff = ele - prev.ele;
      if (eleDiff > 0) {
        elevationGain += eleDiff;
      }
    }

    points.push({
      lat,
      lon,
      ele,
      time: pt.time,
      distFromStart: i === 0 ? 0 : points[i - 1].distFromStart + dist,
    });
  }

  return {
    name,
    totalDistanceM: Math.round(totalDistance),
    elevationGainM: Math.round(elevationGain),
    points,
  };
}

// Helper: Haversine distance in meters
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(dLambda / 2) *
      Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
