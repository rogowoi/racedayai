import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Hero() {
  return (
    <section className="container mx-auto px-4 py-12 md:py-24 lg:py-32">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-16 items-center">
        {/* Text Content */}
        <div className="flex flex-col gap-6 items-start text-left">
          <div className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2"></span>
            Now supporting IRONMAN & 70.3
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            Stop guessing on <br className="hidden sm:block" />
            <span className="text-primary">race day.</span>
          </h1>
          <p className="max-w-[600px] text-lg text-muted-foreground sm:text-xl">
            Enter your fitness data + race details → get a personalized
            execution plan with pacing, nutrition, and real-time weather
            adjustments.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Button
              size="lg"
              className="w-full sm:w-auto h-12 text-base px-8"
              asChild
            >
              <Link href="/wizard">Create Free Plan</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto h-12 text-base"
              asChild
            >
              <Link href="#demo">See Example</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No credit card required · Free for Sprint/Olympic
          </p>
        </div>

        {/* Hero Visual - Mobile Optimized Stack */}
        <div className="relative mx-auto w-full max-w-[400px] lg:max-w-none">
          <div className="relative z-10 rounded-xl border bg-card p-2 shadow-2xl">
            <div className="rounded-lg bg-muted/50 p-4 space-y-4">
              {/* Fake UI: Plan Card */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Predicting Finish
                  </div>
                  <div className="text-2xl font-bold font-mono">5:12:43</div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-xs text-muted-foreground">
                    Confidence
                  </div>
                  <div className="text-sm font-medium text-green-600">
                    High (92%)
                  </div>
                </div>
              </div>

              {/* Fake UI: Pacing Segments */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Bike Pacing
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded bg-background p-2 text-center border">
                    <div className="text-xs text-muted-foreground">
                      Avg Power
                    </div>
                    <div className="font-bold">195W</div>
                  </div>
                  <div className="rounded bg-background p-2 text-center border">
                    <div className="text-xs text-muted-foreground">Hills</div>
                    <div className="font-bold">210W</div>
                  </div>
                  <div className="rounded bg-background p-2 text-center border">
                    <div className="text-xs text-muted-foreground">
                      Descents
                    </div>
                    <div className="font-bold">0W</div>
                  </div>
                </div>
              </div>

              {/* Fake UI: Nutrition */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nutrition Alert
                </div>
                <div className="flex items-start gap-3 rounded bg-blue-50 dark:bg-blue-950/30 p-3 text-sm border border-blue-100 dark:border-blue-900">
                  <span className="text-xl">💧</span>
                  <div>
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      Heat Warning (31°C)
                    </span>
                    <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                      Increase sodium to 800mg/hr. Reduce bike power by 5%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative elements behind */}
          <div className="absolute -top-12 -right-12 -z-10 h-[300px] w-[300px] rounded-full bg-primary/20 blur-3xl opacity-50" />
          <div className="absolute -bottom-12 -left-12 -z-10 h-[300px] w-[300px] rounded-full bg-blue-500/20 blur-3xl opacity-50" />
        </div>
      </div>
    </section>
  );
}
