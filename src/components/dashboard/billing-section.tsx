"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanKey } from "@/lib/stripe";
import { Check, Loader2 } from "lucide-react";

interface BillingSectionProps {
  currentPlan: string;
  plansUsed: number;
  plansLimit: number;
  seasonEndDate: Date | null;
  hasStripeCustomer: boolean;
}

export function BillingSection({
  currentPlan,
  plansUsed,
  plansLimit,
  seasonEndDate,
  hasStripeCustomer,
}: BillingSectionProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");

  const handleUpgrade = async (planKey: PlanKey) => {
    setLoading(planKey);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, billing: billingPeriod }),
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Billing & Usage</h2>
        <p className="text-muted-foreground">
          Manage your subscription and view your plan usage
        </p>
      </div>

      {/* Current Plan & Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Current Plan: {PLANS[currentPlan as PlanKey]?.name || "Free"}</CardTitle>
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
              {loading === "manage" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Manage Billing
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Billing Period Toggle */}
      {currentPlan === "free" && (
        <div className="flex justify-center gap-2">
          <Button
            variant={billingPeriod === "annual" ? "default" : "outline"}
            size="sm"
            onClick={() => setBillingPeriod("annual")}
          >
            Annual (Save 33%)
          </Button>
          <Button
            variant={billingPeriod === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => setBillingPeriod("monthly")}
          >
            Monthly
          </Button>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {(Object.keys(PLANS) as PlanKey[]).map((planKey) => {
          const plan = PLANS[planKey];
          const isCurrent = currentPlan === planKey;
          const price = billingPeriod === "annual" ? plan.annualPrice : plan.monthlyPrice;

          return (
            <Card key={planKey} className={isCurrent ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <div className="pt-2">
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-muted-foreground">
                    /{billingPeriod === "annual" ? "year" : "month"}
                  </span>
                </div>
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
                ) : planKey === "free" ? (
                  <Button disabled variant="ghost" className="w-full">
                    Downgrade to Free
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
                    {currentPlan === "free" ? "Upgrade" : "Switch Plan"}
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
