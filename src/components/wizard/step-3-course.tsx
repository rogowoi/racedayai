"use client";

import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  Mountain,
  Route,
  AlertCircle,
  Search,
  ExternalLink,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { generateRacePlan } from "@/app/actions/generate-plan";
import { SubmitButton } from "@/components/ui/submit-button";

/* ─── Types ──────────────────────────────────────────────── */

interface GpxFallback {
  bikeDistanceM: number;
  runDistanceM: number;
  bikeElevationGainM: number | null;
  runElevationGainM: number | null;
}

interface GpxResponse {
  available: boolean;
  raceId: string;
  segment: string;
  source?: string;
  message?: string;
  courseData?: {
    totalDistanceM: number;
    elevationGainM: number;
    pointCount: number;
  };
  fallback?: GpxFallback;
}

interface RwgpsRoute {
  id: number;
  type: "trip" | "route";
  name: string;
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  startLat: number;
  startLng: number;
  locality: string | null;
  region: string | null;
  country: string | null;
  terrain: string | null;
  difficulty: string | null;
  trackType: string | null;
  userName: string | null;
  gpxUrl: string;
  viewUrl: string;
}

interface RwgpsGpxResponse {
  available: boolean;
  source?: string;
  rwgpsId?: number;
  rwgpsType?: string;
  error?: string;
  message?: string;
  viewUrl?: string;
  courseData?: {
    name: string;
    totalDistanceM: number;
    elevationGainM: number;
    pointCount: number;
  };
}

/* ─── Component ──────────────────────────────────────────── */

export function Step3Course() {
  const { fitnessData, raceData, setStep } = useWizardStore();
  const [fileName, setFileName] = useState<string | null>(null);

  // GPX auto-fetch state (from registry)
  const [gpxStatus, setGpxStatus] = useState<
    "idle" | "loading" | "loaded" | "unavailable" | "error"
  >("idle");
  const [gpxData, setGpxData] = useState<GpxResponse | null>(null);

  // RideWithGPS search state
  const [rwgpsQuery, setRwgpsQuery] = useState("");
  const [rwgpsResults, setRwgpsResults] = useState<RwgpsRoute[]>([]);
  const [rwgpsSearching, setRwgpsSearching] = useState(false);
  const [rwgpsSearched, setRwgpsSearched] = useState(false);
  const [rwgpsTotal, setRwgpsTotal] = useState(0);

  // RideWithGPS selected route & GPX fetch
  const [selectedRwgps, setSelectedRwgps] = useState<RwgpsRoute | null>(null);
  const [rwgpsGpxStatus, setRwgpsGpxStatus] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [rwgpsGpxData, setRwgpsGpxData] = useState<RwgpsGpxResponse | null>(
    null,
  );

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hasKnownRace = !!raceData.selectedRaceId;

  // Auto-fetch GPX when a known race with GPX is selected
  useEffect(() => {
    if (!hasKnownRace || !raceData.selectedRaceId) {
      setGpxStatus("idle");
      setGpxData(null);
      return;
    }

    async function fetchGpx() {
      setGpxStatus("loading");
      try {
        const res = await fetch(
          `/api/races/${raceData.selectedRaceId}/gpx?segment=bike`,
        );
        const data: GpxResponse = await res.json();

        setGpxData(data);
        setGpxStatus(data.available ? "loaded" : "unavailable");
      } catch {
        setGpxStatus("error");
      }
    }

    fetchGpx();
  }, [hasKnownRace, raceData.selectedRaceId]);

  // Pre-populate RWGPS search when a race is selected
  useEffect(() => {
    if (raceData.name && !rwgpsQuery) {
      // Build a search-friendly query: race name + "bike course"
      const q = `${raceData.name} bike course`.trim();
      setRwgpsQuery(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceData.name]);

  // Debounced RideWithGPS search
  const searchRwgps = useCallback(async (query: string) => {
    if (!query.trim()) {
      setRwgpsResults([]);
      setRwgpsSearched(false);
      setRwgpsTotal(0);
      return;
    }

    setRwgpsSearching(true);
    try {
      const res = await fetch(
        `/api/ridewithgps/search?q=${encodeURIComponent(query)}&limit=10`,
      );
      const data = await res.json();
      setRwgpsResults(data.results || []);
      setRwgpsTotal(data.total || 0);
      setRwgpsSearched(true);
    } catch {
      setRwgpsResults([]);
      setRwgpsSearched(true);
    } finally {
      setRwgpsSearching(false);
    }
  }, []);

  const handleRwgpsSearch = () => {
    searchRwgps(rwgpsQuery);
  };

  const handleRwgpsQueryChange = (value: string) => {
    setRwgpsQuery(value);
    // Debounce auto-search on typing
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim().length >= 3) {
        searchRwgps(value);
      }
    }, 500);
  };

  // Fetch GPX from selected RideWithGPS route
  const handleSelectRwgpsRoute = async (route: RwgpsRoute) => {
    setSelectedRwgps(route);
    setRwgpsGpxStatus("loading");

    try {
      const res = await fetch(
        `/api/ridewithgps/gpx?id=${route.id}&type=${route.type}`,
      );
      const data: RwgpsGpxResponse = await res.json();

      setRwgpsGpxData(data);
      setRwgpsGpxStatus(data.available ? "loaded" : "error");

      // Clear any manual upload when RWGPS route is selected
      if (data.available) {
        setFileName(null);
        setGpxStatus("idle");
        setGpxData(null);
      }
    } catch {
      setRwgpsGpxStatus("error");
      setRwgpsGpxData(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // If user uploads a GPX, that overrides auto-fetch and RWGPS
      setGpxStatus("idle");
      setGpxData(null);
      setSelectedRwgps(null);
      setRwgpsGpxStatus("idle");
      setRwgpsGpxData(null);
    }
  };

  // Format distance for display
  const formatDist = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${meters}m`;
  };

  // Determine which GPX source is active for the hidden field
  const activeGpxSource = (() => {
    if (fileName) return "upload";
    if (rwgpsGpxStatus === "loaded" && rwgpsGpxData?.available) return "rwgps";
    if (gpxStatus === "loaded" && gpxData?.available) return "registry";
    return "none";
  })();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Course Profile</h1>
        <p className="text-muted-foreground">
          {hasKnownRace
            ? "We have course data for your race. You can also search RideWithGPS or upload your own."
            : "Search RideWithGPS for your course or upload a GPX file."}
        </p>
      </div>

      <form action={generateRacePlan} className="space-y-6">
        {/* Hidden inputs for store data */}
        <input
          type="hidden"
          name="fitnessData"
          value={JSON.stringify(fitnessData)}
        />
        <input type="hidden" name="raceData" value={JSON.stringify(raceData)} />
        {/* Pass RWGPS GPX info so generate-plan can use it */}
        {activeGpxSource === "rwgps" && rwgpsGpxData?.courseData && (
          <input
            type="hidden"
            name="rwgpsCourseData"
            value={JSON.stringify({
              source: "ridewithgps",
              rwgpsId: rwgpsGpxData.rwgpsId,
              rwgpsType: rwgpsGpxData.rwgpsType,
              ...rwgpsGpxData.courseData,
            })}
          />
        )}

        <div className="space-y-4">
          {/* ───── Section 1: Auto-fetched course data for known races ───── */}
          {hasKnownRace && (
            <div className="space-y-3">
              {gpxStatus === "loading" && (
                <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30 animate-pulse">
                  <Loader2 className="h-5 w-5 text-primary animate-spin" />
                  <div>
                    <p className="text-sm font-medium">
                      Loading course data...
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Fetching elevation and distance profile for{" "}
                      {raceData.name}
                    </p>
                  </div>
                </div>
              )}

              {gpxStatus === "loaded" && gpxData?.courseData && (
                <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Course GPX loaded from {gpxData.source || "registry"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Route className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatDist(gpxData.courseData.totalDistanceM)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mountain className="h-4 w-4 text-muted-foreground" />
                      <span>{gpxData.courseData.elevationGainM}m elevation</span>
                    </div>
                  </div>
                </div>
              )}

              {(gpxStatus === "unavailable" || gpxStatus === "error") && (
                <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      No GPX file in our library yet
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                    Search RideWithGPS below to find this course, or upload your
                    own GPX.
                  </p>
                  {gpxData?.fallback && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Route className="h-4 w-4 text-muted-foreground" />
                        <span>
                          Bike: {formatDist(gpxData.fallback.bikeDistanceM)}
                        </span>
                      </div>
                      {gpxData.fallback.bikeElevationGainM && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mountain className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {gpxData.fallback.bikeElevationGainM}m elevation
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ───── Section 2: RideWithGPS Search ───── */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search RideWithGPS for Course
            </Label>

            <div className="flex gap-2">
              <Input
                value={rwgpsQuery}
                onChange={(e) => handleRwgpsQueryChange(e.target.value)}
                placeholder="e.g. IRONMAN Nice bike course"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRwgpsSearch();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRwgpsSearch}
                disabled={rwgpsSearching || !rwgpsQuery.trim()}
                className="shrink-0"
              >
                {rwgpsSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* RWGPS Selected Route — GPX loaded */}
            {rwgpsGpxStatus === "loaded" &&
              rwgpsGpxData?.available &&
              selectedRwgps && (
                <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      Course loaded from RideWithGPS
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 truncate">
                    {selectedRwgps.name}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Route className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {formatDist(
                          rwgpsGpxData.courseData!.totalDistanceM,
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mountain className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {rwgpsGpxData.courseData!.elevationGainM}m elevation
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
                    onClick={() => {
                      setSelectedRwgps(null);
                      setRwgpsGpxStatus("idle");
                      setRwgpsGpxData(null);
                    }}
                  >
                    Clear selection
                  </button>
                </div>
              )}

            {/* RWGPS GPX loading */}
            {rwgpsGpxStatus === "loading" && (
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30 animate-pulse">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <div>
                  <p className="text-sm font-medium">
                    Fetching course from RideWithGPS...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedRwgps?.name}
                  </p>
                </div>
              </div>
            )}

            {/* RWGPS GPX error */}
            {rwgpsGpxStatus === "error" && rwgpsGpxData && (
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {rwgpsGpxData.message ||
                    "Could not fetch GPX from this route."}
                </p>
                {rwgpsGpxData.viewUrl && (
                  <a
                    href={rwgpsGpxData.viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs underline text-amber-600 dark:text-amber-400 mt-1 inline-flex items-center gap-1"
                  >
                    View on RideWithGPS
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* RWGPS Search Results */}
            {rwgpsSearched &&
              rwgpsGpxStatus !== "loaded" &&
              rwgpsGpxStatus !== "loading" && (
                <div className="space-y-1">
                  {rwgpsResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No routes found. Try different keywords.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {rwgpsTotal.toLocaleString()} results — showing top{" "}
                        {rwgpsResults.length}
                      </p>
                      <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                        {rwgpsResults.map((route) => (
                          <button
                            key={`${route.type}-${route.id}`}
                            type="button"
                            onClick={() => handleSelectRwgpsRoute(route)}
                            className="w-full text-left p-3 hover:bg-muted/50 transition-colors focus:bg-muted/50 focus:outline-none"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {route.name}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Route className="h-3 w-3" />
                                    {formatDist(route.distanceM)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Mountain className="h-3 w-3" />
                                    {route.elevationGainM}m
                                  </span>
                                  {route.locality && (
                                    <span className="flex items-center gap-1 truncate">
                                      <MapPin className="h-3 w-3 shrink-0" />
                                      {route.locality}
                                      {route.region && `, ${route.region}`}
                                    </span>
                                  )}
                                </div>
                                {route.userName && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    by {route.userName}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                                  {route.type}
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
          </div>

          {/* ───── Section 3: Manual GPX Upload ───── */}
          <div className="space-y-2">
            <Label>
              {activeGpxSource !== "none"
                ? "Upload Custom GPX (Override)"
                : "Course GPX File (Optional)"}
            </Label>
            <div className="grid w-full items-center gap-1.5">
              <label
                htmlFor="gpx-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors border-muted-foreground/25 hover:border-primary/50"
              >
                <div className="flex flex-col items-center justify-center py-3">
                  {fileName ? (
                    <>
                      <FileText className="w-7 h-7 text-primary mb-1.5" />
                      <p className="mb-0.5 text-sm text-primary font-medium">
                        {fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click to change
                      </p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-7 h-7 text-muted-foreground mb-1.5" />
                      <p className="mb-0.5 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        GPX files only (max 10MB)
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="gpx-upload"
                  name="gpxFile"
                  type="file"
                  className="hidden"
                  accept=".gpx"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="pt-6 flex gap-3">
          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={() => setStep(2)}
          >
            Back
          </Button>
          <SubmitButton className="w-full" size="lg">
            Generate Plan
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
