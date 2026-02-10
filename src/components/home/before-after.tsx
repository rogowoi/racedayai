import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";

export function BeforeAfter() {
  return (
    <section className="container mx-auto px-4 py-12 md:py-24">
      <div className="grid gap-8 lg:grid-cols-2 items-center">
        {/* The Old Way */}
        <Card className="bg-red-50/50 dark:bg-red-950/10 border-red-100 dark:border-red-900 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <X className="h-6 w-6" />
              The Guesswork Way
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white dark:bg-black/20 rounded-lg border border-red-100 dark:border-red-900/50 text-sm font-mono text-muted-foreground opacity-80">
              <p>"Bike hard but save legs"</p>
              <p>"Eat when hungry"</p>
              <p>"Drink at aid stations"</p>
              <p>"Don't go out too fast"</p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-red-500">✗</span> Vague intensity targets
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">✗</span> No weather adjustment
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500">✗</span> Risks bonking or
                cramping
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* The RaceDayAI Way */}
        <Card className="bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900 overflow-hidden relative shadow-lg ring-1 ring-green-100 dark:ring-green-900">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Check className="h-6 w-6" />
              The RaceDayAI Way
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-white dark:bg-black/20 rounded-lg border border-green-100 dark:border-green-900/50 text-sm">
              <div className="flex justify-between mb-2 border-b border-green-100 dark:border-green-900 pb-2">
                <span className="text-muted-foreground">Bike Target</span>
                <span className="font-bold">195W (73% FTP)</span>
              </div>
              <div className="flex justify-between mb-2 border-b border-green-100 dark:border-green-900 pb-2">
                <span className="text-muted-foreground">Nutrition</span>
                <span className="font-bold">75g Carbs / 800mg Sodium</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weather</span>
                <span className="font-bold text-amber-600">
                  Heat Adjusted (-5%)
                </span>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span> Precision power & pace
                targets
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span> Dynamic weather &
                course analysis
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500">✓</span> Scientific nutrition
                plan
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
