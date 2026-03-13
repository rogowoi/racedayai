import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock, ChevronRight, BookOpen, Map } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { getArticleSummaries } from "@/lib/content";

export const metadata: Metadata = {
  title: "Triathlon Resources & Guides",
  description:
    "Free data-driven guides on 70.3 race execution, bike pacing, nutrition timing, and common mistakes. Built from 840,000+ triathlon race results.",
  keywords: [
    "triathlon guides",
    "70.3 race guide",
    "half ironman tips",
    "triathlon pacing",
    "race nutrition",
  ],
  openGraph: {
    title: "Triathlon Resources & Guides | RaceDayAI",
    description:
      "Free data-driven guides on 70.3 race execution, bike pacing, nutrition timing, and common mistakes.",
    url: "https://racedayai.com/resources",
  },
  alternates: {
    canonical: "https://racedayai.com/resources",
  },
};

export default function ResourcesPage() {
  const resources = getArticleSummaries("resources");
  const races = getArticleSummaries("races");

  const pillar = resources.find((a) => a.isPillar);
  const clusters = resources.filter((a) => !a.isPillar);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <Breadcrumbs items={[{ label: "Resources", href: "/resources" }]} />

      <main className="flex-1">
        {/* Hero */}
        <section className="pb-12 md:pb-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Triathlon Resources & Guides
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Data-driven race execution guides built from 840,000+ triathlon
              results. Everything you need to pace, fuel, and execute your best
              race.
            </p>
          </div>
        </section>

        {/* Pillar Article (featured) */}
        {pillar && (
          <section className="pb-12">
            <div className="container mx-auto px-4 max-w-4xl">
              <Link
                href={`/resources/${pillar.slug}`}
                className="group block rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background p-6 md:p-8 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3">
                  <BookOpen className="h-4 w-4" />
                  Complete Guide
                </div>
                <h2 className="text-2xl md:text-3xl font-bold group-hover:text-primary transition-colors mb-3">
                  {pillar.title}
                </h2>
                <p className="text-muted-foreground mb-4 max-w-2xl">
                  {pillar.metaDescription}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {pillar.readingTime} min read
                  </span>
                  <span className="flex items-center gap-1 text-primary font-medium ml-auto">
                    Read guide
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Cluster Articles */}
        {clusters.length > 0 && (
          <section className="pb-12">
            <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-xl font-bold mb-5">Strategy Deep Dives</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {clusters.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/resources/${article.slug}`}
                    className="group block rounded-lg border bg-background p-5 hover:border-primary/50 transition-colors"
                  >
                    <h3 className="font-semibold group-hover:text-primary transition-colors mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {article.metaDescription}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {article.readingTime} min
                      <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Race-Specific Guides */}
        {races.length > 0 && (
          <section className="pb-12">
            <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                <Map className="h-5 w-5 text-primary" />
                Race-Specific Guides
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {races.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/races/${article.slug}`}
                    className="group block rounded-lg border bg-background p-5 hover:border-primary/50 transition-colors"
                  >
                    <h3 className="font-semibold group-hover:text-primary transition-colors mb-2 line-clamp-2">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {article.metaDescription}
                    </p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      {article.readingTime} min
                      <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="py-16 md:py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Race Smarter?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Get a personalized race plan with segment-by-segment targets for
              your specific course, fitness, and race-day weather.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="h-13 text-base px-10 font-semibold"
              asChild
            >
              <Link href="/wizard">
                Build My Race Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
