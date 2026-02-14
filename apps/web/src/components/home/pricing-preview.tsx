import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight, X } from "lucide-react";

export function PricingPreview() {
  return (
    <section id="pricing" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-6">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Pricing
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            A coach charges $150 for one race plan.
          </h2>
          <p className="text-lg text-muted-foreground">
            Get AI-powered race plans for your entire season — less than the
            cost of a single race entry.
          </p>
        </div>

        {/* Annual savings note */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-4 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-400">
            No long-term contracts &mdash; cancel anytime
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free — Taste */}
          <div className="flex flex-col p-7 bg-card rounded-xl border">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-1">Starter</h3>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-4xl font-extrabold">$0</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Try one race plan &mdash; see your predicted finish time
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1 text-sm">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium">1 race plan</span> (any
                  distance)
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Basic pacing + nutrition</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Manual fitness entry</span>
              </li>
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <X className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-40" />
                <span>No PDF export</span>
              </li>
              <li className="flex items-start gap-2.5 text-muted-foreground">
                <X className="h-4 w-4 flex-shrink-0 mt-0.5 opacity-40" />
                <span>No weather adjustments</span>
              </li>
            </ul>

            <Button variant="outline" className="w-full h-11" asChild>
              <Link href="/wizard">Try Free</Link>
            </Button>
          </div>

          {/* Season Pass — Core conversion target */}
          <div className="flex flex-col p-7 rounded-xl border-2 border-primary relative bg-card shadow-xl shadow-primary/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-xl font-bold mb-1">Season Pass</h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-extrabold">$39</span>
                <span className="text-sm text-muted-foreground">/year</span>
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-muted-foreground line-through">
                  $150/plan with a coach
                </span>
              </div>
              <p className="text-sm font-medium text-primary">
                Just $6.50 per race &middot; 6 races per season
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1 text-sm">
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium">6 race plans</span> per season
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium">Full weather integration</span>{" "}
                  &mdash; heat, wind, humidity
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>GPX course upload + elevation analysis</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  PDF race-day card{" "}
                  <span className="text-muted-foreground">(print & go)</span>
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>Strava auto-import</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  AI narrative strategy{" "}
                  <span className="text-muted-foreground">
                    (coach-style advice)
                  </span>
                </span>
              </li>
            </ul>

            <Button
              className="w-full h-11 font-semibold shadow-lg shadow-primary/25"
              asChild
            >
              <Link href="/pricing">
                Get Season Pass
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Pro / Unlimited */}
          <div className="flex flex-col p-7 bg-card rounded-xl border">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-1">Pro</h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-extrabold">$99</span>
                <span className="text-sm text-muted-foreground">/year</span>
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
                <span>
                  <span className="font-medium">Unlimited</span> race plans
                </span>
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
              <Link href="/pricing">Get Pro</Link>
            </Button>
          </div>
        </div>

        {/* Value anchor */}
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            You spent $200+ on race entry, $150 on a wetsuit, and $5,000 on a
            bike. The plan that ties it all together costs less than two gels.
          </p>
        </div>
      </div>
    </section>
  );
}
