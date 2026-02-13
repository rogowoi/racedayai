import { FlaskConical, DollarSign, Timer, Shield } from "lucide-react";

const proofPoints = [
  {
    icon: FlaskConical,
    stat: "Sports Science",
    detail: "Algorithms built on peer-reviewed exercise physiology and nutrition research",
  },
  {
    icon: DollarSign,
    stat: "$150 Value",
    detail: "The same pacing and nutrition analysis a triathlon coach charges per plan",
  },
  {
    icon: Timer,
    stat: "3 Minutes",
    detail: "From entering your fitness data to a complete race execution plan",
  },
  {
    icon: Shield,
    stat: "All Distances",
    detail: "Sprint, Olympic, Half IRONMAN, and full IRONMAN courses worldwide",
  },
];

export function SocialProof() {
  return (
    <section className="border-y bg-muted/30">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {proofPoints.map((point, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center gap-2"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                <point.icon className="h-5 w-5" />
              </div>
              <div className="text-lg font-bold tracking-tight">
                {point.stat}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
                {point.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
