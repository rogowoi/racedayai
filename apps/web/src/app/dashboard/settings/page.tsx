import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { BillingSection } from "@/components/dashboard/billing-section";
import { getPlanUsage, resetPlanCount } from "@/lib/plan-limits";
import { ConnectedAccountsSection } from "@/components/dashboard/connected-accounts-section";
import { Navbar } from "@/components/layout/navbar";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, athlete] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: true,
        stripeCustomerId: true,
        plansCreatedThisSeason: true,
      },
    }),
    prisma.athlete.findUnique({
      where: { userId: session.user.id },
      select: {
        garminConnected: true,
        stravaConnected: true,
      },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  // If billing success and user is on a paid plan but has a non-zero count,
  // the webhook likely hasn't fired yet - reset it now to avoid confusion
  if (
    params.billing === "success" &&
    (user.plan === "season" || user.plan === "unlimited") &&
    user.plansCreatedThisSeason > 0
  ) {
    await resetPlanCount(session.user.id);
  }

  // Get usage after potential reset
  const usage = await getPlanUsage(session.user.id);

  if (!usage) {
    redirect("/login");
  }

  return (
    <>
      <Navbar />
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and subscription
          </p>
        </div>

        <ConnectedAccountsSection
          garminConnected={athlete?.garminConnected ?? false}
          stravaConnected={athlete?.stravaConnected ?? false}
        />

        <BillingSection
          currentPlan={user.plan}
          plansUsed={usage.plansUsed}
          plansLimit={usage.plansLimit}
          seasonEndDate={usage.seasonEndDate}
          hasStripeCustomer={!!user.stripeCustomerId}
          showSuccess={params.billing === "success"}
          showCancelled={params.billing === "cancelled"}
          autoUpgradePlan={
            typeof params.upgrade === "string" &&
            (params.upgrade === "season" || params.upgrade === "unlimited")
              ? (params.upgrade as "season" | "unlimited")
              : undefined
          }
          autoUpgradeBilling={
            typeof params.billing === "string" &&
            (params.billing === "monthly" || params.billing === "annual")
              ? (params.billing as "monthly" | "annual")
              : undefined
          }
        />
      </div>
    </>
  );
}
