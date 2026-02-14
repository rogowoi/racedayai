"use client";

import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Smartphone, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { loginWithStrava } from "@/app/actions/auth-actions";
import { GarminConnectButton } from "@/components/garmin-connect-button";
import { FtpEstimator } from "@/components/wizard/ftp-estimator";
import { CssEstimator } from "@/components/wizard/css-estimator";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function Step1Fitness() {
  const { fitnessData, setFitnessData, setStep } = useWizardStore();
  const searchParams = useSearchParams();
  const garminError = searchParams.get("garmin_error");
  const garminConnected = searchParams.get("garmin_connected");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");

  const handleNext = () => {
    // Basic validation
    if (!fitnessData.ftp && !fitnessData.thresholdPace) {
      // Allow proceeding but maybe warn? For MVP just proceed.
    }
    setStep(2);
  };

  const handleWeightChange = (value: number) => {
    // Always store as kg internally
    const kgValue = weightUnit === "lb" ? value / 2.20462 : value;
    setFitnessData({ weight: Math.round(kgValue * 10) / 10 });
  };

  const getDisplayWeight = () => {
    if (!fitnessData.weight) return "";
    if (weightUnit === "lb") {
      return Math.round(fitnessData.weight * 2.20462);
    }
    return fitnessData.weight;
  };

  const toggleWeightUnit = () => {
    setWeightUnit((prev) => (prev === "kg" ? "lb" : "kg"));
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Your Fitness Profile
          </h1>
          <p className="text-muted-foreground">
            Connect your accounts or enter data manually to get accurate pacing
            targets.
          </p>
        </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="connect">Connect Apps</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Physiology</CardTitle>
              <CardDescription>
                Basic metrics for pacing calculations. Gender & age unlock
                data-driven insights from 840K+ race records.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={fitnessData.gender || ""}
                    onValueChange={(val: any) =>
                      setFitnessData({ gender: val })
                    }
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Male</SelectItem>
                      <SelectItem value="F">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="35"
                    min={14}
                    max={99}
                    value={fitnessData.age || ""}
                    onChange={(e) =>
                      setFitnessData({ age: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="weight">Weight</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={toggleWeightUnit}
                    >
                      {weightUnit === "kg" ? "Switch to lb" : "Switch to kg"}
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="weight"
                      type="number"
                      placeholder={weightUnit === "kg" ? "75" : "165"}
                      value={getDisplayWeight()}
                      onChange={(e) =>
                        handleWeightChange(Number(e.target.value))
                      }
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {weightUnit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="ftp">Bike FTP (W)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px]">
                          <p>
                            Functional Threshold Power: the highest power you can
                            sustain for ~1 hour. Used to calculate your bike pacing.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <FtpEstimator
                      onEstimate={(ftp) => setFitnessData({ ftp })}
                    />
                  </div>
                  <Input
                    id="ftp"
                    type="number"
                    placeholder="250 (optional)"
                    value={fitnessData.ftp || ""}
                    onChange={(e) =>
                      setFitnessData({ ftp: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="pace">Run Threshold (min/km)</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-muted-foreground hover:text-foreground">
                          <HelpCircle className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p>
                          Your threshold pace: the fastest pace you can hold for
                          ~1 hour of running. Used to calculate your run pacing.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="pace"
                    type="text"
                    placeholder="4:45 (optional)"
                    value={fitnessData.thresholdPace || ""}
                    onChange={(e) =>
                      setFitnessData({ thresholdPace: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="css">Swim CSS (min/100m)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground">
                            <HelpCircle className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px]">
                          <p>
                            Critical Swim Speed: your sustainable swim pace per 100
                            meters. Used to calculate your swim pacing strategy.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <CssEstimator
                      onEstimate={(css) => setFitnessData({ css })}
                    />
                  </div>
                  <Input
                    id="css"
                    type="text"
                    placeholder="1:45 (optional)"
                    value={fitnessData.css || ""}
                    onChange={(e) => setFitnessData({ css: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Triathlon Experience</Label>
                <Select
                  value={fitnessData.experienceLevel}
                  onValueChange={(val: any) =>
                    setFitnessData({ experienceLevel: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">
                      Beginner (First Race)
                    </SelectItem>
                    <SelectItem value="intermediate">
                      Intermediate (2-5 Races)
                    </SelectItem>
                    <SelectItem value="advanced">
                      Advanced (Competitive)
                    </SelectItem>
                    <SelectItem value="elite">Elite / Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connect" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sync Data</CardTitle>
              <CardDescription>
                Auto-import FTP, HR zones, and recent performances
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {garminConnected && (
                <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2 p-2 rounded-md bg-green-50 dark:bg-green-950/20">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Garmin connected successfully!
                </div>
              )}
              {garminError && (
                <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  Failed to connect Garmin. Please try again.
                </div>
              )}
              <GarminConnectButton />
              <form action={loginWithStrava} className="w-full">
                <Button
                  variant="outline"
                  type="submit"
                  className="w-full h-14 justify-start gap-4 text-base font-normal"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  Connect Strava
                </Button>
              </form>
              <div className="text-center text-xs text-muted-foreground mt-4">
                We will only read your activity data. We never post to your
                feed.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

        <div className="pt-6">
          <Button size="lg" className="w-full" onClick={handleNext}>
            Next: Race Details
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
