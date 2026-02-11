import { Navbar } from "@/components/layout/navbar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Target, Zap, Users, TrendingUp } from "lucide-react";

export const metadata = {
  title: "About RaceDayAI",
  description:
    "Learn about RaceDayAI's mission to help triathletes execute perfect race days through AI-powered pacing and nutrition planning.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 bg-gradient-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              About RaceDayAI
            </h1>
            <p className="text-xl text-muted-foreground">
              We're on a mission to help every age-group triathlete execute
              their perfect race day through data-driven planning and AI-powered
              insights.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Our Mission</h2>
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-lg leading-relaxed">
              Most age-group triathletes spend months training for race day,
              only to lose minutes (or hours) to preventable pacing mistakes,
              inadequate nutrition, or poor race-day execution. We built
              RaceDayAI to solve this problem.
            </p>
            <p className="text-lg leading-relaxed">
              By combining proven sports science, course-specific analysis, and
              real-time weather data, we generate personalized race execution
              plans that help you make the most of your fitness on race day.
            </p>
          </div>
        </section>

        {/* Values Grid */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-3xl font-bold tracking-tight mb-12 text-center">
              What We Believe
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4">
                  <Target className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Data-Driven</h3>
                <p className="text-muted-foreground">
                  Race plans should be based on science and your actual fitness
                  metrics, not guesswork.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Simple</h3>
                <p className="text-muted-foreground">
                  Powerful tools shouldn't require a PhD. Generate plans in
                  minutes, not hours.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Accessible</h3>
                <p className="text-muted-foreground">
                  Every athlete deserves access to professional-level race
                  planning, not just elites.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center mb-4">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Transparent</h3>
                <p className="text-muted-foreground">
                  We show our methodology and calculations. No black box, no
                  secrets.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It's Different */}
        <section className="py-16 container mx-auto px-4 max-w-4xl">
          <h2 className="text-3xl font-bold tracking-tight mb-6">
            What Makes Us Different
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Course-Specific Analysis
              </h3>
              <p className="text-muted-foreground">
                We don't just give you generic power zones. Upload your race GPX
                file and we'll analyze every climb, descent, and turn to
                optimize your pacing strategy for that specific course.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">
                Weather-Adjusted Planning
              </h3>
              <p className="text-muted-foreground">
                Racing in Dubai in July is different from racing in Boulder in
                September. We integrate real-time weather forecasts and adjust
                your pacing, hydration, and nutrition recommendations
                accordingly.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">Race-Day Focus</h3>
              <p className="text-muted-foreground">
                Training apps get you TO the start line. We focus on getting you
                FROM the start line to the finish line with the best performance
                possible on race day.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-2">
                Beyond Pacing: Complete Execution
              </h3>
              <p className="text-muted-foreground">
                We provide pacing targets, nutrition timelines, hydration
                strategies, transition checklists, and contingency plans—everything
                you need for flawless race-day execution.
              </p>
            </div>
          </div>
        </section>

        {/* The Science */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tight mb-6">
              The Science Behind RaceDayAI
            </h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p>
                Our algorithms are built on proven sports science principles:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Power-Based Pacing:</strong> Using your FTP and
                  intensity factors validated by research on IRONMAN and 70.3
                  performance
                </li>
                <li>
                  <strong>Metabolic Modeling:</strong> Carbohydrate oxidation
                  rates, glycogen depletion, and fueling strategies based on
                  exercise physiology
                </li>
                <li>
                  <strong>Biomechanical Efficiency:</strong> Elevation-adjusted
                  pacing that accounts for the physiological cost of climbing
                </li>
                <li>
                  <strong>Environmental Adaptation:</strong> Heat stress
                  calculations using dew point, WBGT, and acclimatization status
                </li>
              </ul>
              <p className="mt-4">
                We continually refine our models based on real race data and the
                latest research in endurance sports science.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">
              Ready to Execute Your Perfect Race?
            </h2>
            <p className="text-lg mb-8 opacity-90">
              Join thousands of triathletes who trust RaceDayAI for their race
              execution planning.
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
              <Button size="lg" variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 md:py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RaceDayAI. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
