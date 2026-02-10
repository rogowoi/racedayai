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
import { Activity, Smartphone } from "lucide-react";

export function Step1Fitness() {
  const { fitnessData, setFitnessData, setStep } = useWizardStore();

  const handleNext = () => {
    // Basic validation
    if (!fitnessData.ftp && !fitnessData.thresholdPace) {
      // Allow proceeding but maybe warn? For MVP just proceed.
    }
    setStep(2);
  };

  return (
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
                Basic metrics for pacing calculations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="75"
                    value={fitnessData.weight || ""}
                    onChange={(e) =>
                      setFitnessData({ weight: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ftp">Bike FTP (Watts)</Label>
                  <Input
                    id="ftp"
                    type="number"
                    placeholder="250"
                    value={fitnessData.ftp || ""}
                    onChange={(e) =>
                      setFitnessData({ ftp: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pace">Threshold Run</Label>
                  <Input
                    id="pace"
                    type="text"
                    placeholder="4:45 /km"
                    value={fitnessData.thresholdPace || ""}
                    onChange={(e) =>
                      setFitnessData({ thresholdPace: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="css">Swim CSS</Label>
                  <Input
                    id="css"
                    type="text"
                    placeholder="1:45 /100m"
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
              <Button
                variant="outline"
                className="w-full h-14 justify-start gap-4 text-base font-normal"
              >
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
                Connect Garmin
              </Button>
              <Button
                variant="outline"
                className="w-full h-14 justify-start gap-4 text-base font-normal"
              >
                <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-orange-600" />
                </div>
                Connect Strava
              </Button>
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
  );
}
