"use client";

import { useWizardStore } from "@/stores/wizard-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UploadCloud, FileText } from "lucide-react";
import { useState } from "react";
import { generateRacePlan } from "@/app/actions/generate-plan";
import { SubmitButton } from "@/components/ui/submit-button";

export function Step3Course() {
  const { fitnessData, raceData, setStep } = useWizardStore();
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Course Profile</h1>
        <p className="text-muted-foreground">
          Upload a GPX file to get segment-specific power analysis.
        </p>
      </div>

      <form action={generateRacePlan} className="space-y-6">
        {/* Hidden inputs for store data */}
        <input
          type="hidden"
          name="fitnessData"
          value={JSON.stringify(fitnessData)}
        />
        <input type="hidden" name="raceData" value={JSON.stringify(raceData)} />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Course GPX File</Label>
            <div className="grid w-full items-center gap-1.5">
              <label
                htmlFor="gpx-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors border-muted-foreground/25 hover:border-primary/50"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {fileName ? (
                    <>
                      <FileText className="w-10 h-10 text-primary mb-3" />
                      <p className="mb-2 text-sm text-primary font-medium">
                        {fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click to change
                      </p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-10 h-10 text-muted-foreground mb-3" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        GPX files only (max 10MB)
                      </p>
                    </>
                  )}
                </div>
                <input
                  id="gpx-upload"
                  name="gpxFile"
                  type="file"
                  className="hidden"
                  accept=".gpx"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900 text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">Coming Soon:</p>
            <p>
              We're building an auto-fetch feature to grab GPX files directly
              from race websites.
            </p>
          </div>
        </div>

        <div className="pt-6 flex gap-3">
          <Button
            variant="outline"
            type="button"
            className="w-full"
            onClick={() => setStep(2)}
          >
            Back
          </Button>
          <SubmitButton className="w-full" size="lg">
            Generate Plan
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
