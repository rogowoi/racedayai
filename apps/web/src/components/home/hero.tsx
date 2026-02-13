import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-sky-50 dark:from-orange-950/20 dark:via-background dark:to-sky-950/20" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-28 lg:py-36">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="flex flex-col gap-6 items-start text-left">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              AI-powered race execution for triathletes
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
              You trained for months.{" "}
              <br className="hidden sm:block" />
              <span className="text-primary">
                Don&apos;t race on guesswork.
              </span>
            </h1>

            <p className="max-w-[540px] text-lg text-muted-foreground leading-relaxed">
              Get a precision race plan with AI-optimized pacing, nutrition, and
              weather adjustments. The same analysis a{" "}
              <span className="font-semibold text-foreground">
                $150 coach
              </span>{" "}
              runs &mdash; generated in 3 minutes.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-13 text-base px-8 font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
                asChild
              >
                <Link href="/wizard">
                  Build My Race Plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-13 text-base font-medium"
                asChild
              >
                <Link href="#demo">See a Sample Plan</Link>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Free for your first race &middot; No credit card required
            </p>
          </div>

          {/* Hero Visual — Live plan preview */}
          <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
            <div className="relative z-10 rounded-xl border bg-card p-2 shadow-2xl shadow-black/10">
              <div className="rounded-lg bg-muted/50 p-5 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-primary uppercase tracking-wider">
                      Predicted Finish
                    </div>
                    <div className="text-3xl font-bold font-mono tracking-tight">
                      5:12:43
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Confidence
                    </div>
                    <div className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-sm font-semibold text-green-700 dark:text-green-400">
                      92% High
                    </div>
                  </div>
                </div>

                {/* Pacing */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Bike Power Targets
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-background p-2.5 text-center border">
                      <div className="text-[11px] text-muted-foreground uppercase">
                        Flats
                      </div>
                      <div className="font-bold text-lg font-mono">195W</div>
                      <div className="text-[11px] text-muted-foreground">
                        73% FTP
                      </div>
                    </div>
                    <div className="rounded-lg bg-background p-2.5 text-center border border-primary/20">
                      <div className="text-[11px] text-primary uppercase font-medium">
                        Hills
                      </div>
                      <div className="font-bold text-lg font-mono text-primary">
                        210W
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        79% FTP
                      </div>
                    </div>
                    <div className="rounded-lg bg-background p-2.5 text-center border">
                      <div className="text-[11px] text-muted-foreground uppercase">
                        Descents
                      </div>
                      <div className="font-bold text-lg font-mono">165W</div>
                      <div className="text-[11px] text-muted-foreground">
                        62% FTP
                      </div>
                    </div>
                  </div>
                </div>

                {/* Weather Alert */}
                <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-sm border border-amber-200 dark:border-amber-800">
                  <span className="text-lg leading-none">&#x26A0;&#xFE0F;</span>
                  <div>
                    <span className="font-semibold text-amber-900 dark:text-amber-100">
                      Heat Alert &mdash; 31&deg;C forecast
                    </span>
                    <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                      Power reduced 5%. Sodium increased to 800mg/hr.
                    </p>
                  </div>
                </div>

                {/* Nutrition strip */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

            {/* Decorative glow */}
            <div className="absolute -top-16 -right-16 -z-10 h-[350px] w-[350px] rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 -z-10 h-[300px] w-[300px] rounded-full bg-accent/15 blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
}
