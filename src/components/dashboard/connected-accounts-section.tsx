"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GarminConnectButton } from "@/components/garmin-connect-button";
import { GarminSyncButton } from "@/components/garmin-sync-button";
import { StravaSyncButton } from "@/components/strava-sync-button";
import { loginWithStrava } from "@/app/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Smartphone, Check } from "lucide-react";

interface ConnectedAccountsSectionProps {
  garminConnected: boolean;
  stravaConnected: boolean;
}

export function ConnectedAccountsSection({
  garminConnected,
  stravaConnected,
}: ConnectedAccountsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>
          Sync fitness data from your devices and training platforms
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Garmin */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <GarminConnectButton initialConnected={garminConnected} />
          </div>
          {garminConnected && (
            <GarminSyncButton variant="outline" size="sm" />
          )}
        </div>

        <div className="border-t" />

        {/* Strava */}
        <div className="space-y-3">
          {stravaConnected ? (
            <Button
              variant="outline"
              disabled
              className="w-full h-14 justify-start gap-4 text-base font-normal border-green-200 bg-green-50 dark:bg-green-950/20"
            >
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              Strava Connected
            </Button>
          ) : (
            <form action={loginWithStrava}>
              <Button
                variant="outline"
                type="submit"
                className="w-full h-14 justify-start gap-4 text-base font-normal"
              >
                <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-orange-600" />
                </div>
                Connect Strava
              </Button>
            </form>
          )}
          {stravaConnected && (
            <StravaSyncButton variant="outline" size="sm" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
