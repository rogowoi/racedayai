import { Navbar } from "@/components/layout/navbar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  CloudSun,
  Utensils,
  ClipboardCheck,
  Upload,
  MapPin,
  Zap,
  Download,
  Activity,
  Calendar,
  FileText,
  Share2,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export const metadata = {
  title: "Features",
  description:
    "Discover how RaceDayAI helps triathletes execute perfect race days with AI-powered pacing, nutrition planning, and course-specific analysis.",
};

const coreFeatures = [
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
      "31°C? Power reduced 5%. Headwind km 30–45? Pacing adjusted. Real-time weather data changes your entire strategy automatically.",
    icon: CloudSun,
    color: "text-sky-600 dark:text-sky-400",
    bg: "bg-sky-100 dark:bg-sky-900/30",
  },
  {
    title: "Don't wing your transitions",
    description:
      "T1 and T2 checklists with target times. Gear layout strategy. Every second counts — athletes lose 2–5 minutes in transitions alone.",
    icon: ClipboardCheck,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-100 dark:bg-violet-900/30",
  },
];

const additionalFeatures = [
  {
    title: "Connect Your Training Data",
    description:
      "Sync with Strava or Garmin Connect to automatically pull your FTP, threshold pace, and recent training data. No manual entry needed.",
    icon: Activity,
  },
  {
    title: "Race Calendar Integration",
    description:
      "Search our database of thousands of races worldwide, or create custom events. Upload GPX files for precise course analysis.",
    icon: Calendar,
  },
  {
    title: "PDF Race Cards",
    description:
      "Download printer-friendly race cards with all your targets, nutrition timeline, and contingency plans. Laminate it and race with confidence.",
    icon: FileText,
  },
  {
    title: "Share Your Plans",
    description:
      "Share race plans with your coach, training partners, or crew. Get feedback before race day and share your execution strategy.",
    icon: Share2,
  },
];

const howItWorksSteps = [
  {
    icon: Upload,
    title: "Enter your fitness data",
    description:
      "Input FTP, threshold pace, and body weight — or connect Strava and we'll pull it automatically.",
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

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Breadcrumbs items={[{ label: "Features", href: "/features" }]} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Everything You Need for Race Day Success
            </h1>
            <p className="text-xl text-muted-foreground">
              AI-powered race execution planning that helps you execute your
              best performance on race day. No guesswork, no spreadsheets, no
              complexity.
            </p>
          </div>
        </section>

        {/* Core Features */}
        <section className="py-16 container mx-auto px-4">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              Core Features
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Training gets you to the start line.{" "}
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">
                We get you to the finish line.
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">
              The average age-grouper leaves 15–30 minutes on the course from
              poor execution. Here&apos;s how we fix that.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {coreFeatures.map((feature, i) => (
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
        </section>

        {/* How It Works */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                How it works
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                From data to race plan in 3 minutes.
              </h2>
              <p className="text-lg text-muted-foreground">
                No coaching degree required. No spreadsheet wizardry. Just
                answer a few questions.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {howItWorksSteps.map((step, index) => (
                <div
                  key={index}
                  className="relative flex flex-col items-center text-center group"
                >
                  {/* Connector */}
                  {index < howItWorksSteps.length - 1 && (
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

        {/* Additional Features */}
        <section className="py-16 container mx-auto px-4">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Everything Else You Need
            </h2>
            <p className="text-lg text-muted-foreground">
              Beyond pacing and nutrition, we provide all the tools you need
              for race-day preparation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {additionalFeatures.map((feature, i) => (
              <Card
                key={i}
                className="border shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
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
        </section>

        {/* The Science */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight mb-6 text-center">
              Built on Sports Science
            </h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-lg text-center text-muted-foreground mb-8">
                Our algorithms are built on proven sports science principles:
              </p>
              <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
                <li>
                  <strong className="text-foreground">
                    Power-Based Pacing:
                  </strong>{" "}
                  Using your FTP and intensity factors validated by research on
                  IRONMAN and 70.3 performance
                </li>
                <li>
                  <strong className="text-foreground">
                    Metabolic Modeling:
                  </strong>{" "}
                  Carbohydrate oxidation rates, glycogen depletion, and fueling
                  strategies based on exercise physiology
                </li>
                <li>
                  <strong className="text-foreground">
                    Biomechanical Efficiency:
                  </strong>{" "}
                  Elevation-adjusted pacing that accounts for the physiological
                  cost of climbing
                </li>
                <li>
                  <strong className="text-foreground">
                    Environmental Adaptation:
                  </strong>{" "}
                  Heat stress calculations using dew point, WBGT, and
                  acclimatization status
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              Ready to Transform Your Race Day?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Build your perfect race-day execution plan in minutes &mdash;
              backed by sports science and powered by AI.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                asChild
              >
                <Link href="/wizard">Create Free Plan</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
                asChild
              >
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            {/* Product */}
            <div>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                Product
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/wizard"
                    className="hover:text-primary transition-colors"
                  >
                    Create Plan
                  </Link>
                </li>
                <li>
                  <Link
                    href="/pricing"
                    className="hover:text-primary transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/features"
                    className="hover:text-primary transition-colors"
                  >
                    Features
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                Company
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/about"
                    className="hover:text-primary transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="/faq"
                    className="hover:text-primary transition-colors"
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="hover:text-primary transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                Legal
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/privacy"
                    className="hover:text-primary transition-colors"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="hover:text-primary transition-colors"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>

            {/* Connect */}
            <div>
              <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                Connect
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link
                    href="/login"
                    className="hover:text-primary transition-colors"
                  >
                    Login
                  </Link>
                </li>
                <li>
                  <Link
                    href="/signup"
                    className="hover:text-primary transition-colors"
                  >
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} RaceDayAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
