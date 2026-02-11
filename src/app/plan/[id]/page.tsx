import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Download, Share2, Printer } from "lucide-react";
import Link from "next/link";
import { Metadata } from "next";
import { generateRacePlanSchema, jsonLdScript } from "@/lib/schema";

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
  const bike = bikePlan as any;
  const run = runPlan as any;
  const nutrition = nutritionPlan as any;

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

  const { course, weatherData, bikePlan, runPlan, swimPlan, nutritionPlan } =
    plan;
  const weather = weatherData as any;
  const bike = bikePlan as any;
  const run = runPlan as any;
  const swim = swimPlan as any;
  const nutrition = nutritionPlan as any;

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
              <h1 className="text-3xl font-bold tracking-tight">
                {course.raceName}
              </h1>
              <p className="text-muted-foreground">
                {plan.raceDate.toLocaleDateString()} ·{" "}
                {course.distanceCategory.toUpperCase()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" /> Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
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
                <p className="text-xs text-muted-foreground mt-1">
                  High Confidence
                </p>
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
                  {weather?.tempC}°C
                  <span className="text-sm font-normal text-muted-foreground">
                    {weather?.humidity}% Hum
                  </span>
                </div>
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  {weather?.tempC > 25
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
                  <span>{formatTime(swim?.estimatedTimeMin * 60)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Target Pace
                  </div>
                  <div className="text-lg font-semibold">
                    {formatPace(swim?.targetPaceSec)}/100m
                  </div>
                </div>
                <div className="sm:col-span-2 text-sm text-muted-foreground">
                  Steady effort. Don't start too fast. Save legs for the bike.
                </div>
              </CardContent>
            </Card>

            {/* Bike */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Bike</span>
                  <span>{formatTime(bike?.durationMinutes * 60)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Avg Power</div>
                  <div className="text-lg font-semibold">
                    {bike?.targetPower} Watts
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Intensity: {(bike?.intensityFactor * 100).toFixed(0)}%
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

            {/* Run */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Run</span>
                  <span>{formatTime(run?.estimatedTimeMin * 60)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid sm:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Target Pace
                  </div>
                  <div className="text-lg font-semibold">
                    {formatPace(run?.targetPaceSec)}/km
                  </div>
                </div>
                <div className="sm:col-span-2 text-sm text-muted-foreground">
                  Hold back first 5km. Negative split strategy.
                </div>
              </CardContent>
            </Card>
          </div>

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
