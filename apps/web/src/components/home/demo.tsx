import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Activity, Wind, Droplet, Zap } from "lucide-react";

export function Demo() {
  return (
    <section id="demo" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            See RaceDayAI in Action
          </h2>
          <p className="text-lg text-muted-foreground">
            Example race plan for IRONMAN 70.3 Dubai (March 2026)
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          {/* Overview Card */}
          <Card className="mb-8 border-2">
            <CardHeader className="bg-muted/50">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <CardTitle className="text-2xl mb-2">
                    IRONMAN 70.3 Dubai
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    March 7, 2026 · Middle Distance Triathlon
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-sm text-muted-foreground mb-1">
                    Predicted Finish
                  </div>
                  <div className="text-3xl font-bold font-mono">5:12:43</div>
                  <div className="text-sm text-green-600 font-medium mt-1">
                    Confidence: High (92%)
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Swim */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Activity className="h-5 w-5" />
                    <h3 className="font-semibold text-lg">Swim</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance:</span>
                      <span className="font-medium">1.9 km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Pace:</span>
                      <span className="font-medium">1:45/100m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Time:</span>
                      <span className="font-medium">33:15</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Steady effort, draft when possible
                  </p>
                </div>

                {/* Bike */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Zap className="h-5 w-5" />
                    <h3 className="font-semibold text-lg">Bike</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance:</span>
                      <span className="font-medium">90 km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Power:</span>
                      <span className="font-medium">195W</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Time:</span>
                      <span className="font-medium">2:38:20</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Hills: +10% power · Descents: recover
                  </p>
                </div>

                {/* Run */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <Activity className="h-5 w-5" />
                    <h3 className="font-semibold text-lg">Run</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Distance:</span>
                      <span className="font-medium">21.1 km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Pace:</span>
                      <span className="font-medium">5:15/km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. Time:</span>
                      <span className="font-medium">1:51:00</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    First 10K +15s/km, negative split
                  </p>
                </div>
              </div>

              {/* AI Insights */}
              <div className="mt-8 pt-6 border-t">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <span className="text-primary">🤖</span>
                  AI-Powered Adjustments
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                    <Wind className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                        Heat Warning (31°C forecast)
                      </div>
                      <p className="text-amber-700 dark:text-amber-300">
                        Power reduced by 5%. Increase sodium to 800mg/hr.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                    <Droplet className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        Hydration Strategy
                      </div>
                      <p className="text-blue-700 dark:text-blue-300">
                        500ml/hr on bike, 200ml/hr on run. Start early.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nutrition Timeline */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-4">Nutrition Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-3 p-3 rounded bg-muted">
                    <div className="font-mono font-semibold w-16">T+0:15</div>
                    <div className="text-muted-foreground">
                      First gel (25g carbs) + 250ml water
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded bg-muted">
                    <div className="font-mono font-semibold w-16">T+0:40</div>
                    <div className="text-muted-foreground">
                      Second gel + electrolytes
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded bg-muted">
                    <div className="font-mono font-semibold w-16">T+1:05</div>
                    <div className="text-muted-foreground">
                      Third gel (60g total per hour)
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    + Continue pattern every 25 minutes through bike and run
                  </p>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-8 pt-6 border-t text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Get your personalized race plan with course-specific pacing,
                  weather adjustments, and nutrition timeline
                </p>
                <Button size="lg" asChild>
                  <Link href="/wizard">Create Your Free Plan</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
