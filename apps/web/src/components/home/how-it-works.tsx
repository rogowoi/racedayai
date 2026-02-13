import { Upload, MapPin, Zap, Download } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: "Enter your fitness data",
      description:
        "Input FTP, threshold pace, and body weight \u2014 or connect Strava and we\u2019ll pull it automatically.",
      detail: "2 minutes",
    },
    {
      icon: MapPin,
      title: "Pick your race",
      description:
        "Select distance, date, and location. Upload a GPX file for course-specific analysis.",
      detail: "30 seconds",
    },
    {
      icon: Zap,
      title: "AI builds your plan",
      description:
        "Our engine analyzes course elevation, weather forecast, and your fitness to create optimized targets.",
      detail: "~30 seconds",
    },
    {
      icon: Download,
      title: "Execute on race day",
      description:
        "Download your PDF race card. Follow power, pace, and nutrition targets to your best finish.",
      detail: "Race day",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            From data to race plan in 3 minutes.
          </h2>
          <p className="text-lg text-muted-foreground">
            No coaching degree required. No spreadsheet wizardry. Just answer a
            few questions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative flex flex-col items-center text-center group"
            >
              {/* Connector */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-border" />
              )}

              {/* Step Number + Icon */}
              <div className="relative mb-5">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <step.icon className="h-9 w-9" />
                </div>
                <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                {step.description}
              </p>
              <span className="text-xs font-medium text-primary">
                {step.detail}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
