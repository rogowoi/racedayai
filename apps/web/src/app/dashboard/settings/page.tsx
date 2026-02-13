import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { BillingSection } from "@/components/dashboard/billing-section";
import { getPlanUsage } from "@/lib/plan-limits";
import { ConnectedAccountsSection } from "@/components/dashboard/connected-accounts-section";

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

  const [user, usage, athlete] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: true,
        stripeCustomerId: true,
      },
    }),
    getPlanUsage(session.user.id),
    prisma.athlete.findUnique({
      where: { userId: session.user.id },
      select: {
        garminConnected: true,
        stravaConnected: true,
      },
    }),
  ]);

  if (!user || !usage) {
    redirect("/login");
  }

  return (
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
  );
}
