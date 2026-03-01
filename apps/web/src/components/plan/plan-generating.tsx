"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RotateCcw, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

const generationSteps = [
  { key: "fitness", label: "Analyzing your fitness profile", progressKey: null },
  { key: "weather", label: "Fetching race-day weather forecast", progressKey: "weather" as const },
  { key: "pacing", label: "Calculating optimal pacing strategy", progressKey: "pacing" as const },
  { key: "nutrition", label: "Building nutrition timeline", progressKey: "nutrition" as const },
  { key: "narrative", label: "Generating race-day insights", progressKey: "narrative" as const },
];

// Minimum time (ms) each step should display before showing as complete
const MIN_STEP_DISPLAY = 2000;

export function PlanGenerating({ planId }: { planId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState(0);
  const stepTimers = useRef<Map<string, number>>(new Map());

  // Track when each step's progress becomes true with minimum display time
  useEffect(() => {
    if (!status?.progress) return;

    const now = Date.now();

    // First step ("fitness") completes immediately after a delay
    if (!stepTimers.current.has("fitness")) {
      stepTimers.current.set("fitness", now);
      setTimeout(() => {
        setCompletedSteps((prev) => new Set([...prev, "fitness"]));
      }, MIN_STEP_DISPLAY);
    }

    // Backend-driven steps
    for (const step of generationSteps) {
      if (!step.progressKey) continue;
      const done = status.progress[step.progressKey];
      if (done && !stepTimers.current.has(step.key)) {
        stepTimers.current.set(step.key, now);
        setTimeout(() => {
          setCompletedSteps((prev) => new Set([...prev, step.key]));
        }, MIN_STEP_DISPLAY);
      }
    }
  }, [status?.progress]);

  // Determine active step (first non-completed step)
  useEffect(() => {
    let idx = 0;
    for (let i = 0; i < generationSteps.length; i++) {
      if (completedSteps.has(generationSteps[i].key)) {
        idx = i + 1;
      } else {
        break;
      }
    }
    setActiveStep(Math.min(idx, generationSteps.length - 1));
  }, [completedSteps]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${planId}/status`);
      if (!res.ok) return;
      const data: StatusResponse = await res.json();
      setStatus(data);

      if (data.status === "completed") {
        // Small delay to let the final animation complete
        setTimeout(() => router.refresh(), 800);
      }
    } catch {
      // Ignore network errors, keep polling
    }
  }, [planId, router]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [poll]);

  const completedCount = completedSteps.size;
  const progressPercent = Math.round((completedCount / generationSteps.length) * 100);

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
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Building Your Race Plan</h2>
          <p className="text-sm text-muted-foreground">
            This usually takes 15-30 seconds
          </p>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">{progressPercent}%</p>
        </div>

        {/* Vertical stepper */}
        <div className="space-y-0">
          {generationSteps.map((step, i) => {
            const isCompleted = completedSteps.has(step.key);
            const isActive = i === activeStep && !isCompleted;

            return (
              <div key={step.key} className="flex items-start gap-3">
                {/* Step indicator column */}
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-500",
                      isCompleted && "bg-primary text-primary-foreground",
                      isActive && "bg-primary/20 text-primary",
                      !isCompleted && !isActive && "bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4 animate-in zoom-in duration-300" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-xs">{i + 1}</span>
                    )}
                  </div>
                  {/* Connector line */}
                  {i < generationSteps.length - 1 && (
                    <div
                      className={cn(
                        "w-px h-5 transition-colors duration-500",
                        isCompleted ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>

                {/* Step label */}
                <p
                  className={cn(
                    "text-sm pt-1 transition-colors duration-300",
                    isCompleted && "text-foreground",
                    isActive && "text-foreground font-medium",
                    !isCompleted && !isActive && "text-muted-foreground/50"
                  )}
                >
                  {step.label}
                  {isActive && (
                    <span className="inline-block animate-pulse">...</span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
