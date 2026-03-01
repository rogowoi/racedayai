"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StepData {
  step: string;
  viewed: number;
  completed: number;
  skipped: number;
}

interface FunnelData {
  steps: StepData[];
  totalSessions: number;
  periodDays: number;
}

const STEP_LABELS: Record<string, string> = {
  quiz_0: "Quiz: Distance",
  quiz_1: "Quiz: Goal",
  quiz_2: "Quiz: Experience",
  wizard_1: "Wizard: Fitness",
  wizard_2: "Wizard: Race",
  wizard_3: "Wizard: Course",
  plan_generated: "Plan Generated",
};

const PERIOD_OPTIONS = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export function FunnelDashboardClient() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  async function loadData(period: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/funnel?days=${period}`);
      if (!res.ok) throw new Error("Failed to load funnel data");
      setData(await res.json());
    } catch {
      toast.error("Failed to load funnel data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(days);
  }, [days]);

  const firstViewed = data?.steps[0]?.viewed || 0;
  const lastCompleted =
    data?.steps[data.steps.length - 1]?.completed || 0;
  const completionRate =
    firstViewed > 0 ? Math.round((lastCompleted / firstViewed) * 100) : 0;

  // Find biggest drop-off
  let biggestDropStep = "";
  let biggestDropPct = 0;
  if (data) {
    for (let i = 1; i < data.steps.length; i++) {
      const prev = data.steps[i - 1].viewed;
      const curr = data.steps[i].viewed;
      if (prev > 0) {
        const drop = Math.round(((prev - curr) / prev) * 100);
        if (drop > biggestDropPct) {
          biggestDropPct = drop;
          biggestDropStep = STEP_LABELS[data.steps[i].step] || data.steps[i].step;
        }
      }
    }
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Funnel Analytics</h1>
        <div className="flex gap-1 rounded-lg border p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                days === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                Total Sessions
              </div>
              <div className="text-3xl font-bold mt-1">
                {data.totalSessions}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                Completion Rate
              </div>
              <div className="text-3xl font-bold mt-1">{completionRate}%</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Quiz start → Plan generated
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="text-sm text-muted-foreground">
                Biggest Drop-off
              </div>
              <div className="text-3xl font-bold mt-1 text-red-500">
                {biggestDropPct > 0 ? `-${biggestDropPct}%` : "—"}
              </div>
              {biggestDropStep && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {biggestDropStep}
                </div>
              )}
            </div>
          </div>

          {/* Funnel bars */}
          <div className="rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-6">
              Step-by-Step Funnel
            </h2>
            <div className="space-y-4">
              {data.steps.map((step, i) => {
                const maxViewed = data.steps[0]?.viewed || 1;
                const prevViewed =
                  i > 0 ? data.steps[i - 1].viewed : step.viewed;
                const dropOff =
                  prevViewed > 0
                    ? Math.round(
                        ((prevViewed - step.viewed) / prevViewed) * 100
                      )
                    : 0;
                const barWidth = Math.max(
                  (step.viewed / maxViewed) * 100,
                  2
                );

                return (
                  <div key={step.step}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">
                        {STEP_LABELS[step.step] || step.step}
                      </span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{step.viewed} viewed</span>
                        {step.completed > 0 && (
                          <span className="text-green-600">
                            {step.completed} completed
                          </span>
                        )}
                        {step.skipped > 0 && (
                          <span className="text-yellow-600">
                            {step.skipped} skipped
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="w-14 text-right">
                        {i > 0 && dropOff > 0 ? (
                          <span className="text-xs font-medium text-red-500">
                            -{dropOff}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Empty state */}
          {data.totalSessions === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No funnel data yet for this period. Events will appear as users
              go through the wizard.
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
