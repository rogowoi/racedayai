import { Card } from "@/components/ui/card";

const testimonials = [
  {
    quote:
      "I used to wing my nutrition and bonked at mile 18 every time. RaceDayAI's plan had me fueling every 30 minutes and I actually negative-split the run.",
    name: "Sarah K.",
    description: "First IRONMAN 70.3 finisher",
    initials: "SK",
    bgColor: "bg-blue-500",
  },
  {
    quote:
      "The weather adjustment alone was worth it. Race day hit 34°C and the plan had already cut my power target and doubled my sodium. Finished strong while others were walking.",
    name: "Marcus T.",
    description: "3x IRONMAN finisher",
    initials: "MT",
    bgColor: "bg-green-500",
  },
  {
    quote:
      "I showed my coach the plan and he said it was exactly what he would have prescribed. For $39 a year vs $150 per plan, it's a no-brainer.",
    name: "Coach Jamie R.",
    description: "USAT Certified Coach",
    initials: "JR",
    bgColor: "bg-orange-500",
  },
];

export function Testimonials() {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Trusted by triathletes at every level
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how athletes across all distances use RaceDayAI to execute their
            race day strategy and achieve their goals.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, i) => (
            <Card
              key={i}
              className="border shadow-sm hover:shadow-md transition-shadow bg-card p-8 flex flex-col"
            >
              {/* Star Rating */}
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, j) => (
                  <span key={j} className="text-orange-500 text-lg">
                    ★
                  </span>
                ))}
              </div>

              {/* Quote */}
              <p className="text-base leading-relaxed mb-6 flex-1 text-foreground">
                "{testimonial.quote}"
              </p>

              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div
                  className={`h-12 w-12 rounded-full ${testimonial.bgColor} flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-white font-bold text-sm">
                    {testimonial.initials}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.description}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
