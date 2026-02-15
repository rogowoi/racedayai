import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Hero } from "@/components/home/hero";
import { SocialProof } from "@/components/home/social-proof";
import { BeforeAfter } from "@/components/home/before-after";
import { Demo } from "@/components/home/demo";
import { Features } from "@/components/home/features";
import { HowItWorks } from "@/components/home/how-it-works";
import { Testimonials } from "@/components/home/testimonials";
import { PricingPreview } from "@/components/home/pricing-preview";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {/* 1. Hook: Fear + desire headline */}
        <Hero />

        {/* 2. Trust: Quick credibility strip */}
        <SocialProof />

        {/* 3. Pain: Before/After — amplify the problem */}
        <BeforeAfter />

        {/* 4. Proof: Live demo — show the product works */}
        <Demo />

        {/* 5. Solution: Feature breakdown — how we solve it */}
        <Features />

        {/* 6. Easy: How it works — remove friction */}
        <HowItWorks />

        {/* 7. Social Proof: Testimonials — build trust */}
        <Testimonials />

        {/* 8. Close: Pricing — anchor value and convert */}
        <PricingPreview />

        {/* 9. Final CTA */}
        <section className="py-20 md:py-28 bg-primary/5">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Your next race deserves better than guesswork.
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              You&apos;ve put in the training. Let AI handle the execution
              strategy so you can focus on racing.
            </p>
            <Button
              size="lg"
              className="h-13 text-base px-10 font-semibold shadow-lg shadow-primary/25"
              asChild
            >
              <Link href="/wizard">
                Build My Race Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Free for your first race &middot; No credit card required
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
