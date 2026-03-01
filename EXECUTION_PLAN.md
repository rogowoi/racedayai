# RaceDayAI — Conversion Fix Execution Plan

**Goal:** Go from 0% to 5-10% signup rate on next TikTok campaign
**Timeline:** 2-3 days of work before next ad spend
**Date:** February 18, 2026

---

## Task 1: Remove Auth Gate from Wizard (THE MOST IMPORTANT CHANGE)

**Why:** Right now clicking "Build My Race Plan" → /wizard → 401 redirect → /signup. Users must create an account before seeing ANY value. This kills 100% of TikTok conversions.

**What to change:** Let anonymous users complete the wizard. Only require signup when they click "Generate Plan" in Step 3.

### File 1: `apps/web/src/app/wizard/page.tsx`

**Current behavior (lines 36-57):** On mount, calls `/api/plans/check-limit`. If 401, redirects to `/signup`.

**Change to:**
- Remove the auth redirect on mount entirely
- Still call check-limit, but if 401, just set `planLimit` to `{ canCreate: true }` (let them use wizard)
- Only the plan-limit-exceeded state blocks the wizard (for existing users who hit their cap)

```tsx
// REPLACE lines 36-57 with:
useEffect(() => {
  async function checkLimits() {
    try {
      const res = await fetch("/api/plans/check-limit");
      const data = await res.json();

      if (res.status === 401) {
        // Anonymous user — let them use the wizard freely
        // Auth check happens at plan generation (Step 3)
        setPlanLimit({ canCreate: true });
        setChecking(false);
        setMounted(true);
        return;
      }

      setPlanLimit(data);
      setChecking(false);
      setMounted(true);
    } catch {
      // On error, still let them use the wizard
      setPlanLimit({ canCreate: true });
      setChecking(false);
      setMounted(true);
    }
  }

  checkLimits();
}, [router]);
```

Also remove the Strava pre-fill useEffect for anonymous users (it will fail gracefully anyway since `getAthleteMetrics` is a server action that requires auth — just make sure it doesn't break):

The existing try/catch on line 82 already handles this. No change needed.

### File 2: `apps/web/src/components/wizard/step-3-course.tsx`

**Current behavior (lines 340-348):** If `/api/plans/generate` returns 401, silently redirects to `/login`.

**Change to:** Show a signup modal instead of redirecting. The user has already filled out 3 steps of data — don't throw them to a different page.

```tsx
// REPLACE lines 340-348 with:
if (res.status === 401) {
  setShowSignupModal(true);
  setIsSubmitting(false);
  return;
}
```

Then add a signup modal component at the bottom of step-3-course.tsx:

```tsx
// Add state at top of component:
const [showSignupModal, setShowSignupModal] = useState(false);

// Add modal in the return JSX:
{showSignupModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className="bg-background rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
      <h2 className="text-xl font-bold">Create your free account</h2>
      <p className="text-muted-foreground">
        Your race data is saved. Sign up to generate your personalized plan — it takes 30 seconds.
      </p>
      <div className="space-y-3">
        <Button asChild className="w-full" size="lg">
          <Link href={`/signup?callbackUrl=${encodeURIComponent("/wizard")}`}>
            Sign Up — Free
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full" size="lg">
          <Link href={`/login?callbackUrl=${encodeURIComponent("/wizard")}`}>
            I already have an account
          </Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Free for your first race plan · No credit card required
      </p>
    </div>
  </div>
)}
```

**Key detail:** The wizard store (Zustand) persists data in memory. When the user signs up and gets redirected back to `/wizard`, their data will be gone. Two options:

- **Option A (quick):** Save wizard data to sessionStorage before redirect. On wizard mount, check sessionStorage and restore.
- **Option B (better UX):** After signup, redirect to `/wizard?restore=true`, and persist wizard data in sessionStorage when showing the signup modal.

### Recommended sessionStorage persistence:

Add to step-3-course.tsx before showing the modal:
```tsx
// Save wizard state before redirect
if (typeof window !== "undefined") {
  sessionStorage.setItem("wizard-data", JSON.stringify({
    fitnessData: useWizardStore.getState().fitnessData,
    raceData: useWizardStore.getState().raceData,
    step: 3, // they were on step 3
  }));
}
```

Add to wizard/page.tsx on mount:
```tsx
// Restore wizard state after signup redirect
useEffect(() => {
  if (typeof window !== "undefined") {
    const saved = sessionStorage.getItem("wizard-data");
    if (saved) {
      try {
        const { fitnessData, raceData, step } = JSON.parse(saved);
        if (fitnessData) setFitnessData(fitnessData);
        if (raceData) useWizardStore.getState().setRaceData(raceData);
        if (step) setStep(step);
        sessionStorage.removeItem("wizard-data");
      } catch {}
    }
  }
}, [mounted]);
```

### Test checklist:
- [ ] Open incognito → go to /wizard → should load Step 1 (no redirect)
- [ ] Complete Step 1, 2, 3 → click Generate → signup modal appears
- [ ] Click "Sign Up" → signs up → redirected back to /wizard with data restored
- [ ] Click Generate again → plan generates successfully
- [ ] Logged-in user flow still works normally
- [ ] User who hit plan limit still sees the upgrade prompt

---

## Task 2: Create TikTok Landing Page at `/go`

**Why:** The main homepage has 8 sections and is designed for Google traffic. TikTok users need one screen: headline + CTA.

### Create `apps/web/src/app/go/page.tsx`

```tsx
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export const metadata = {
  title: "Get Your AI Race Plan — Free | RaceDayAI",
  description: "Build your personalized triathlon race plan in 3 minutes. AI-optimized pacing, nutrition, and weather adjustments.",
};

export default function TikTokLanding() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-gradient-to-b from-orange-50 to-white dark:from-orange-950/20 dark:to-background">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <Zap className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold">RaceDayAI</span>
      </div>

      {/* Headline */}
      <h1 className="text-3xl sm:text-4xl font-extrabold text-center leading-tight max-w-md mb-4">
        Know your finish time
        <br />
        <span className="text-primary">before race day.</span>
      </h1>

      {/* One-liner */}
      <p className="text-center text-muted-foreground text-lg max-w-sm mb-8">
        Enter your fitness data, pick your race, get an AI-powered pacing and nutrition plan in 3 minutes.
      </p>

      {/* Social proof line */}
      <p className="text-sm text-muted-foreground mb-6">
        Free · No credit card · Works for any triathlon distance
      </p>

      {/* Single CTA */}
      <Button size="lg" className="h-14 text-lg px-10 font-semibold shadow-lg shadow-primary/25" asChild>
        <Link href="/wizard">
          Build My Race Plan
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>

      {/* Trust strip */}
      <div className="flex gap-6 mt-12 text-sm text-muted-foreground">
        <span>Sprint</span>
        <span>·</span>
        <span>Olympic</span>
        <span>·</span>
        <span>70.3</span>
        <span>·</span>
        <span>IRONMAN</span>
      </div>
    </div>
  );
}
```

### Test:
- [ ] Visit /go on mobile — should be one screen, no scroll needed
- [ ] "Build My Race Plan" → goes to /wizard (no signup redirect after Task 1)
- [ ] Page loads fast (no heavy components)

### In TikTok ads, change the destination URL to:
```
https://racedayai.com/go?utm_source=tiktok&utm_medium=paid&utm_campaign=launch_v2
```

---

## Task 3: Fix TikTok Ad Targeting

### In TikTok Ads Manager:

1. **Duplicate the existing campaign** (don't edit — keep old data for comparison)
2. **Change objective** to "Website Conversions" (not "Traffic")
   - This requires TikTok Pixel (see Task 4)
   - If Pixel isn't ready yet, use "Traffic" but optimize for "Landing Page Views" with a conversion value
3. **Change targeting:**
   - **Countries:** United States, United Kingdom, Australia, Canada
   - **Age:** 25-54
   - **Interests:** Triathlon, IRONMAN, Marathon, Endurance Sports, Cycling, Running, Strava, Garmin
   - **Behaviors:** Sports enthusiasts
4. **Budget:** Start with $10-15/day for 3-5 days to test
5. **Bid strategy:** Lowest cost (let TikTok optimize)

---

## Task 4: Install TikTok Pixel

### Step 1: Get your Pixel ID from TikTok Ads Manager
- Go to Assets → Events → Web Events
- Create a new pixel (or use existing one)
- Copy the Pixel ID (looks like: `XXXXXXXXXXXXXXXXX`)

### Step 2: Add to the app

Create `apps/web/src/components/tiktok-pixel.tsx`:

```tsx
"use client";

import Script from "next/script";

const TIKTOK_PIXEL_ID = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

export function TikTokPixel() {
  if (!TIKTOK_PIXEL_ID) return null;

  return (
    <Script id="tiktok-pixel" strategy="afterInteractive">
      {`
        !function (w, d, t) {
          w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
          ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
          ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
          for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
          ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
          ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;
          ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};
          var i=document.createElement("script");i.type="text/javascript";i.async=!0;i.src=r+"?sdkid="+e+"&lib="+t;
          var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(i,a)};
          ttq.load('${TIKTOK_PIXEL_ID}');
          ttq.page();
        }(window, document, 'ttq');
      `}
    </Script>
  );
}

// Helper to fire TikTok events from anywhere
export function ttqTrack(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && (window as any).ttq) {
    (window as any).ttq.track(event, params);
  }
}
```

### Step 3: Add to root layout

In `apps/web/src/app/layout.tsx`, add:
```tsx
import { TikTokPixel } from "@/components/tiktok-pixel";

// Inside the <body>:
<TikTokPixel />
```

### Step 4: Fire conversion events

Add these calls to existing code:

```tsx
// In step-1-fitness.tsx — when user clicks "Next: Race Details"
import { ttqTrack } from "@/components/tiktok-pixel";
ttqTrack("ViewContent", { content_name: "wizard_step1_complete" });

// In step-3-course.tsx — when user clicks "Generate Plan"
ttqTrack("AddToCart", { content_name: "wizard_step3_generate" });

// In signup action (auth-actions.ts) — after successful signup
ttqTrack("CompleteRegistration");
```

### Step 5: Add env var
```
NEXT_PUBLIC_TIKTOK_PIXEL_ID=your_pixel_id_here
```

---

## Task 5: Create TikTok-Style Video Content with Tolstoy

### Use platform.gotolstoy.com to generate AI video ads:

1. Go to platform.gotolstoy.com
2. Look for AI video generation features
3. Create short (15-30 sec) videos with these scripts:

**Script A — "The Discovery" (for beginners)**
> "I just found an AI that tells you exactly how to race your triathlon. You put in your fitness data, pick your race, and it gives you your predicted finish time, exactly when to eat, what power to hold... and it's free? I'm trying this for my next 70.3."

**Script B — "The Problem" (pain point)**
> "You trained 6 months for this race and your pacing strategy is... vibes? No wonder people blow up on the bike and walk the marathon. This AI analyzes your actual fitness and the course to build a real plan."

**Script C — "The Result" (show the output)**
> "This is what a $150 coaching analysis looks like... except an AI made it in 3 minutes. Predicted finish, power targets for every section, nutrition timed to the minute, weather adjustments. Free for your first race."

### Video style guidelines:
- Vertical (9:16) — 1080x1920
- 15-30 seconds
- Hook in first 2 seconds
- Show the actual product (screen recording of wizard/results)
- End with clear CTA: "Link in bio" or "Try it free"
- Use trending sounds if Tolstoy supports it

---

## Task 6: Deploy & Verify Analytics

### Before launching ads:

1. **Deploy the code changes** (Tasks 1 & 2):
   ```bash
   git add -A && git commit -m "feat: remove auth gate from wizard, add /go landing page"
   git push
   ```

2. **Verify PostHog tracking** (already fixed from previous session):
   - Open incognito → visit racedayai.com
   - Check PostHog → should see a pageview event (without cookie consent)
   - Walk through wizard → check events fire

3. **Verify TikTok Pixel** (Task 4):
   - Install TikTok Pixel Helper Chrome extension
   - Visit racedayai.com → should see PageView event
   - Walk through wizard → should see ViewContent, AddToCart events

4. **Test the full funnel in incognito:**
   - Go to racedayai.com/go
   - Click "Build My Race Plan"
   - Complete wizard steps 1-3
   - Click "Generate Plan" → signup modal appears
   - Sign up → redirected to wizard with data restored
   - Generate plan → success

---

## Checklist Summary

| # | Task | Priority | Time | Status |
|---|------|----------|------|--------|
| 1 | Remove auth gate from wizard | P0 | 2-3 hrs | Not started |
| 2 | Create /go TikTok landing page | P0 | 1 hr | Not started |
| 3 | Fix TikTok ad targeting | P0 | 30 min | Not started |
| 4 | Install TikTok Pixel | P1 | 1-2 hrs | Not started |
| 5 | Create video content with Tolstoy | P1 | 1-2 hrs | Not started |
| 6 | Deploy & verify analytics | P0 | 1 hr | Not started |

**Total estimated time: 6-9 hours**

---

## Success Metrics for Next Campaign

After implementing these changes, run a $30-50 test campaign for 3-5 days and measure:

- **Landing → Wizard rate:** Target >15% (currently 0.7%)
- **Wizard → Signup rate:** Target >20% (currently 0%)
- **Overall Visit → Signup:** Target >3% (currently 0%)
- **Cost per signup:** Target <$2.00 (currently infinite)

If these targets are hit, scale budget to $20-30/day and start optimizing creatives.
