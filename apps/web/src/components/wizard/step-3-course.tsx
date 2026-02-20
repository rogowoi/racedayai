"use client";

import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Loader2,
  Mountain,
  Route,
  AlertCircle,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ttqTrack } from "@/components/tiktok-pixel";

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

/* ─── Expected bike distances by category (meters) ─────── */

const EXPECTED_BIKE_M: Record<string, number> = {
  sprint: 20000,
  olympic: 40000,
  "70.3": 90000,
  "140.6": 180000,
};

/* ─── Component ──────────────────────────────────────────── */

export function Step3Course() {
  const {
    fitnessData,
    raceData,
    courseData,
    setStep,
    setCourseData,
    pendingGeneration,
    pendingGpxFileKey,
    setPendingGeneration,
  } = useWizardStore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    message: string;
    existingPlanId: string;
  } | null>(null);
  const gpxFileRef = useRef<HTMLInputElement>(null);

  // Extract persisted course data from store
  const {
    fileName,
    gpxStatus,
    gpxData,
    selectedRwgps,
    rwgpsGpxStatus,
    rwgpsGpxData,
  } = courseData;

  // Helper functions to update course data in store
  const setFileName = (fileName: string | null) =>
    setCourseData({ fileName });
  const setGpxStatus = (
    gpxStatus: "idle" | "loading" | "loaded" | "unavailable" | "error",
  ) => setCourseData({ gpxStatus });
  const setGpxData = (gpxData: GpxResponse | null) => setCourseData({ gpxData });
  const setSelectedRwgps = (selectedRwgps: RwgpsRoute | null) =>
    setCourseData({ selectedRwgps });
  const setRwgpsGpxStatus = (
    rwgpsGpxStatus: "idle" | "loading" | "loaded" | "error",
  ) => setCourseData({ rwgpsGpxStatus });
  const setRwgpsGpxData = (rwgpsGpxData: RwgpsGpxResponse | null) =>
    setCourseData({ rwgpsGpxData });

  // Auto-search state
  const [rwgpsAutoSearching, setRwgpsAutoSearching] = useState(false);
  const rwgpsAutoSearchedForRef = useRef<string | null>(null);

  const hasKnownRace = !!raceData.selectedRaceId;

  // Auto-generate plan after signup when pendingGeneration is set
  useEffect(() => {
    if (!pendingGeneration) return;

    async function autoGenerate() {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        // Rebuild RWGPS course data from persisted store state
        const rwgpsCourseData =
          rwgpsGpxData?.available && rwgpsGpxData?.courseData
            ? {
                source: "ridewithgps",
                rwgpsId: rwgpsGpxData.rwgpsId,
                rwgpsType: rwgpsGpxData.rwgpsType,
                ...rwgpsGpxData.courseData,
              }
            : selectedRwgps
              ? {
                  source: "ridewithgps",
                  rwgpsId: selectedRwgps.id,
                  rwgpsType: selectedRwgps.type,
                  totalDistanceM: selectedRwgps.distanceM,
                  elevationGainM: selectedRwgps.elevationGainM,
                }
              : null;

        const res = await fetch("/api/plans/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fitnessData,
            raceData,
            rwgpsCourseData,
            gpxFileKey: pendingGpxFileKey,
            ignoreDuplicate: true,
          }),
        });

        if (res.status === 401) {
          // Still not authenticated — show signup modal again
          setIsSubmitting(false);
          setShowSignupModal(true);
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to generate plan");
        }

        setPendingGeneration(false);
        const { planId } = await res.json();
        router.push(`/plan/${planId}`);
      } catch (err) {
        setPendingGeneration(false);
        setSubmitError(
          err instanceof Error ? err.message : "Something went wrong",
        );
        setIsSubmitting(false);
      }
    }

    autoGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGeneration]);

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

  // Auto-search RWGPS and select best match when registry GPX is unavailable
  useEffect(() => {
    // Skip if we already have course data from registry or RWGPS
    if (gpxStatus === "loaded" || selectedRwgps) return;
    // Skip if registry GPX is still loading
    if (hasKnownRace && gpxStatus === "loading") return;
    // Skip if no race name to search with
    if (!raceData.name) return;
    // Skip if already searched for this race
    if (rwgpsAutoSearchedForRef.current === raceData.name) return;
    rwgpsAutoSearchedForRef.current = raceData.name;

    async function autoSearchAndSelect() {
      setRwgpsAutoSearching(true);
      const query = `${raceData.name} bike course`.trim();

      try {
        const res = await fetch(
          `/api/ridewithgps/search?q=${encodeURIComponent(query)}&limit=10`,
        );
        const data = await res.json();
        const results: RwgpsRoute[] = data.results || [];
        if (results.length === 0) return;

        // Find best match by distance to expected bike distance
        const expectedM = EXPECTED_BIKE_M[raceData.distanceCategory];
        let bestRoute = results[0];
        if (expectedM) {
          bestRoute = results.reduce((best, route) =>
            Math.abs(route.distanceM - expectedM) < Math.abs(best.distanceM - expectedM)
              ? route
              : best,
          );
        }

        // Auto-select the best match (fetches GPX)
        handleSelectRwgpsRoute(bestRoute);
      } catch {
        // Silent fail — user still has manual GPX upload
      } finally {
        setRwgpsAutoSearching(false);
      }
    }

    autoSearchAndSelect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpxStatus, hasKnownRace, raceData.name, raceData.distanceCategory, selectedRwgps]);

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
    // Auth-required RWGPS routes can still provide metadata
    if (
      rwgpsGpxStatus === "error" &&
      rwgpsGpxData?.error === "auth_required" &&
      selectedRwgps
    )
      return "rwgps-metadata";
    if (gpxStatus === "loaded" && gpxData?.available) return "registry";
    return "none";
  })();

  const handleSubmit = async (e: React.FormEvent, ignoreDuplicate = false) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    setDuplicateWarning(null);

    ttqTrack("AddToCart", { content_name: "wizard_step3_generate" });

    try {
      // Upload GPX to R2 if user selected a file
      let gpxFileKey: string | null = null;
      const file = gpxFileRef.current?.files?.[0];
      if (file) {
        const urlRes = await fetch("/api/gpx/upload-url", { method: "POST" });
        if (!urlRes.ok) throw new Error("Failed to get upload URL");
        const { key, uploadUrl } = await urlRes.json();

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/gpx+xml" },
          body: file,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload GPX file");
        gpxFileKey = key;
      }

      // Build RWGPS course data if selected
      const rwgpsCourseData =
        activeGpxSource === "rwgps" && rwgpsGpxData?.courseData
          ? {
              source: "ridewithgps",
              rwgpsId: rwgpsGpxData.rwgpsId,
              rwgpsType: rwgpsGpxData.rwgpsType,
              ...rwgpsGpxData.courseData,
            }
          : activeGpxSource === "rwgps-metadata" && selectedRwgps
            ? {
                source: "ridewithgps",
                rwgpsId: selectedRwgps.id,
                rwgpsType: selectedRwgps.type,
                totalDistanceM: selectedRwgps.distanceM,
                elevationGainM: selectedRwgps.elevationGainM,
              }
            : null;

      const res = await fetch("/api/plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fitnessData,
          raceData,
          rwgpsCourseData,
          gpxFileKey,
          ignoreDuplicate,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Not authenticated — save state and show signup modal
        if (res.status === 401) {
          setPendingGeneration(true, gpxFileKey);
          setShowSignupModal(true);
          setIsSubmitting(false);
          return;
        }
        // Handle duplicate detection
        if (res.status === 409 && data.error === "duplicate") {
          setDuplicateWarning({
            message: data.message,
            existingPlanId: data.existingPlanId,
          });
          setIsSubmitting(false);
          return;
        }
        throw new Error(data.error || "Failed to generate plan");
      }

      const { planId } = await res.json();
      router.push(`/plan/${planId}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong",
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Course Profile</h1>
        <p className="text-muted-foreground">
          {hasKnownRace && gpxStatus === "loaded"
            ? "We have course data for your race. You can also search RideWithGPS or upload your own."
            : hasKnownRace && gpxStatus === "loading"
              ? "Checking course data for your race..."
              : "Search RideWithGPS for your course or upload a GPX file."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

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

          {/* ───── Section 2: Auto-fetched RideWithGPS course ───── */}
          <div className="space-y-3">
            {/* Auto-searching RWGPS */}
            {(rwgpsAutoSearching || rwgpsGpxStatus === "loading") && !selectedRwgps && (
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30 animate-pulse">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <div>
                  <p className="text-sm font-medium">
                    Finding course data...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Searching RideWithGPS for {raceData.name}
                  </p>
                </div>
              </div>
            )}

            {/* RWGPS GPX loading for selected route */}
            {rwgpsGpxStatus === "loading" && selectedRwgps && (
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30 animate-pulse">
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                <div>
                  <p className="text-sm font-medium">
                    Loading course data...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedRwgps.name}
                  </p>
                </div>
              </div>
            )}

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
                </div>
              )}

            {/* RWGPS metadata fallback — show as success card */}
            {rwgpsGpxStatus === "error" && selectedRwgps && rwgpsGpxData?.error === "auth_required" && (
              <div className="p-4 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Course data found
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-2 truncate">
                  {selectedRwgps.name}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Route className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDist(selectedRwgps.distanceM)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mountain className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedRwgps.elevationGainM}m elevation</span>
                  </div>
                </div>
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
                  ref={gpxFileRef}
                  id="gpx-upload"
                  type="file"
                  className="hidden"
                  accept=".gpx"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        </div>

        {duplicateWarning && (
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 space-y-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  Duplicate Plan Detected
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">
                  {duplicateWarning.message}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/plan/${duplicateWarning.existingPlanId}`)}
              >
                View Existing Plan
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={(e) => handleSubmit(e as any, true)}
                disabled={isSubmitting}
              >
                Create Anyway
              </Button>
            </div>
          </div>
        )}

        {submitError && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  {submitError}
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80">
                  {submitError.includes("Unauthorized")
                    ? "Please sign in to generate a race plan."
                    : submitError.includes("limit")
                      ? <>
                          <Link href="/pricing" className="underline hover:text-red-700 dark:hover:text-red-300 font-medium">
                            Upgrade your plan
                          </Link>{" "}
                          to create more race plans.
                        </>
                      : "Check your connection and try again. If the issue persists, try refreshing the page."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 flex flex-col sm:flex-row gap-3 [&_button]:shrink [&_button]:min-w-0">
          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={() => setStep(2)}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Plan...
              </>
            ) : (
              "Generate Plan"
            )}
          </Button>
        </div>
      </form>

      {showSignupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h2 className="text-xl font-bold">Create your free account</h2>
            <p className="text-muted-foreground">
              Your race plan is being prepared. Sign up to see your personalized
              results — it takes 30 seconds.
            </p>
            <div className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link
                  href={`/signup?callbackUrl=${encodeURIComponent("/wizard")}`}
                >
                  Sign Up — Free
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link
                  href={`/login?callbackUrl=${encodeURIComponent("/wizard")}`}
                >
                  I already have an account
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Free for your first race plan · No credit card required
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
