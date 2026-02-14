import posthog from "posthog-js";

// Event names enum for type safety
export const AnalyticsEvent = {
  // Authentication
  SIGNUP_COMPLETED: "signup_completed",
  LOGIN_COMPLETED: "login_completed",
  LOGOUT: "logout",
  STRAVA_CONNECTED: "strava_connected",
  GARMIN_CONNECTED: "garmin_connected",

  // Onboarding
  ONBOARDING_VIEWED: "onboarding_viewed",
  ONBOARDING_CTA_CLICKED: "onboarding_cta_clicked",

  // Wizard Flow
  WIZARD_STARTED: "wizard_started",
  WIZARD_STEP_COMPLETED: "wizard_step_completed",
  WIZARD_STEP_BACK: "wizard_step_back",
  WIZARD_ABANDONED: "wizard_abandoned",

  // Wizard Step 1 (Fitness)
  FITNESS_DATA_MANUAL_ENTERED: "fitness_data_manual_entered",
  FITNESS_ESTIMATOR_USED: "fitness_estimator_used",
  STRAVA_SYNC_INITIATED: "strava_sync_initiated",
  STRAVA_SYNC_COMPLETED: "strava_sync_completed",

  // Wizard Step 2 (Race)
  RACE_SEARCH_PERFORMED: "race_search_performed",
  RACE_SELECTED_FROM_DATABASE: "race_selected_from_database",
  RACE_ENTERED_MANUALLY: "race_entered_manually",

  // Wizard Step 3 (Course)
  GPX_UPLOAD_STARTED: "gpx_upload_started",
  GPX_UPLOAD_COMPLETED: "gpx_upload_completed",
  RWGPS_SEARCH_PERFORMED: "rwgps_search_performed",
  RWGPS_ROUTE_SELECTED: "rwgps_route_selected",

  // Plan Generation
  PLAN_GENERATION_REQUESTED: "plan_generation_requested",
  PLAN_GENERATION_STARTED: "plan_generation_started",
  PLAN_GENERATION_COMPLETED: "plan_generation_completed",
  PLAN_GENERATION_FAILED: "plan_generation_failed",

  // Plan Viewing
  PLAN_VIEWED: "plan_viewed",
  PLAN_PDF_DOWNLOAD_CLICKED: "plan_pdf_download_clicked",
  PLAN_SHARE_LINK_CREATED: "plan_share_link_created",
  PLAN_SHARE_LINK_COPIED: "plan_share_link_copied",

  // Paywall & Conversion
  PAYWALL_SHOWN: "paywall_shown",
  UPGRADE_LINK_CLICKED: "upgrade_link_clicked",
  PRICING_PAGE_VIEWED: "pricing_page_viewed",
  PRICING_PLAN_SELECTED: "pricing_plan_selected",
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_COMPLETED: "checkout_completed",
  CHECKOUT_FAILED: "checkout_failed",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",

  // Dashboard
  DASHBOARD_VIEWED: "dashboard_viewed",
  SETTINGS_VIEWED: "settings_viewed",
  BILLING_PORTAL_CLICKED: "billing_portal_clicked",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

// User properties interface
export interface UserProperties {
  email?: string;
  plan?: "free" | "season" | "unlimited";
  plansCreatedThisSeason?: number;
  plansRemaining?: number;
  hasStravaConnected?: boolean;
  hasGarminConnected?: boolean;
  createdAt?: string;
  experienceLevel?: "beginner" | "intermediate" | "advanced" | "elite";
}

// Event properties interfaces
export interface WizardStepCompletedProps {
  step: 1 | 2 | 3;
  hasData: boolean;
}

export interface RaceSelectedProps {
  source: "database" | "manual";
  raceId?: string;
  raceName?: string;
  distance?: string;
}

export interface GpxUploadProps {
  source: "manual" | "database" | "rwgps";
  routeId?: number;
}

export interface PlanGenerationProps {
  planId?: string;
  distance?: string;
  hasGpx?: boolean;
  hasFtp?: boolean;
  durationSeconds?: number;
  error?: string;
}

export interface PlanViewedProps {
  planId: string;
  isOwner: boolean;
  viaShareLink: boolean;
}

export interface PaywallProps {
  plansUsed: number;
  plansLimit: number;
  triggerPoint?: string;
}

export interface CheckoutProps {
  plan: "season" | "unlimited";
  billing?: "monthly" | "annual";
  amount?: number;
}

// Type-safe analytics wrapper
export const analytics = {
  /**
   * Track an event
   */
  track: (
    event: AnalyticsEventName,
    properties?: Record<string, unknown>
  ) => {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.capture(event, properties);
    }
  },

  /**
   * Identify a user with properties
   */
  identify: (userId: string, properties?: UserProperties) => {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.identify(userId, properties);
    }
  },

  /**
   * Reset user identity (on logout)
   */
  reset: () => {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.reset();
    }
  },

  /**
   * Set user properties without identifying
   */
  setUserProperties: (properties: UserProperties) => {
    if (typeof window !== "undefined" && posthog.__loaded) {
      posthog.setPersonProperties(properties);
    }
  },
};

// Convenience methods for common events
export const trackWizardStep = (step: 1 | 2 | 3, hasData: boolean) => {
  analytics.track(AnalyticsEvent.WIZARD_STEP_COMPLETED, { step, hasData });
};

export const trackPlanGeneration = (
  status: "requested" | "started" | "completed" | "failed",
  props: PlanGenerationProps
) => {
  const eventMap = {
    requested: AnalyticsEvent.PLAN_GENERATION_REQUESTED,
    started: AnalyticsEvent.PLAN_GENERATION_STARTED,
    completed: AnalyticsEvent.PLAN_GENERATION_COMPLETED,
    failed: AnalyticsEvent.PLAN_GENERATION_FAILED,
  };
  analytics.track(eventMap[status], props);
};

export const trackPaywall = (props: PaywallProps) => {
  analytics.track(AnalyticsEvent.PAYWALL_SHOWN, props);
};

export const trackCheckout = (
  status: "started" | "completed" | "failed",
  props: CheckoutProps
) => {
  const eventMap = {
    started: AnalyticsEvent.CHECKOUT_STARTED,
    completed: AnalyticsEvent.CHECKOUT_COMPLETED,
    failed: AnalyticsEvent.CHECKOUT_FAILED,
  };
  analytics.track(eventMap[status], props);
};
