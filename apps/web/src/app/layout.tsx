import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { generateOrganizationSchema, jsonLdScript } from "@/lib/schema";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { PostHogProvider, PostHogPageView } from "@/providers/posthog-provider";
import { Suspense } from "react";
import { HashScrollHandler } from "@/components/layout/hash-scroll-handler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://racedayai.com"),

  title: {
    default: "RaceDayAI — AI Race Execution Coach for Triathletes",
    template: "%s | RaceDayAI",
  },

  description:
    "Get a personalized race-day execution plan with AI-optimized pacing, nutrition, and weather adjustments. Used by triathletes at IRONMAN, 70.3, Olympic, and Sprint distances.",

  keywords: [
    "triathlon race plan",
    "IRONMAN pacing strategy",
    "70.3 nutrition plan",
    "race day execution",
    "triathlon pacing calculator",
    "AI race coach",
    "marathon pacing",
    "race nutrition planning",
    "triathlon training",
    "race day strategy",
  ],

  authors: [{ name: "RaceDayAI" }],

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://racedayai.com",
    siteName: "RaceDayAI",
    title: "RaceDayAI — AI Race Execution Coach for Triathletes",
    description:
      "Stop guessing on race day. Get AI-powered pacing, nutrition, and weather-adjusted race plans for your next triathlon.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "RaceDayAI - AI Race Execution Coach",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "RaceDayAI — AI Race Execution Coach",
    description:
      "AI-powered race plans with pacing, nutrition & weather adjustments",
    images: ["/og-image.png"],
  },

  alternates: {
    canonical: "https://racedayai.com",
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  verification: {
    google: "BGF_KCOgdCiGvY3uq52VmOU6d-u-4awre7F-4VhcCx0",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationSchema = generateOrganizationSchema();

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdScript(organizationSchema)}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <HashScrollHandler />
          {children}
        </PostHogProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
