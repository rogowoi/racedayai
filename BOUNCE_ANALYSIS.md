# Why 97% of TikTok Visitors Bounce — Deep Analysis

**Date:** February 17, 2026
**Data:** 980 visitors, 139 PLN (~$35) ad spend, 0 signups

---

## The Data

| Metric | Value |
|--------|-------|
| Total Visitors | 980 |
| Bounce Rate | **97%** |
| TikTok Visitors | 777 (79%) |
| Mobile | 91% |
| iOS | 88% |
| Signups | **0** |

### Funnel Breakdown

| Step | Visitors | % of Total | Drop-off |
|------|----------|-----------|----------|
| Landing Page (/) | 979 | 100% | — |
| Wizard (/wizard) | 7 | 0.7% | **99.3%** |
| Dashboard | 5 | 0.5% | — |
| Pricing | 3 | 0.3% | — |
| Signup | 3 | 0.3% | — |

### Geography (all wrong)

Poland 25%, Portugal 23%, Belgium 9%, Spain 8%, Czech Republic 6%

---

## The 6 Root Causes

### 1. CRITICAL — Wizard Requires Signup Before Showing Value

The wizard (`/wizard`) calls `/api/plans/check-limit` on mount. For unauthenticated users → 401 → redirect to `/signup`. Users must create an account before even trying the product.

**The flow:** TikTok ad → Landing page → Click CTA → Signup form → (user leaves)

**Why it kills conversions:** Zero value has been delivered. User hasn't seen a prediction, entered their data, or gotten any taste of the product. From a TikTok user's perspective, they clicked a link and got hit with a signup form.

**Fix:** Remove auth gate from wizard. Let anonymous users complete all 3 steps. Gate the "Generate Plan" button in Step 3 with a signup modal.

### 2. HIGH — Landing Page Built for Google, Not TikTok

The homepage has 8 sections (Hero, Social Proof, Before/After, Demo, Features, How It Works, Testimonials, Pricing). This is a SaaS marketing page for intent-driven Google traffic.

TikTok users have ~3 seconds of attention. They won't scroll through 8 sections. The demo (actual product showcase) is 3-4 screens below the fold on mobile.

**Fix:** Create a dedicated `/go` page for TikTok ads. One screen: headline + CTA → straight to wizard.

### 3. FIXED — Cookie Banner Blocking Wizard Button on Mobile

The cookie consent banner was `fixed bottom-0 z-50` and physically covered the "Next: Race Details" button on mobile.

**Status:** Fixed Feb 17 — moved to `fixed top-0`.

### 4. HIGH — Wrong Geography

Top countries: Poland, Portugal, Belgium, Spain, Czech Republic. Product is English-only with USD pricing. TikTok account is set to Polish market, biasing the algorithm.

**Fix:** Target US, UK, AU, CA only. Age 25-54. Interests: triathlon, IRONMAN, endurance sports.

### 5. MEDIUM — Hero Speaks to Experts, Ads Target Beginners

The "FirstTriathlon" ad targets beginners, but the hero shows: 195W/210W/165W power targets, FTP percentages, sodium mg/hr, gel timing. First-time triathletes don't know what FTP is.

**Fix:** Match hero messaging to audience. Beginners → show predicted finish time and simple pace targets. Experts → show power data.

### 6. MEDIUM — Campaign Optimized for Clicks, Not Conversions

Campaign objective was "Traffic" → "Landing Page Views". TikTok found cheap clickers ($0.05 CPC), not converters. 679 clicks, 0 conversions.

**Fix:** Install TikTok Pixel. Switch to "Website Conversions" objective. Fire events: ViewContent (wizard start), AddToCart (Step 3), CompleteRegistration (signup).

---

## The Core Insight

> Your product requires a high-commitment action (signup) before delivering any value. This works for Google traffic where users have intent. It does not work for TikTok traffic where users have curiosity.

The reframe: value first, signup second. Let them use the wizard → show a signup modal at "Generate Plan" → they're invested and will convert.

---

## Expected Impact (After Fixes)

| Metric | Current | Projected |
|--------|---------|-----------|
| Landing → Wizard | 0.7% | 15-30% |
| Wizard → Signup | 0% | 20-40% |
| Visit → Signup | 0% | 3-12% |
| Cost Per Signup | ∞ | $0.30-$1.20 |
