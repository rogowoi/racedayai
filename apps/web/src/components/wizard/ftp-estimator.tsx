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

interface FtpEstimatorProps {
  onEstimate: (ftp: number) => void;
}

export function FtpEstimator({ onEstimate }: FtpEstimatorProps) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"20min" | "ramp">("20min");
  const [power20min, setPower20min] = useState<number | "">("");
  const [rampPower, setRampPower] = useState<number | "">("");

  const calculate20MinFTP = () => {
    if (typeof power20min === "number" && power20min > 0) {
      const ftp = Math.round(power20min * 0.95);
      onEstimate(ftp);
      setOpen(false);
    }
  };

  const calculateRampFTP = () => {
    if (typeof rampPower === "number" && rampPower > 0) {
      const ftp = Math.round(rampPower * 0.75);
      onEstimate(ftp);
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
        >
          <Calculator className="h-3.5 w-3.5 mr-1" />
          Estimate
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Estimate Your FTP</SheetTitle>
          <SheetDescription>
            Use a recent power test to estimate your Functional Threshold Power
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={method === "20min" ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod("20min")}
                className="flex-1"
              >
                20-Minute Test
              </Button>
              <Button
                type="button"
                variant={method === "ramp" ? "default" : "outline"}
                size="sm"
                onClick={() => setMethod("ramp")}
                className="flex-1"
              >
                Ramp Test
              </Button>
            </div>

            {method === "20min" && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Enter your average power from a 20-minute all-out effort. Your
                  FTP is typically 95% of this value.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="power20">Average Power (W)</Label>
                  <Input
                    id="power20"
                    type="number"
                    placeholder="265"
                    value={power20min}
                    onChange={(e) => setPower20min(Number(e.target.value) || "")}
                  />
                </div>
                {typeof power20min === "number" && power20min > 0 && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="text-sm font-medium">Estimated FTP</div>
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(power20min * 0.95)}W
                    </div>
                  </div>
                )}
                <Button
                  onClick={calculate20MinFTP}
                  disabled={!power20min}
                  className="w-full"
                >
                  Use This FTP
                </Button>
              </div>
            )}

            {method === "ramp" && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Enter your final 1-minute power from a ramp test (like Zwift or
                  TrainerRoad). Your FTP is typically 75% of this value.
                </div>
                <div className="space-y-2">
                  <Label htmlFor="powerRamp">Peak 1-Min Power (W)</Label>
                  <Input
                    id="powerRamp"
                    type="number"
                    placeholder="335"
                    value={rampPower}
                    onChange={(e) => setRampPower(Number(e.target.value) || "")}
                  />
                </div>
                {typeof rampPower === "number" && rampPower > 0 && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="text-sm font-medium">Estimated FTP</div>
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(rampPower * 0.75)}W
                    </div>
                  </div>
                )}
                <Button
                  onClick={calculateRampFTP}
                  disabled={!rampPower}
                  className="w-full"
                >
                  Use This FTP
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
