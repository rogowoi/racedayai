"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Database, Target, Zap } from "lucide-react";
import { StravaSyncButton } from "@/components/strava-sync-button";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      {/* Header */}
      <header className="pt-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-2">
            <span className="inline-block text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
              🏁 RaceDayAI
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          {/* Welcome Heading */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                RaceDayAI
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground">
              Let AI turn your training into your competitive edge
            </p>
          </div>

          {/* 3-Step Visual */}
          <div className="mb-12 sm:mb-16">
            <div className="relative">
              {/* Steps Container */}
              <div className="grid grid-cols-3 gap-4 sm:gap-6">
                {/* Step 1 */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3 sm:mb-4 border-2 border-orange-500">
                    <Database className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base text-center">
                    Enter fitness data
                  </h3>
                </div>

                {/* Arrow 1 */}
                <div className="flex items-center justify-center">
                  <div className="hidden sm:block text-2xl text-muted-foreground">→</div>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3 sm:mb-4 border-2 border-blue-500">
                    <Target className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base text-center">
                    Pick your race
                  </h3>
                </div>

                {/* Arrow 2 */}
                <div className="flex items-center justify-center">
                  <div className="hidden sm:block text-2xl text-muted-foreground">→</div>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-3 sm:mb-4 border-2 border-purple-500">
                    <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-sm sm:text-base text-center">
                    Get your plan
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="mb-12 sm:mb-16 bg-white dark:bg-slate-800/50 rounded-lg p-6 sm:p-8 border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg sm:text-xl font-semibold mb-6">
              What you'll get
            </h2>
            <ul className="space-y-3 sm:space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-semibold">
                  ✓
                </span>
                <span className="text-base sm:text-lg text-slate-700 dark:text-slate-300">
                  <strong>Personalized pacing strategy</strong> — Run/bike/swim splits tailored to your fitness
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-semibold">
                  ✓
                </span>
                <span className="text-base sm:text-lg text-slate-700 dark:text-slate-300">
                  <strong>Weather-adjusted nutrition plan</strong> — Calorie, sodium, and hydration targets updated for race-day conditions
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-semibold">
                  ✓
                </span>
                <span className="text-base sm:text-lg text-slate-700 dark:text-slate-300">
                  <strong>Printable race-day card</strong> — Your full plan, condensed and easy to carry on the course
                </span>
              </li>
            </ul>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {/* Primary CTA */}
            <Link href="/wizard" className="flex-1 sm:flex-none">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white gap-2"
              >
                Let's Build Your First Plan <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            {/* Secondary CTA - Strava Sync */}
            <div className="flex-1 sm:flex-none">
              <StravaSyncButton variant="outline" size="lg" />
            </div>
          </div>

          {/* Strava optional text */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            Connect Strava to automatically import your recent fitness data, or skip this step to enter it manually.
          </p>
        </div>
      </main>
    </div>
  );
}
