# RaceDayAI — Product Recommendations

**From:** An honest product review
**Date:** February 14, 2026
**Context:** Full end-to-end product audit (fresh visitor → signup → free plan → paywall → authenticated experience)

---

## Executive Summary (PM Additions)

This feedback is strong and directionally correct. To make it execution-ready:

- Prioritize by business risk (credibility + conversion choke points first).
- Convert each item into shippable scope with acceptance criteria.
- Add instrumentation so we can measure impact (activation, conversion, retention, growth).
- Sequence work to minimize time-to-value (hotfixes → funnel fixes → retention → foundations).

### Priority Rubric

- **P0:** Broken flows, trust/credibility risks, paywall confusion.
- **P1:** Onboarding improvements that increase first-plan success.
- **P2:** Dashboard/ongoing value to drive returning usage.
- **P3:** Security/compliance foundations and growth loops.

### Proposed Sequencing

- **Next deploy:** Fix `/features` 404 links, fix paywall entry point, add share feedback toast, remove/label fake weather.
- **Next 1-2 weeks:** Onboarding flow + basic dashboard usefulness + PDF gating consistency + landing copy audit.
- **Next 2-4 weeks:** Settings completeness (profile, deletion/export), email verification gating for integrations/purchase.

### Instrumentation (Minimum Set)

- `nav_features_clicked` (with `location=footer|menu`) + `features_404_seen`
- `build_plan_clicked` + `plan_limit_reached_shown` + `upgrade_prompt_shown` + `upgrade_started` + `upgrade_completed`
- `share_clicked` + `share_link_copied` + `share_view_opened` + `share_cta_clicked`
- `weather_card_shown` + `weather_data_source=placeholder|forecast|historical` + `weather_unavailable_reason`
- `pdf_clicked` + `pdf_blocked_shown` + `pdf_generated`
- `onboarding_started` + `onboarding_completed` + `integration_connect_started` + `integration_connect_completed`

## 1. Kill the "Features" Page — Build a Real One or Remove Every Link to It

This is embarrassing. Two primary navigation elements (footer + hamburger menu) point to a page that doesn't exist. Every curious visitor who clicks "Features" gets a 404. For a product that sells precision and trustworthiness, having broken navigation is like a coach showing up to race day without a stopwatch.

**What to do:** Either build a proper features page that showcases your ML pipeline, weather integration, GPX analysis, and nutrition planning in a compelling way — or remove every reference to `/features` from the site immediately. A well-designed features page could actually be a strong conversion tool, walking visitors through exactly what they get at each tier. But a 404 is worse than having no link at all.

**PM enhancement**

- **Priority:** P0
- **Decision:** Remove links immediately unless a real features page ships in the same deploy.
- **Acceptance criteria:** No navigation path leads to a 404; add an automated check for known routes.
- **Metric:** `features_404_seen` goes to ~0.

---

## 2. Fix the Paywall Moment — It's Costing You Conversions

Right now, when a free user who has used their plan clicks "Build New Plan," they get dumped into a wizard showing "Step 3 of 3" with "Plan Limit Reached." This is the single most critical moment in your conversion funnel, and you're bungling it.

The user hasn't gone through any steps. Showing "Step 3 of 3" is confusing and makes the product feel buggy at the exact moment you're asking for money. Instead, intercept BEFORE the wizard. When a maxed-out free user clicks "Build New Plan," show a dedicated, well-designed upgrade prompt — not a broken wizard state. This prompt should remind them of the plan they already created ("Your Ironman 70.3 Warsaw plan predicted 6:30:00 — imagine that precision for every race this season"), show the upgrade options inline, and make upgrading feel like a natural next step rather than a roadblock.

**PM enhancement**

- **Priority:** P0
- **Recommended MVP:** Intercept before the wizard; show a dedicated upgrade screen/modal (no wizard progress UI).
- **Acceptance criteria:** A user at limit cannot land in an invalid wizard step; the upgrade prompt clearly explains block + next action.
- **Metric:** Improve `upgrade_completed / upgrade_prompt_shown`; reduce exits after `plan_limit_reached_shown`.

---

## 3. The Weather Feature Is Your Biggest Credibility Risk

Every plan shows 22°C and 60% humidity regardless of location or date. This is listed as a premium feature ("Full weather integration" for Season Pass and above), and it's clearly hardcoded placeholder data. If a single paying customer creates a plan for a December race in Finland and sees "22°C, Optimal Conditions," your credibility is destroyed instantly.

**Options, in order of preference:** (a) Integrate a real weather API (OpenWeatherMap, WeatherAPI) and pull historical averages for the race location and date. This is the core promise you're selling. (b) If real weather isn't ready, HIDE the weather card entirely for the free tier and show "Weather data loads 14 days before your race" for paid tiers. (c) At the absolute minimum, label it "Placeholder — real weather coming soon." Never show fake data as if it's real.

**PM enhancement**

- **Priority:** P0
- **Clarify promise:** Decide whether “weather” is forecast (near race date), historical normals, or both; update copy accordingly.
- **Acceptance criteria:** No placeholder numbers presented as real; UI indicates data source + “last updated” when real.
- **Metric:** Track `weather_data_source` and ensure placeholder is never shown as “optimal conditions”.

---

## 4. The Share Button Needs to Actually Feel Like It Works

Clicking "Share" produces zero feedback. No toast, no modal, no copied-link confirmation, nothing. Even if a clipboard copy happens behind the scenes, the user has no idea. This is a solved UX problem — every product from Google Docs to Notion shows a "Link copied!" toast when you click share.

Beyond the immediate fix, think bigger about sharing. Sharing a race plan should be a growth channel. When someone shares their plan, the recipient should see a beautiful, branded read-only view that makes them think "I want one of these for my race." Include a subtle "Create your own plan" CTA on shared views. This turns every shared plan into a marketing asset.

**PM enhancement**

- **Priority:** P0 for UX feedback; P2/P3 for growth loop.
- **Recommended MVP:** Toast (“Link copied”) + fallback UI if clipboard permission fails.
- **Acceptance criteria:** `share_clicked` always results in visible feedback; shared links open read-only without auth (if implemented).
- **Metric:** `share_link_copied / share_clicked` and `share_cta_clicked / share_view_opened`.

---

## 5. Build a Real Onboarding Flow for New Users

Right now, a new user signs up and lands on an empty dashboard with "Total Plans: 0" and a big "Build New Plan" button. That's it. There's no welcome message, no product tour, no guidance on what to do first.

Consider: a welcome modal that explains the 3-minute plan creation process, a prompt to connect Garmin/Strava upfront (which dramatically improves plan quality), and a sample plan that's pre-loaded so users can explore the output format before committing their one free plan. The goal is to reduce the anxiety of "wasting" their single free plan on a bad input and to get them to their "aha moment" faster.

**PM enhancement**

- **Priority:** P1
- **Recommended MVP:** First-run checklist (3 steps) + sample plan preview; don’t hard-block on integrations.
- **Acceptance criteria:** New users never see a dead-end empty dashboard; onboarding dismisses after first plan (or explicit dismiss).
- **Metric:** Improve `plan_created / signup_completed` and reduce time-to-first-plan.

---

## 6. The Settings Page Is a Ghost Town

The settings page has three things: Garmin connection, Strava connection, and pricing cards. That's it. There is no profile management (can't change name or email), no notification preferences, no data export, no account deletion, and no way to manage connected devices.

For a paid SaaS product, this is below minimum viable. At the very least, add: profile editing (name, email), password change, notification preferences (email me when my plan is ready, race-week reminders), data export (download all my plans), and account deletion (this is a GDPR requirement — not optional). The settings page should feel like a control center, not an afterthought.

**PM enhancement**

- **Priority:** P2/P3
- **Scope split:** Account basics (profile/password) → data rights (export/delete) → preferences (notifications).
- **Acceptance criteria:** Users can self-serve core account changes; export/delete flows are explicit and confirmed.
- **Metric:** Reduced support tickets; track `data_export_requested` and `account_delete_completed`.

---

## 7. Make the Dashboard Actually Useful

The current dashboard shows: Total Plans count, a Quick Actions card with two links (Settings, View Plans), and a list of plans. For a product about race planning and preparation, this dashboard is missing its biggest opportunity.

Imagine instead: a countdown to your next race ("47 days until Ironman 70.3 Warsaw"), a weather forecast preview for the race location, training load indicators if Garmin/Strava is connected, a pre-race checklist ("Have you reviewed your nutrition plan?"), and quick-access to your most recent plan. The dashboard should make athletes feel prepared and excited, not just show them a list. This is where engagement and retention are built.

**PM enhancement**

- **Priority:** P2
- **Recommended MVP:** Next-race countdown + “continue recent plan” + one checklist module (rules-based).
- **Acceptance criteria:** Dashboard answers “what’s next?” without relying on placeholder premium data.
- **Metric:** Improve `dashboard_returned_within_7d` and `plan_opened_from_dashboard`.

---

## 8. Rethink the "View Online Only" Limitation for Free Users

The free tier says "View online only" — meaning free users can't export their plan as PDF. But the plan detail page still shows a "PDF" button to free users. When they click it... what happens? If it generates a PDF, the limitation text is wrong. If it blocks them, there should be a clear "Upgrade to export PDF" message with an inline upgrade prompt.

More importantly, consider whether this is the right limitation at all. The free plan is your conversion tool. If someone creates a great plan and can't take it to race day because they can't print it, you haven't proven value — you've frustrated them. Consider giving free users a basic PDF (without the premium sections like weather and AI narrative) rather than locking the format entirely. Let them taste the output. The paid PDF can be the deluxe version.

**PM enhancement**

- **Priority:** P1/P2
- **Fix consistency first:** If gated, hide/disable with clear messaging; if not gated, update copy and entitlements.
- **Acceptance criteria:** No ambiguous PDF button behavior; every gated click shows an upgrade prompt with a single CTA.
- **Metric:** `pdf_clicked` → upgrade conversion; returning usage for free users.

---

## 9. Add Email Verification and Basic Security Foundations

There appears to be no email verification in the signup flow. This means anyone can create an account with any email address. For a product that will eventually handle payment data and integrations with Garmin/Strava (which contain sensitive health/fitness data), basic identity verification is essential.

Implement email verification on signup. It doesn't need to be blocking — let them create their free plan first, then require verification before connecting external services or making purchases. Also consider: password strength requirements, session management (ability to see and revoke active sessions), and two-factor authentication as a future roadmap item for Pro users.

**PM enhancement**

- **Priority:** P3 (move up if abuse signals appear)
- **Policy:** Non-blocking for initial activation; require verified email for integrations and purchase.
- **Acceptance criteria:** Resend flow, rate limiting, verification status visible in settings.
- **Metric:** Verification completion rate; drop-off at integration/purchase gates.

---

## 10. Your Pricing Page Is Good — Your Landing Page Pricing Is Contradictory

The dedicated `/pricing` page is actually well-structured: clear value anchoring against coaching costs, honest FAQ, good tier differentiation. But the landing page has pricing copy that references "unlimited AI-powered plans" in a way that could apply to all paid tiers, when only Pro is actually unlimited. Season Pass (your most promoted tier) is 6 plans.

Audit every piece of copy on the landing page for accuracy against the actual tier limits. The landing page should tease the pricing and drive to `/pricing` for details — it shouldn't have its own inconsistent pricing claims. Also, the landing page is quite long. Consider whether the embedded pricing section should be replaced with a simpler "See Plans →" CTA that routes to the dedicated pricing page. One source of truth for pricing = fewer inconsistencies.

**PM enhancement**

- **Priority:** P0
- **Recommended MVP:** Manual audit + deploy checklist; ideally centralize tier entitlements into a single source of truth.
- **Acceptance criteria:** No page claims “unlimited” unless billing enforces it; landing copy matches `/pricing`.
- **Metric:** Reduced pre-purchase confusion; improved pricing page CTR and conversion.

---

## Bonus: The Stuff That's Actually Working Well

It's not all problems. Credit where it's due:

The **pricing page** value anchoring is strong — "$150 coach" comparison is compelling, and the FAQ answers real objections. The **plan detail page** layout is clean and scannable — swim/bike/run breakdown with clear pacing targets is exactly what athletes need mid-race. The **404 page** copy is charming ("Even the best triathletes miss a marker sometimes"). The **rename functionality** works perfectly — modal with character count and clear save/cancel. The **pricing toggle** (which was previously broken) now works smoothly. And the **logout button** has been added — this was a critical missing feature from the previous review.

The foundation is solid. The core product idea is strong. These recommendations are about closing the gap between a promising MVP and a product that paying customers will trust and recommend.

---

## Suggested “Now / Next / Later” Cut (Optional)

- **Now (P0):** `/features` links, paywall interception, weather honesty, share feedback toast, landing copy contradictions.
- **Next (P1):** onboarding checklist + sample plan, PDF gating consistency, basic dashboard “next race” card.
- **Later (P2/P3):** settings completeness, verification/security, deeper dashboard insights and share growth loop.
