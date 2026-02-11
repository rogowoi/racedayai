"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Check, X, ArrowRight, Shield, Zap, Clock } from "lucide-react";

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero — Coach Cost Anchor */}
        <section className="pt-16 pb-8 md:pt-20 md:pb-12">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
              Pricing
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              A coach charges $150 per race plan.
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Get the same precision for less than a pair of race-day gels.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-green-600" />
                7-day money-back guarantee
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                Cancel anytime
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                Plans ready in 3 minutes
              </span>
            </div>
          </div>
        </section>

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
                  <Link href="/signup">
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
                    For coaches, clubs, and multi-sport athletes
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
                    <span>Plan comparison tool</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Multi-athlete support <span className="text-muted-foreground">(up to 5)</span></span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>API access</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                </ul>

                <Button variant="outline" className="w-full h-11" asChild>
                  <Link href="/signup">Get Pro</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Value anchor */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              You spent $200+ on race entry, $150 on a wetsuit, and $5,000 on a
              bike. The plan that ties it all together costs less than two gels.
            </p>
          </div>
        </section>

        {/* FAQ quick hits */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight mb-8 text-center">
              Common Questions
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-1">Can I try before I pay?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes. The Starter plan is free forever and lets you create a full race plan for any distance. No credit card required.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">What counts as a &ldquo;race plan&rdquo;?</h3>
                <p className="text-sm text-muted-foreground">
                  Each plan is a complete race-day execution strategy: pacing targets, nutrition timeline, weather adjustments, and contingency plans for one specific race event.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">What if it doesn&apos;t work for me?</h3>
                <p className="text-sm text-muted-foreground">
                  All paid plans come with a 7-day money-back guarantee. If you&apos;re not happy, email us and we&apos;ll refund you &mdash; no questions asked.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Can I switch plans later?</h3>
                <p className="text-sm text-muted-foreground">
                  Absolutely. Upgrade or downgrade at any time. If you upgrade mid-cycle, we prorate the difference.
                </p>
              </div>
            </div>
            <div className="text-center mt-8">
              <Link href="/faq" className="text-sm text-primary hover:underline">
                View all frequently asked questions &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 text-center max-w-xl">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Your next race deserves better than guesswork.
            </h2>
            <p className="text-muted-foreground mb-8">
              Start with a free plan. Upgrade when you&apos;re ready.
            </p>
            <Button size="lg" className="h-13 text-base px-10 font-semibold shadow-lg shadow-primary/25" asChild>
              <Link href="/wizard">
                Build My Race Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/wizard" className="hover:text-primary">Create Plan</Link></li>
                <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
                <li><Link href="/#features" className="hover:text-primary">Features</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary">About</Link></li>
                <li><Link href="/faq" className="hover:text-primary">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-primary">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-primary">Log In</Link></li>
                <li><Link href="/signup" className="hover:text-primary">Sign Up</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} RaceDayAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
