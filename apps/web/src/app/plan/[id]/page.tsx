import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ShareButton } from "@/components/plan/share-button";
import { StatisticalInsights } from "@/components/plan/statistical-insights";
import { PlanGenerating } from "@/components/plan/plan-generating";
import { TssWithTooltip } from "@/components/plan/tss-with-tooltip";
import { RenamePlanSheet } from "@/components/plan/rename-plan-sheet";
import { DeletePlanButton } from "@/components/plan/delete-plan-button";
import Link from "next/link";
import { Metadata } from "next";
import { generateRacePlanSchema, jsonLdScript } from "@/lib/schema";
import type { WeatherData } from "@/lib/weather";
import type { PacingOutput } from "@/lib/engine/pacing";
import type { NutritionPlan } from "@/lib/engine/nutrition";
import type { FullStatisticalContext } from "@/lib/engine/statistics";

type SwimRunPlan = { targetPaceSec: number; estimatedTimeMin: number };

async function getRacePlan(id: string) {
  const plan = await prisma.racePlan.findUnique({
    where: { id },
    include: {
      course: true,
      athlete: true,
    },
  });
  return plan;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const plan = await getRacePlan(id);

  if (!plan) {
    return {
      title: "Race Plan Not Found",
    };
  }

  const { course, bikePlan, runPlan, nutritionPlan } = plan;
  const bike = bikePlan as PacingOutput | null;
  const run = runPlan as SwimRunPlan | null;
  const nutrition = nutritionPlan as NutritionPlan | null;

  const finishTime = formatTime(plan.predictedFinishSec || 0);
  const shareUrl = plan.shareToken
    ? `https://racedayai.com/plan/${plan.shareToken}`
    : `https://racedayai.com/plan/${id}`;

  return {
    title: `${course.raceName} Race Plan`,
    description: `Personalized race execution plan for ${course.raceName}: ${course.distanceCategory.toUpperCase()} triathlon with AI-optimized pacing (${bike?.targetPower || "custom"}W bike, ${formatPace(run?.targetPaceSec || 0)} run pace), nutrition (${nutrition?.carbsPerHour || 60}g/hr), and weather-adjusted strategy. Predicted finish: ${finishTime}.`,

    openGraph: {
      title: `${course.raceName} Race Plan — RaceDayAI`,
      description: `AI-generated execution plan with predicted finish time: ${finishTime}`,
      url: shareUrl,
      siteName: "RaceDayAI",
      type: "article",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${course.raceName} Race Plan`,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: `${course.raceName} Race Plan`,
      description: `Predicted finish: ${finishTime} | ${course.distanceCategory.toUpperCase()} triathlon`,
    },

    alternates: {
      canonical: shareUrl,
    },
  };
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const plan = await getRacePlan(id);

  if (!plan) notFound();

  // Show generating UI for plans still in progress
  if (plan.status !== "completed") {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <PlanGenerating planId={id} />
        </main>
      </div>
    );
  }

  const {
    course,
    weatherData,
    bikePlan,
    runPlan,
    swimPlan,
    nutritionPlan,
    statisticalContext: rawStats,
  } = plan;
  const weather = weatherData as WeatherData | null;
  const bike = bikePlan as PacingOutput | null;
  const run = runPlan as SwimRunPlan | null;
  const swim = swimPlan as SwimRunPlan | null;
  const nutrition = nutritionPlan as NutritionPlan | null;
  const statisticalContext = rawStats as FullStatisticalContext | null;

  const racePlanSchema = generateRacePlanSchema({
    raceName: course.raceName,
    raceDate: plan.raceDate.toISOString(),
    location: course.location || "TBD",
    distanceCategory: course.distanceCategory.toUpperCase(),
    targetFinishTime: formatTime(plan.predictedFinishSec || 0),
    shareUrl: plan.shareToken
      ? `https://racedayai.com/plan/${plan.shareToken}`
      : `https://racedayai.com/plan/${id}`,
  });

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(racePlanSchema)}
      />
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {course.raceName}
              </h1>
              <p className="text-muted-foreground">
                {plan.raceDate.toLocaleDateString()} ·{" "}
                {course.distanceCategory.toUpperCase()}
              </p>
            </div>
            <div className="flex gap-2">
              <RenamePlanSheet
                planId={id}
                currentName={course.raceName}
                variant="outline"
                size="sm"
              />
              <ShareButton planId={id} existingShareToken={plan.shareToken} />
              <Button variant="outline" size="sm" asChild>
                <a href={`/api/plans/${id}/pdf`} download>
                  <Download className="mr-2 h-4 w-4" /> PDF
                </a>
              </Button>
              <DeletePlanButton
                planId={id}
                raceName={course.raceName}
                variant="outline"
                size="sm"
                showIcon={true}
                redirectToDashboard={true}
              />
            </div>
          </div>

          {/* Overview Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatTime(plan.predictedFinishSec || 0)}
                </div>
                {(() => {
                  const confidence = calculateConfidence(plan);
                  return (
                    <p className={`text-xs mt-1 font-medium ${confidence.color}`}>
                      {confidence.label}
                    </p>
                  );
                })()}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Weather Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {weather?.tempC ?? "--"}°C
                  <span className="text-sm font-normal text-muted-foreground">
                    {weather?.humidity ?? "--"}% Hum
                  </span>
                </div>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  {weather?.isEstimated
                    ? "Estimated (Historical Average)"
                    : (weather?.tempC ?? 0) > 25
                      ? "Heat Adjustment Active"
                      : "Optimal Conditions"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Nutrition
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {nutrition?.carbsPerHour}g/hr
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {nutrition?.sodiumPerHour}mg Sodium ·{" "}
                  {nutrition?.fluidPerHour}ml Fluid
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Splits */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Race Execution</h2>

            {/* Swim */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Swim</span>
                  <span>{formatTime((swim?.estimatedTimeMin ?? 0) * 60)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Target Pace
                  </div>
                  <div className="text-lg font-semibold">
                    {formatPace(swim?.targetPaceSec ?? 0)}/100m
                  </div>
                </div>
                <div className="md:col-span-2 text-sm text-muted-foreground">
                  Steady effort. Don't start too fast. Save legs for the bike.
                </div>
              </CardContent>
            </Card>

            {/* Bike */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Bike</span>
                  <span>{formatTime((bike?.durationMinutes ?? 0) * 60)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Avg Power</div>
                  <div className="text-lg font-semibold">
                    {bike?.targetPower} Watts
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Intensity: {((bike?.intensityFactor ?? 0) * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Avg Speed</div>
                  <div className="text-lg font-semibold">
                    {bike?.targetSpeedKph} km/h
                  </div>
                </div>
                <TssWithTooltip tss={bike?.tss} />
              </CardContent>
            </Card>

            {/* Run */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Run</span>
                  <span>{formatTime((run?.estimatedTimeMin ?? 0) * 60)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Target Pace
                  </div>
                  <div className="text-lg font-semibold">
                    {formatPace(run?.targetPaceSec ?? 0)}/km
                  </div>
                </div>
                <div className="md:col-span-2 text-sm text-muted-foreground">
                  Hold back first 5km. Negative split strategy.
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data-Driven Statistical Insights */}
          {statisticalContext?.available && (
            <StatisticalInsights
              statisticalContext={statisticalContext}
              predictedFinishSec={plan.predictedFinishSec ?? undefined}
            />
          )}

          {/* AI Narrative */}
          {plan.narrativePlan && (
            <Card>
              <CardHeader>
                <CardTitle>Race Strategy Narrative</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
                  {plan.narrativePlan}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-center pt-8">
            <Button size="lg" className="w-full md:w-auto" asChild>
              <Link href="/wizard">Create New Plan</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function calculateConfidence(plan: {
  weatherData: unknown;
  athlete: { ftpWatts: number | null; thresholdPaceSec: number | null; stravaConnected: boolean; garminConnected: boolean } | null;
  course: { bikeElevationGainM: number | null } | null;
}): { label: string; color: string } {
  let score = 0;
  const maxScore = 5;

  if (plan.weatherData) score++;
  if (plan.athlete?.ftpWatts) score++;
  if (plan.athlete?.thresholdPaceSec) score++;
  if (plan.course?.bikeElevationGainM) score++;
  if (plan.athlete?.stravaConnected || plan.athlete?.garminConnected) score++;

  const ratio = score / maxScore;
  if (ratio >= 0.8) return { label: "High Confidence", color: "text-green-600" };
  if (ratio >= 0.5) return { label: "Medium Confidence", color: "text-amber-600" };
  return { label: "Low Confidence", color: "text-red-500" };
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatPace(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
