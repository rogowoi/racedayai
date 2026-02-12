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
import { useState, useEffect } from "react";
import { generateRacePlan } from "@/app/actions/generate-plan";
import { SubmitButton } from "@/components/ui/submit-button";

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

export function Step3Course() {
  const { fitnessData, raceData, setStep } = useWizardStore();
  const [fileName, setFileName] = useState<string | null>(null);

  // GPX auto-fetch state
  const [gpxStatus, setGpxStatus] = useState<
    "idle" | "loading" | "loaded" | "unavailable" | "error"
  >("idle");
  const [gpxData, setGpxData] = useState<GpxResponse | null>(null);

  const hasKnownRace = !!raceData.selectedRaceId;
  const hasGpxAvailable = raceData.hasGpx;

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // If user uploads a GPX, that overrides auto-fetch
      setGpxStatus("idle");
      setGpxData(null);
    }
  };

  // Format distance for display
  const formatDist = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${meters}m`;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Course Profile</h1>
        <p className="text-muted-foreground">
          {hasKnownRace
            ? "We have course data for your race. You can also upload your own GPX."
            : "Upload a GPX file to get segment-specific power analysis."}
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

        <div className="space-y-4">
          {/* Auto-fetched course data for known races */}
          {hasKnownRace && (
            <div className="space-y-3">
              {/* Loading state */}
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

              {/* GPX loaded successfully */}
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

              {/* Known race but no GPX — show known elevation data */}
              {(gpxStatus === "unavailable" || gpxStatus === "error") && (
                <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Course data from race registry
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
                    No GPX file available yet. Using known course metrics.
                    Upload your own GPX below for more precision.
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

          {/* Manual GPX Upload */}
          <div className="space-y-2">
            <Label>
              {hasKnownRace
                ? "Upload Custom GPX (Override)"
                : "Course GPX File (Optional)"}
            </Label>
            <div className="grid w-full items-center gap-1.5">
              <label
                htmlFor="gpx-upload"
                className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors border-muted-foreground/25 hover:border-primary/50"
              >
                <div className="flex flex-col items-center justify-center py-4">
                  {fileName ? (
                    <>
                      <FileText className="w-8 h-8 text-primary mb-2" />
                      <p className="mb-1 text-sm text-primary font-medium">
                        {fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click to change
                      </p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="mb-1 text-sm text-muted-foreground">
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
