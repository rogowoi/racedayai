"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Smartphone, ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { loginWithStrava } from "@/app/actions/auth-actions";

interface EngagementHookProps {
  hasStrava: boolean;
  hasGarmin: boolean;
  hasFtp: boolean;
  hasThresholdPace: boolean;
}

export function EngagementHook({
  hasStrava,
  hasGarmin,
  hasFtp,
  hasThresholdPace,
}: EngagementHookProps) {
  const isFullyConnected = (hasStrava || hasGarmin) && hasFtp && hasThresholdPace;

  // Fully connected users just see the CTA
  if (isFullyConnected) return null;

  const needsConnection = !hasStrava && !hasGarmin;
  const needsMetrics = !hasFtp || !hasThresholdPace;

  return (
    <Card className="border-dashed">
      <CardContent className="py-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            {needsConnection ? (
              <>
                <p className="text-sm font-medium">
                  Connect your training data for better predictions
                </p>
                <p className="text-xs text-muted-foreground">
                  Athletes with connected accounts get more accurate pacing targets
                </p>
              </>
            ) : needsMetrics ? (
              <>
                <p className="text-sm font-medium">
                  Add your performance thresholds for precision pacing
                </p>
                <p className="text-xs text-muted-foreground">
                  {!hasFtp && "Add your bike FTP"}
                  {!hasFtp && !hasThresholdPace && " and "}
                  {!hasThresholdPace && "run threshold pace"}
                  {" "}to unlock personalized power and pace targets
                </p>
              </>
            ) : null}
          </div>
          <div className="flex gap-2 shrink-0">
            {needsConnection && (
              <form action={loginWithStrava}>
                <Button variant="outline" size="sm" type="submit">
                  <Smartphone className="mr-1.5 h-3.5 w-3.5" />
                  Connect Strava
                </Button>
              </form>
            )}
            {needsMetrics && !needsConnection && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/wizard">
                  Update Profile
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
