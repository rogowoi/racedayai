"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, Zap, LayoutDashboard, Check } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const wizardSteps = [
  { label: "Fitness", shortLabel: "Fit" },
  { label: "Race", shortLabel: "Race" },
  { label: "Course", shortLabel: "Course" },
];

export default function WizardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const step = useWizardStore((state) => state.step);
  const quizCompleted = useWizardStore((state) => state.quizCompleted);
  const [showStepIndicator, setShowStepIndicator] = useState(true);

  // Check if we're showing the paywall (plan limit reached)
  useEffect(() => {
    async function checkIfPaywallShown() {
      try {
        const res = await fetch("/api/plans/check-limit");
        const data = await res.json();
        setShowStepIndicator(data.canCreate !== false);
      } catch {
        setShowStepIndicator(true);
      }
    }
    checkIfPaywallShown();
  }, []);

  // Hide header during quiz flow
  const inQuiz = !quizCompleted;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Wizard Header - hidden during quiz */}
      {!inQuiz && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              {showStepIndicator && step > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => useWizardStore.getState().setStep(step - 1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <Link href="/" className="flex items-center gap-1.5 text-sm font-bold">
                <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                  <Zap className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="hidden sm:inline">
                  RaceDay<span className="text-primary">AI</span>
                </span>
              </Link>
            </div>

            {/* Step indicators */}
            {showStepIndicator && (
              <div className="flex items-center gap-1 sm:gap-2">
                {wizardSteps.map((s, i) => {
                  const stepNum = i + 1;
                  const isCompleted = step > stepNum;
                  const isActive = step === stepNum;
                  return (
                    <div key={s.label} className="flex items-center">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300",
                            isCompleted && "bg-primary text-primary-foreground",
                            isActive && "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                            !isCompleted && !isActive && "bg-muted text-muted-foreground"
                          )}
                        >
                          {isCompleted ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            stepNum
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium hidden sm:inline transition-colors",
                            isActive ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {s.label}
                        </span>
                      </div>
                      {i < wizardSteps.length - 1 && (
                        <div
                          className={cn(
                            "w-6 sm:w-10 h-px mx-1 sm:mx-2 transition-colors duration-300",
                            step > stepNum ? "bg-primary" : "bg-border"
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
                <Link href="/dashboard" className="flex items-center gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="sm:hidden">
                <Link href="/dashboard">
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="sr-only">Go to Dashboard</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Exit</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          {showStepIndicator && (
            <div className="h-1 w-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          )}
        </header>
      )}

      {/* Content */}
      <main className={cn(
        "flex-1 w-full mx-auto",
        inQuiz ? "max-w-lg p-4" : "max-w-xl p-4 md:py-8 pb-8 md:pb-12"
      )}>
        {children}
      </main>
    </div>
  );
}
