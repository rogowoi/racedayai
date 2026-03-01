"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface CohortComparisonProps {
  predictedFinishSec: number;
  distanceCategory: string;
  gender: string | null;
  age: number | null;
  experienceLevel: string | null;
}

// Cohort median finish times in seconds by distance + gender
// Based on aggregated triathlon race data
const cohortData: Record<string, { M: { p25: number; median: number; p75: number }; F: { p25: number; median: number; p75: number } }> = {
  sprint: {
    M: { p25: 4200, median: 4800, p75: 5700 },   // 1:10 - 1:20 - 1:35
    F: { p25: 4800, median: 5400, p75: 6300 },    // 1:20 - 1:30 - 1:45
  },
  olympic: {
    M: { p25: 7800, median: 9000, p75: 10800 },   // 2:10 - 2:30 - 3:00
    F: { p25: 9000, median: 10200, p75: 12000 },   // 2:30 - 2:50 - 3:20
  },
  "70.3": {
    M: { p25: 17100, median: 19800, p75: 23400 }, // 4:45 - 5:30 - 6:30
    F: { p25: 19800, median: 22500, p75: 26100 }, // 5:30 - 6:15 - 7:15
  },
  "140.6": {
    M: { p25: 36000, median: 42300, p75: 50400 }, // 10:00 - 11:45 - 14:00
    F: { p25: 41400, median: 48600, p75: 57600 }, // 11:30 - 13:30 - 16:00
  },
};

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}` : `${m}min`;
}

function getPercentile(time: number, p25: number, median: number, p75: number): number {
  // Approximate percentile using quartile interpolation
  if (time <= p25) {
    const ratio = Math.max(0, (p25 - time) / (p25 * 0.3));
    return Math.min(95, 75 + ratio * 20);
  }
  if (time <= median) {
    const ratio = (median - time) / (median - p25);
    return 50 + ratio * 25;
  }
  if (time <= p75) {
    const ratio = (p75 - time) / (p75 - median);
    return 25 + ratio * 25;
  }
  const ratio = Math.max(0, (time - p75) / (p75 * 0.3));
  return Math.max(5, 25 - ratio * 20);
}

export function CohortComparison({
  predictedFinishSec,
  distanceCategory,
  gender,
  age,
  experienceLevel,
}: CohortComparisonProps) {
  const genderKey = gender === "F" ? "F" : "M";
  const data = cohortData[distanceCategory];
  if (!data || !predictedFinishSec) return null;

  const cohort = data[genderKey];
  const percentile = Math.round(getPercentile(predictedFinishSec, cohort.p25, cohort.median, cohort.p75));

  // Build descriptive cohort label
  const genderLabel = gender === "F" ? "Female" : "Male";
  const ageLabel = age ? `${Math.floor(age / 5) * 5}-${Math.floor(age / 5) * 5 + 4}` : null;
  const levelLabel = experienceLevel
    ? experienceLevel.charAt(0).toUpperCase() + experienceLevel.slice(1)
    : null;
  const cohortLabel = [genderLabel, ageLabel, levelLabel].filter(Boolean).join(", ");

  // Position on the bar (inverted: faster = higher percentile = further right)
  const barPosition = Math.max(5, Math.min(95, percentile));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-muted-foreground" />
          How You Compare
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Athletes like you ({cohortLabel}) typically finish{" "}
          {distanceCategory.toUpperCase()} in{" "}
          <span className="font-medium text-foreground">
            {formatTime(cohort.p25)} – {formatTime(cohort.p75)}
          </span>
        </p>

        {/* Visual bar */}
        <div className="space-y-2">
          <div className="relative h-8">
            {/* Background range */}
            <div className="absolute inset-x-0 top-3 h-2 bg-muted rounded-full" />
            {/* Cohort range (p25-p75) */}
            <div className="absolute top-3 h-2 bg-primary/20 rounded-full" style={{ left: "15%", right: "15%" }} />
            {/* User's position */}
            <div
              className="absolute top-0 flex flex-col items-center transition-all duration-500"
              style={{ left: `${barPosition}%`, transform: "translateX(-50%)" }}
            >
              <div className="h-4 w-4 rounded-full bg-primary border-2 border-background shadow-sm" />
              <div className="w-px h-2 bg-primary" />
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Slower</span>
            <span>Faster</span>
          </div>
        </div>

        <p
          className={cn(
            "text-sm font-medium",
            percentile >= 60
              ? "text-green-600 dark:text-green-400"
              : percentile >= 40
                ? "text-foreground"
                : "text-muted-foreground"
          )}
        >
          Your predicted time puts you in the top {percentile}% of your group
        </p>
      </CardContent>
    </Card>
  );
}
