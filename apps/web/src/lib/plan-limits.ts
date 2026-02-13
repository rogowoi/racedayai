import { prisma } from "@/lib/db";
import { getPlanLimits } from "@/lib/stripe";

const SEASON_DURATION_DAYS = 365;

/**
 * Check if a user has reached their plan limit for race plan creation
 */
export async function checkCanCreatePlan(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      plansCreatedThisSeason: true,
      seasonStartDate: true,
    },
  });

  if (!user) {
    return false;
  }

  const planLimits = getPlanLimits(user.plan);

  // Unlimited plan has no restrictions
  if (planLimits.maxPlansPerSeason === Infinity) {
    return true;
  }

  // Check if season has expired and needs reset
  if (user.seasonStartDate) {
    const daysSinceSeasonStart = Math.floor(
      (Date.now() - user.seasonStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSeasonStart >= SEASON_DURATION_DAYS) {
      // Season expired - reset counter
      await prisma.user.update({
        where: { id: userId },
        data: {
          plansCreatedThisSeason: 0,
          seasonStartDate: new Date(),
        },
      });
      return true;
    }
  }

  // Check if user is within their limit
  return user.plansCreatedThisSeason < planLimits.maxPlansPerSeason;
}

/**
 * Increment the user's plan count and set season start date if needed
 */
export async function incrementPlanCount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { seasonStartDate: true, plansCreatedThisSeason: true },
  });

  if (!user) {
    return;
  }

  // Set season start date if this is the first plan
  const seasonStartDate = user.seasonStartDate ?? new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      plansCreatedThisSeason: user.plansCreatedThisSeason + 1,
      seasonStartDate,
    },
  });
}

/**
 * Get user's plan usage statistics
 */
export async function getPlanUsage(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      plansCreatedThisSeason: true,
      seasonStartDate: true,
    },
  });

  if (!user) {
    return null;
  }

  const planLimits = getPlanLimits(user.plan);
  const seasonEndDate = user.seasonStartDate
    ? new Date(
        user.seasonStartDate.getTime() +
          SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000
      )
    : null;

  return {
    plan: user.plan,
    plansUsed: user.plansCreatedThisSeason,
    plansLimit: planLimits.maxPlansPerSeason,
    seasonStartDate: user.seasonStartDate,
    seasonEndDate,
    isUnlimited: planLimits.maxPlansPerSeason === Infinity,
  };
}

/**
 * Decrement the user's plan count (used when async generation fails)
 */
export async function decrementPlanCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plansCreatedThisSeason: { decrement: 1 },
    },
  });
}

/**
 * Reset plan count when user upgrades (start fresh season)
 */
export async function resetPlanCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plansCreatedThisSeason: 0,
      seasonStartDate: new Date(),
    },
  });
}
