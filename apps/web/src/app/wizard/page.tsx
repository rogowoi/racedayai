"use client";

import { useEffect, useState } from "react";
import { useWizardStore } from "@/stores/wizard-store";
import { Step1Fitness } from "@/components/wizard/step-1-fitness";
import { Step2Race } from "@/components/wizard/step-2-race";
import { Step3Course } from "@/components/wizard/step-3-course";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function WizardPage() {
  const step = useWizardStore((state) => state.step);
  const setStep = useWizardStore((state) => state.setStep);
  const [mounted, setMounted] = useState(false);
  const [checking, setChecking] = useState(true);
  const [planLimit, setPlanLimit] = useState<{
    canCreate: boolean;
    needsAuth?: boolean;
    usage?: {
      plan: string;
      plansUsed: number;
      plansLimit: number | "Unlimited";
      isUnlimited: boolean;
    };
  } | null>(null);
  const router = useRouter();

  // Check plan limits on mount
  useEffect(() => {
    async function checkLimits() {
      try {
        const res = await fetch("/api/plans/check-limit");
        const data = await res.json();

        if (res.status === 401 && data.needsAuth) {
          // Not authenticated - redirect to login
          router.push("/signup?callbackUrl=" + encodeURIComponent("/wizard"));
          return;
        }

        setPlanLimit(data);
        setChecking(false);
        setMounted(true);
      } catch {
        setChecking(false);
        setMounted(true);
      }
    }

    checkLimits();
  }, [router]);

  useEffect(() => {
    if (planLimit && !planLimit.canCreate && step !== 1) {
      setStep(1);
    }
  }, [planLimit, setStep, step]);

  if (!mounted || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading wizard...</p>
        </div>
      </div>
    );
  }

  // Show upgrade prompt if user has hit plan limit
  if (planLimit && !planLimit.canCreate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-lg">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Plan Limit Reached</h2>
                <p className="text-muted-foreground">
                  You've used {planLimit.usage?.plansUsed} of {planLimit.usage?.plansLimit} race plans on your{" "}
                  <span className="font-medium">{planLimit.usage?.plan}</span> plan.
                </p>
                <p className="text-sm text-muted-foreground">
                  Upgrade to create more personalized race strategies and unlock premium features like GPX analysis, weather integration, and PDF exports.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild className="flex-1">
                <Link href="/pricing">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  See Pricing
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {step === 1 && <Step1Fitness />}
      {step === 2 && <Step2Race />}
      {step === 3 && <Step3Course />}
    </>
  );
}
