# RaceDayAI — Bug Report (February 14, 2026)

**Tested by:** Claude (Automated QA Pass)
**Date:** February 14, 2026
**Device:** Mobile viewport 390×844 (iPhone 14 Pro equivalent)
**URL:** https://racedayai.com
**Scope:** Full fresh visitor pass + authenticated deep feature dive

---

## Critical Bugs (P0 — Blocks core experience)

### B01 — `/features` page returns 404
**Location:** Footer link "Features" + Hamburger menu "Features"
**Steps:** Click "Features" from either the footer or the hamburger menu (logged in or out)
**Expected:** Features page loads with product feature descriptions
**Actual:** 404 "Page Not Found" error
**Impact:** Two separate navigation elements point to a dead page. Every visitor who clicks "Features" hits a wall. This is present in both the public footer and the authenticated hamburger menu, making it a high-traffic dead end.

### B02 — Share button provides zero user feedback
**Location:** Plan detail page → "Share" button
**Steps:** Open a plan → click "Share"
**Expected:** A modal, toast notification, or visual confirmation (e.g., "Link copied to clipboard!")
**Actual:** Nothing happens. No visible response. The button may copy a link silently, but the user has absolutely no way to know if it worked.
**Impact:** Users will think the feature is broken. Even if it works internally, the lack of feedback makes it useless from a UX perspective.

---

## High Bugs (P1 — Significant UX/trust issues)

### B03 — Weather data is static placeholder (22°C / 60% humidity for all races)
**Location:** Plan detail page → "Weather Impact" card
**Steps:** Create a plan for any race, any location, any date
**Expected:** Weather data should reflect the race location and time of year, or at minimum say "Weather data will update closer to race day"
**Actual:** Every single plan shows 22°C, 60% Humidity, "Optimal Conditions" — regardless of location or date
**Impact:** This is a core selling point of the paid tiers ("Full weather integration") yet appears to be hardcoded. Paying customers will immediately notice and lose trust in the entire prediction engine. If weather data isn't available yet, the card should be hidden or clearly labeled as a placeholder.

### B04 — Paywall appears at "Step 3 of 3" without steps 1 and 2
**Location:** Wizard → when a free user who used their plan tries to create another
**Steps:** As a Starter plan user who used their 1 free plan, click "Build New Plan" from anywhere
**Expected:** Either (a) block the user BEFORE entering the wizard, or (b) show a standalone paywall page
**Actual:** User is dropped into the wizard showing "Step 3 of 3" with "Plan Limit Reached" — but they never completed steps 1 or 2. The step indicator is misleading.
**Impact:** Confusing and jarring. The user didn't go through any wizard steps; showing "Step 3 of 3" is nonsensical and makes the app feel buggy.

### B05 — Billing anchor link (`#billing`) doesn't scroll to Billing section
**Location:** Hamburger menu → "Billing"
**Steps:** Open the hamburger menu → click "Billing"
**Expected:** Navigate to Settings page and auto-scroll to the "Billing & Usage" section
**Actual:** Navigates to `/dashboard/settings#billing` but loads at the top of the page — the Connected Accounts section is visible, not the Billing section
**Impact:** User has to manually scroll down to find billing info after clicking a link that should take them directly there.

### B06 — "Save 33%" label is mathematically incorrect
**Location:** Pricing toggle on both `/pricing` page and `/dashboard/settings`
**Steps:** Toggle between Annual and Monthly pricing
**Expected:** The "Save 33%" label should match the actual discount
**Actual:** Season Pass: $4.99/mo × 12 = $59.88/yr vs $39/yr = 34.9% savings. Pro: $12.99/mo × 12 = $155.88/yr vs $99/yr = 36.5% savings. Neither tier is exactly 33%. The label should say "Save up to 35%" or use tier-specific percentages.
**Impact:** Minor trust issue. Savvy customers may calculate and feel misled by imprecise marketing.

### B07 — Settings page title shows generic site title instead of "Settings"
**Location:** Browser tab on `/dashboard/settings`
**Steps:** Navigate to Settings
**Expected:** Tab title: "Settings | RaceDayAI"
**Actual:** Tab title: "RaceDayAI — AI Race Execution Coach for Triathletes" (the homepage title)
**Impact:** Poor SEO hygiene and bad UX for users with multiple tabs open. Also applies to `/dashboard/billing` anchor route.

---

## Medium Bugs (P2 — Polish & consistency issues)

### B08 — Starter plan pricing label inconsistency: "$0/forever" vs "$0/year" vs "$0/month"
**Location:** `/pricing` page shows "$0/forever"; `/dashboard/settings` shows "$0/year" (annual toggle) or "$0/month" (monthly toggle)
**Steps:** Compare the Starter plan label on the Pricing page vs the Settings page
**Expected:** Consistent labeling across all locations
**Actual:** Three different labels for the same free tier: "/forever", "/year", "/month"
**Impact:** Inconsistency undermines professionalism. "/forever" is actually the most accurate and compelling — use it everywhere.

### B09 — `#how-it-works` anchor doesn't scroll to the section
**Location:** Landing page anchor navigation
**Steps:** Navigate to `racedayai.com/#how-it-works` or click a link pointing there
**Expected:** Page loads and scrolls to the "How it Works" section
**Actual:** Page loads at the very top (hero section). No scrolling occurs.
**Impact:** Anchor-based navigation appears broken for at least this section. If the hamburger menu "How it Works" link uses this anchor, logged-in users clicking it get taken to the landing page hero instead of the relevant section.

### B10 — No profile editing capability in Settings
**Location:** `/dashboard/settings`
**Steps:** Look for options to update name, email, or password
**Expected:** A profile section where users can modify their account info
**Actual:** Settings page only has Connected Accounts and Billing/Pricing. There is no way to change your name, email, or password.
**Impact:** Users who need to update their info have no way to do so. This is a standard expectation for any SaaS settings page.

### B11 — No account deletion option
**Location:** `/dashboard/settings`
**Steps:** Look for a "Delete account" or "Close account" option
**Expected:** GDPR/privacy compliance requires a way to delete your account and data
**Actual:** No such option exists anywhere in the settings
**Impact:** Potential legal compliance issue (GDPR right to erasure). Also a trust concern for privacy-conscious users.

### B12 — Contact page has no contact form
**Location:** `/contact`
**Steps:** Visit the contact page
**Expected:** A contact form (name, email, message) or at minimum multiple contact methods
**Actual:** Page only shows an email link (mailto:). No form, no live chat, no response time expectation.
**Impact:** High friction for users who need support. A contact form is table stakes for a paid SaaS product. Some users won't bother composing an email in their mail client.

### B13 — Landing page pricing section says "unlimited AI-powered plans" — misleading
**Location:** Landing page → embedded pricing section (scrolling down past testimonials)
**Steps:** Scroll to the pricing area on the landing page
**Expected:** Accurate description of each tier
**Actual:** Copy references "unlimited AI-powered plans" in a context that could be interpreted as applying to all paid plans. Only the Pro tier ($99/yr) is truly unlimited. Season Pass is 6 plans.
**Impact:** Could mislead visitors into thinking the Season Pass ($39) offers unlimited plans, leading to disappointment and potential chargeback/refund requests.

### B14 — Dashboard "Quick Actions" section is redundant and bare
**Location:** `/dashboard` → Quick Actions card
**Steps:** View the dashboard
**Expected:** Useful quick actions relevant to the user's current state
**Actual:** Only shows "Settings" and "View Plans" — two links that are already in the hamburger menu and accessible via the main navigation. The card takes up prime dashboard real estate with minimal value.
**Impact:** Wasted space that could be used for more useful dashboard content.

---

## Low Bugs (P3 — Minor / nice-to-have fixes)

### B15 — Footer has "Sign Up" link but hamburger menu does not
**Location:** Footer vs hamburger menu (logged-out view)
**Steps:** Compare navigation options in the footer vs the mobile hamburger menu
**Expected:** Consistent navigation options across both
**Actual:** Footer has a "Sign Up" link under "Connect" column. The hamburger menu for logged-out users may not include a direct "Sign Up" CTA.
**Impact:** Minor inconsistency in navigation structure.

### B16 — Plan detail page has no transition time information
**Location:** Plan detail page → Race Execution section
**Steps:** View any race plan
**Expected:** For triathlon plans, T1 and T2 transition times should be shown between swim/bike/run
**Actual:** The plan goes directly from Swim → Bike → Run with no transition data
**Impact:** Transitions are part of every triathlon. Omitting them makes the total time calculation seem off (Swim 0:39 + Bike 3:57 + Run 1:54 = 6:30, which does add up here, but transition times are a real component of race planning).

### B17 — No loading/generating state when PDF button is clicked
**Location:** Plan detail page → PDF button
**Steps:** Click the PDF button
**Expected:** A loading spinner or "Generating PDF..." state while the file is being prepared
**Actual:** The button turns blue briefly, but there's no clear loading indicator. For slow connections, the user won't know if anything is happening.
**Impact:** Minor UX confusion — user may click multiple times thinking it didn't work.

### B18 — 404 page missing navigation header
**Location:** Any 404 page (e.g., `/features`, `/plan/new`)
**Steps:** Navigate to a non-existent URL
**Expected:** The standard RaceDayAI header with navigation should be present
**Actual:** The 404 page has a minimal layout with just the logo icon, error message, and two buttons. No hamburger menu, no way to navigate back except the provided buttons.
**Impact:** Users are somewhat trapped on the 404 page. While "Back to Home" exists, the lack of the standard header breaks navigational consistency.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical (P0) | 2 |
| High (P1) | 5 |
| Medium (P2) | 7 |
| Low (P3) | 4 |
| **Total** | **18** |

### Previously Reported Bugs — Now Fixed
- **Logout button** — was completely missing, now exists in the hamburger menu ✅
- **Pricing toggle crash** — was crashing the page, now works correctly ✅
