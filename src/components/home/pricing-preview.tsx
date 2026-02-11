import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function PricingPreview() {
  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade when you need more plans
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <div className="flex flex-col p-8 bg-card rounded-lg border">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$0</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Perfect for trying your first race plan
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">1 race plan</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Basic pacing + nutrition</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Manual fitness entry</span>
              </li>
            </ul>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/wizard">Get Started Free</Link>
            </Button>
          </div>

          {/* Season Pass */}
          <div className="flex flex-col p-8 bg-primary text-primary-foreground rounded-lg border-2 border-primary relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary-foreground text-primary px-3 py-1 rounded-full text-xs font-semibold">
              Most Popular
            </div>

            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Season Pass</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$39</span>
                <span className="text-sm opacity-90">/year</span>
              </div>
              <p className="text-sm opacity-90">
                For athletes racing 2-6 times per season
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">6 race plans per season</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">PDF export with race-day cards</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">GPX course upload + analysis</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Weather integration</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Strava auto-import</span>
              </li>
            </ul>

            <Button
              variant="secondary"
              className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              asChild
            >
              <Link href="/pricing">Get Season Pass</Link>
            </Button>
          </div>

          {/* Unlimited */}
          <div className="flex flex-col p-8 bg-card rounded-lg border">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Unlimited</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold">$99</span>
                <span className="text-sm text-muted-foreground">/year</span>
              </div>
              <p className="text-sm text-muted-foreground">
                For coaches and multi-sport athletes
              </p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Unlimited race plans</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">AI-generated race strategy</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Advanced weather warnings</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">Share plans via public link</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm">API access</span>
              </li>
            </ul>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/pricing">Get Unlimited</Link>
            </Button>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link
            href="/pricing"
            className="text-sm text-muted-foreground hover:text-primary underline"
          >
            View full pricing details →
          </Link>
        </div>
      </div>
    </section>
  );
}
