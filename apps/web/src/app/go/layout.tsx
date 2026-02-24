import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Your AI Race Plan — Free | RaceDayAI",
  description:
    "Build your personalized triathlon race plan in 3 minutes. AI-optimized pacing, nutrition, and weather adjustments.",
  openGraph: {
    title: "Get Your AI Race Plan — Free | RaceDayAI",
    description:
      "Build your personalized triathlon race plan in 3 minutes. AI-optimized pacing, nutrition, and weather adjustments.",
  },
};

export default function GoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
