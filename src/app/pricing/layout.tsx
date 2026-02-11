import type { Metadata } from "next";

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
  return children;
}
