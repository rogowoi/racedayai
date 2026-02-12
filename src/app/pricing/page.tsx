import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Shield, Zap, Clock, ArrowRight } from "lucide-react";
import { PricingCards } from "@/components/pricing/pricing-cards";

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero — Coach Cost Anchor */}
        <section className="pt-16 pb-8 md:pt-20 md:pb-12">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">
              Pricing
            </p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              A coach charges $150 per race plan.
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Get the same precision for less than a pair of race-day gels.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-green-600" />
                No long-term contracts
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                Cancel anytime
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                Plans ready in 3 minutes
              </span>
            </div>
          </div>
        </section>

        {/* Client component: billing toggle + pricing cards */}
        <PricingCards />

        {/* Value anchor */}
        <section className="py-8">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              You spent $200+ on race entry, $150 on a wetsuit, and $5,000 on a
              bike. The plan that ties it all together costs less than two gels.
            </p>
          </div>
        </section>

        {/* FAQ quick hits */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl font-bold tracking-tight mb-8 text-center">
              Common Questions
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-1">Can I try before I pay?</h3>
                <p className="text-sm text-muted-foreground">
                  Yes. The Starter plan is free forever and lets you create a full race plan for any distance. No credit card required.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">What counts as a &ldquo;race plan&rdquo;?</h3>
                <p className="text-sm text-muted-foreground">
                  Each plan is a complete race-day execution strategy: pacing targets, nutrition timeline, weather adjustments, and contingency plans for one specific race event.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">What if it doesn&apos;t work for me?</h3>
                <p className="text-sm text-muted-foreground">
                  All sales are final. You can cancel your subscription at any time and retain access through the end of your billing period. We don&apos;t offer refunds, but you can try RaceDayAI free before committing.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Can I switch plans later?</h3>
                <p className="text-sm text-muted-foreground">
                  Absolutely. Upgrade or downgrade at any time. If you upgrade mid-cycle, we prorate the difference.
                </p>
              </div>
            </div>
            <div className="text-center mt-8">
              <Link href="/faq" className="text-sm text-primary hover:underline">
                View all frequently asked questions &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 text-center max-w-xl">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Your next race deserves better than guesswork.
            </h2>
            <p className="text-muted-foreground mb-8">
              Start with a free plan. Upgrade when you&apos;re ready.
            </p>
            <Button size="lg" className="h-13 text-base px-10 font-semibold shadow-lg shadow-primary/25" asChild>
              <Link href="/wizard">
                Build My Race Plan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/wizard" className="hover:text-primary">Create Plan</Link></li>
                <li><Link href="/pricing" className="hover:text-primary">Pricing</Link></li>
                <li><Link href="/#features" className="hover:text-primary">Features</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/about" className="hover:text-primary">About</Link></li>
                <li><Link href="/faq" className="hover:text-primary">FAQ</Link></li>
                <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-primary">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Connect</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/login" className="hover:text-primary">Log In</Link></li>
                <li><Link href="/signup" className="hover:text-primary">Sign Up</Link></li>
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
