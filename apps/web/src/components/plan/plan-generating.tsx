"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatusResponse {
  status: "pending" | "generating" | "completed" | "failed";
  errorMessage: string | null;
  progress: {
    weather: boolean;
    pacing: boolean;
    nutrition: boolean;
    statistics: boolean;
    narrative: boolean;
  };
}

const statusMessages = [
  "Analyzing course profile...",
  "Fetching weather conditions...",
  "Calculating pacing targets...",
  "Crunching race statistics...",
  "Writing your race strategy...",
];

export function PlanGenerating({ planId }: { planId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  // Rotate status messages every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % statusMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update message based on actual progress
  useEffect(() => {
    if (!status?.progress) return;
    const { weather, pacing, nutrition, statistics, narrative } = status.progress;
    if (narrative) setMessageIndex(4);
    else if (statistics) setMessageIndex(4);
    else if (nutrition) setMessageIndex(3);
    else if (pacing) setMessageIndex(2);
    else if (weather) setMessageIndex(1);
  }, [status?.progress]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${planId}/status`);
      if (!res.ok) return;
      const data: StatusResponse = await res.json();
      setStatus(data);

      if (data.status === "completed") {
        router.refresh();
      }
    } catch {
      // Ignore network errors, keep polling
    }
  }, [planId, router]);

  useEffect(() => {
    poll(); // Initial fetch
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  if (status?.status === "failed") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold">Plan Generation Failed</h2>
          <p className="text-sm text-muted-foreground">
            {status.errorMessage || "Something went wrong. Please try again."}
          </p>
          <Button onClick={() => router.push("/wizard")} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Building Your Race Plan</h2>
          <p className="text-sm text-muted-foreground animate-pulse">
            {statusMessages[messageIndex]}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {statusMessages.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors duration-300 ${
                i <= messageIndex
                  ? "bg-primary"
                  : "bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          This usually takes 15-30 seconds
        </p>
      </div>
    </div>
  );
}
