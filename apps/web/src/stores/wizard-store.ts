import { create } from "zustand";
import { persist } from "zustand/middleware";
import { analytics, AnalyticsEvent } from "@/lib/analytics";

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
  dateWasAutofilled: boolean; // True if date was auto-set from race selection
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

  // Pending generation (for anonymous users who complete wizard before signing up)
  pendingGeneration: boolean;
  pendingGpxFileKey: string | null;

  // Actions
  setStep: (step: number) => void;
  setFitnessData: (data: Partial<FitnessData>) => void;
  setRaceData: (data: Partial<Omit<RaceData, "gpxFile">>) => void;
  setCourseData: (data: Partial<CourseData>) => void;
  setPendingGeneration: (pending: boolean, gpxFileKey?: string | null) => void;
  reset: () => void;
};

const defaultRaceData: Omit<RaceData, "gpxFile"> = {
  name: "",
  date: null,
  dateWasAutofilled: false,
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
      pendingGeneration: false,
      pendingGpxFileKey: null,

      setStep: (step) => {
        const prevState = useWizardStore.getState();
        const prevStep = prevState.step;

        // Track wizard started when moving to step 1
        if (step === 1 && prevStep !== 1) {
          analytics.track(AnalyticsEvent.WIZARD_STARTED);
        }

        // Track step completion when moving forward
        if (step > prevStep && prevStep >= 1 && prevStep <= 3) {
          const hasData =
            prevStep === 1
              ? prevState.fitnessData.ftp !== null ||
                prevState.fitnessData.thresholdPace !== null
              : prevStep === 2
                ? prevState.raceData.name !== ""
                : prevState.courseData.gpxData !== null ||
                  prevState.courseData.fileName !== null ||
                  prevState.courseData.selectedRwgps !== null;

          analytics.track(AnalyticsEvent.WIZARD_STEP_COMPLETED, {
            step: prevStep,
            hasData,
          });
        }

        // Track going back
        if (step < prevStep) {
          analytics.track(AnalyticsEvent.WIZARD_STEP_BACK, {
            fromStep: prevStep,
            toStep: step,
          });
        }

        set({ step });
      },
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
      setPendingGeneration: (pending, gpxFileKey) =>
        set({
          pendingGeneration: pending,
          pendingGpxFileKey: gpxFileKey ?? null,
        }),
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
          pendingGeneration: false,
          pendingGpxFileKey: null,
        }),
    }),
    {
      name: "raceday-wizard-storage",
      partialize: (state) => ({
        step: state.step,
        fitnessData: state.fitnessData,
        raceData: state.raceData,
        courseData: state.courseData,
        pendingGeneration: state.pendingGeneration,
        pendingGpxFileKey: state.pendingGpxFileKey,
      }),
    },
  ),
);
