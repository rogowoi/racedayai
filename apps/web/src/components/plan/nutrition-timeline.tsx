"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, Bike, PersonStanding, Waves } from "lucide-react";
import type {
  NutritionPlan,
  NutritionTimelineEntry,
  NutritionSegment,
  SegmentNutrition,
} from "@/lib/engine/nutrition";
import { calculateSegmentedNutrition } from "@/lib/engine/nutrition";

interface NutritionTimelineProps {
  nutrition: NutritionPlan;
  swimDurationMin?: number;
  bikeDurationMin?: number;
  runDurationMin?: number;
  distanceCategory: string;
}

function formatElapsedTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${m.toString().padStart(2, "0")}`;
}

const SEGMENT_STYLES: Record<
  NutritionSegment,
  { bg: string; text: string; border: string; badge: string }
> = {
  swim: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  t1: {
    bg: "bg-slate-50 dark:bg-slate-950/20",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-800",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  },
  bike: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  t2: {
    bg: "bg-slate-50 dark:bg-slate-950/20",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-800",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300",
  },
  run: {
    bg: "bg-green-50 dark:bg-green-950/20",
    text: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    badge:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
};

const SEGMENT_LABELS: Record<NutritionSegment, string> = {
  swim: "Swim",
  t1: "T1",
  bike: "Bike",
  t2: "T2",
  run: "Run",
};

function SegmentIcon({
  segment,
  className,
}: {
  segment: NutritionSegment;
  className?: string;
}) {
  switch (segment) {
    case "swim":
      return <Waves className={className} />;
    case "bike":
      return <Bike className={className} />;
    case "run":
      return <PersonStanding className={className} />;
    default:
      return <Utensils className={className} />;
  }
}

export function NutritionTimeline({
  nutrition,
  swimDurationMin,
  bikeDurationMin,
  runDurationMin,
  distanceCategory,
}: NutritionTimelineProps) {
  // Client-side fallback: compute timeline if not present (old plans)
  const { segments, timeline, totalCarbs, totalFluid, totalSodium } = useMemo(() => {
    if (nutrition.timeline && nutrition.segments) {
      return {
        segments: nutrition.segments,
        timeline: nutrition.timeline,
        totalCarbs: nutrition.totalCarbs ?? 0,
        totalFluid: nutrition.totalFluid ?? 0,
        totalSodium: nutrition.totalSodium ?? 0,
      };
    }

    // Fallback: compute from flat rates + durations
    if (swimDurationMin && bikeDurationMin && runDurationMin) {
      const result = calculateSegmentedNutrition({
        swimDurationMin,
        bikeDurationMin,
        runDurationMin,
        temperatureC: 20, // Default assumption for old plans
        carbsPerHour: nutrition.carbsPerHour,
        sodiumPerHour: nutrition.sodiumPerHour,
        fluidPerHour: nutrition.fluidPerHour,
        distanceCategory,
      });
      return result;
    }

    return {
      segments: [] as SegmentNutrition[],
      timeline: [] as NutritionTimelineEntry[],
      totalCarbs: 0,
      totalFluid: 0,
      totalSodium: 0,
    };
  }, [nutrition, swimDurationMin, bikeDurationMin, runDurationMin, distanceCategory]);

  if (timeline.length === 0) {
    return null;
  }

  // Find the bike and run segment summaries
  const bikeSegment = segments.find((s) => s.segment === "bike");
  const runSegment = segments.find((s) => s.segment === "run");

  // Group timeline entries by segment
  const groupedTimeline: { segment: NutritionSegment; entries: NutritionTimelineEntry[] }[] = [];
  let currentGroup: { segment: NutritionSegment; entries: NutritionTimelineEntry[] } | null = null;

  for (const entry of timeline) {
    if (!currentGroup || currentGroup.segment !== entry.segment) {
      currentGroup = { segment: entry.segment, entries: [] };
      groupedTimeline.push(currentGroup);
    }
    currentGroup.entries.push(entry);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Utensils className="h-5 w-5" />
        Nutrition Timeline
      </h2>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Bike className="h-3.5 w-3.5 text-amber-600" />
              Bike Nutrition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {bikeSegment?.totalCarbs ?? 0}g carbs
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {bikeSegment?.totalFluid ?? 0}ml fluid ·{" "}
              {bikeSegment?.totalSodium ?? 0}mg sodium
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <PersonStanding className="h-3.5 w-3.5 text-green-600" />
              Run Nutrition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {runSegment?.totalCarbs ?? 0}g carbs
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {runSegment?.totalFluid ?? 0}ml fluid ·{" "}
              {runSegment?.totalSodium ?? 0}mg sodium
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{totalCarbs}g carbs</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalFluid}ml fluid · {totalSodium}mg sodium
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gel-by-Gel Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedTimeline.map((group, groupIdx) => {
            const style = SEGMENT_STYLES[group.segment];
            return (
              <div key={groupIdx}>
                {/* Segment Divider */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}
                  >
                    <SegmentIcon
                      segment={group.segment}
                      className="h-3 w-3"
                    />
                    {SEGMENT_LABELS[group.segment]}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Entries */}
                <div className="space-y-1.5">
                  {group.entries.map((entry, entryIdx) => (
                    <div
                      key={entryIdx}
                      className={`flex items-center gap-3 p-2.5 rounded-lg ${style.bg} border ${style.border}`}
                    >
                      <div className="font-mono font-semibold text-sm w-14 flex-shrink-0">
                        T+{formatElapsedTime(entry.elapsedMinutes)}
                      </div>
                      <div className={`text-sm ${style.text}`}>
                        {entry.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Footer note */}
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Adjust timing based on how you feel. Reduce intake if experiencing
            GI distress. Practice this plan in training.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
