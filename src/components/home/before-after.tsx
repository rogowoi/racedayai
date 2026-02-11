import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Check, ArrowRight, AlertTriangle } from "lucide-react";

export function BeforeAfter() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            The difference between finishing strong
            <br className="hidden sm:block" />
            and walking the marathon.
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 items-stretch max-w-5xl mx-auto">
          {/* The Guesswork Way */}
          <Card className="bg-red-50/60 dark:bg-red-950/10 border-red-200 dark:border-red-900 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 text-xl">
                <X className="h-6 w-6" />
                The Arm-Scribble Plan
              </CardTitle>
              <p className="text-sm text-red-600/70 dark:text-red-400/70">
                How most age-groupers race today
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white dark:bg-black/20 rounded-lg border border-red-200/50 dark:border-red-900/50 font-mono text-sm text-muted-foreground space-y-1">
                <p>&quot;Bike hard but save legs&quot;</p>
                <p>&quot;Eat when hungry&quot;</p>
                <p>&quot;Drink at aid stations&quot;</p>
                <p>&quot;Don&apos;t go out too fast&quot;</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-red-700 dark:text-red-400">
                      Blows up at km 60
                    </span>
                    <span className="text-muted-foreground">
                      {" "}&mdash; went 15W over target on the first climb
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-red-700 dark:text-red-400">
                      Bonks at mile 13
                    </span>
                    <span className="text-muted-foreground">
                      {" "}&mdash; missed two fueling windows on the bike
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-red-700 dark:text-red-400">
                      Walks the last 5K
                    </span>
                    <span className="text-muted-foreground">
                      {" "}&mdash; didn&apos;t adjust for 31&deg;C heat
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-red-200 dark:border-red-900">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Result:</span>
                  <span className="font-bold text-red-700 dark:text-red-400 font-mono">
                    +32 min slower than potential
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* The RaceDayAI Way */}
          <Card className="bg-green-50/60 dark:bg-green-950/10 border-green-200 dark:border-green-900 overflow-hidden relative shadow-lg ring-1 ring-primary/20">
            <div className="absolute top-3 right-3">
              <span className="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                RaceDayAI
              </span>
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400 text-xl">
                <Check className="h-6 w-6" />
                The Precision Plan
              </CardTitle>
              <p className="text-sm text-green-600/70 dark:text-green-400/70">
                Every watt, every gel, every degree accounted for
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-white dark:bg-black/20 rounded-lg border border-green-200/50 dark:border-green-900/50 text-sm space-y-2.5">
                <div className="flex justify-between items-center border-b border-green-100 dark:border-green-900 pb-2">
                  <span className="text-muted-foreground">Bike Target</span>
                  <span className="font-bold font-mono">195W (73% FTP)</span>
                </div>
                <div className="flex justify-between items-center border-b border-green-100 dark:border-green-900 pb-2">
                  <span className="text-muted-foreground">Hill Strategy</span>
                  <span className="font-bold font-mono">210W push, 165W recover</span>
                </div>
                <div className="flex justify-between items-center border-b border-green-100 dark:border-green-900 pb-2">
                  <span className="text-muted-foreground">Nutrition</span>
                  <span className="font-bold font-mono">75g carbs &middot; 800mg Na/hr</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Weather</span>
                  <span className="font-bold font-mono text-amber-600">Heat adj. &minus;5%</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium">Negative split the run</span>
                    <span className="text-muted-foreground">
                      {" "}&mdash; saved energy on bike with smart power targets
                    </span>
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium">Zero GI issues</span>
                    <span className="text-muted-foreground">
                      {" "}&mdash; timed nutrition prevented stomach problems
                    </span>
                  </span>
                </div>
                <div className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="font-medium">Ran strong through heat</span>
                    <span className="text-muted-foreground">
                      {" "}&mdash; adjusted intensity before the gun went off
                    </span>
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-green-200 dark:border-green-900">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Result:</span>
                  <span className="font-bold text-green-700 dark:text-green-400 font-mono flex items-center gap-1">
                    New PR <ArrowRight className="h-3 w-3" /> 5:12:43
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
