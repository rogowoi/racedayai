import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export const metadata = {
  title: "Get Your AI Race Plan — Free | RaceDayAI",
  description:
    "Build your personalized triathlon race plan in 3 minutes. AI-optimized pacing, nutrition, and weather adjustments.",
};

export default function TikTokLanding() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-orange-50 to-white dark:from-orange-950/20 dark:to-background">
      <div className="flex items-center gap-2 mb-8">
        <Zap className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold">RaceDayAI</span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-extrabold text-center leading-tight max-w-md mb-4">
        Know your finish time
        <br />
        <span className="text-primary">before race day.</span>
      </h1>

      <p className="text-center text-muted-foreground text-lg max-w-sm mb-8">
        Enter your fitness data, pick your race, get an AI-powered pacing and
        nutrition plan in 3 minutes.
      </p>

      <p className="text-sm text-muted-foreground mb-6">
        Free · No credit card · Works for any triathlon distance
      </p>

      <Button
        size="lg"
        className="h-14 text-lg px-10 font-semibold shadow-lg shadow-primary/25"
        asChild
      >
        <Link href="/wizard">
          Build My Race Plan
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>

      <div className="flex gap-6 mt-12 text-sm text-muted-foreground">
        <span>Sprint</span>
        <span>·</span>
        <span>Olympic</span>
        <span>·</span>
        <span>70.3</span>
        <span>·</span>
        <span>IRONMAN</span>
      </div>
    </div>
  );
}
