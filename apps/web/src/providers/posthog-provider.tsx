"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  getConsent,
  type CookieConsentState,
} from "@/components/cookie-consent-banner";

function initPostHog() {
  if (
    typeof window !== "undefined" &&
    !posthog.__loaded &&
    process.env.NEXT_PUBLIC_POSTHOG_KEY &&
    process.env.NEXT_PUBLIC_POSTHOG_HOST
  ) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: "identified_only",
      capture_pageview: false, // We'll capture manually
      capture_pageleave: true,
      session_recording: {
        recordCrossOriginIframes: true,
      },
    });
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const consent = getConsent();
    if (consent?.analytics) {
      initPostHog();
    }

    const handleConsentChange = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentState>).detail;
      if (detail.analytics) {
        initPostHog();
      } else if (posthog.__loaded) {
        posthog.opt_out_capturing();
        posthog.reset();
      }
    };

    window.addEventListener("cookie-consent-changed", handleConsentChange);
    return () =>
      window.removeEventListener("cookie-consent-changed", handleConsentChange);
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}

// PageView tracker component
export function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog.__loaded) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + `?${searchParams.toString()}`;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}
