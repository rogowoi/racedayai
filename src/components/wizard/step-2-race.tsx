"use client";

import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarIcon, MapPin } from "lucide-react";

const distances = [
  { id: "sprint", label: "Sprint", sub: "750m / 20km / 5km" },
  { id: "olympic", label: "Olympic", sub: "1.5km / 40km / 10km" },
  { id: "70.3", label: "70.3", sub: "1.9km / 90km / 21.1km" },
  { id: "140.6", label: "140.6", sub: "3.8km / 180km / 42.2km" },
];

export function Step2Race() {
  const { raceData, setRaceData, setStep } = useWizardStore();

  const handleNext = () => {
    if (!raceData.name) {
      // Basic validation
      return;
    }
    setStep(3);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Race Details</h1>
        <p className="text-muted-foreground">
          Tell us about your A-race so we can optimize for the course.
        </p>
      </div>

      <div className="space-y-4">
        {/* Race Name */}
        <div className="space-y-2">
          <Label htmlFor="raceName">Race Name</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="raceName"
              placeholder="e.g. IRONMAN 70.3 Dubai"
              className="pl-10"
              value={raceData.name}
              onChange={(e) => setRaceData({ name: e.target.value })}
            />
          </div>
        </div>

        {/* Date (Simplified text input for now, ideally DatePicker) */}
        <div className="space-y-2">
          <Label htmlFor="raceDate">Race Date</Label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="raceDate"
              type="date"
              className="pl-10 block w-full"
              // Basic date handling for MVP
              onChange={(e) => setRaceData({ date: e.target.valueAsDate })}
            />
          </div>
        </div>

        {/* Distance Selector - Mobile friendly cards */}
        <div className="space-y-2 pt-2">
          <Label>Distance</Label>
          <div className="grid grid-cols-2 gap-3">
            {distances.map((dist) => (
              <Card
                key={dist.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary",
                  raceData.distanceCategory === dist.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border",
                )}
                onClick={() =>
                  setRaceData({ distanceCategory: dist.id as any })
                }
              >
                <div className="p-4 text-center space-y-1">
                  <div className="font-bold">{dist.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {dist.sub}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-6 flex gap-3">
        <Button variant="outline" className="w-full" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button
          size="lg"
          className="w-full"
          onClick={handleNext}
          disabled={!raceData.name}
        >
          Next: Course
        </Button>
      </div>
    </div>
  );
}
