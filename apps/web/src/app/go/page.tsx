"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Zap, FlaskConical, DollarSign, Timer, Shield } from "lucide-react";
import { ttqTrack } from "@/components/tiktok-pixel";

export default function TikTokLanding() {
  useEffect(() => {
    ttqTrack("ViewContent", { content_name: "go_landing" });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-orange-50 to-white dark:from-orange-950/20 dark:to-background">
      {/* Hero Section */}
      <section className="flex flex-col items-center px-4 pt-8 pb-6">
        <div className="flex items-center gap-2 mb-6">
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">
            RaceDay<span className="text-primary">AI</span>
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-center leading-tight max-w-md mb-3">
          Know your finish time
          <br />
          <span className="text-primary">before race day.</span>
        </h1>

        <p className="text-center text-muted-foreground text-base max-w-sm mb-2">
          AI-powered pacing, nutrition, and weather plan for your next triathlon.
        </p>

        <p className="text-sm text-muted-foreground mb-5">
          Free &middot; No credit card &middot; 3 minutes
        </p>

        <Button
          size="lg"
          className="w-full max-w-xs h-14 text-lg font-semibold shadow-lg shadow-primary/25"
          asChild
        >
          <Link href="/wizard">
            Build My Race Plan
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </section>

      {/* Plan Preview Card */}
      <section className="px-4 pb-6">
        <div className="mx-auto max-w-sm">
          <p className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wider mb-3">
            Example race plan
          </p>
          <div className="rounded-xl border bg-card p-2 shadow-xl shadow-black/5">
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between border-b pb-3">
                <div className="space-y-0.5">
                  <div className="text-[10px] font-medium text-primary uppercase tracking-wider">
                    Predicted Finish
                  </div>
                  <div className="text-2xl font-bold font-mono tracking-tight">
                    5:12:43
                  </div>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="text-[10px] text-muted-foreground">
                    Confidence
                  </div>
                  <div className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400">
                    92% High
                  </div>
                </div>
              </div>

              {/* Power Targets */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Bike Power Targets
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-lg bg-background p-2 text-center border">
                    <div className="text-[10px] text-muted-foreground uppercase">
                      Flats
                    </div>
                    <div className="font-bold text-base font-mono">195W</div>
                    <div className="text-[10px] text-muted-foreground">
                      73% FTP
                    </div>
                  </div>
                  <div className="rounded-lg bg-background p-2 text-center border border-primary/20">
                    <div className="text-[10px] text-primary uppercase font-medium">
                      Hills
                    </div>
                    <div className="font-bold text-base font-mono text-primary">
                      210W
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      79% FTP
                    </div>
                  </div>
                  <div className="rounded-lg bg-background p-2 text-center border">
                    <div className="text-[10px] text-muted-foreground uppercase">
                      Descents
                    </div>
                    <div className="font-bold text-base font-mono">165W</div>
                    <div className="text-[10px] text-muted-foreground">
                      62% FTP
                    </div>
                  </div>
                </div>
              </div>

              {/* Weather Alert */}
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2.5 text-sm border border-amber-200 dark:border-amber-800">
                <span className="text-base leading-none">&#x26A0;&#xFE0F;</span>
                <div>
                  <span className="font-semibold text-amber-900 dark:text-amber-100 text-xs">
                    Heat Alert &mdash; 31&deg;C
                  </span>
                  <p className="text-amber-700 dark:text-amber-300 text-[11px] mt-0.5">
                    Power reduced 5%. Sodium +800mg/hr.
                  </p>
                </div>
              </div>

              {/* Nutrition */}
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Next fuel:</span>
                <span className="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 font-medium">
                  Gel #1 at T+0:15
                </span>
                <span>&rarr;</span>
                <span className="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 font-medium">
                  75g carbs/hr
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="border-y bg-muted/30 py-6 px-4">
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          {[
            { icon: FlaskConical, stat: "Sports Science", detail: "Peer-reviewed physiology" },
            { icon: DollarSign, stat: "$150 Value", detail: "Same as a coach charges" },
            { icon: Timer, stat: "3 Minutes", detail: "Data to race plan" },
            { icon: Shield, stat: "All Distances", detail: "Sprint to IRONMAN" },
          ].map((point, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <point.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">{point.stat}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  {point.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="px-4 py-6">
        <div className="max-w-sm mx-auto rounded-xl border bg-card p-5">
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, j) => (
              <span key={j} className="text-orange-500 text-sm">
                ★
              </span>
            ))}
          </div>
          <p className="text-sm leading-relaxed mb-3 text-foreground">
            &ldquo;I used to wing my nutrition and bonked at mile 18 every time.
            RaceDayAI&apos;s plan had me fueling every 30 minutes and I actually
            negative-split the run.&rdquo;
          </p>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">SK</span>
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Sarah K.</p>
              <p className="text-xs text-muted-foreground">
                First IRONMAN 70.3 finisher
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="flex flex-col items-center px-4 pb-10">
        <div className="flex gap-4 mb-5 text-xs text-muted-foreground">
          <span>Sprint</span>
          <span>&middot;</span>
          <span>Olympic</span>
          <span>&middot;</span>
          <span>70.3</span>
          <span>&middot;</span>
          <span>IRONMAN</span>
        </div>

        <Button
          size="lg"
          className="w-full max-w-xs h-14 text-lg font-semibold shadow-lg shadow-primary/25"
          asChild
        >
          <Link href="/wizard">
            Build My Race Plan
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>

        <p className="text-xs text-muted-foreground mt-3">
          Free for your first race &middot; No credit card required
        </p>
      </section>
    </div>
  );
}
