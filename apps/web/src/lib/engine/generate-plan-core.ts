import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  calculateBikePacing,
  calculateRunPacing,
  calculateSwimPacing,
} from "@/lib/engine/pacing";
import {
  calculateNutrition,
  calculateSegmentedNutrition,
} from "@/lib/engine/nutrition";
import { parseGpx, type CourseData } from "@/lib/engine/gpx";
import { getRaceWeather } from "@/lib/weather";
import { generateRaceNarrative } from "@/lib/engine/narrative";
import {
  buildFullContext,
  type Gender,
  type FullStatisticalContext,
} from "@/lib/engine/statistics";
import { getRaceById } from "@/lib/race-registry";
import { isPaidPlan } from "@/lib/plans";
import { downloadGpx } from "@/lib/r2";
import {
  findMatchingCourse,
  getTransitionEstimate,
} from "@/lib/engine/course-model";

// ── Types ───────────────────────────────────────────────────

export interface GeneratePlanInput {
  userId: string;
  planId: string;
  fitnessData: {
    ftp: number | null;
    weight: number | null;
    thresholdPace: string | null;
    css: string | null;
    experienceLevel: string;
    gender?: string | null;
    age?: number | null;
  };
  raceData: {
    name: string;
    date: string | null;
    distanceCategory: string;
    selectedRaceId: string | null;
    raceLocation?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  rwgpsCourseData?: {
    source: string;
    rwgpsId: number;
    rwgpsType: string;
    totalDistanceM: number;
    elevationGainM: number;
  } | null;
  gpxFileKey?: string | null;
}

// ── Step 1: Prepare (resolve course + weather) ──────────────

export async function prepareStep(input: GeneratePlanInput) {
  const { planId, raceData, gpxFileKey } = input;

  // Update status to generating
  await prisma.racePlan.update({
    where: { id: planId },
    data: { status: "generating" },
  });

  // Resolve course data
  const registryRace = raceData.selectedRaceId
    ? getRaceById(raceData.selectedRaceId)
    : null;

  let courseData: CourseData = {
    totalDistanceM: 90000,
    elevationGainM: 500,
    points: [],
  };
  let gpxSource: "upload" | "rwgps" | "registry" | "default" = "default";

  if (gpxFileKey) {
    // Download GPX from R2 and parse
    const gpxText = await downloadGpx(gpxFileKey);
    courseData = parseGpx(gpxText);
    gpxSource = "upload";
  } else if (input.rwgpsCourseData?.totalDistanceM) {
    courseData.totalDistanceM = input.rwgpsCourseData.totalDistanceM;
    courseData.elevationGainM = input.rwgpsCourseData.elevationGainM || 500;
    gpxSource = "rwgps";
  } else if (registryRace) {
    courseData.totalDistanceM = registryRace.bikeDistanceM;
    courseData.elevationGainM = registryRace.bikeElevationGainM || 500;
    gpxSource = "registry";
  } else {
    // Fallback defaults based on distance category
    const defaults: Record<string, { dist: number; elev: number }> = {
      sprint: { dist: 20000, elev: 200 },
      olympic: { dist: 40000, elev: 300 },
      "70.3": { dist: 90000, elev: 600 },
      "140.6": { dist: 180000, elev: 1200 },
    };
    const d = defaults[raceData.distanceCategory];
    if (d) {
      courseData.totalDistanceM = d.dist;
      courseData.elevationGainM = d.elev;
    }
  }

  // Resolve coordinates
  let lat = 52.52;
  let lon = 13.41;
  if (courseData.points.length > 0) {
    lat = courseData.points[0].lat;
    lon = courseData.points[0].lon;
  } else if (raceData.latitude && raceData.longitude) {
    lat = raceData.latitude;
    lon = raceData.longitude;
  } else if (registryRace?.latitude && registryRace?.longitude) {
    lat = registryRace.latitude;
    lon = registryRace.longitude;
  }

  const raceDate = raceData.date ? new Date(raceData.date) : new Date();

  // Fetch weather
  const weather = await getRaceWeather(lat, lon, raceDate);

  // Build GPX URL for DB storage
  const bikeGpxUrl =
    gpxSource === "rwgps" && input.rwgpsCourseData?.rwgpsId
      ? `https://ridewithgps.com/${input.rwgpsCourseData.rwgpsType === "route" ? "routes" : "trips"}/${input.rwgpsCourseData.rwgpsId}.gpx`
      : registryRace?.gpx?.bikeUrl || null;

  // Update course record with resolved data
  const plan = await prisma.racePlan.findUniqueOrThrow({
    where: { id: planId },
    select: { courseId: true },
  });

  await prisma.raceCourse.update({
    where: { id: plan.courseId },
    data: {
      location: raceData.raceLocation || registryRace?.location || null,
      latitude: raceData.latitude || registryRace?.latitude || null,
      longitude: raceData.longitude || registryRace?.longitude || null,
      swimDistanceM:
        registryRace?.swimDistanceM || getSwimDist(raceData.distanceCategory),
      bikeDistanceM: courseData.totalDistanceM,
      runDistanceM:
        registryRace?.runDistanceM || getRunDist(raceData.distanceCategory),
      bikeElevationGainM: courseData.elevationGainM,
      runElevationGainM: registryRace?.runElevationGainM || null,
      bikeGpxUrl,
      runGpxUrl: registryRace?.gpx?.runUrl || null,
    },
  });

  // Save weather to plan
  await prisma.racePlan.update({
    where: { id: planId },
    data: { weatherData: weather },
  });

  // Return data needed by next steps
  return {
    courseData,
    weather,
    raceDate: raceDate.toISOString(),
    lat,
    lon,
    registryRace: registryRace
      ? { id: registryRace.id, location: registryRace.location }
      : null,
  };
}

// ── Step 2: Compute (pacing + nutrition + statistics) ───────

export async function computeStep(
  input: GeneratePlanInput,
  prepareResult: Awaited<ReturnType<typeof prepareStep>>,
) {
  const { planId, fitnessData, raceData } = input;
  const { courseData, weather, raceDate: raceDateStr } = prepareResult;

  const raceDate = new Date(raceDateStr);
  const raceYear = raceDate.getFullYear();

  // Get athlete from DB
  const athlete = await prisma.athlete.findUniqueOrThrow({
    where: { userId: input.userId },
  });

  // Swim pacing
  const swimDist = getSwimDist(raceData.distanceCategory);
  const swimPacing = calculateSwimPacing(
    athlete.cssPer100mSec || 120,
    swimDist,
  );

  // Bike pacing
  const bikePacing = calculateBikePacing({
    ftp: athlete.ftpWatts || 200,
    courseDistanceKm: courseData.totalDistanceM / 1000,
    elevationGainM: courseData.elevationGainM,
    userWeightKg: Number(athlete.weightKg) || 75,
  });

  // Run pacing
  const runDist = getRunDist(raceData.distanceCategory);
  const runPacing = calculateRunPacing(
    athlete.thresholdPaceSec || 300,
    runDist / 1000,
    bikePacing.tss,
  );

  // Transition time estimate (venue-specific or defaults)
  const courseKey = await findMatchingCourse(raceData.name);
  const transitionEstimate = await getTransitionEstimate(
    courseKey,
    raceData.distanceCategory,
  );

  const t1Min = transitionEstimate.t1Sec / 60;
  const t2Min = transitionEstimate.t2Sec / 60;

  // Nutrition
  const totalDurationHours =
    (swimPacing.estimatedTimeMin +
      t1Min +
      bikePacing.durationMinutes +
      t2Min +
      runPacing.estimatedTimeMin) /
    60;
  const baseNutrition = calculateNutrition(
    Number(athlete.weightKg) || 75,
    totalDurationHours,
    weather.tempC,
  );

  // Segmented nutrition timeline
  const segmented = calculateSegmentedNutrition({
    swimDurationMin: swimPacing.estimatedTimeMin,
    bikeDurationMin: bikePacing.durationMinutes,
    runDurationMin: runPacing.estimatedTimeMin,
    temperatureC: weather.tempC,
    carbsPerHour: baseNutrition.carbsPerHour,
    sodiumPerHour: baseNutrition.sodiumPerHour,
    fluidPerHour: baseNutrition.fluidPerHour,
    distanceCategory: raceData.distanceCategory,
    t1DurationMin: t1Min,
    t2DurationMin: t2Min,
  });

  const nutrition = { ...baseNutrition, ...segmented };

  // Predicted finish (swim + T1 + bike + T2 + run)
  const predictedFinishSec =
    (swimPacing.estimatedTimeMin +
      bikePacing.durationMinutes +
      runPacing.estimatedTimeMin) *
      60 +
    transitionEstimate.totalTransitionSec;

  // Statistical context
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

  // Build transition plan
  const transitionPlan = {
    t1Sec: transitionEstimate.t1Sec,
    t2Sec: transitionEstimate.t2Sec,
    totalTransitionSec: transitionEstimate.totalTransitionSec,
    source: transitionEstimate.source,
    venueName: transitionEstimate.venueName ?? null,
  };

  // Save all computed data to plan
  await prisma.racePlan.update({
    where: { id: planId },
    data: {
      swimPlan: swimPacing,
      bikePlan: bikePacing,
      runPlan: runPacing,
      nutritionPlan: nutrition,
      transitionPlan,
      statisticalContext: JSON.parse(JSON.stringify(statisticalContext)),
      predictedFinishSec,
    },
  });

  return {
    swimPacing,
    bikePacing,
    runPacing,
    nutrition,
    transitionPlan,
    statisticalContext,
    predictedFinishSec,
  };
}

// ── Step 3: Narrative + finalize ────────────────────────────

export async function narrativeStep(
  input: GeneratePlanInput,
  prepareResult: Awaited<ReturnType<typeof prepareStep>>,
  computeResult: Awaited<ReturnType<typeof computeStep>>,
) {
  const { planId, raceData } = input;
  const { courseData, weather, raceDate: raceDateStr } = prepareResult;
  const {
    swimPacing,
    bikePacing,
    runPacing,
    nutrition,
    statisticalContext,
    predictedFinishSec,
  } = computeResult;

  const raceDate = new Date(raceDateStr);

  // Check if user is on a paid plan
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { plan: true },
  });

  if (user && isPaidPlan(user.plan)) {
    const statsForNarrative = buildNarrativeStats(statisticalContext);

    const athlete = await prisma.athlete.findUniqueOrThrow({
      where: { userId: input.userId },
      select: { weightKg: true },
    });

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
        where: { id: planId },
        data: { narrativePlan: narrative },
      });
    }
  }

  // Mark as completed
  await prisma.racePlan.update({
    where: { id: planId },
    data: { status: "completed", generationInput: Prisma.DbNull },
  });
}

// ── Helpers ─────────────────────────────────────────────────

function buildNarrativeStats(ctx: FullStatisticalContext) {
  if (!ctx.available || !ctx.cohort) return undefined;
  return {
    cohortSize: ctx.cohort.sampleSize,
    percentilePlacement: ctx.cohort.percentilePlacement?.label,
    fasterThanPct: ctx.cohort.percentilePlacement?.fasterThanPct,
    confidenceRange: ctx.confidenceInterval
      ? `${formatFinishTime(ctx.confidenceInterval.p10)} to ${formatFinishTime(ctx.confidenceInterval.p90)}`
      : undefined,
    recommendedSplitBike: ctx.cohort.splitRecommendation?.bikePct,
    recommendedSplitRun: ctx.cohort.splitRecommendation?.runPct,
    courseInfo: ctx.course?.matched
      ? {
          courseName: ctx.course.courseName ?? undefined,
          difficulty: ctx.course.difficulty?.tier,
          medianFinishSec: ctx.course.medianFinishSec ?? undefined,
        }
      : undefined,
    fadeInfo: ctx.fadePrediction
      ? {
          paceSlowdownPct: ctx.fadePrediction.paceSlowdownPct,
          estimatedTimeAddedSec: ctx.fadePrediction.estimatedTimeAddedSec,
        }
      : undefined,
    weatherImpact: ctx.weatherImpact
      ? {
          combinedImpactPct: ctx.weatherImpact.combinedImpactPct,
          riskLevel: ctx.weatherImpact.riskLevel,
        }
      : undefined,
    trendInfo: ctx.trendAdjustment
      ? {
          adjustmentSec: ctx.trendAdjustment.adjustmentSec,
          targetYear: ctx.trendAdjustment.targetYear,
          segmentTrends: {
            swim: ctx.trendAdjustment.segmentTrends.swim.direction,
            bike: ctx.trendAdjustment.segmentTrends.bike.direction,
            run: ctx.trendAdjustment.segmentTrends.run.direction,
          },
        }
      : undefined,
  };
}

export function parsePace(paceStr: string | null): number {
  if (!paceStr) return 0;
  const parts = paceStr.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 0;
}

export function getSwimDist(cat: string): number {
  if (cat === "sprint") return 750;
  if (cat === "olympic") return 1500;
  if (cat === "70.3") return 1900;
  if (cat === "140.6") return 3800;
  return 1500;
}

export function getRunDist(cat: string): number {
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
