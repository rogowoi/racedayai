"use server";

import { prisma } from "@/lib/db";
import {
  calculateBikePacing,
  calculateRunPacing,
  calculateSwimPacing,
} from "@/lib/engine/pacing";
import { calculateNutrition } from "@/lib/engine/nutrition";
import { parseGpx, CourseData } from "@/lib/engine/gpx";
import { getRaceWeather } from "@/lib/weather";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { checkCanCreatePlan, incrementPlanCount, getPlanUsage } from "@/lib/plan-limits";
import { getPlanLimits, isPaidPlan } from "@/lib/stripe";
import { generateRaceNarrative } from "@/lib/engine/narrative";
import {
  buildStatisticalContext,
  buildFullContext,
  getPercentile,
  type Gender,
  type StatisticalContext,
  type FullStatisticalContext,
} from "@/lib/engine/statistics";
import { getRaceById } from "@/lib/race-registry";

export async function generateRacePlan(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;

  // Extract data
  // Note: We expect JSON strings for complex objects or individual fields
  const fitnessData = JSON.parse(formData.get("fitnessData") as string);
  const raceData = JSON.parse(formData.get("raceData") as string);
  const gpxFile = formData.get("gpxFile") as File;

  // 1. Require authentication
  if (!userId) {
    throw new Error("User must be logged in");
  }

  // 2. Check plan limits before proceeding
  const canCreate = await checkCanCreatePlan(userId);
  if (!canCreate) {
    const usage = await getPlanUsage(userId);
    if (usage) {
      throw new Error(
        `Plan limit reached (${usage.plansUsed}/${usage.plansLimit} plans used). Upgrade at /dashboard/settings to create more plans.`
      );
    }
    throw new Error("Unable to create plan. Please check your subscription.");
  }

  // Update Athlete profile
  const athlete = await prisma.athlete.upsert({
    where: { userId },
    update: {
      ftpWatts: fitnessData.ftp,
      weightKg: fitnessData.weight,
      thresholdPaceSec: parsePace(fitnessData.thresholdPace),
      cssPer100mSec: parsePace(fitnessData.css),
      experienceLevel: fitnessData.experienceLevel,
    },
    create: {
      userId,
      ftpWatts: fitnessData.ftp,
      weightKg: fitnessData.weight,
      thresholdPaceSec: parsePace(fitnessData.thresholdPace),
      cssPer100mSec: parsePace(fitnessData.css),
      experienceLevel: fitnessData.experienceLevel || "intermediate",
    },
  });

  // 2. Parse GPX — priority: upload > RideWithGPS > registry > defaults
  const registryRace = raceData.selectedRaceId
    ? getRaceById(raceData.selectedRaceId)
    : null;

  // Check for RWGPS course data from the search picker
  const rwgpsCourseRaw = formData.get("rwgpsCourseData") as string | null;
  const rwgpsCourse = rwgpsCourseRaw ? JSON.parse(rwgpsCourseRaw) : null;

  let courseData: CourseData = {
    totalDistanceM: 90000,
    elevationGainM: 500,
    points: [],
  };
  let gpxSource: "upload" | "rwgps" | "registry" | "default" = "default";

  if (gpxFile && gpxFile.size > 0) {
    // Priority 1: User-uploaded GPX file
    const text = await gpxFile.text();
    courseData = parseGpx(text);
    gpxSource = "upload";
  } else if (rwgpsCourse?.totalDistanceM) {
    // Priority 2: RideWithGPS route selected by user
    courseData.totalDistanceM = rwgpsCourse.totalDistanceM;
    courseData.elevationGainM = rwgpsCourse.elevationGainM || 500;
    gpxSource = "rwgps";
  } else if (registryRace) {
    // Priority 3: Registry race data for distance and elevation
    courseData.totalDistanceM = registryRace.bikeDistanceM;
    courseData.elevationGainM = registryRace.bikeElevationGainM || 500;
    gpxSource = "registry";
  } else {
    // Priority 4: Fallback defaults based on distance category
    if (raceData.distanceCategory === "sprint") {
      courseData.totalDistanceM = 20000;
      courseData.elevationGainM = 200;
    } else if (raceData.distanceCategory === "olympic") {
      courseData.totalDistanceM = 40000;
      courseData.elevationGainM = 300;
    } else if (raceData.distanceCategory === "70.3") {
      courseData.totalDistanceM = 90000;
      courseData.elevationGainM = 600;
    } else if (raceData.distanceCategory === "140.6") {
      courseData.totalDistanceM = 180000;
      courseData.elevationGainM = 1200;
    }
  }

  // 3. Get Weather — use registry coordinates, GPX coordinates, or store coordinates
  let lat = 52.52; // Berlin fallback
  let lon = 13.41;

  if (courseData.points.length > 0) {
    // GPX coordinates take priority
    lat = courseData.points[0].lat;
    lon = courseData.points[0].lon;
  } else if (raceData.latitude && raceData.longitude) {
    // Use coordinates from wizard store (set by race registry selection)
    lat = raceData.latitude;
    lon = raceData.longitude;
  } else if (registryRace?.latitude && registryRace?.longitude) {
    // Fallback to registry lookup
    lat = registryRace.latitude;
    lon = registryRace.longitude;
  }

  // Use today if no date
  const raceDate = raceData.date ? new Date(raceData.date) : new Date();
  const raceYear = raceDate.getFullYear();

  const weather = await getRaceWeather(lat, lon, raceDate);

  // 4. Run Engines
  // Swim
  const swimDist = getSwimDist(raceData.distanceCategory);
  const swimPacing = calculateSwimPacing(
    athlete.cssPer100mSec || 120,
    swimDist,
  );

  // Bike
  const bikePacing = calculateBikePacing({
    ftp: athlete.ftpWatts || 200,
    courseDistanceKm: courseData.totalDistanceM / 1000,
    elevationGainM: courseData.elevationGainM,
    userWeightKg: Number(athlete.weightKg) || 75,
  });

  // Run
  const runDist = getRunDist(raceData.distanceCategory);
  const runPacing = calculateRunPacing(
    athlete.thresholdPaceSec || 300,
    runDist / 1000,
    bikePacing.tss,
  );

  // Nutrition
  const totalDurationHours =
    (swimPacing.estimatedTimeMin +
      bikePacing.durationMinutes +
      runPacing.estimatedTimeMin) /
    60;
  const nutrition = calculateNutrition(
    Number(athlete.weightKg) || 75,
    totalDurationHours,
    weather.tempC,
  );

  // 4b. Build Statistical Context (data-driven insights from 840K race records + course/fade models)
  const predictedFinishSec =
    (swimPacing.estimatedTimeMin +
      bikePacing.durationMinutes +
      runPacing.estimatedTimeMin) * 60;

  // Build full context with course matching, fade prediction, weather impact, and trend adjustment
  const statisticalContext = await buildFullContext({
    gender: fitnessData.gender as Gender | undefined,
    age: fitnessData.age ?? undefined,
    ftp: athlete.ftpWatts ?? undefined,
    distanceCategory: raceData.distanceCategory,
    predictedTotalSec: predictedFinishSec,
    raceName: raceData.name,
    bikePlanIF: bikePacing.intensityFactor,
    raceYear,
    weatherTempC: weather.tempC,
    weatherWindKph: weather.windSpeedKph,
    weatherHumidityPct: weather.humidity,
  });

  // 5. Save RacePlan
  // Create Course first — enrich with registry data if available
  // Build GPX URL for DB storage: RWGPS URL if used, or registry URL
  const bikeGpxUrl =
    gpxSource === "rwgps" && rwgpsCourse?.rwgpsId
      ? `https://ridewithgps.com/${rwgpsCourse.rwgpsType === "route" ? "routes" : "trips"}/${rwgpsCourse.rwgpsId}.gpx`
      : registryRace?.gpx?.bikeUrl || null;

  const course = await prisma.raceCourse.create({
    data: {
      raceName: raceData.name,
      distanceCategory: raceData.distanceCategory,
      location: raceData.raceLocation || registryRace?.location || null,
      latitude: raceData.latitude || registryRace?.latitude || null,
      longitude: raceData.longitude || registryRace?.longitude || null,
      swimDistanceM: registryRace?.swimDistanceM || getSwimDist(raceData.distanceCategory),
      bikeDistanceM: courseData.totalDistanceM,
      runDistanceM: registryRace?.runDistanceM || getRunDist(raceData.distanceCategory),
      bikeElevationGainM: courseData.elevationGainM,
      runElevationGainM: registryRace?.runElevationGainM || null,
      bikeGpxUrl,
      runGpxUrl: registryRace?.gpx?.runUrl || null,
    },
  });

  const plan = await prisma.racePlan.create({
    data: {
      athleteId: athlete.id,
      courseId: course.id,
      raceDate: raceDate,
      weatherData: weather,
      swimPlan: swimPacing,
      bikePlan: bikePacing,
      runPlan: runPacing,
      nutritionPlan: nutrition,
      statisticalContext: JSON.parse(JSON.stringify(statisticalContext)),
      predictedFinishSec: predictedFinishSec,
    },
  });

  // 6. Generate AI narrative for paid users (non-blocking)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true },
  });

  if (user && isPaidPlan(user.plan)) {
    // Build statistical summary for the narrative
    const statsForNarrative = statisticalContext.available && statisticalContext.cohort
      ? {
          cohortSize: statisticalContext.cohort.sampleSize,
          percentilePlacement: statisticalContext.cohort.percentilePlacement?.label,
          fasterThanPct: statisticalContext.cohort.percentilePlacement?.fasterThanPct,
          confidenceRange: statisticalContext.confidenceInterval
            ? `${formatFinishTime(statisticalContext.confidenceInterval.p10)} to ${formatFinishTime(statisticalContext.confidenceInterval.p90)}`
            : undefined,
          recommendedSplitBike: statisticalContext.cohort.splitRecommendation?.bikePct,
          recommendedSplitRun: statisticalContext.cohort.splitRecommendation?.runPct,
          courseInfo: statisticalContext.course?.matched
            ? {
                courseName: statisticalContext.course.courseName ?? undefined,
                difficulty: statisticalContext.course.difficulty?.tier,
                medianFinishSec: statisticalContext.course.medianFinishSec ?? undefined,
              }
            : undefined,
          fadeInfo: statisticalContext.fadePrediction
            ? {
                paceSlowdownPct: statisticalContext.fadePrediction.paceSlowdownPct,
                estimatedTimeAddedSec: statisticalContext.fadePrediction.estimatedTimeAddedSec,
              }
            : undefined,
          weatherImpact: statisticalContext.weatherImpact
            ? {
                combinedImpactPct: statisticalContext.weatherImpact.combinedImpactPct,
                riskLevel: statisticalContext.weatherImpact.riskLevel,
              }
            : undefined,
          trendInfo: statisticalContext.trendAdjustment
            ? {
                adjustmentSec: statisticalContext.trendAdjustment.adjustmentSec,
                targetYear: statisticalContext.trendAdjustment.targetYear,
                segmentTrends: {
                  swim: statisticalContext.trendAdjustment.segmentTrends.swim.direction,
                  bike: statisticalContext.trendAdjustment.segmentTrends.bike.direction,
                  run: statisticalContext.trendAdjustment.segmentTrends.run.direction,
                },
              }
            : undefined,
        }
      : undefined;

    const narrative = await generateRaceNarrative({
      raceName: raceData.name,
      distanceCategory: raceData.distanceCategory,
      raceDate: raceDate.toLocaleDateString(),
      weatherTempC: weather.tempC,
      weatherHumidity: weather.humidity,
      swimPacePer100m: formatPaceStr(swimPacing.targetPaceSec),
      bikeTargetPower: bikePacing.targetPower,
      bikeSpeedKph: bikePacing.targetSpeedKph,
      runTargetPace: formatPaceStr(runPacing.targetPaceSec),
      carbsPerHour: nutrition.carbsPerHour,
      fluidPerHour: nutrition.fluidPerHour,
      predictedFinish: formatFinishTime(predictedFinishSec),
      elevationGainM: courseData.elevationGainM,
      athleteWeight: Number(athlete.weightKg) || undefined,
      statisticalInsights: statsForNarrative,
    });

    if (narrative) {
      await prisma.racePlan.update({
        where: { id: plan.id },
        data: { narrativePlan: narrative },
      });
    }
  }

  // 7. Increment plan count after successful creation
  await incrementPlanCount(userId);

  redirect(`/plan/${plan.id}`);
}

// Helpers
function parsePace(paceStr: string | null): number {
  if (!paceStr) return 0;
  const parts = paceStr.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 0;
}

function getSwimDist(cat: string): number {
  if (cat === "sprint") return 750;
  if (cat === "olympic") return 1500;
  if (cat === "70.3") return 1900;
  if (cat === "140.6") return 3800;
  return 1500;
}

function getRunDist(cat: string): number {
  if (cat === "sprint") return 5000;
  if (cat === "olympic") return 10000;
  if (cat === "70.3") return 21100;
  if (cat === "140.6") return 42200;
  return 10000;
}

function formatPaceStr(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatFinishTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
