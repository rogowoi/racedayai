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

export async function generateRacePlan(formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id; // Allow anonymous for now? No, require auth or create mock user

  // Extract data
  // Note: We expect JSON strings for complex objects or individual fields
  const fitnessData = JSON.parse(formData.get("fitnessData") as string);
  const raceData = JSON.parse(formData.get("raceData") as string);
  const gpxFile = formData.get("gpxFile") as File;

  // 1. Create/Update User & Athlete
  // For MVP, if no user, we might create a temporary one or fail.
  // We'll require user to be logged in for now, OR valid email provided.
  // As a fallback, if no session, we skip DB or create a guest user (not implemented).
  if (!userId) {
    throw new Error("User must be logged in");
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

  // 2. Parse GPX
  let courseData: CourseData = {
    totalDistanceM: 90000,
    elevationGainM: 500,
    points: [],
  };

  if (gpxFile && gpxFile.size > 0) {
    const text = await gpxFile.text();
    courseData = parseGpx(text);
  } else {
    // Fallback if no GPX (use defaults based on distance category)
    if (raceData.distanceCategory === "70.3") {
      courseData.totalDistanceM = 90000;
      courseData.elevationGainM = 600;
    } else if (raceData.distanceCategory === "140.6") {
      courseData.totalDistanceM = 180000;
      courseData.elevationGainM = 1200;
    }
  }

  // 3. Get Weather (Mock location for now or parse from GPX first point if available)
  // Default to Dubai logic if 'Dubai' in name
  let lat = 52.52; // Berlin
  let lon = 13.41;

  if (courseData.points.length > 0) {
    lat = courseData.points[0].lat;
    lon = courseData.points[0].lon;
  }

  // Use today if no date
  const raceDate = raceData.date ? new Date(raceData.date) : new Date();

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

  // 5. Save RacePlan
  // Create Course first
  const course = await prisma.raceCourse.create({
    data: {
      raceName: raceData.name,
      distanceCategory: raceData.distanceCategory,
      bikeDistanceM: courseData.totalDistanceM,
      bikeElevationGainM: courseData.elevationGainM,
      // ... store full gpx url later
    },
  });

  const plan = await prisma.racePlan.create({
    data: {
      athleteId: athlete.id,
      courseId: course.id,
      raceDate: raceDate,
      weatherData: weather as any,
      swimPlan: swimPacing as any,
      bikePlan: bikePacing as any,
      runPlan: runPacing as any,
      nutritionPlan: nutrition as any,
      predictedFinishSec:
        (swimPacing.estimatedTimeMin +
          bikePacing.durationMinutes +
          runPacing.estimatedTimeMin) *
        60,
    },
  });

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
