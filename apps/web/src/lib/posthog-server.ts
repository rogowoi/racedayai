import { PostHog } from "posthog-node";
import type { AnalyticsEventName } from "./analytics";

// Server-side PostHog client (singleton)
let posthogClient: PostHog | null = null;

export function getPostHogClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    console.warn("PostHog API key not found");
    return null;
  }

  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
    });
  }

  return posthogClient;
}

/**
 * Track a server-side event
 */
export async function trackServerEvent(
  distinctId: string,
  event: AnalyticsEventName,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) return;

  try {
    client.capture({
      distinctId,
      event,
      properties,
    });
  } catch (error) {
    console.error("PostHog server tracking error:", error);
  }
}

/**
 * Identify a user on the server
 */
export async function identifyServerUser(
  distinctId: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  if (!client) return;

  try {
    client.identify({
      distinctId,
      properties,
    });
  } catch (error) {
    console.error("PostHog server identify error:", error);
  }
}

/**
 * Flush events (call before serverless function termination)
 */
export async function flushPostHog() {
  const client = getPostHogClient();
  if (!client) return;

  try {
    await client.shutdown();
  } catch (error) {
    console.error("PostHog flush error:", error);
  }
}
