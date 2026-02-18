"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !posthog.__loaded &&
      process.env.NEXT_PUBLIC_POSTHOG_KEY &&
      process.env.NEXT_PUBLIC_POSTHOG_HOST
    ) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        person_profiles: "identified_only",
        capture_pageview: false,
        capture_pageleave: true,
        persistence: "localStorage+cookie",
      });
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// PageView tracker component — also captures UTM parameters
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog.__loaded) {
      let url = window.origin + pathname;
      const params = searchParams?.toString();
      if (params) {
        url = url + `?${params}`;
      }

      // Capture UTM parameters for attribution
      const utmProps: Record<string, string> = {};
      const utmKeys = [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
      ];
      for (const key of utmKeys) {
        const value = searchParams?.get(key);
        if (value) {
          utmProps[key] = value;
        }
      }

      // Also capture referrer and TikTok click ID if present
      const ttclid = searchParams?.get("ttclid");
      if (ttclid) {
        utmProps.ttclid = ttclid;
      }

      posthog.capture("$pageview", {
        $current_url: url,
        ...utmProps,
        $referrer: document.referrer || undefined,
      });
    }
  }, [pathname, searchParams]);

  return null;
}
