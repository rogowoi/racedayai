"use client";

import { useEffect } from "react";
import { analytics, type AnalyticsEventName } from "@/lib/analytics";

interface TrackEventProps {
  event: AnalyticsEventName;
  properties?: Record<string, unknown>;
}

/**
 * Component to track an event once when mounted
 * Use this in Server Components to track page views
 */
export function TrackEvent({ event, properties }: TrackEventProps) {
  useEffect(() => {
    analytics.track(event, properties);
  }, [event, properties]);

  return null;
}
