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

type RwgpsRoute = {
  id: number;
  type: "trip" | "route";
  name: string;
  distanceM: number;
  elevationGainM: number;
  elevationLossM: number;
  startLat: number;
  startLng: number;
  locality: string | null;
  region: string | null;
  country: string | null;
  terrain: string | null;
  difficulty: string | null;
  trackType: string | null;
  userName: string | null;
  gpxUrl: string;
  viewUrl: string;
};

type RwgpsGpxData = {
  available: boolean;
  source?: string;
  rwgpsId?: number;
  rwgpsType?: string;
  error?: string;
  message?: string;
  viewUrl?: string;
  courseData?: {
    name: string;
    totalDistanceM: number;
    elevationGainM: number;
    pointCount: number;
  };
};

type GpxData = {
  available: boolean;
  raceId: string;
  segment: string;
  source?: string;
  message?: string;
  courseData?: {
    totalDistanceM: number;
    elevationGainM: number;
    pointCount: number;
  };
  fallback?: {
    bikeDistanceM: number;
    runDistanceM: number;
    bikeElevationGainM: number | null;
    runElevationGainM: number | null;
  };
};

type CourseData = {
  // RideWithGPS selected route
  selectedRwgps: RwgpsRoute | null;
  rwgpsGpxData: RwgpsGpxData | null;
  rwgpsGpxStatus: "idle" | "loading" | "loaded" | "error";

  // Auto-fetched GPX from registry
  gpxData: GpxData | null;
  gpxStatus: "idle" | "loading" | "loaded" | "unavailable" | "error";

  // Manual upload filename (file itself can't be persisted)
  fileName: string | null;
};

type WizardState = {
  step: number;
  fitnessData: FitnessData;
  raceData: Omit<RaceData, "gpxFile">;
  courseData: CourseData;

  // Actions
  setStep: (step: number) => void;
  setFitnessData: (data: Partial<FitnessData>) => void;
  setRaceData: (data: Partial<Omit<RaceData, "gpxFile">>) => void;
  setCourseData: (data: Partial<CourseData>) => void;
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

const defaultCourseData: CourseData = {
  selectedRwgps: null,
  rwgpsGpxData: null,
  rwgpsGpxStatus: "idle",
  gpxData: null,
  gpxStatus: "idle",
  fileName: null,
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
      courseData: { ...defaultCourseData },

      setStep: (step) => set({ step }),
      setFitnessData: (data) =>
        set((state) => ({
          fitnessData: { ...state.fitnessData, ...data },
        })),
      setRaceData: (data) =>
        set((state) => ({
          raceData: { ...state.raceData, ...data },
        })),
      setCourseData: (data) =>
        set((state) => ({
          courseData: { ...state.courseData, ...data },
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
          courseData: { ...defaultCourseData },
        }),
    }),
    {
      name: "raceday-wizard-storage",
      partialize: (state) => ({
        step: state.step,
        fitnessData: state.fitnessData,
        raceData: state.raceData,
        courseData: state.courseData,
      }),
    },
  ),
);
