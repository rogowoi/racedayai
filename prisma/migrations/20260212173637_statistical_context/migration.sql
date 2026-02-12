-- AlterTable
ALTER TABLE "RacePlan" ADD COLUMN     "statisticalContext" JSONB;

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL,
    "gender" TEXT,
    "ageGroup" TEXT,
    "age" INTEGER,
    "country" TEXT,
    "eventYear" INTEGER NOT NULL,
    "eventLocation" TEXT,
    "swimTimeSec" DOUBLE PRECISION NOT NULL,
    "bikeTimeSec" DOUBLE PRECISION NOT NULL,
    "runTimeSec" DOUBLE PRECISION NOT NULL,
    "transitionTimeSec" DOUBLE PRECISION,
    "totalTimeSec" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'kaggle',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaceResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortDistribution" (
    "id" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "distance" TEXT NOT NULL,
    "discipline" TEXT NOT NULL,
    "mu" DOUBLE PRECISION NOT NULL,
    "sigma" DOUBLE PRECISION NOT NULL,
    "n" INTEGER NOT NULL,
    "p10" DOUBLE PRECISION NOT NULL,
    "p25" DOUBLE PRECISION NOT NULL,
    "p50" DOUBLE PRECISION NOT NULL,
    "p75" DOUBLE PRECISION NOT NULL,
    "p90" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CohortDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherRecord" (
    "id" TEXT NOT NULL,
    "eventLocation" TEXT NOT NULL,
    "eventYear" INTEGER NOT NULL,
    "eventDate" TIMESTAMP(3),
    "tempC" DOUBLE PRECISION,
    "humidityPct" DOUBLE PRECISION,
    "windKph" DOUBLE PRECISION,
    "conditions" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeatherRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanOutcome" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "actualSwimSec" DOUBLE PRECISION,
    "actualBikeSec" DOUBLE PRECISION,
    "actualRunSec" DOUBLE PRECISION,
    "actualTotalSec" DOUBLE PRECISION,
    "weatherConditions" TEXT,
    "reportedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteTrainingFeature" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "weeklyTssAvg" DOUBLE PRECISION,
    "longRideHrs" DOUBLE PRECISION,
    "longRunKm" DOUBLE PRECISION,
    "ftpTrend" DOUBLE PRECISION,
    "volumeTrend" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteTrainingFeature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RaceResult_eventYear_eventLocation_idx" ON "RaceResult"("eventYear", "eventLocation");

-- CreateIndex
CREATE INDEX "RaceResult_gender_ageGroup_idx" ON "RaceResult"("gender", "ageGroup");

-- CreateIndex
CREATE INDEX "CohortDistribution_gender_ageGroup_idx" ON "CohortDistribution"("gender", "ageGroup");

-- CreateIndex
CREATE UNIQUE INDEX "CohortDistribution_gender_ageGroup_distance_discipline_key" ON "CohortDistribution"("gender", "ageGroup", "distance", "discipline");

-- CreateIndex
CREATE INDEX "WeatherRecord_eventYear_eventLocation_idx" ON "WeatherRecord"("eventYear", "eventLocation");

-- CreateIndex
CREATE INDEX "PlanOutcome_planId_idx" ON "PlanOutcome"("planId");

-- CreateIndex
CREATE INDEX "AthleteTrainingFeature_athleteId_periodStart_idx" ON "AthleteTrainingFeature"("athleteId", "periodStart" DESC);

-- AddForeignKey
ALTER TABLE "PlanOutcome" ADD CONSTRAINT "PlanOutcome_planId_fkey" FOREIGN KEY ("planId") REFERENCES "RacePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteTrainingFeature" ADD CONSTRAINT "AthleteTrainingFeature_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;
