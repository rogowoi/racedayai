import { TrendingUp, CloudSun, Utensils, PlayCircle } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

const features = [
  {
    title: "Smart Pacing",
    description:
      "Course-specific power and pace targets based on elevation and your fitness.",
    icon: TrendingUp,
  },
  {
    title: "Weather Adjustments",
    description:
      "Real-time heat and humidity analysis to adjust your intensity and hydration.",
    icon: CloudSun,
  },
  {
    title: "Nutrition Strategy",
    description:
      "Exact carb, fluid, and sodium intake customized to your sweat rate and race duration.",
    icon: Utensils,
  },
  {
    title: "Execution Plan",
    description:
      "Transition checklists and detailed segment-by-segment strategy.",
    icon: PlayCircle,
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="container mx-auto px-4 py-12 md:py-24 bg-muted/30"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
          More than just a training plan.
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Most athletes train for months but fail on race day because they lack
          an execution strategy. We bridge that gap.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((feature, i) => (
          <Card key={i} className="border-none shadow-md bg-card">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
                <feature.icon className="h-6 w-6" />
              </div>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
