import { create } from "zustand";
import { persist } from "zustand/middleware";

type FitnessData = {
  ftp: number | null;
  thresholdPace: string | null; // min:sec format e.g. "4:45"
  css: string | null; // min:sec format e.g. "1:45"
  weight: number | null;
  maxHr: number | null;
  restingHr: number | null;
  experienceLevel: "beginner" | "intermediate" | "advanced" | "elite";
};

type RaceData = {
  name: string;
  date: Date | null;
  distanceCategory: "sprint" | "olympic" | "70.3" | "140.6";
  gpxFile: File | null; // Note: Files can't be persisted to localStorage easily
};

type WizardState = {
  step: number;
  fitnessData: FitnessData;
  raceData: Omit<RaceData, "gpxFile">;

  // Actions
  setStep: (step: number) => void;
  setFitnessData: (data: Partial<FitnessData>) => void;
  setRaceData: (data: Partial<Omit<RaceData, "gpxFile">>) => void;
  reset: () => void;
};

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      step: 1,
      fitnessData: {
        ftp: null,
        thresholdPace: null,
        css: null,
        weight: null,
        maxHr: null,
        restingHr: null,
        experienceLevel: "intermediate",
      },
      raceData: {
        name: "",
        date: null,
        distanceCategory: "70.3",
      },

      setStep: (step) => set({ step }),
      setFitnessData: (data) =>
        set((state) => ({
          fitnessData: { ...state.fitnessData, ...data },
        })),
      setRaceData: (data) =>
        set((state) => ({
          raceData: { ...state.raceData, ...data },
        })),
      reset: () =>
        set({
          step: 1,
          fitnessData: {
            ftp: null,
            thresholdPace: null,
            css: null,
            weight: null,
            maxHr: null,
            restingHr: null,
            experienceLevel: "intermediate",
          },
          raceData: {
            name: "",
            date: null,
            distanceCategory: "70.3",
          },
        }),
    }),
    {
      name: "raceday-wizard-storage",
      partialize: (state) => ({
        step: state.step,
        fitnessData: state.fitnessData,
        raceData: state.raceData,
      }),
    },
  ),
);
