-- AlterTable
ALTER TABLE "RacePlan" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "generationInput" JSONB,
ADD COLUMN     "gpxFileKey" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'completed';
