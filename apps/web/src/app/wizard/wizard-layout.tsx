"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, Zap } from "lucide-react";
import { useWizardStore } from "@/stores/wizard-store";

export default function WizardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const step = useWizardStore((state) => state.step);
  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Wizard Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button
                variant="ghost"
                size="icon"
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
            <span className="text-muted-foreground">|</span>
            <span className="font-semibold text-sm">
              Step {step} of {totalSteps}
            </span>
          </div>

          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <X className="h-5 w-5" />
              <span className="sr-only">Exit</span>
            </Link>
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full max-w-md mx-auto p-4 md:py-8 pb-8 md:pb-12">
        {children}
      </main>
    </div>
  );
}
