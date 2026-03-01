"use client";

import { useWizardStore } from "@/stores/wizard-store";
import { useState, useCallback } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { ttqTrack } from "@/components/tiktok-pixel";

const distanceOptions = [
  {
    value: "sprint" as const,
    label: "Sprint",
    description: "750m / 20km / 5km",
  },
  {
    value: "olympic" as const,
    label: "Olympic",
    description: "1.5km / 40km / 10km",
  },
  {
    value: "70.3" as const,
    label: "70.3",
    description: "1.9km / 90km / 21.1km",
  },
  {
    value: "140.6" as const,
    label: "140.6",
    description: "3.8km / 180km / 42.2km",
  },
];

const goalOptions = [
  {
    value: "finish-strong" as const,
    label: "Finish strong",
    description: "Complete the race feeling good",
  },
  {
    value: "time-target" as const,
    label: "Hit a time target",
    description: "I have a specific finish time in mind",
  },
  {
    value: "pr" as const,
    label: "Set a PR",
    description: "Beat my personal record",
  },
  {
    value: "just-finish" as const,
    label: "Just finish",
    description: "This is my first time at this distance",
  },
];

const experienceOptions = [
  {
    value: "multiple" as const,
    label: "Multiple times",
    description: "I've raced this distance before",
  },
  {
    value: "once" as const,
    label: "Once before",
    description: "I've done one race at this distance",
  },
  {
    value: "first" as const,
    label: "This is my first",
    description: "I haven't raced this distance yet",
  },
];

function QuizCard({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-xl border-2 transition-all duration-200",
        "hover:border-primary/50 hover:bg-primary/5",
        "active:scale-[0.98]",
        selected
          ? "border-primary bg-primary/10 shadow-sm"
          : "border-border bg-card"
      )}
    >
      <div className="font-semibold text-base">{label}</div>
      <div className="text-sm text-muted-foreground mt-0.5">{description}</div>
    </button>
  );
}

export function QuizFlow({ onComplete }: { onComplete: () => void }) {
  const { quizData, quizStep, setQuizData, setQuizStep, setQuizCompleted, setRaceData, setFitnessData } =
    useWizardStore();
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [targetTimeInput, setTargetTimeInput] = useState(quizData.goalTargetTime || "");

  const advanceToNext = useCallback(() => {
    if (quizStep < 2) {
      setDirection("forward");
      setTransitioning(true);
      setTimeout(() => {
        setQuizStep(quizStep + 1);
        setTransitioning(false);
      }, 200);
    } else {
      // Quiz complete — pre-fill wizard fields from quiz answers
      if (quizData.distance) {
        setRaceData({ distanceCategory: quizData.distance });
      }
      if (quizData.experience) {
        const levelMap = {
          multiple: "advanced",
          once: "intermediate",
          first: "beginner",
        } as const;
        setFitnessData({ experienceLevel: levelMap[quizData.experience] });
      }
      setQuizCompleted(true);
      ttqTrack("ViewContent", { content_name: "quiz_completed" });
      onComplete();
    }
  }, [quizStep, quizData, setQuizStep, setQuizCompleted, setRaceData, setFitnessData, onComplete]);

  const handleSelect = useCallback(
    (key: string, value: string) => {
      setQuizData({ [key]: value });

      // Auto-advance after selection (with delay for visual feedback)
      // Exception: "time-target" goal needs extra input
      if (key === "goal" && value === "time-target") return;

      setTimeout(() => {
        advanceToNext();
      }, 300);
    },
    [setQuizData, advanceToNext]
  );

  const goBack = () => {
    if (quizStep > 0) {
      setDirection("back");
      setTransitioning(true);
      setTimeout(() => {
        setQuizStep(quizStep - 1);
        setTransitioning(false);
      }, 200);
    }
  };

  const animationClass = transitioning
    ? direction === "forward"
      ? "opacity-0 translate-x-4"
      : "opacity-0 -translate-x-4"
    : "opacity-100 translate-x-0";

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <div className="h-10 mb-6">
          {quizStep > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}
        </div>

        {/* Quiz content */}
        <div
          className={cn(
            "transition-all duration-200 ease-out",
            animationClass
          )}
        >
          {/* Screen 1: Distance */}
          {quizStep === 0 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  What distance are you racing?
                </h1>
                <p className="text-muted-foreground text-sm">
                  We'll tailor your race plan to this distance
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {distanceOptions.map((opt) => (
                  <QuizCard
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={quizData.distance === opt.value}
                    onClick={() => handleSelect("distance", opt.value)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Screen 2: Goal */}
          {quizStep === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  What's your goal for race day?
                </h1>
                <p className="text-muted-foreground text-sm">
                  This shapes your pacing strategy
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {goalOptions.map((opt) => (
                  <QuizCard
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={quizData.goal === opt.value}
                    onClick={() => handleSelect("goal", opt.value)}
                  />
                ))}
              </div>

              {/* Time target input */}
              {quizData.goal === "time-target" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-medium" htmlFor="target-time">
                    What finish time are you aiming for?
                  </label>
                  <input
                    id="target-time"
                    type="text"
                    placeholder="e.g. 5:30:00"
                    value={targetTimeInput}
                    onChange={(e) => setTargetTimeInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-border bg-card text-base focus:border-primary focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setQuizData({ goalTargetTime: targetTimeInput || null });
                      advanceToNext();
                    }}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Screen 3: Experience */}
          {quizStep === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">
                  Have you raced this distance before?
                </h1>
                <p className="text-muted-foreground text-sm">
                  Helps us calibrate your predictions
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {experienceOptions.map((opt) => (
                  <QuizCard
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={quizData.experience === opt.value}
                    onClick={() => handleSelect("experience", opt.value)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Skip link */}
        <div className="text-center mt-8">
          <button
            type="button"
            onClick={advanceToNext}
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Skip
          </button>
        </div>

        {/* Quiz progress dots */}
        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === quizStep
                  ? "w-6 bg-primary"
                  : i < quizStep
                    ? "w-1.5 bg-primary/40"
                    : "w-1.5 bg-muted-foreground/20"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
