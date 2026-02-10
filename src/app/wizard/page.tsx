"use client";

import { useEffect, useState } from "react";
import { useWizardStore } from "@/stores/wizard-store";
import { Step1Fitness } from "@/components/wizard/step-1-fitness";
import { Step2Race } from "@/components/wizard/step-2-race";
import { Step3Course } from "@/components/wizard/step-3-course";

export default function WizardPage() {
  const step = useWizardStore((state) => state.step);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {step === 1 && <Step1Fitness />}
      {step === 2 && <Step2Race />}
      {step === 3 && <Step3Course />}
    </>
  );
}
