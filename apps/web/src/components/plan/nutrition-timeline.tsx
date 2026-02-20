"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Utensils,
  Bike,
  PersonStanding,
  Waves,
  Coffee,
  Lightbulb,
  Package2,
  Sunrise,
  ShoppingCart,
} from "lucide-react";
import type {
  NutritionPlan,
  NutritionTimelineEntry,
  NutritionSegment,
  SegmentNutrition,
} from "@/lib/engine/nutrition";
import { calculateSegmentedNutrition } from "@/lib/engine/nutrition";
import { ProductSwapper } from "@/components/plan/product-swapper";

interface NutritionTimelineProps {
  nutrition: NutritionPlan;
  swimDurationMin?: number;
  bikeDurationMin?: number;
  runDurationMin?: number;
  distanceCategory: string;
  planId?: string;
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

const SEGMENT_BORDER_LEFT: Partial<Record<NutritionSegment, string>> = {
  bike: "border-l-amber-500",
  run: "border-l-green-500",
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

// ── Legacy per-entry rendering for segments without cadence ────

function LegacySegmentEntries({
  entries,
  segment,
}: {
  entries: NutritionTimelineEntry[];
  segment: NutritionSegment;
}) {
  const style = SEGMENT_STYLES[segment];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}
        >
          <SegmentIcon segment={segment} className="h-3 w-3" />
          {SEGMENT_LABELS[segment]}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="space-y-1.5">
        {entries.map((entry, entryIdx) => (
          <div
            key={entryIdx}
            className={`flex items-center gap-3 p-2.5 rounded-lg ${style.bg} border ${style.border}`}
          >
            <div className="font-mono font-semibold text-sm w-14 flex-shrink-0">
              T+{formatElapsedTime(entry.elapsedMinutes)}
            </div>
            <div className={`text-sm ${style.text}`}>{entry.action}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────

export function NutritionTimeline({
  nutrition,
  swimDurationMin,
  bikeDurationMin,
  runDurationMin,
  distanceCategory,
  planId,
}: NutritionTimelineProps) {
  // Client-side fallback: compute timeline if not present (old plans)
  const { segments, timeline, totalCarbs, totalFluid, totalSodium } =
    useMemo(() => {
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
    }, [
      nutrition,
      swimDurationMin,
      bikeDurationMin,
      runDurationMin,
      distanceCategory,
    ]);

  if (timeline.length === 0) {
    return null;
  }

  // Find the bike and run segment summaries
  const bikeSegment = segments.find((s) => s.segment === "bike");
  const runSegment = segments.find((s) => s.segment === "run");

  // Determine whether we have any condensed segment data
  const hasCondensedSegments = segments.some(
    (s) => s.cadence && s.keyMoments,
  );

  // Group timeline entries by segment (for legacy fallback)
  const groupedTimeline: {
    segment: NutritionSegment;
    entries: NutritionTimelineEntry[];
  }[] = [];
  let currentGroup: {
    segment: NutritionSegment;
    entries: NutritionTimelineEntry[];
  } | null = null;

  for (const entry of timeline) {
    if (!currentGroup || currentGroup.segment !== entry.segment) {
      currentGroup = { segment: entry.segment, entries: [] };
      groupedTimeline.push(currentGroup);
    }
    currentGroup.entries.push(entry);
  }

  const breakfast = nutrition.preRaceBreakfast;
  const setup = nutrition.bikeSetup;
  const caf = nutrition.caffeineStrategy;
  const bags = nutrition.transitionBags;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <Utensils className="h-5 w-5" />
        Nutrition Timeline
      </h2>

      {/* ── 1. Summary Cards ─────────────────────────────────── */}
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

      {/* ── Shopping List ──────────────────────────────────── */}
      {nutrition.shoppingList && nutrition.shoppingList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              What to Buy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {nutrition.shoppingList.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-semibold">{item.quantity}&times;</span>{" "}
                    {item.productName}
                  </span>
                  {item.note && (
                    <span className="text-xs text-muted-foreground">
                      {item.note}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 2. Pre-Race Breakfast ────────────────────────────── */}
      {breakfast && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sunrise className="h-4 w-4" />
              Pre-Race Breakfast
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="font-medium">
                {breakfast.timingHours}h before start
              </span>
              <span className="text-muted-foreground">
                Target: {breakfast.carbTargetG}g carbs
              </span>
            </div>
            <ul className="space-y-1.5">
              {breakfast.mealSuggestions.map((meal, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  &bull; {meal}
                </li>
              ))}
            </ul>
            <div className="text-xs text-muted-foreground border-t pt-2 space-y-0.5">
              {breakfast.notes.map((note, i) => (
                <p key={i}>{note}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 3. Bike Setup Guide ──────────────────────────────── */}
      {setup && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bike className="h-4 w-4" />
              Bike Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {setup.prose && (
              <p className="text-sm text-muted-foreground italic">
                {setup.prose}
              </p>
            )}
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium w-24">Top tube:</span>
                <span>
                  {setup.topTubeGels
                    .map(
                      (g) =>
                        `${g.count}\u00d7 ${g.product}${g.caffeinated ? " \u2615" : ""}`,
                    )
                    .join(" + ")}
                </span>
              </div>
              {setup.btaBottle && (
                <div className="flex items-center gap-2">
                  <span className="font-medium w-24">BTA bottle:</span>
                  <span>
                    {setup.btaBottle.contents} ({setup.btaBottle.carbsG}g carbs)
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="font-medium w-24">Rear:</span>
                <span>
                  {setup.rearBottles.count}&times; {setup.rearBottles.contents}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic border-t pt-2">
              {setup.philosophy}
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── 4. Segment Nutrition Cards ───────────────────────── */}
      {hasCondensedSegments
        ? segments
            .filter((seg) => seg.segment === "bike" || seg.segment === "run")
            .map((seg) => {
              if (seg.cadence && seg.keyMoments) {
                return (
                  <CondensedSegmentCard key={seg.segment} segment={seg} />
                );
              }

              // Fallback for segments without cadence data
              const entries = groupedTimeline.find(
                (g) => g.segment === seg.segment,
              );
              if (!entries || entries.entries.length === 0) return null;
              return (
                <Card key={seg.segment}>
                  <CardContent className="pt-6">
                    <LegacySegmentEntries
                      entries={entries.entries}
                      segment={seg.segment}
                    />
                  </CardContent>
                </Card>
              );
            })
        : /* Full legacy timeline — no condensed segments at all */
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Gel-by-Gel Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupedTimeline.map((group, groupIdx) => (
                <LegacySegmentEntries
                  key={groupIdx}
                  entries={group.entries}
                  segment={group.segment}
                />
              ))}
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Adjust timing based on how you feel. Reduce intake if
                experiencing GI distress. Practice this plan in training.
              </p>
            </CardContent>
          </Card>
      }

      {/* ── 5. Caffeine Strategy ─────────────────────────────── */}
      {caf && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Coffee className="h-4 w-4" />
              Caffeine Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              Budget: <strong>{caf.totalPlannedMg}mg</strong> of{" "}
              {caf.totalBudgetMg}mg ({caf.mgPerKg}mg/kg)
            </div>
            <div className="space-y-1.5">
              {caf.hits.map((hit, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="font-mono w-14 text-muted-foreground">
                    T+{formatElapsedTime(hit.elapsedMinutes)}
                  </span>
                  <span>
                    {hit.productName} ({hit.caffeineMg}mg)
                  </span>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground border-t pt-2 space-y-0.5">
              {caf.notes.map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 6-8. Collapsible Sections ────────────────────────── */}
      <Accordion type="multiple" className="space-y-2">
        {/* Transition Bags */}
        {bags && (
          <AccordionItem value="bags" className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium">
              <span className="flex items-center gap-2">
                <Package2 className="h-4 w-4" /> Transition Bags
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1.5">T1 Bag</p>
                  <ul className="space-y-1">
                    {bags.t1.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        &bull; <span className="font-medium text-foreground">{item.item}</span>{" "}
                        &mdash; {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1.5">T2 Bag</p>
                  <ul className="space-y-1">
                    {bags.t2.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground">
                        &bull; <span className="font-medium text-foreground">{item.item}</span>{" "}
                        &mdash; {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
                {bags.notes.length > 0 && (
                  <div className="text-xs text-muted-foreground border-t pt-2 space-y-0.5">
                    {bags.notes.map((note, i) => (
                      <p key={i}>{note}</p>
                    ))}
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Pro Tips */}
        {nutrition.proTips && nutrition.proTips.length > 0 && (
          <AccordionItem value="tips" className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium">
              <span className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" /> Pro Tips
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {nutrition.proTips.map((tip, i) => (
                <div key={i} className="mb-3">
                  <p className="text-sm font-medium">{tip.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {tip.description}
                  </p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground italic border-t pt-2">
                These are suggestions &mdash; always test everything in training
                first.
              </p>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Products Used */}
        {nutrition.productRecommendations &&
          nutrition.productRecommendations.length > 0 && (
            <AccordionItem value="products" className="border rounded-lg">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium">
                <span className="flex items-center gap-2">
                  <Utensils className="h-4 w-4" /> Products Used
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {nutrition.productRecommendations.map((p) => (
                    <div key={p.id} className="text-sm p-2 rounded border">
                      <p className="font-medium">{p.displayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.carbsG}g carbs
                        {p.caffeineMg > 0
                          ? ` \u00b7 ${p.caffeineMg}mg caffeine`
                          : ""}
                        {p.sodiumMg > 0
                          ? ` \u00b7 ${p.sodiumMg}mg sodium`
                          : ""}
                      </p>
                    </div>
                  ))}
                </div>
                {planId && (
                  <div className="mt-3 pt-3 border-t">
                    <ProductSwapper
                      planId={planId}
                      selectedProducts={nutrition.selectedProducts}
                    />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}
      </Accordion>
    </div>
  );
}

// ── Condensed Segment Card ──────────────────────────────────────

function CondensedSegmentCard({
  segment: seg,
}: {
  segment: SegmentNutrition;
}) {
  const cadence = seg.cadence!;
  const keyMoments = seg.keyMoments!;
  const borderColor = SEGMENT_BORDER_LEFT[seg.segment] ?? "";
  const style = SEGMENT_STYLES[seg.segment];

  const hours = Math.floor(seg.durationMin / 60);
  const minutes = seg.durationMin % 60;
  const durationLabel =
    hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <SegmentIcon segment={seg.segment} className="h-4 w-4" />
            {SEGMENT_LABELS[seg.segment]} Nutrition ({durationLabel})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cadence */}
        <div className="space-y-1 text-sm">
          <p>
            Every <strong>{cadence.gelIntervalMin} min</strong>: 1&times;{" "}
            {cadence.gelProduct} ({cadence.gelCarbsG}g carbs) + water
          </p>
          <p>
            Every <strong>{cadence.fluidIntervalMin} min</strong>: Sip ~
            {cadence.fluidAmountMl}ml from bottle
          </p>
        </div>

        {/* Key Moments */}
        {keyMoments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Key Moments
            </p>
            {keyMoments.map((km, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-2.5 rounded-lg ${style.bg} border ${style.border}`}
              >
                <div className="font-mono font-semibold text-sm w-14 flex-shrink-0">
                  T+{formatElapsedTime(km.elapsedMinutes)}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${style.text}`}>
                    {km.label}
                    {km.isCaffeinated && (
                      <span className="inline-flex items-center gap-0.5 ml-2 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                        <Coffee className="h-2.5 w-2.5" /> Caf
                      </span>
                    )}
                  </div>
                  {km.coachNote && (
                    <p className="text-xs text-muted-foreground mt-0.5 italic">
                      {km.coachNote}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Segment Totals */}
        <div className="text-xs text-muted-foreground border-t pt-2">
          Total: {seg.totalCarbs}g carbs &middot; {seg.totalFluid}ml fluid
          &middot; {seg.totalSodium}mg sodium
        </div>
      </CardContent>
    </Card>
  );
}
