import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { BillingSection } from "@/components/dashboard/billing-section";
import { getPlanUsage } from "@/lib/plan-limits";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, usage] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: true,
        stripeCustomerId: true,
      },
    }),
    getPlanUsage(session.user.id),
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

      <BillingSection
        currentPlan={user.plan}
        plansUsed={usage.plansUsed}
        plansLimit={usage.plansLimit}
        seasonEndDate={usage.seasonEndDate}
        hasStripeCustomer={!!user.stripeCustomerId}
      />
    </div>
  );
}
