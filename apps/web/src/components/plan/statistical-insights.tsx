"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";

// ── Types mirrored from lib/engine/statistics.ts ──────────────

interface PercentileResult {
  percentile: number;
  label: string;
  fasterThanPct: number;
}

interface SplitRecommendation {
  swimPct: number;
  bikePct: number;
  runPct: number;
  swimSec: number;
  bikeSec: number;
  runSec: number;
}

interface CohortStats {
  mean: number;
  median: number;
  std: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
  count: number;
}

interface CohortPrediction {
  gender: string;
  ageGroup: string;
  cohortKey: string;
  sampleSize: number;
  segments: {
    swim: CohortStats | null;
    bike: CohortStats | null;
    run: CohortStats | null;
    total: CohortStats | null;
  };
  splitRecommendation: SplitRecommendation | null;
  percentilePlacement: PercentileResult | null;
}

interface StatisticalContext {
  available: boolean;
  datasetSize: number;
  cohort: CohortPrediction | null;
  confidenceInterval: {
    p10: number;
    p50: number;
    p90: number;
  } | null;
  recommendedIF: number | null;
}

// ── Helpers ────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatMinSec(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function genderLabel(g: string): string {
  return g === "M" ? "Male" : "Female";
}

// ── Components ─────────────────────────────────────────────────

function PercentileBar({
  percentile,
  label,
}: {
  percentile: number;
  label: string;
}) {
  // percentile: 0-100 where lower = faster
  // Visual: marker on a bar from "Fast" (left) to "Slow" (right)
  const position = Math.max(2, Math.min(98, percentile));

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Fastest</span>
        <span>Slowest</span>
      </div>
      <div className="relative h-3 rounded-full overflow-hidden bg-gradient-to-r from-green-500 via-yellow-400 to-red-400">
        <div
          className="absolute top-0 w-0.5 h-full bg-white shadow-md"
          style={{ left: `${position}%` }}
        />
        <div
          className="absolute -top-0.5 h-4 w-4 rounded-full bg-white border-2 border-primary shadow-lg"
          style={{ left: `calc(${position}% - 8px)` }}
        />
      </div>
      <div className="text-center">
        <span className="text-sm font-semibold">{label}</span>
      </div>
    </div>
  );
}

function SplitDonut({ splits }: { splits: SplitRecommendation }) {
  // Simple horizontal stacked bar for split ratios
  return (
    <div className="space-y-3">
      <div className="flex h-4 rounded-full overflow-hidden">
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${splits.swimPct}%` }}
        />
        <div
          className="bg-orange-500 transition-all"
          style={{ width: `${splits.bikePct}%` }}
        />
        <div
          className="bg-green-500 transition-all"
          style={{ width: `${splits.runPct}%` }}
        />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-medium">Swim</span>
          </div>
          <span className="text-muted-foreground">
            {splits.swimPct.toFixed(1)}% · {formatMinSec(splits.swimSec)}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="font-medium">Bike</span>
          </div>
          <span className="text-muted-foreground">
            {splits.bikePct.toFixed(1)}% · {formatTime(splits.bikeSec)}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-medium">Run</span>
          </div>
          <span className="text-muted-foreground">
            {splits.runPct.toFixed(1)}% · {formatTime(splits.runSec)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────

export function StatisticalInsights({
  statisticalContext,
  predictedFinishSec,
}: {
  statisticalContext: StatisticalContext;
  predictedFinishSec?: number;
}) {
  if (!statisticalContext?.available || !statisticalContext.cohort) {
    return null;
  }

  const { cohort, confidenceInterval, recommendedIF, datasetSize } =
    statisticalContext;
  const placement = cohort.percentilePlacement;
  const splits = cohort.splitRecommendation;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Data-Driven Insights</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Based on {datasetSize.toLocaleString()} IRONMAN 70.3 race records ·{" "}
        {genderLabel(cohort.gender)} {cohort.ageGroup} cohort (
        {cohort.sampleSize.toLocaleString()} athletes)
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Percentile Placement */}
        {placement && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Your Predicted Placement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {placement.fasterThanPct}%
                </span>
                <span className="text-sm text-muted-foreground">
                  faster than your cohort
                </span>
              </div>
              <PercentileBar
                percentile={placement.percentile}
                label={placement.label}
              />
            </CardContent>
          </Card>
        )}

        {/* Confidence Interval */}
        {confidenceInterval && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4" />
                Finish Time Range
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Best case
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {formatTime(confidenceInterval.p10)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Most likely
                  </span>
                  <span className="text-lg font-bold">
                    {formatTime(confidenceInterval.p50)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    Conservative
                  </span>
                  <span className="text-sm font-semibold text-amber-600">
                    {formatTime(confidenceInterval.p90)}
                  </span>
                </div>
              </div>
              {/* Visual range bar */}
              <div className="relative pt-2">
                <div className="h-2 rounded-full bg-gradient-to-r from-green-200 via-blue-200 to-amber-200" />
                {predictedFinishSec &&
                  confidenceInterval.p10 &&
                  confidenceInterval.p90 && (
                    <div
                      className="absolute top-1 w-3 h-3 rounded-full bg-primary border-2 border-white shadow"
                      style={{
                        left: `${Math.max(
                          0,
                          Math.min(
                            100,
                            ((predictedFinishSec - confidenceInterval.p10) /
                              (confidenceInterval.p90 -
                                confidenceInterval.p10)) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Range for {genderLabel(cohort.gender)} {cohort.ageGroup} athletes
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Optimal Split Strategy */}
      {splits && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Optimal Split Strategy
            </CardTitle>
            <CardDescription className="text-xs">
              How the fastest athletes in your cohort distribute their race time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SplitDonut splits={splits} />
          </CardContent>
        </Card>
      )}

      {/* Data-Driven IF */}
      {recommendedIF && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-3 flex items-center gap-2">
          <BarChart3 className="h-3.5 w-3.5 shrink-0" />
          <span>
            Data-driven bike power target:{" "}
            <span className="font-semibold text-foreground">
              {(recommendedIF * 100).toFixed(1)}% of FTP
            </span>{" "}
            — based on what similar athletes actually ride, not textbook theory.
          </span>
        </div>
      )}
    </div>
  );
}
