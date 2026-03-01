import { useWizardStore } from "@/stores/wizard-store";

export type FunnelStep =
  | "quiz_0"
  | "quiz_1"
  | "quiz_2"
  | "wizard_1"
  | "wizard_2"
  | "wizard_3"
  | "plan_generated";

export type FunnelAction = "viewed" | "completed" | "skipped";

export function trackFunnelEvent(
  step: FunnelStep,
  action: FunnelAction,
  value?: string
) {
  const sessionId = useWizardStore.getState().funnelSessionId;

  fetch("/api/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, step, action, value }),
  }).catch(() => {
    // Silent fail — funnel tracking should never break the UX
  });
}
