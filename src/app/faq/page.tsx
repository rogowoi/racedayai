import { Navbar } from "@/components/layout/navbar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { generateFAQSchema, jsonLdScript } from "@/lib/schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Common questions about RaceDayAI triathlon race planning, pacing strategies, nutrition recommendations, and AI-powered execution plans for IRONMAN and 70.3 races.",
  keywords: [
    "triathlon FAQ",
    "race planning questions",
    "pacing strategy FAQ",
    "triathlon nutrition questions",
    "IRONMAN questions",
    "70.3 FAQ",
  ],
  openGraph: {
    title: "FAQ — RaceDayAI",
    description:
      "Get answers to common questions about AI-powered race execution planning for triathletes.",
    url: "https://racedayai.com/faq",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FAQ — RaceDayAI",
    description: "Common questions about triathlon race planning and pacing.",
  },
  alternates: {
    canonical: "https://racedayai.com/faq",
  },
};

const faqs = [
  {
    question: "What is RaceDayAI and how does it work?",
    answer:
      "RaceDayAI is an AI-powered race execution planner for triathletes. You input your fitness data (FTP, run pace, swim pace), select your race, and optionally upload the course GPX file. Our AI analyzes your fitness, the course profile, and real-time weather forecasts to generate a personalized pacing strategy, nutrition timeline, and race-day execution plan.",
  },
  {
    question: "What races does RaceDayAI support?",
    answer:
      "We support all triathlon distances: Sprint, Olympic, Half IRONMAN (70.3), and Full IRONMAN. You can select from our database of popular races or create a custom race plan by uploading your own course GPX file.",
  },
  {
    question: "Do I need a power meter or heart rate monitor?",
    answer:
      "For the most accurate bike pacing recommendations, we recommend knowing your FTP (Functional Threshold Power). However, you can also use perceived exertion or heart rate zones. For running, we use pace-based targets which work with any GPS watch.",
  },
  {
    question: "How accurate are the finish time predictions?",
    answer:
      "Our predictions are based on proven sports science principles and validated algorithms. For athletes who accurately input their fitness metrics, predictions typically fall within 3-5% of actual finish times. Accuracy improves when you upload the actual course profile and include current weather forecasts.",
  },
  {
    question: "Can I use RaceDayAI for my first triathlon?",
    answer:
      "Absolutely! RaceDayAI is designed for all levels, from first-timers to seasoned pros. For newer athletes, we provide conservative pacing recommendations and detailed nutrition guidance to help you finish strong. The free plan includes unlimited Sprint and Olympic distance plans.",
  },
  {
    question: "What's the difference between the Free and Season Pass plans?",
    answer:
      "The Free plan includes unlimited Sprint and Olympic distance race plans with basic features. The Season Pass ($39/year) adds Half IRONMAN (70.3) and Full IRONMAN support, weather-adjusted pacing, advanced nutrition planning, course-specific analysis, and up to 10 race plans per season.",
  },
  {
    question: "How does the weather adjustment work?",
    answer:
      "We integrate real-time weather forecasts for your race location and date. Hot conditions trigger recommendations to reduce bike power (typically 5-10%), increase hydration and sodium intake, and adjust pacing on exposed sections. Cold/wet conditions get different recommendations to maintain body temperature and adjust nutrition timing.",
  },
  {
    question: "Can I use the plan on my Garmin or other GPS device?",
    answer:
      "Yes! Your race plan includes downloadable files compatible with Garmin, Wahoo, and other GPS devices. You can also print a simplified race card to carry with you or take screenshots of key sections for quick reference during the race.",
  },
  {
    question: "What if my race doesn't have a GPX file available?",
    answer:
      "No problem! You can still create an effective race plan using general course information (distance, estimated elevation gain, typical weather). While a detailed GPX file provides the most accurate segment-by-segment pacing, our AI can generate excellent recommendations based on race distance and category (flat, hilly, mountainous).",
  },
  {
    question: "How far in advance should I create my race plan?",
    answer:
      "We recommend creating your initial plan 2-4 weeks before the race. This gives you time to practice the nutrition strategy and get familiar with your target power/pace zones. You can regenerate the plan closer to race day (3-7 days out) to incorporate the latest weather forecast.",
  },
  {
    question: "Does RaceDayAI replace my coach?",
    answer:
      "No, RaceDayAI focuses specifically on race-day execution, not training. Think of us as complementary to your coach or training plan. We help you make the most of your fitness on race day through optimal pacing and nutrition. Many coaches use RaceDayAI to quickly generate race plans for their athletes.",
  },
  {
    question: "What nutrition recommendations does RaceDayAI provide?",
    answer:
      "We calculate your carbohydrate needs based on race duration and intensity, typically targeting 60-90g/hour for longer races. The plan includes a minute-by-minute nutrition timeline showing when to consume gels, drinks, or solid food, adjusted for your personal preferences and the specific race conditions.",
  },
  {
    question: "Can I adjust the AI's recommendations?",
    answer:
      "Yes! While we provide science-backed recommendations, you can adjust power targets, pace zones, and nutrition timing to match your preferences and experience. The plan is a starting point that you can customize based on how you feel during training and past race experience.",
  },
  {
    question: "How does the bike pacing account for hills?",
    answer:
      "When you upload a GPX file, we analyze every climb and descent. For climbs, we increase your target power based on gradient and duration (typically 10-20% above FTP for short climbs). On descents, we reduce power to near zero to allow recovery. This prevents the common mistake of surging too hard on climbs.",
  },
  {
    question: "What about the run pacing strategy?",
    answer:
      "We recommend a negative split strategy for most athletes: start 10-15 seconds per kilometer slower than goal pace, gradually increasing as the run progresses. This conservative start protects against the bike-to-run transition fatigue and helps you finish strong rather than walking the final 5K.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes. We take data privacy seriously. Your fitness data and race plans are encrypted and never shared with third parties. You can delete your account and all associated data at any time. See our Privacy Policy for complete details.",
  },
  {
    question: "Can I share my race plan with others?",
    answer:
      "Yes! Each race plan has a unique shareable link that you can send to your coach, training partners, or family. Shared plans are view-only and don't require the recipient to create an account.",
  },
  {
    question: "Do you offer refunds?",
    answer:
      "Yes, we offer a 30-day money-back guarantee on all paid plans. If you're not satisfied with RaceDayAI for any reason, contact us within 30 days of purchase for a full refund.",
  },
  {
    question: "Can I use RaceDayAI for other endurance events?",
    answer:
      "Currently, we focus specifically on triathlons (Sprint, Olympic, 70.3, IRONMAN). We're working on expanding to standalone cycling events, marathons, and ultra-endurance races. Join our newsletter to be notified when we add new event types.",
  },
  {
    question: "How do I contact support?",
    answer:
      "You can reach us at support@racedayai.com or through the contact form on our website. We typically respond within 24 hours on business days. For urgent race-week questions, mention your race date in the subject line for priority support.",
  },
];

export default function FAQPage() {
  // Generate FAQ schema for rich snippets
  const faqSchema = generateFAQSchema(
    faqs.map((faq) => ({
      question: faq.question,
      answer: faq.answer,
    }))
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Add FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(faqSchema)}
      />

      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: "FAQ", href: "/faq" }]} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-16 bg-gradient-to-b from-muted/30 to-background">
          <div className="container mx-auto px-4 max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about AI-powered race execution
              planning
            </p>
          </div>
        </section>

        {/* FAQ Content */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="space-y-8">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="border-b pb-8 last:border-b-0 last:pb-0"
                >
                  <h2 className="text-xl md:text-2xl font-semibold mb-4">
                    {faq.question}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>

            {/* CTA Section */}
            <div className="mt-16 pt-12 border-t text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Create Your Race Plan?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                Join thousands of triathletes who trust RaceDayAI for their race
                execution planning. Start with a free Sprint or Olympic plan.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild>
                  <Link href="/wizard">Create Free Plan</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>

            {/* Still Have Questions */}
            <div className="mt-12 p-6 bg-muted/30 rounded-lg text-center">
              <h3 className="text-lg font-semibold mb-2">
                Still have questions?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                We're here to help! Reach out to our support team.
              </p>
              <Button variant="outline" asChild>
                <Link href="mailto:support@racedayai.com">Contact Support</Link>
              </Button>
            </div>

            {/* Last Updated */}
            <div className="mt-12 pt-8 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Last updated: February 11, 2026
              </p>
              <Link href="/" className="text-sm text-primary hover:underline">
                ← Back to Home
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
