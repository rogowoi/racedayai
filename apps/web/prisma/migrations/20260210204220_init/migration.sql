-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "garminConnected" BOOLEAN NOT NULL DEFAULT false,
    "garminToken" JSONB,
    "stravaConnected" BOOLEAN NOT NULL DEFAULT false,
    "stravaToken" JSONB,
    "ftpWatts" INTEGER,
    "thresholdPaceSec" INTEGER,
    "cssPer100mSec" INTEGER,
    "maxHr" INTEGER,
    "restingHr" INTEGER,
    "weightKg" DECIMAL(5,1),
    "experienceLevel" TEXT NOT NULL DEFAULT 'beginner',
    "sweatRateMlHr" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceCourse" (
    "id" TEXT NOT NULL,
    "raceName" TEXT NOT NULL,
    "raceYear" INTEGER,
    "distanceCategory" TEXT NOT NULL,
    "location" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "swimDistanceM" INTEGER,
    "bikeDistanceM" INTEGER,
    "runDistanceM" INTEGER,
    "bikeGpxUrl" TEXT,
    "runGpxUrl" TEXT,
    "bikeElevationGainM" INTEGER,
    "runElevationGainM" INTEGER,
    "courseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaceCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RacePlan" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "raceDate" DATE NOT NULL,
    "goalType" TEXT NOT NULL DEFAULT 'finish_strong',
    "weatherData" JSONB,
    "altitudeM" INTEGER,
    "swimPlan" JSONB,
    "bikePlan" JSONB,
    "runPlan" JSONB,
    "nutritionPlan" JSONB,
    "transitionPlan" JSONB,
    "predictedFinishSec" INTEGER,
    "confidenceLowSec" INTEGER,
    "confidenceHighSec" INTEGER,
    "predictedSplits" JSONB,
    "narrativePlan" TEXT,
    "weatherWarnings" TEXT[],
    "pdfUrl" TEXT,
    "shareToken" VARCHAR(12),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RacePlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Athlete_userId_key" ON "Athlete"("userId");

-- CreateIndex
CREATE INDEX "Athlete_userId_idx" ON "Athlete"("userId");

-- CreateIndex
CREATE INDEX "RaceCourse_raceName_raceYear_idx" ON "RaceCourse"("raceName", "raceYear");

-- CreateIndex
CREATE UNIQUE INDEX "RacePlan_shareToken_key" ON "RacePlan"("shareToken");

-- CreateIndex
CREATE INDEX "RacePlan_athleteId_raceDate_idx" ON "RacePlan"("athleteId", "raceDate" DESC);

-- CreateIndex
CREATE INDEX "RacePlan_shareToken_idx" ON "RacePlan"("shareToken");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RacePlan" ADD CONSTRAINT "RacePlan_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RacePlan" ADD CONSTRAINT "RacePlan_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "RaceCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
