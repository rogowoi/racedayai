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
  gender: "M" | "F" | null;
  age: number | null;
};

type RaceData = {
  name: string;
  date: Date | null;
  distanceCategory: "sprint" | "olympic" | "70.3" | "140.6";
  gpxFile: File | null; // Note: Files can't be persisted to localStorage easily
  // Auto-populated from race registry when a known race is selected
  selectedRaceId: string | null;
  raceLocation: string | null;
  latitude: number | null;
  longitude: number | null;
  bikeElevationGainM: number | null;
  runElevationGainM: number | null;
  hasGpx: boolean;
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

const defaultRaceData: Omit<RaceData, "gpxFile"> = {
  name: "",
  date: null,
  distanceCategory: "70.3",
  selectedRaceId: null,
  raceLocation: null,
  latitude: null,
  longitude: null,
  bikeElevationGainM: null,
  runElevationGainM: null,
  hasGpx: false,
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
        gender: null,
        age: null,
      },
      raceData: { ...defaultRaceData },

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
            gender: null,
            age: null,
          },
          raceData: { ...defaultRaceData },
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
