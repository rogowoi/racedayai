import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";
import type { WeatherData } from "@/lib/weather";
import type { PacingOutput } from "@/lib/engine/pacing";
import type { NutritionPlan } from "@/lib/engine/nutrition";
import { NutritionTimeline } from "@/components/plan/nutrition-timeline";

type SwimRunPlan = { targetPaceSec: number; estimatedTimeMin: number };

async function getSharedPlan(token: string) {
  const plan = await prisma.racePlan.findUnique({
    where: { shareToken: token },
    include: {
      course: true,
      athlete: {
        select: { id: true },
      },
    },
  });
  return plan;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const plan = await getSharedPlan(token);

  if (!plan) {
    return { title: "Plan Not Found" };
  }

  const finishTime = formatTime(plan.predictedFinishSec || 0);

  return {
    title: `${plan.course.raceName} Race Plan — RaceDayAI`,
    description: `AI-generated ${plan.course.distanceCategory.toUpperCase()} triathlon plan with predicted finish: ${finishTime}`,
    openGraph: {
      title: `${plan.course.raceName} Race Plan — RaceDayAI`,
      description: `${plan.course.distanceCategory.toUpperCase()} triathlon · Predicted finish: ${finishTime}`,
      siteName: "RaceDayAI",
      type: "article",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${plan.course.raceName} Race Plan`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${plan.course.raceName} Race Plan`,
      description: `Predicted finish: ${finishTime}`,
    },
  };
}

export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const plan = await getSharedPlan(token);

  if (!plan) notFound();

  const { course, weatherData, bikePlan, runPlan, swimPlan, nutritionPlan, transitionPlan: rawTransition } =
    plan;
  const weather = weatherData as WeatherData | null;
  const bike = bikePlan as PacingOutput | null;
  const run = runPlan as SwimRunPlan | null;
  const swim = swimPlan as SwimRunPlan | null;
  const nutrition = nutritionPlan as NutritionPlan | null;
  const transition = rawTransition as {
    t1Sec?: number;
    t2Sec?: number;
    source?: string;
    venueName?: string | null;
  } | null;
  const weatherSource = weather?.source ?? "unavailable";
  const isWeatherUnavailable = weatherSource === "unavailable";

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Simple header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
          >
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span>
              RaceDay<span className="text-primary">AI</span>
            </span>
          </Link>
          <Button size="sm" asChild>
            <Link href="/wizard">Create Your Plan</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">
              Shared Race Plan
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              {course.raceName}
            </h1>
            <p className="text-muted-foreground">
              {plan.raceDate.toLocaleDateString()} ·{" "}
              {course.distanceCategory.toUpperCase()}
            </p>
          </div>

          {/* Overview Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Predicted Finish
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {formatTime(plan.predictedFinishSec || 0)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Weather
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {isWeatherUnavailable ? "~20°C" : `${weather?.tempC}°C`}
                  <span className="text-sm font-normal text-muted-foreground">
                    {isWeatherUnavailable ? "~50% Hum" : `${weather?.humidity}% Hum`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {isWeatherUnavailable ? "Default estimate — live forecast available 10 days before race" : weatherSource === "historical_estimate" ? "Historical estimate" : "Forecast"}
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
              <CardContent className="grid sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Target Pace
                  </div>
                  <div className="text-lg font-semibold">
                    {formatPace(swim?.targetPaceSec ?? 0)}/100m
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* T1 */}
            {transition?.t1Sec && (
              <Card className="border-l-4 border-l-gray-400">
                <CardHeader className="py-3">
                  <CardTitle className="flex justify-between text-base">
                    <span className="text-muted-foreground">T1 — Swim to Bike</span>
                    <span>{formatTime(transition.t1Sec)}</span>
                  </CardTitle>
                </CardHeader>
                {transition.source === "venue" && transition.venueName && (
                  <CardContent className="pt-0 pb-3">
                    <p className="text-xs text-muted-foreground">
                      Based on {transition.venueName} historical data
                    </p>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Bike */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Bike</span>
                  <span>{formatTime((bike?.durationMinutes ?? 0) * 60)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Avg Power</div>
                  <div className="text-lg font-semibold">
                    {bike?.targetPower} Watts
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Avg Speed</div>
                  <div className="text-lg font-semibold">
                    {bike?.targetSpeedKph} km/h
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">TSS</div>
                  <div className="text-lg font-semibold">{bike?.tss}</div>
                </div>
              </CardContent>
            </Card>

            {/* T2 */}
            {transition?.t2Sec && (
              <Card className="border-l-4 border-l-gray-400">
                <CardHeader className="py-3">
                  <CardTitle className="flex justify-between text-base">
                    <span className="text-muted-foreground">T2 — Bike to Run</span>
                    <span>{formatTime(transition.t2Sec)}</span>
                  </CardTitle>
                </CardHeader>
                {transition.source === "venue" && transition.venueName && (
                  <CardContent className="pt-0 pb-3">
                    <p className="text-xs text-muted-foreground">
                      Based on {transition.venueName} historical data
                    </p>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Run */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Run</span>
                  <span>{formatTime((run?.estimatedTimeMin ?? 0) * 60)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Target Pace
                  </div>
                  <div className="text-lg font-semibold">
                    {formatPace(run?.targetPaceSec ?? 0)}/km
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Nutrition Timeline */}
          {nutrition && (
            <NutritionTimeline
              nutrition={nutrition}
              swimDurationMin={swim?.estimatedTimeMin}
              bikeDurationMin={bike?.durationMinutes}
              runDurationMin={run?.estimatedTimeMin}
              distanceCategory={course.distanceCategory}
            />
          )}

          {/* Narrative */}
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

          {/* CTA */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="flex flex-col items-center text-center py-8 gap-4">
              <h3 className="text-lg font-semibold">
                Want your own AI race plan?
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Get a personalized triathlon execution strategy with
                weather-adjusted pacing, power targets, and nutrition timing.
              </p>
              <Button size="lg" asChild>
                <Link href="/wizard">Create Your Plan</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        Powered by{" "}
        <Link href="/" className="text-primary hover:underline">
          RaceDayAI
        </Link>
      </footer>
    </div>
  );
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
