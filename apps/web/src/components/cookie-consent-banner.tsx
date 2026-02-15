"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const CONSENT_KEY = "cookie-consent";
const CONSENT_EXPIRY_DAYS = 365;

export interface CookieConsentState {
  analytics: boolean;
  timestamp: number;
}

export function getConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CONSENT_KEY);
  if (!raw) return null;
  try {
    const parsed: CookieConsentState = JSON.parse(raw);
    const expiryMs = CONSENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > expiryMs) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setConsent(analytics: boolean): void {
  const consent: CookieConsentState = { analytics, timestamp: Date.now() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  window.dispatchEvent(
    new CustomEvent("cookie-consent-changed", { detail: consent })
  );
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show banner if no consent decision has been made
    const consent = getConsent();
    if (!consent) {
      setVisible(true);
    }

    // Listen for re-show event (e.g. from footer "Cookie Preferences" link)
    const handleShow = () => setVisible(true);
    window.addEventListener("cookie-consent-show", handleShow);
    return () => window.removeEventListener("cookie-consent-show", handleShow);
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    setConsent(true);
    setVisible(false);
  };

  const handleReject = () => {
    setConsent(false);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background shadow-lg">
      <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          We use cookies to analyze site usage and improve your experience.{" "}
          <Link
            href="/privacy"
            className="underline hover:text-foreground transition-colors"
          >
            Privacy Policy
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleReject}>
            Reject
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
