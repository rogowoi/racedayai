import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Hero } from "@/components/home/hero";
import { SocialProof } from "@/components/home/social-proof";
import { BeforeAfter } from "@/components/home/before-after";
import { Demo } from "@/components/home/demo";
import { Features } from "@/components/home/features";
import { HowItWorks } from "@/components/home/how-it-works";
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

        {/* 7. Close: Pricing — anchor value and convert */}
        <PricingPreview />

        {/* 8. Final CTA */}
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

      <footer className="border-t py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/wizard" className="hover:text-primary">
                    Create Plan
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-primary">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/#features" className="hover:text-primary">
                    Features
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-primary">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-primary">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy" className="hover:text-primary">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/login" className="hover:text-primary">
                    Log In
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-primary">
                    Sign Up
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} RaceDayAI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
