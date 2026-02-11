import { Upload, Zap, MapPin, Download } from "lucide-react";

export function HowItWorks() {
  const steps = [
    {
      icon: Upload,
      title: "1. Enter Your Data",
      description:
        "Input your fitness metrics (FTP, threshold pace) or connect Strava. Upload race GPX files for course-specific analysis.",
    },
    {
      icon: MapPin,
      title: "2. Select Your Race",
      description:
        "Choose your race date, distance (Sprint, Olympic, 70.3, 140.6), and location. We'll pull real-time weather forecasts.",
    },
    {
      icon: Zap,
      title: "3. AI Generates Your Plan",
      description:
        "Our AI analyzes course elevation, weather conditions, and your fitness to create optimized pacing, nutrition, and hydration strategies.",
    },
    {
      icon: Download,
      title: "4. Execute on Race Day",
      description:
        "Download your plan as a PDF with race-day cards. Follow power targets, pace zones, and nutrition timeline to execute perfectly.",
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground">
            From fitness data to race-day execution plan in minutes
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {steps.map((step, index) => (
            <div
              key={index}
              className="relative flex flex-col items-center text-center group"
            >
              {/* Connector Line (except for last item) */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-1/2 w-full h-0.5 bg-border -z-10" />
              )}

              {/* Icon Circle */}
              <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground group-hover:scale-110 transition-transform">
                <step.icon className="h-10 w-10" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
