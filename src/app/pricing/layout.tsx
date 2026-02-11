import type { Metadata } from "next";
import { generateProductSchema, jsonLdScript } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Flexible pricing for every racing season. From free Sprint/Olympic plans to unlimited access for coaches and pros. Choose the plan that fits your goals.",
  keywords: [
    "triathlon pricing",
    "race plan pricing",
    "triathlon coach pricing",
    "ironman planning cost",
    "triathlon subscription",
  ],
  openGraph: {
    title: "Pricing — RaceDayAI",
    description:
      "Choose the perfect plan for your racing season. Free Sprint/Olympic plans, Season Pass for serious athletes, or Unlimited for coaches.",
    url: "https://racedayai.com/pricing",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — RaceDayAI",
    description:
      "Flexible pricing for triathletes. Free plans available for Sprint/Olympic distance races.",
  },
  alternates: {
    canonical: "https://racedayai.com/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Generate Product schema for all three pricing tiers
  const freeProductSchema = generateProductSchema({
    name: "RaceDayAI Free",
    description:
      "Unlimited Sprint and Olympic distance race plans with AI-powered pacing and nutrition guidance.",
    price: "0",
    currency: "USD",
    imageUrl: "https://racedayai.com/og-image.png",
  });

  const seasonPassSchema = generateProductSchema({
    name: "RaceDayAI Season Pass",
    description:
      "Complete access to Half IRONMAN (70.3) and Full IRONMAN race planning with weather adjustments, advanced nutrition, and course analysis. Up to 6 plans per season.",
    price: "39",
    currency: "USD",
    imageUrl: "https://racedayai.com/og-image.png",
  });

  const unlimitedSchema = generateProductSchema({
    name: "RaceDayAI Unlimited",
    description:
      "Unlimited race plans for all distances including IRONMAN. Perfect for coaches managing multiple athletes or serious age-groupers racing frequently.",
    price: "99",
    currency: "USD",
    imageUrl: "https://racedayai.com/og-image.png",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(freeProductSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(seasonPassSchema)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(unlimitedSchema)}
      />
      {children}
    </>
  );
}
