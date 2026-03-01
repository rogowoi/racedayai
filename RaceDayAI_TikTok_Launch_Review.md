# RaceDayAI TikTok Launch Post-Mortem

**Date:** February 17, 2026
**Campaign Period:** February 11-17, 2026 (paused Feb 15)
**Result:** 0 signups from paid traffic

---

## Executive Summary

You spent 139 PLN (~$35 USD) on TikTok ads and got 82,292 impressions, 679 clicks, and 614 landing page views — but **zero signups**. The funnel broke at every stage after the click, and a combination of analytics blindness, mobile UX bugs, and audience mismatch explains the failure. The good news: the ad creative performance was actually strong, and the fixes are concrete.

---

## 1. TikTok Ads Performance

### Campaign Setup
| Metric | Value |
|--------|-------|
| Campaign name | "test campaign" |
| Ad groups | 1 (auto-named) |
| Ads | 6 video creatives |
| Objective | Landing page views |
| Budget | No limit set |
| Total spend | 139.05 PLN (~$35) |
| Duration | ~2 days (created Feb 15, paused same day) |
| Targeting region | Poland |
| Audience | 86% iOS, 9% iPad, 5% Android |

### Performance Metrics
| Metric | Value | Benchmark | Assessment |
|--------|-------|-----------|------------|
| Impressions | 82,292 | - | Good reach for budget |
| Clicks | 679 | - | Decent volume |
| CTR | 0.83% | 0.5-1.5% avg | OK — within normal range |
| CPM | 1.69 PLN | - | Very cheap (Poland market) |
| CPC | 0.20 PLN (~$0.05) | $0.50-2.00 avg | Excellent — 10x below avg |
| Landing page views | 614 | - | 90% of clicks converted |
| Signups | 0 | - | **CRITICAL FAILURE** |

### Per-Ad Breakdown
| Ad # | Impressions | Clicks | CTR | Cost | Cost/LPV |
|------|-------------|--------|-----|------|----------|
| Ad 1 | 7,996 | 57 | 0.71% | 14.90 PLN | 0.28 PLN |
| Ad 2 | 18,203 | 142 | 0.78% | 28.06 PLN | 0.22 PLN |
| Ad 3 (best CTR) | 13,891 | 131 | **0.94%** | 23.81 PLN | 0.20 PLN |
| Ad 4 | 10,255 | 84 | 0.82% | 18.56 PLN | 0.23 PLN |
| Ad 5 (most spend) | 20,609 | 172 | 0.83% | 33.32 PLN | 0.21 PLN |
| Ad 6 | 11,338 | 93 | 0.82% | 20.40 PLN | 0.25 PLN |

**Key finding:** Ad performance was actually decent. The $0.05 CPC and 0.83% CTR means the creatives worked. The problem is everything after the click.

---

## 2. The Funnel Breakdown

```
TikTok Impressions: 82,292
        ↓ 0.83% CTR
Clicks: 679
        ↓ 90% reached site
Landing Page Views: 614
        ↓ 0% conversion ← TOTAL FAILURE HERE
Signups: 0
```

### Why Zero Signups — Root Causes

#### ROOT CAUSE #1: Cookie Consent Blocks Analytics AND the Next Button

**Severity: CRITICAL**

PostHog is consent-gated — it only initializes after users click "Accept" on the cookie banner. On mobile (95% of TikTok traffic), the cookie banner sits at the bottom of the screen, **directly covering the "Next: Race Details" button on the wizard**.

This means:
- Users who don't interact with the cookie banner **cannot see the navigation button** to proceed past Step 1 of the wizard
- Users who click "Reject" won't be tracked by PostHog at all
- Users who ignore the banner are stuck on Step 1

**Evidence:** PostHog shows only 4 total persons ever recorded. With 614 landing page visits, that means **99.3% of visitors were invisible to analytics**. You were flying completely blind.

#### ROOT CAUSE #2: Wrong Campaign Objective

**Severity: HIGH**

The campaign was optimized for **"Landing page views"** (Landingpage-Aufruf), not conversions. TikTok's algorithm optimized for users most likely to click and load the page — not users likely to sign up. These are fundamentally different audiences.

When you optimize for landing page views, TikTok serves ads to "clickers" — people who casually tap on interesting content but have no intent to engage deeply. You want to optimize for a deeper event (signup or at minimum "add to cart" equivalent).

#### ROOT CAUSE #3: Audience Mismatch (Poland)

**Severity: HIGH**

The ads ran in **Poland** (PLN currency, Polish-language TikTok Ads Manager). Your product:
- Has English-only content
- Prices in USD ($10/mo, $96/yr)
- Targets triathlon-specific jargon (FTP, CSS, T1/T2, watts)
- References IRONMAN races (Dubai, Austria)

Even if a Polish triathlete saw the ad, the language and pricing barrier likely caused instant bounce. Triathlon is also a relatively niche sport in Poland compared to the US, UK, or Australia.

#### ROOT CAUSE #4: TikTok In-App Browser Friction

**Severity: MEDIUM**

When users click a TikTok ad, it opens in TikTok's in-app browser. This creates multiple friction points:
- Limited browser features (no password autofill, no Strava OAuth popup support)
- Users can't easily bookmark or return later
- The in-app browser may not handle complex SPAs well
- Users are in "entertainment mode" — not "tool-research mode"

#### ROOT CAUSE #5: No Mobile-First Optimization for Ads Traffic

**Severity: MEDIUM**

The landing page hero on mobile shows:
- Headline + body text + two CTAs
- The demo panel (predicted finish time, power targets) is pushed below the fold
- No immediate visual proof of the product value
- The "See a Sample Plan" button takes equal visual weight as the primary CTA, causing decision paralysis

For a TikTok user who just saw a 15-second video about race planning, they need to see the product immediately — not read more text.

---

## 3. Ad Creative Analysis

### What You Built (Remotion/React)
Six 15-second vertical videos (1080x1920, 30fps) with a shared component library:

| Video | Concept | Hook | Target Audience |
|-------|---------|------|----------------|
| V1: TheBlowup | Race failure/pain | "240W — 25W over target" → blows up | Experienced athletes who've bonked |
| V2: ThePerfectRace | Aspiration | Full race breakdown with AI splits | Goal-oriented triathletes |
| V3: RaceDayHeat | Weather adaptation | "31C" → auto-adjusts power/sodium | Hot-climate racers |
| V4: FirstTriathlon | Beginner confidence | "First race. No idea what to expect." | First-time triathletes |
| V5: NeverBonk | Nutrition strategy | Gel timing + hydration data | Long-distance racers |
| V6: EightMinFaster | PR achievement | "8 minutes faster. New PR." | Competitive athletes |

### Creative Strengths
- Professional production (Remotion + stock/AI footage)
- Data-driven overlays differentiate from generic fitness ads
- Strong 3-act structure (Problem → Solution → CTA)
- Brand consistency (BrandBar, CTASlide components)

### Creative Weaknesses
- **No sound/voiceover** — TikTok is a sound-on platform; text-only overlays get less engagement
- **No face/personality** — TikTok rewards authenticity and faces; these feel like brand ads, not creator content
- **Too polished** — high-production value can feel like "ad" and get skipped; TikTok rewards raw/native content
- **No urgency/scarcity** — no reason to act now vs. later
- **CTA is weak** — "racedayai.com" or "Build yours in 3 minutes" lacks emotional pull
- **All 6 launched at once** — no A/B testing strategy; should have started with 2-3 and iterated

---

## 4. Vercel Analytics (Consent-Free Data)

Vercel Analytics works without cookie consent, giving us the true traffic picture:

| Metric | Value |
|--------|-------|
| Total Visitors | 980 |
| Total Page Views | 1,132 |
| **Bounce Rate** | **97%** |
| Top Referrer | tiktok.com (777 visitors, 79%) |

### Page Breakdown
| Page | Visitors | % of Total |
|------|----------|------------|
| / (landing) | 979 | 99.9% |
| /wizard | 7 | 0.7% |
| /dashboard | 5 | 0.5% |
| /pricing | 3 | 0.3% |
| /signup | 3 | 0.3% |

### Geography (confirms Poland problem)
| Country | Share |
|---------|-------|
| Poland | 25% |
| Portugal | 23% |
| Belgium | 9% |
| Spain | 8% |
| Czech Republic | 6% |

### Devices
| Platform | Share |
|----------|-------|
| Mobile | 91% |
| Tablet | 8% |
| Desktop | 2% |
| iOS | 88% |
| Android | 10% |

**Key finding:** Of 979 landing page visitors, only **7 made it to /wizard** (0.7% progression). The 97% bounce rate confirms that users either couldn't or didn't want to proceed past the landing page. With the cookie banner covering the Next button on mobile, most likely *couldn't*.

---

## 5. PostHog & Analytics State

### Before Fix (During Campaign)
- PostHog JS client: v1.347.2 (consent-gated — only initialized after cookie accept)
- PostHog Node server: v5.24.15 (works, not consent-gated)
- Vercel Analytics: installed and working
- **Total persons tracked: 4** (all appeared to be you testing)
- **50+ custom events defined** but none firing from real users (consent gate)
- **No UTM parameter tracking** — zero attribution

### After Fix (Applied Feb 17, 2026)

**✅ FIX 1: PostHog now tracks without consent** (`posthog-provider.tsx`)
- PostHog initializes immediately in **cookieless memory-only mode** (`persistence: "memory"`)
- No cookies set, no localStorage used — fully GDPR-compliant anonymous tracking
- Session recording and surveys disabled until consent is granted
- If user accepts cookies → upgrades to full `localStorage+cookie` persistence with session recording
- If user rejects → stays in memory mode, anonymous events still captured
- **Result:** Every visitor will now generate pageview + funnel events in PostHog

**✅ FIX 2: Cookie banner moved to top of screen** (`cookie-consent-banner.tsx`)
- Changed from `fixed bottom-0` to `fixed top-0` to prevent covering the wizard "Next" button on mobile
- Made more compact (smaller padding/text) to minimize screen real estate usage
- **Result:** Users can now see and tap the wizard navigation button regardless of banner state

**✅ FIX 3: UTM parameter capture added** (`posthog-provider.tsx`)
- Every pageview now captures: `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- Also captures TikTok click ID (`ttclid`) and `document.referrer`
- **Result:** Full attribution — you'll know exactly which ad/channel drives each visit and conversion

---

## 6. Recommendations for Next Launch

### P0 — Fix Before Spending Another Dollar

**1. ~~Fix the cookie banner blocking the wizard button~~ ✅ DONE**

**2. ~~Add analytics that don't require consent~~ ✅ DONE**

**3. ~~Add UTM parameter capture~~ ✅ DONE**

**4. Change TikTok campaign objective to "Website Conversions"**
Install the TikTok Pixel on your site. Set the conversion event to "CompleteRegistration" or at minimum "AddToCart" (wizard step 2). This tells TikTok to find users who actually convert, not just click.

### P1 — High Priority Improvements

**5. Target the right audience/geography (MOST IMPORTANT REMAINING)**
- Run ads in English-speaking markets: US, UK, Australia, Canada
- Target triathlon interests: IRONMAN, triathlon training, cycling power meters, Strava
- Age 25-54 (triathlon demographic)
- Consider starting with Instagram/Facebook Reels (more triathlon community there)

**6. Create native-feeling TikTok content**
- Film a talking-head video: "I built an AI that creates race plans..."
- Show the actual product in a screen recording with voiceover
- Use TikTok trends/sounds
- Make it feel like a creator sharing a tool, not a brand running an ad
- Film vertically on a phone, not Remotion

**7. Build a mobile-optimized landing page for ad traffic**
Create a dedicated `/from-tiktok` or `/get-started` page that:
- Shows the product demo immediately (above the fold)
- Has ONE clear CTA (not two competing buttons)
- Skips the long-scroll marketing page
- Goes straight to value: "Enter your race → See your plan in 3 minutes"
- Consider showing a sample plan result without requiring signup

**8. Reduce signup friction**
Current flow: Click ad → Landing page → Click CTA → Wizard Step 1 (fitness data) → Step 2 → Step 3 → *Then* signup

Better flow: Click ad → Simplified landing → Enter just your race name → Show a teaser result → "Sign up to see your full plan"

### P2 — Nice to Have

**9. Implement the TikTok Pixel**
Add the TikTok pixel to track: PageView, ViewContent (wizard), AddToCart (wizard step 3), CompleteRegistration (signup). This enables retargeting and lookalike audiences.

**10. Set up a PostHog funnel dashboard**
Create a funnel visualization: Landing → Wizard Start → Step 2 → Step 3 → Signup → Plan Generated. Monitor this before every ad campaign.

**11. A/B test ad creatives systematically**
Don't launch 6 ads at once. Test 2-3 concepts, kill losers after 48 hours, scale winners. Ad 3 (0.94% CTR) and Ad 5 (most impressions/engagement) showed the most promise.

---

## 7. Budget & Timeline Recommendation

### Next Test Campaign Budget
- **Budget:** $100-200 USD (not PLN)
- **Duration:** 5-7 days
- **Geography:** US or UK
- **Objective:** Website Conversions (after pixel install)
- **Ads:** 2-3 native-style videos (not Remotion brand ads)

### Before Launching
1. ~~Fix cookie banner mobile bug~~ ✅ DONE
2. ~~Add UTM tracking~~ ✅ DONE
3. ~~Fix PostHog consent-free tracking~~ ✅ DONE
4. Install TikTok Pixel (2-3 hours)
5. Create a dedicated ad landing page (4-6 hours)
6. Film 2-3 native TikTok-style videos (half day)
7. Deploy and verify analytics are capturing events (1 hour)

**Estimated remaining prep time: 1-2 days of focused work**

---

## 8. Key Takeaway

The 0-signup result isn't because RaceDayAI is a bad product — the landing page and product itself are well-built with strong copy and clear value proposition. The failure was a combination of running ads in the wrong market (Poland), optimizing for the wrong objective (clicks not conversions), a critical mobile UX bug (cookie banner hiding the Next button), and complete analytics blindness (consent-gated tracking). Fix these four things and the next launch will give you real signal to iterate on.
