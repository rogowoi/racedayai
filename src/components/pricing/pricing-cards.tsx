"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight } from "lucide-react";

interface PricingCardsProps {
  isLoggedIn?: boolean;
}

export function PricingCards({ isLoggedIn = false }: PricingCardsProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  // Logged-in users go straight to checkout via settings, new users go to signup
  const getUpgradeHref = (plan: string) =>
    isLoggedIn
      ? `/dashboard/settings?upgrade=${plan}&billing=${billing}`
      : `/signup?plan=${plan}&billing=${billing}`;

  return (
    <>
      {/* Billing toggle */}
      <section className="pb-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center gap-3">
            <button
              onClick={() => setBilling("annual")}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                billing === "annual"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs opacity-80">(Save 33%)</span>
            </button>
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                billing === "monthly"
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">

            {/* Free */}
            <div className="flex flex-col p-7 bg-card rounded-xl border">
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">Starter</h2>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-4xl font-extrabold">$0</span>
                  <span className="text-sm text-muted-foreground">/forever</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Try one race plan &mdash; see your predicted finish time
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1 text-sm">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span><span className="font-medium">1 race plan</span> (any distance)</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Basic pacing + nutrition</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Manual fitness entry</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>View online</span>
                </li>
                <li className="flex items-start gap-2.5 text-muted-foreground">
                  <X className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-40" />
                  <span>No PDF export</span>
                </li>
                <li className="flex items-start gap-2.5 text-muted-foreground">
                  <X className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-40" />
                  <span>No weather adjustments</span>
                </li>
                <li className="flex items-start gap-2.5 text-muted-foreground">
                  <X className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-40" />
                  <span>No GPX course upload</span>
                </li>
                <li className="flex items-start gap-2.5 text-muted-foreground">
                  <X className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-40" />
                  <span>No Strava auto-import</span>
                </li>
              </ul>

              <Button variant="outline" className="w-full h-11" asChild>
                <Link href="/wizard">Try Free</Link>
              </Button>
            </div>

            {/* Season Pass — Primary conversion target */}
            <div className="flex flex-col p-7 rounded-xl border-2 border-primary relative bg-card shadow-xl shadow-primary/10">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </span>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">Season Pass</h2>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-extrabold">
                    ${billing === "annual" ? "39" : "4.99"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{billing === "annual" ? "year" : "month"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-muted-foreground line-through">
                    $150/plan with a coach
                  </span>
                </div>
                <p className="text-sm font-medium text-primary">
                  {billing === "annual"
                    ? "Just $6.50 per race \u00B7 6 races per season"
                    : "$4.99/mo \u00B7 cancel anytime"}
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1 text-sm">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span><span className="font-medium">6 race plans</span> per season</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span><span className="font-medium">Full weather integration</span> &mdash; heat, wind, humidity</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>GPX course upload + elevation analysis</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>PDF race-day card <span className="text-muted-foreground">(print &amp; go)</span></span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Strava auto-import</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>AI narrative strategy <span className="text-muted-foreground">(coach-style advice)</span></span>
                </li>
              </ul>

              <Button className="w-full h-11 font-semibold shadow-lg shadow-primary/25" asChild>
                <Link href={getUpgradeHref("season")}>
                  Get Season Pass
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Pro / Unlimited */}
            <div className="flex flex-col p-7 bg-card rounded-xl border">
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">Pro</h2>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-extrabold">
                    ${billing === "annual" ? "99" : "12.99"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    /{billing === "annual" ? "year" : "month"}
                  </span>
                </div>
                <div className="mb-3">
                  <span className="text-sm text-muted-foreground line-through">
                    $600+/year for coaching
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  For dedicated multi-race athletes
                </p>
              </div>

              <ul className="space-y-3 mb-8 flex-1 text-sm">
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span><span className="font-medium">Unlimited</span> race plans</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Everything in Season Pass</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Share plans via public link</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  <span>Priority support</span>
                </li>
              </ul>

              <Button variant="outline" className="w-full h-11" asChild>
                <Link href={getUpgradeHref("unlimited")}>Get Pro</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
