import type { Metadata } from "next";
import WizardLayoutClient from "./wizard-layout";

export const metadata: Metadata = {
  title: "Create Race Plan",
  description:
    "Generate your personalized triathlon race execution plan in minutes. Enter your fitness data, select your race, upload the course, and get AI-powered pacing, nutrition, and race-day strategy.",
  keywords: [
    "create race plan",
    "triathlon race planner",
    "race execution plan",
    "pacing calculator",
    "triathlon nutrition plan",
  ],
  openGraph: {
    title: "Create Race Plan — RaceDayAI",
    description:
      "Generate your personalized race execution plan with AI-powered pacing and nutrition strategy.",
    url: "https://racedayai.com/wizard",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Create Race Plan — RaceDayAI",
    description:
      "Build your custom race execution plan with AI-powered recommendations.",
  },
  robots: {
    index: false, // Don't index the wizard page (conversion funnel)
    follow: true,
  },
};

export default async function WizardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth check here — anonymous users can use the wizard.
  // Auth is enforced at plan generation (step 3) via the API.
  return <WizardLayoutClient>{children}</WizardLayoutClient>;
}
