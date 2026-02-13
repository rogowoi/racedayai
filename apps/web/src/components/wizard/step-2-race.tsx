"use client";

import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CalendarIcon, MapPin, Mountain, Route } from "lucide-react";
import { RaceSearchCombobox } from "./race-search-combobox";

const distances = [
  { id: "sprint", label: "Sprint", sub: "750m / 20km / 5km" },
  { id: "olympic", label: "Olympic", sub: "1.5km / 40km / 10km" },
  { id: "70.3", label: "70.3", sub: "1.9km / 90km / 21.1km" },
  { id: "140.6", label: "140.6", sub: "3.8km / 180km / 42.2km" },
];

export function Step2Race() {
  const { raceData, setRaceData, setStep } = useWizardStore();

  const handleNext = () => {
    if (!raceData.name) return;
    setStep(3);
  };

  const handleRaceSelect = (race: {
    id: string;
    name: string;
    distanceCategory: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    bikeElevationGainM: number | null;
    runElevationGainM: number | null;
    hasGpx: boolean;
  }) => {
    setRaceData({
      name: race.name,
      selectedRaceId: race.id,
      distanceCategory: race.distanceCategory as
        | "sprint"
        | "olympic"
        | "70.3"
        | "140.6",
      raceLocation: race.location,
      latitude: race.latitude,
      longitude: race.longitude,
      bikeElevationGainM: race.bikeElevationGainM,
      runElevationGainM: race.runElevationGainM,
      hasGpx: race.hasGpx,
    });
  };

  const handleRaceClear = () => {
    setRaceData({
      selectedRaceId: null,
      raceLocation: null,
      latitude: null,
      longitude: null,
      bikeElevationGainM: null,
      runElevationGainM: null,
      hasGpx: false,
    });
  };

  const isKnownRace = !!raceData.selectedRaceId;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Race Details</h1>
        <p className="text-muted-foreground">
          Search for your A-race or enter a custom race name.
        </p>
      </div>

      <div className="space-y-4">
        {/* Race Name — Typeahead Search */}
        <div className="space-y-2">
          <Label htmlFor="raceName">Race Name</Label>
          <RaceSearchCombobox
            value={raceData.name}
            onChange={(name) => setRaceData({ name })}
            onRaceSelect={handleRaceSelect}
            onClear={handleRaceClear}
          />
        </div>

        {/* Race info when a known race is selected */}
        {isKnownRace && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1.5 animate-in fade-in duration-300">
            {raceData.raceLocation && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span>{raceData.raceLocation}</span>
              </div>
            )}
            {raceData.bikeElevationGainM && (
              <div className="flex items-center gap-2 text-sm">
                <Mountain className="h-4 w-4 text-primary" />
                <span>Bike elevation: {raceData.bikeElevationGainM}m</span>
                {raceData.runElevationGainM && (
                  <span className="text-muted-foreground">
                    / Run: {raceData.runElevationGainM}m
                  </span>
                )}
              </div>
            )}
            {raceData.hasGpx && (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <Route className="h-4 w-4" />
                <span>Course GPX available — will auto-load on next step</span>
              </div>
            )}
          </div>
        )}

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="raceDate">Race Date</Label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
            <Input
              id="raceDate"
              type="date"
              className="pl-10 block w-full"
              onChange={(e) => setRaceData({ date: e.target.valueAsDate })}
            />
          </div>
        </div>

        {/* Distance Selector */}
        <div className="space-y-2 pt-2">
          <Label>
            Distance
            {isKnownRace && (
              <span className="text-xs text-muted-foreground ml-2">
                (auto-selected from race)
              </span>
            )}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {distances.map((dist) => (
              <Card
                key={dist.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary",
                  raceData.distanceCategory === dist.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border",
                  isKnownRace &&
                    raceData.distanceCategory !== dist.id &&
                    "opacity-40",
                )}
                onClick={() => {
                  if (!isKnownRace) {
                    setRaceData({
                      distanceCategory: dist.id as
                        | "sprint"
                        | "olympic"
                        | "70.3"
                        | "140.6",
                    });
                  }
                }}
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
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setStep(1)}
        >
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
