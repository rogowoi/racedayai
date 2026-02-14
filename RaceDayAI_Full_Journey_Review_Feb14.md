# RaceDayAI — Full End-to-End Journey Review

**Perspective:** New user, triathlete age-grouper (42M, Intermediate)
**Date:** February 14, 2026 | **Device:** iPhone 14 Pro (390×844 viewport)
**Flow tested:** Fresh visitor → Sign up → Create free plan → Hit paywall → Payment → Create paid plan

---

## Executive Summary

This review covers the complete new-user journey from first landing page visit through account creation, free plan generation, paywall encounter, Stripe payment, and second plan generation on the Season Pass tier. Several bugs from the previous review have been fixed (unit labels, help icons, lb/kg toggle, simplified language on the generated plan). The core product — AI-generated race execution plans — remains impressive and delivers genuine value.

However, the journey has several friction points that would lose users at each stage: no email verification on signup, a paywall that appears only AFTER completing the full 3-step wizard, no clickable upgrade link in the paywall error, "ROGUS" as the merchant name in Stripe, no logout button anywhere in the UI, and identical plan output data across different races (same 5:19:00 time, same 22°C weather for every race). These issues range from trust-damaging to conversion-killing.

---

## Journey Stage 1: Landing Page (Logged Out)

### What Works Well

- Hero headline is emotionally resonant and speaks directly to age-grouper anxiety.
- The $150 coach comparison is immediately compelling.
- Hamburger menu for logged-out visitors correctly shows: Features, How it Works, Pricing, "Log in" button, and "Build My Race Plan" CTA.
- The "Build My Race Plan" CTA is prominent and action-oriented.
- Clean visual hierarchy with the orange brand color.

### Issues Found

- **No "Sign Up" in the navigation** — the hamburger menu only shows "Log in". A first-time visitor looking to create an account would not intuitively click "Log in" to find the signup link. A dedicated "Sign Up Free" entry in the nav would improve conversion.
- Previously reported text bugs (missing space in "strongand", unicode \\u2013 escape, missing space in "line.We") — **not re-verified in this pass** as focus was on the authenticated flow.

---

## Journey Stage 2: Login & Signup

### Login Page (`/login`)

Clicking "Build My Race Plan" redirects to `/login?callbackUrl=/wizard` — smart routing that returns the user to the wizard after authentication.

The login page offers:
- Continue with Strava (OAuth)
- Email + Password fields
- "Forgot password?" link
- "Don't have an account? Sign up free" link at the bottom

### Signup Page (`/signup`)

The signup page has:
- Name, Email, Password fields
- "Create Free Account" button
- Terms of Service and Privacy Policy links
- "← Back to Home" link

### Issues Found

| ID | Severity | Description |
|----|----------|-------------|
| **N1** | 🟠 High | **No Strava signup option** — The login page shows "Continue with Strava" but the signup page does not. A new user who wants to use Strava must first create an email account, then connect Strava later. This is a missed conversion opportunity — Strava OAuth signup would reduce friction significantly. |
| **N2** | 🟠 High | **No email verification** — Account creation is instant with no email verification step. I entered "miketest42tri@gmail.com" (an address I don't own) and was immediately logged in. This means anyone can create accounts with any email address, leading to potential abuse and deliverability issues for transactional emails. |
| **N3** | 🟡 Medium | **No password strength requirements visible** — The password field shows no guidance on minimum length, required characters, or strength meter. The password "TestRace2026!" was accepted, but a user might try "123456" and not know what's required until submission fails. |

---

## Journey Stage 3: Onboarding

After signup, the user is redirected to `/onboarding` — a welcome screen with:
- "Welcome to RaceDayAI" heading
- 3-step visual overview of the process
- "Let's Build Your First Plan" primary CTA
- "Sync from Strava" secondary CTA

### What Works Well

- Clean, focused onboarding flow — doesn't overwhelm the new user.
- Two clear paths: manual entry or Strava sync.
- The 3-step overview sets expectations.

### Issues Found

| ID | Severity | Description |
|----|----------|-------------|
| **N4** | 🟢 Low | The onboarding page is a one-time view with no way to revisit it from the dashboard. If a user accidentally dismisses it, they lose the guided overview. Consider adding a "Getting Started" link in the dashboard. |

---

## Journey Stage 4: Wizard — Creating First Plan

### Step 1: Fitness Profile

**Improvements since last review (confirmed fixed):**
- ✅ Weight field now has "Switch to lb" toggle — US athletes can use pounds
- ✅ Bike FTP is now marked "(optional)" with an ⓘ help icon
- ✅ Run Threshold now shows "min/km" unit label with ⓘ help icon and "(optional)"
- ✅ Swim CSS now shows "min/100m" unit label with ⓘ help icon and "(optional)"
- ✅ Gender starts as "Select" dropdown (not pre-selected)

**Data entered:** Male, Age 42, Weight 80kg, FTP 220W, Run Threshold 5:15 min/km, Swim CSS 1:50 min/100m, Experience: Intermediate

### Issues Found

| ID | Severity | Description |
|----|----------|-------------|
| **N5** | 🟡 Medium | **Tooltip overlap** — Tapping the ⓘ icon on Run Threshold shows a helpful tooltip, but it overlaps and covers the FTP field above it. On mobile, this makes it hard to read both the tooltip and the context of the field it's explaining. Tooltips should open below or in a bottom-sheet modal on mobile. |
| **N6** | 🟡 Medium | **No "I don't know" helpers** — While FTP/CSS/Threshold are now marked optional, there's still no estimation helper. A beginner who doesn't know their FTP can simply leave it blank, but a prompt like "Don't know your FTP? Enter your average bike speed and we'll estimate" would significantly improve the beginner experience. |
| **N7** | 🟢 Low | **Step 1 uses orange theme, Steps 2–3 use blue theme** for the progress indicator. Visual inconsistency still present from previous review (B10). |

### Step 2: Race Details

Searched "IRONMAN 70.3 Goa" — race found immediately with 9 athletes, ~6h08m estimated finish, 70.3 badge. Auto-selected 70.3 distance. Set date to 25.10.2026.

| ID | Severity | Description |
|----|----------|-------------|
| **N8** | 🟡 Medium | **Date format still European-only** (dd.mm.yyyy) — no locale detection for US users who expect mm/dd/yyyy. Previous bug B8 still present. |
| **N9** | 🟡 Medium | **"Pre-filled from typical race month" message shows even on manually entered dates** — I typed 25.10.2026 myself, but the message "Pre-filled from typical race month — please confirm the exact date" still appears. This is misleading. The message should only show when the system actually pre-fills the date from the race database. |
| **N10** | 🟢 Low | **Race date not auto-filled from database** — When selecting IRONMAN 70.3 Goa from the database, the date field is not populated with the known race date. Previous bug B9 still present. |

### Step 3: Course Profile

Shows "No GPX file in our library yet" with RideWithGPS search pre-filled for "IRONMAN 70.3 Goa bike course". GPX upload area present.

No new issues found. The "Generate Plan" button renders correctly on mobile (previous B1 fix confirmed).

### Generated Plan (First Plan — Free Tier)

The plan generated successfully in ~15–20 seconds with a nice loading animation ("Building Your Race Plan" → "Writing your race strategy..." → "This usually takes 15-30 seconds").

**Plan Output:**
- Race: IRONMAN 70.3 Goa | 10/25/2026
- Total Time: **5:19:00** — "High Confidence"
- Weather: **22°C / 60% Humidity / "Optimal Conditions"**
- Nutrition: 90g/hr, 500mg Sodium, 750ml Fluid
- Swim: 0:35:00 at 1:52/100m
- Bike: 2:48:00 at 172W (78% intensity), 32.2 km/h, TSS 170
- Run: 1:56:00 at 5:31/km
- Predicted Placement: 71.3% faster than cohort (840,075 records, Male 40-44)
- Finish Range: Best 4:50:10, Most Likely 5:43:33, Conservative 6:46:45

**Improvements confirmed:**
- ✅ TSS now has a ⓘ help icon
- ✅ Bike power target language simplified: "based on what similar athletes actually ride, not textbook theory"
- ✅ P-values (P10/P50/P90) no longer shown next to Best/Most Likely/Conservative labels — cleaner for non-technical users

---

## Journey Stage 5: Paywall Experience

After the first plan was created, the dashboard showed:
- Plan: **Starter**, 0 plans remaining
- Total Plans: 1

Clicking "Create Race Plan" from the dashboard entered the wizard normally with Step 3 pre-filled from the previous attempt. The "Generate Plan" button was visible but clicking it showed:

> ⚠️ **"Plan limit reached (1/1 plans used). Upgrade to create more plans. Upgrade your plan to create more race plans."**

### Issues Found — Critical Paywall Bugs

| ID | Severity | Description |
|----|----------|-------------|
| **N11** | 🔴 Critical | **Paywall appears AFTER completing the full 3-step wizard** — The user fills out all 3 steps, clicks "Generate Plan", and THEN sees the paywall error. The system knows the user has 0 plans remaining before they even enter the wizard. The paywall or an upgrade prompt should appear BEFORE entering the wizard or at minimum at Step 1, not after the user has invested 2-3 minutes of effort. This is a major friction point that would anger users and reduce conversion. |
| **N12** | 🔴 Critical | **"Upgrade your plan" text in the paywall error is NOT a clickable link** — The error says "Upgrade your plan to create more race plans" but this text is static — it's not a hyperlink or button. The user has no way to upgrade directly from the paywall. They must manually navigate to the dashboard or settings to find the upgrade path. This is a dead end that would lose paying customers. |
| **N13** | 🟠 High | **Dashboard shows "0 plans remaining" but still allows entering the wizard** — The "Create Race Plan" button on the dashboard is fully active even when the user has no plans remaining. It should either be disabled with an upgrade prompt, or show a modal explaining they need to upgrade before entering the wizard. |

---

## Journey Stage 6: Finding the Upgrade Path

Since the paywall error had no clickable upgrade link, I navigated to the dashboard manually. The dashboard's "Upgrade →" link (orange text under Current Plan: Starter) correctly navigated to `/pricing`.

Attempted `/settings` first — **returned a 404 "Page Not Found"**. The settings page has moved to `/dashboard/settings`.

| ID | Severity | Description |
|----|----------|-------------|
| **N14** | 🟡 Medium | **`/settings` returns 404** — The direct URL `/settings` gives a "Page Not Found" error. Settings is now at `/dashboard/settings`. Any old links or bookmarks to `/settings` will break. Should redirect. |

---

## Journey Stage 7: Pricing Page

The pricing page (`/pricing`) is well-structured with three tiers:

**Starter — $0/forever**
- 1 race plan (any distance)
- Basic pacing + nutrition
- Manual fitness entry
- View online only
- ✗ No PDF export, no weather, no GPX, no Strava

**Season Pass — $39/year (MOST POPULAR)**
- 6 race plans per season
- Full weather integration
- GPX course upload + elevation analysis
- PDF race-day card (print & go)
- Strava auto-import
- AI narrative strategy (coach-style advice)

**Pro — $99/year**
- Unlimited race plans
- Everything in Season Pass
- Share plans via public link
- Priority support

### What Works Well

- Annual/Monthly toggle with "Save 33%" badge
- "$150/plan with a coach" strikethrough comparison
- "Just $6.50 per race · 6 races per season" value breakdown
- Clear feature differentiation between tiers
- Bottom copy: "You spent $200+ on race entry, $150 on a wetsuit, and $5,000 on a bike. The plan that ties it all together costs less than two gels."

### Issues Found

| ID | Severity | Description |
|----|----------|-------------|
| **N15** | 🟢 Low | **Monthly pricing not visible** — I only tested the Annual tab. The Monthly toggle is present but I didn't verify the monthly price. If there's no monthly option for the Season Pass, the toggle is misleading. |

---

## Journey Stage 8: Stripe Payment

Clicking "Get Season Pass →" redirected to Stripe Checkout (`checkout.stripe.com`).

### What Works Well

- Email pre-filled from the signup account (miketest42tri@gmail.com)
- "Pay with Link" option for faster checkout
- Feature summary shown: "6 race plans per season with PDF export, GPX analysis, weather integration, and Strava sync"
- "$3.25 / month billed annually" breakdown
- Standard Stripe card form with Visa/MC/Amex/Discover logos
- Country auto-detected

### Issues Found

| ID | Severity | Description |
|----|----------|-------------|
| **N16** | 🔴 Critical | **Stripe merchant name is "ROGUS" not "RaceDayAI"** — The checkout page title shows "ROGUS TEST", the save-card prompt says "Pay securely at ROGUS", and the footer says "By subscribing, you authorize ROGUS to charge you." This is the Stripe test account name leaking through. In production, customers would see "ROGUS" on their credit card statement instead of "RaceDayAI". This is a major trust issue — a customer seeing an unknown "ROGUS" charge would likely dispute it. Must update the Stripe account business name to "RaceDayAI" before launch. |
| **N17** | 🟡 Medium | **"TEST" badge visible** — The Stripe checkout shows a "TEST" badge next to "ROGUS", indicating the site is using Stripe test keys. This should be switched to live keys before launch (or hidden in a staging environment). |

---

## Journey Stage 9: Post-Payment Experience

After successful payment, the user is redirected to `/dashboard/settings?billing=success`.

### What Works Well

- Green success banner: "Payment successful! Your subscription has been updated."
- Two clear CTAs: "Create Your First Plan →" and "Go to Dashboard"
- Billing & Usage section shows: Current Plan: Season Pass, 0 of 6 plans used, Season ends: 2/14/2027
- Usage progress bar (0/6)
- "Manage Billing" button (Stripe customer portal)
- Connected Accounts section with Garmin and Strava options
- Pricing tiers displayed with "Current Plan" indicator on Season Pass and "Switch Plan" on Pro

### Issues Found

| ID | Severity | Description |
|----|----------|-------------|
| **N18** | 🟡 Medium | **"Create Your First Plan" button text is wrong** — The user already created one plan on the free tier before upgrading. This should say "Create Your Next Plan" or "Create a Race Plan". Calling it "first" is inaccurate and confusing. |
| **N19** | 🟡 Medium | **Pricing tiers shown on settings page after purchase** — After paying, the user sees the full pricing table again below their billing info. This is redundant and potentially confusing — the user just paid and now sees pricing cards with "Downgrade via Billing Portal" for Starter and "Switch Plan" for Pro. This should be removed or collapsed under an "Upgrade/Downgrade" section. |

---

## Journey Stage 10: Second Plan (Post-Payment)

Navigating to the wizard after payment, it loaded at Step 3 with the previous Goa race data pre-filled. No paywall error this time — the "Generate Plan" button worked immediately.

The second plan generated successfully with the same loading animation (~15-20 seconds).

### Issues Found

| ID | Severity | Description |
|----|----------|-------------|
| **N20** | 🔴 Critical | **Identical plan output for the same race** — The second plan for IRONMAN 70.3 Goa produced the exact same Total Time (5:19:00), same weather (22°C/60%), same bike power (172W), same run pace (5:31/km), same predicted placement (71.3%), and same nutrition (90g/hr). The only differences were in the Finish Time Range seconds (4:50:10 vs 4:50:00 previously). If a user creates two plans for the same race, they should get identical results OR the system should detect the duplicate and offer to show the existing plan. Currently it creates a duplicate that uses one of their 6 plan slots. |
| **N21** | 🟠 High | **No duplicate detection or warning** — The system allows creating the exact same plan twice without any warning. A user could accidentally burn through all 6 Season Pass plans on the same race. The wizard should check: "You already have a plan for IRONMAN 70.3 Goa on 10/25/2026. Would you like to view it instead?" |
| **N22** | 🟠 High | **Weather data appears to be placeholder** — 22°C and 60% humidity with "Optimal Conditions" is the same output for EVERY race regardless of location or date. The previous review (different pass, different test user) also showed 22°C/60% for IRONMAN 70.3 Dubai. Goa in October averages 28-32°C with 70-80% humidity. This strongly suggests the weather integration is returning a static placeholder rather than real weather data. For a paid feature ("Full weather integration"), this is misleading. |
| **N23** | 🟡 Medium | **Dashboard plan list has no way to distinguish duplicate plans** — Both IRONMAN 70.3 Goa plans show identical cards with the same race name, date, predicted time, and creation date (2/14/2026). There's no creation timestamp with time, no plan number, and no way to delete or rename plans. A user would have no idea which plan is which. |

---

## Journey Stage 11: Dashboard (Post-Payment)

### What Works Well

- Shows "Season Pass" with "5 plans remaining this season"
- Total Plans: 2 with "1 this season" (free plan counted separately)
- Recent Race Plans section lists both plans
- Quick Actions with Settings and View Plans links

### Issues Found

| ID | Severity | Description |
|----|----------|-------------|
| **N24** | 🟡 Medium | **"Total Plans: 2" vs "1 this season" is confusing** — The free plan counts toward total but not toward the season. This is technically correct but the UI doesn't explain why the numbers differ. A tooltip or subtitle like "1 plan on Season Pass + 1 from free tier" would clarify. |
| **N25** | 🟡 Medium | **No plan management** — There's no way to delete, rename, archive, or organize plans. As users accumulate plans over a season, the dashboard will become cluttered with no way to manage them. |

---

## Global Issues (Cross-Journey)

| ID | Severity | Description |
|----|----------|-------------|
| **N26** | 🔴 Critical | **No logout button anywhere in the UI** — The hamburger menu (when logged in) shows: Dashboard, Build a Race Plan, My Plans, Settings, About, Contact, Legal section. There is NO "Log out" or "Sign out" option. The only way to log out is to manually navigate to `/api/auth/signout` (NextAuth's default endpoint). A logged-in user who wants to switch accounts or sign out is completely stuck. |
| **N27** | 🟠 High | **No "Sign Up" in the hamburger menu** — When logged out, the menu shows "Log in" but no "Sign Up" option. The user must click "Log in" first, then find the "Don't have an account? Sign up free" link at the bottom of the login page. A direct "Sign Up" entry in the nav would improve conversion. |
| **N28** | 🟠 High | **`/settings` returns 404** — Direct navigation to `/settings` shows a 404 error. Settings has moved to `/dashboard/settings` but there's no redirect. Any links, bookmarks, or documentation pointing to `/settings` will break. |

---

## Bug Summary

### By Severity

| Severity | Count | IDs |
|----------|-------|-----|
| 🔴 Critical | 5 | N11, N12, N16, N20, N26 |
| 🟠 High | 6 | N1, N2, N13, N21, N22, N27 |
| 🟡 Medium | 10 | N3, N5, N6, N8, N9, N14, N17, N18, N19, N23–N25 |
| 🟢 Low | 3 | N4, N7, N10, N15 |

### By Journey Stage

| Stage | Critical | High | Medium | Low |
|-------|----------|------|--------|-----|
| Landing Page | — | — | — | — |
| Login/Signup | — | 2 | 1 | — |
| Onboarding | — | — | — | 1 |
| Wizard | — | — | 4 | 2 |
| Paywall | 2 | 1 | — | — |
| Pricing | — | — | — | 1 |
| Stripe Payment | 1 | — | 1 | — |
| Post-Payment | — | — | 2 | — |
| Generated Plan | 1 | 2 | 1 | — |
| Dashboard | — | — | 2 | — |
| Global/Cross-Journey | 1 | 2 | — | — |

---

## Fixes Confirmed from Previous Review

The following issues from the first review (Feb 13) have been fixed:

1. ✅ **B1 — Button overflow on mobile** — "Next: Course" and "Generate Plan" buttons now render correctly.
2. ✅ **B2 — Plan generation failure** — Plans generate successfully.
3. ✅ **B14 — No units on Run Threshold / Swim CSS** — Now shows "min/km" and "min/100m" respectively.
4. ✅ **B16 — Weight field kg-only** — Now has "Switch to lb" toggle.
5. ✅ **B18 — P-values (P10/P50/P90) in Finish Time Range** — No longer shown; labels use plain "Best case / Most likely / Conservative".
6. ✅ **B19 — Technical language for bike intensity** — Now reads "based on what similar athletes actually ride, not textbook theory."
7. ✅ **TSS** now has a ⓘ help icon (partial fix for B17).

---

## Recommendations — Priority Order

### Immediate (Pre-Launch Blockers)

1. **Add a logout button** to the hamburger menu (N26)
2. **Add a clickable upgrade link/button** to the paywall error message (N12)
3. **Show the paywall BEFORE entering the wizard**, not after completing all 3 steps (N11)
4. **Update Stripe merchant name** from "ROGUS" to "RaceDayAI" (N16)
5. **Fix weather integration** — either serve real forecast data or clearly label it as "estimated" (N22)
6. **Add email verification** to the signup flow (N2)

### High Priority (Launch Week)

7. **Add duplicate plan detection** — warn users before creating a plan for the same race (N21)
8. **Add "Sign Up" to the navigation menu** alongside "Log in" (N27)
9. **Add Strava as a signup option** on the registration page (N1)
10. **Disable "Create Race Plan" button** when the user has 0 plans remaining, or show an upgrade prompt (N13)
11. **Redirect `/settings` to `/dashboard/settings`** (N28)

### UX Polish (Post-Launch)

12. Fix "Create Your First Plan" to "Create a Race Plan" on success page (N18)
13. Add plan management (rename, delete, archive) to dashboard (N25)
14. Add timestamps to plan cards to distinguish duplicates (N23)
15. Fix tooltip overlap on mobile (N5)
16. Add "I don't know" estimation helpers for FTP/CSS/Threshold (N6)
17. Add locale detection for date format (N8)
18. Fix "Pre-filled from typical race month" message to only show when auto-filled (N9)

---

## Overall Assessment

The core product is strong — the AI-generated race plans are data-rich, visually appealing, and provide genuine value that would justify the $39/year price. The narrative strategy feature is particularly impressive and differentiating. The loading animation during generation, the cohort-based predictions, and the split strategy visualization are all consumer-grade quality.

The biggest risks to conversion are:

1. **The paywall dead-end** — users complete the wizard then hit a brick wall with no upgrade path. This is the #1 fix needed.
2. **The weather data credibility** — if a paying user notices the same 22°C/60% for races in Dubai and Goa, they'll feel cheated by the "Full weather integration" they paid for.
3. **The "ROGUS" merchant name** — an unknown charge on a credit card statement will generate chargebacks and support tickets.
4. **No logout** — a fundamental auth UI omission that signals the app isn't production-ready.

Fix these four issues and the product is ready for a confident launch.
