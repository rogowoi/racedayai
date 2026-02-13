import { TrendingUp, CloudSun, Utensils, ClipboardCheck } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const features = [
  {
    title: "Don't blow up on the bike",
    description:
      "AI adjusts your power target for every hill, headwind, and temperature change. Course-specific wattage targets that protect your run legs.",
    icon: TrendingUp,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-900/30",
  },
  {
    title: "Don't bonk at mile 16",
    description:
      "Exact carb, sodium, and caffeine timing based on your body weight, race duration, and conditions. Gel-by-gel timeline you can follow.",
    icon: Utensils,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  {
    title: "Don't ignore the forecast",
    description:
      "31\u00B0C? Power reduced 5%. Headwind km 30\u201345? Pacing adjusted. Real-time weather data changes your entire strategy automatically.",
    icon: CloudSun,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-100 dark:bg-sky-900/30",
  },
  {
    title: "Don't wing your transitions",
    description:
      "T1 and T2 checklists with target times. Gear layout strategy. Every second counts \u2014 athletes lose 2\u20135 minutes in transitions alone.",
    icon: ClipboardCheck,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-900/30",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Why athletes fail on race day
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Training gets you to the start line.{" "}
            <br className="hidden sm:block" />
            <span className="text-muted-foreground">
              We get you to the finish line.
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The average age-grouper leaves 15–30 minutes on the course from
            poor execution. Here&apos;s how we fix that.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <Card
              key={i}
              className="border shadow-sm hover:shadow-md transition-shadow bg-card"
            >
              <CardHeader>
                <div
                  className={`h-12 w-12 rounded-lg ${feature.bg} flex items-center justify-center mb-4 ${feature.color}`}
                >
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
