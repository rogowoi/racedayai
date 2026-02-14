"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLANS, getAnnualSavingsLabel, type PlanKey } from "@/lib/plans";
import { Check, Loader2, ArrowRight, LayoutDashboard } from "lucide-react";

interface BillingSectionProps {
  currentPlan: string;
  plansUsed: number;
  plansLimit: number;
  seasonEndDate: Date | null;
  hasStripeCustomer: boolean;
  showSuccess?: boolean;
  showCancelled?: boolean;
  autoUpgradePlan?: "season" | "unlimited";
}

export function BillingSection({
  currentPlan,
  plansUsed,
  plansLimit,
  seasonEndDate,
  hasStripeCustomer,
  showSuccess,
  showCancelled,
  autoUpgradePlan,
}: BillingSectionProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const autoUpgradeTriggered = useRef(false);

  const handleUpgrade = async (planKey: PlanKey) => {
    setLoading(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });

      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      } else {
        alert("Failed to start checkout. Please try again.");
      }
    } finally {
      setLoading(null);
    }
  };

  // Auto-trigger checkout when redirected from signup with a plan selection
  useEffect(() => {
    if (autoUpgradePlan && !autoUpgradeTriggered.current) {
      autoUpgradeTriggered.current = true;
      handleUpgrade(autoUpgradePlan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoUpgradePlan]);

  const handleManageBilling = async () => {
    setLoading("manage");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        window.location.href = data.url;
      } else {
        alert("Failed to open billing portal. Please try again.");
      }
    } finally {
      setLoading(null);
    }
  };

  const isUnlimited = plansLimit === Infinity;
  const isPaid = currentPlan === "season" || currentPlan === "unlimited";

  return (
    <div className="space-y-6">
      {showSuccess && (
        <div className="bg-green-100 border border-green-200 text-green-800 px-4 py-4 rounded-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-3">
            <Check className="h-5 w-5 flex-shrink-0" />
            <p className="font-medium">
              Payment successful! Your subscription has been updated.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 ml-7">
            <Button size="sm" variant="default" asChild className="bg-green-700 hover:bg-green-800">
              <Link href="/wizard">
                Create Your First Plan
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button size="sm" variant="outline" asChild className="border-green-700 text-green-800 hover:bg-green-50">
              <Link href="/dashboard">
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      )}

      {showCancelled && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md animate-in fade-in slide-in-from-top-2">
          <p className="font-medium">
            Payment cancelled. No charges were made.
          </p>
        </div>
      )}

      <div id="billing" className="scroll-mt-24">
        <h2 className="text-2xl font-bold tracking-tight">Billing & Usage</h2>
        <p className="text-muted-foreground">
          Manage your subscription and view your plan usage
        </p>
      </div>

      {/* Current Plan & Usage */}
      <Card>
        <CardHeader>
          <CardTitle>
            Current Plan: {PLANS[currentPlan as PlanKey]?.name || "Starter"}
          </CardTitle>
          <CardDescription>
            {isUnlimited ? (
              "Unlimited race plans"
            ) : (
              <>
                {plansUsed} of {plansLimit} plans used this season
                {seasonEndDate && (
                  <span className="block mt-1">
                    Season ends: {seasonEndDate.toLocaleDateString()}
                  </span>
                )}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isUnlimited && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage</span>
                <span className="font-medium">
                  {plansUsed} / {plansLimit}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min((plansUsed / plansLimit) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}

          {hasStripeCustomer && (
            <Button
              onClick={handleManageBilling}
              disabled={loading === "manage"}
              variant="outline"
              className="w-full mt-4"
            >
              {loading === "manage" && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Manage Billing
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {(Object.keys(PLANS) as PlanKey[]).map((planKey) => {
          const plan = PLANS[planKey];
          const isCurrent = currentPlan === planKey;
          const price = plan.annualPrice;

          // Determine if this plan is a downgrade
          const planOrder = { free: 0, season: 1, unlimited: 2 } as const;
          const isDowngrade =
            (planOrder[planKey] ?? 0) < (planOrder[currentPlan as PlanKey] ?? 0);

          return (
            <Card key={planKey} className={isCurrent ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="pt-2">
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-muted-foreground">
                    {planKey === "free" ? "/forever" : "/year"}
                  </span>
                </div>
                {planKey !== "free" && getAnnualSavingsLabel(planKey) && (
                  <div className="pt-2">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800 dark:bg-green-950/50 dark:text-green-400">
                      {getAnnualSavingsLabel(planKey)}
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <Button disabled variant="outline" className="w-full">
                    Current Plan
                  </Button>
                ) : isDowngrade && hasStripeCustomer ? (
                  <Button
                    onClick={handleManageBilling}
                    disabled={loading === "manage"}
                    variant="ghost"
                    className="w-full"
                  >
                    {loading === "manage" && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Downgrade via Billing Portal
                  </Button>
                ) : isDowngrade ? (
                  <Button disabled variant="ghost" className="w-full">
                    Free Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleUpgrade(planKey)}
                    disabled={loading === planKey}
                    className="w-full"
                  >
                    {loading === planKey && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isPaid ? "Switch Plan" : "Upgrade"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
