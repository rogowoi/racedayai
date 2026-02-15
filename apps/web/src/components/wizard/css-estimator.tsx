"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

interface CssEstimatorProps {
  onEstimate: (css: string) => void;
}

export function CssEstimator({ onEstimate }: CssEstimatorProps) {
  const [open, setOpen] = useState(false);
  const [distance, setDistance] = useState<number | "">("");
  const [minutes, setMinutes] = useState<number | "">("");
  const [seconds, setSeconds] = useState<number | "">("");

  const calculateCSS = () => {
    if (
      typeof distance === "number" &&
      distance > 0 &&
      (typeof minutes === "number" || typeof seconds === "number")
    ) {
      const totalSeconds = (minutes || 0) * 60 + (seconds || 0);
      if (totalSeconds > 0) {
        // Convert to pace per 100m
        const paceSecondsPer100m = (totalSeconds / distance) * 100;
        const mins = Math.floor(paceSecondsPer100m / 60);
        const secs = Math.round(paceSecondsPer100m % 60);
        const cssString = `${mins}:${secs.toString().padStart(2, "0")}`;
        onEstimate(cssString);
        setOpen(false);
      }
    }
  };

  const getEstimatedCSS = () => {
    if (
      typeof distance === "number" &&
      distance > 0 &&
      (typeof minutes === "number" || typeof seconds === "number")
    ) {
      const totalSeconds = (minutes || 0) * 60 + (seconds || 0);
      if (totalSeconds > 0) {
        const paceSecondsPer100m = (totalSeconds / distance) * 100;
        const mins = Math.floor(paceSecondsPer100m / 60);
        const secs = Math.round(paceSecondsPer100m % 60);
        return `${mins}:${secs.toString().padStart(2, "0")}`;
      }
    }
    return null;
  };

  const css = getEstimatedCSS();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
        >
          <Calculator className="h-3.5 w-3.5" />
          <span className="sr-only">Estimate</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Estimate Your CSS</SheetTitle>
          <SheetDescription>
            Enter your time for a recent all-out swim effort (400m-1500m recommended)
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="swimDistance">Distance (meters)</Label>
              <Input
                id="swimDistance"
                type="number"
                placeholder="400"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value) || "")}
              />
              <p className="text-xs text-muted-foreground">
                Common test distances: 400m, 500m, 1000m, 1500m
              </p>
            </div>

            <div className="space-y-2">
              <Label>Time</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Input
                    type="number"
                    placeholder="7"
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value) || "")}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    minutes
                  </p>
                </div>
                <div className="space-y-1">
                  <Input
                    type="number"
                    placeholder="30"
                    value={seconds}
                    onChange={(e) => setSeconds(Number(e.target.value) || "")}
                    min={0}
                    max={59}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    seconds
                  </p>
                </div>
              </div>
            </div>

            {css && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="text-sm font-medium">Estimated CSS</div>
                <div className="text-2xl font-bold text-primary">
                  {css}/100m
                </div>
              </div>
            )}

            <Button onClick={calculateCSS} disabled={!css} className="w-full">
              Use This CSS
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <strong>Tip:</strong> CSS is your sustainable pace for continuous swimming.
            If you haven't done a time trial, swim 400m or 1000m as fast as you can
            maintain consistently.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
