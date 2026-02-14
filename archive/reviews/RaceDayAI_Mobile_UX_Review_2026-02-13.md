# RaceDayAI — Mobile UX Review & Bug Report

**Perspective:** Triathlete Age-Grouper (42M, Intermediate)
**Date:** February 13, 2026 | **Device:** iPhone 14 Pro (390×844)
**Review passes:** Two full passes — first as a developer/power user, second as a non-technical consumer

---

## Executive Summary

RaceDayAI offers a compelling value proposition for triathlete age-groupers: AI-generated race execution plans that cover pacing, nutrition, and weather adjustments. The landing page does a strong job of communicating the pain point (*"You trained for months. Don't race on guesswork."*) and the pricing is attractive at $39/year for 6 races.

The mobile experience has improved since the first testing pass — the wizard button overflow and plan generation failure appear to have been fixed. However, the site still has several content bugs on the landing page, a broken "Features" page (404), no authentication protecting the dashboard, and significant jargon/accessibility issues that would confuse first-time triathletes. The generated race plan itself is impressive and data-rich, but leans heavily on technical terminology without explanation.

---

## Would I Buy It? — Age-Grouper Verdict

As a 42-year-old male intermediate triathlete preparing for a half-IRONMAN, this product is immediately relevant. The value proposition is crystal clear: a coach charges $150 per race plan; this tool offers 6 plans per year for $39. The comparison between the "Arm-Scribble Plan" and the "Precision Plan" is extremely relatable — every age-grouper has experienced blowing up on the bike or bonking on the run.

The feature set covers exactly what matters: power targets per terrain, nutrition timing with specific carb/sodium amounts, weather adjustments, and a negative-split run strategy. The Strava integration and GPX upload show seriousness about personalization.

The generated plan is genuinely impressive — predicted placement against 840K+ race records, finish time ranges with probability bands, optimal split strategy visualization, and data-driven bike intensity targets. This is the kind of data that makes an age-grouper feel like they have a secret weapon.

**Verdict: Yes, I would buy the Season Pass ($39/year)** — the plan generation now works and produces high-quality output. The free tier is a smart funnel. But the site needs polish on text bugs, jargon accessibility, and trust signals before it's ready for a broad audience launch.

---

## Landing Page Evaluation

### What Works Well

- Hero headline is powerful and emotionally resonant — speaks directly to the anxiety every age-grouper feels before race day.
- The $150 coach comparison is immediately compelling. The "costs less than two gels" line at the bottom is chef's kiss.
- Sample race plan demo is excellent — shows concrete data (watts, pace, nutrition timeline) that a data-driven age-grouper craves.
- Free first race plan with no credit card is a low-friction entry point.
- All four race distances supported (Sprint, Olympic, 70.3, 140.6) covers the full age-grouper market.
- The 404 page is charming ("Even the best triathletes miss a marker sometimes") — small touch but shows personality.
- Contact page is clean with email support, 24hr response time promise, FAQ link, and a contact form.
- Privacy Policy and Terms of Service are comprehensive, properly dated, and well-structured.

### What Could Be Improved — Consumer Perspective

**Trust & Social Proof:**
- No social proof numbers on the landing page (e.g., "5,000 plans generated" or "Used by athletes in 40+ countries"). The race search shows 262 athletes for Dubai, but that's buried in the wizard.
- Testimonials use initials only (Sarah K., Marcus T., Coach Jamie R.) with no photos, last names, race results, or social links. This reads as potentially fake to a skeptical consumer.
- About page claims transparency ("no black box") but provides zero links to methodology, research papers, or data sources. No team photos, no founder story, no "we're triathletes too" messaging. Major trust gap.
- No "as seen in" media logos, no partnerships with triathlon brands or events, no athlete ambassador program visible.

**Jargon & Clarity (Non-Technical User Perspective):**
- "73% FTP" in the sample plan — a casual age-grouper or first-timer has no idea what FTP means.
- "Na" used as shorthand for sodium in the nutrition timeline. Not everyone knows Na is the chemical symbol.
- "Confidence: High (92%)" — what does 92% confidence even mean? Confidence in what? No explanation.
- "+15s/km" run adjustment notation is confusing — what's the baseline? Compared to what?
- Nutrition timeline starts at "T+0:15" — when does T+0 start? Beginning of race? Beginning of bike?
- "GPX file" is meaningless to most age-groupers who don't use mapping software.
- "CSS" (Critical Swim Speed) — only experienced swimmers would know this term.
- "AI narrative strategy (coach-style advice)" in the pricing page — what does this actually mean?
- "WBGT" mentioned on the About page with no explanation (Wet Bulb Globe Temperature).

**Pricing & Feature Confusion:**
- The free tier demo on the landing page prominently shows weather adjustments, but the actual free tier explicitly excludes weather integration. This feels like a bait-and-switch.
- Landing page says "$150 coach" per plan, but later the About/FAQ mentions "$600+/year for coaching" — if you're racing 6 times that's $900 at $150/plan, not $600. The numbers don't reconcile cleanly.
- "6 races per season" — what defines a "season"? Calendar year? Rolling 12 months? Unclear.
- FAQ mentions Garmin/Wahoo file exports but the pricing cards don't list this as a feature.
- PDF race-day card (print & go) is a great feature buried in the Settings pricing — should be prominently on the landing page.
- "All sales are final" no-refund policy in the FAQ feels harsh for a $39 product from an unknown brand.

**Missing Content:**
- No FAQ section visible on the landing page itself — it exists at /faq but is only linked from the footer. Most users won't scroll that far.
- The "See a Sample Plan" button scrolls to a section on the same page rather than opening a dedicated interactive sample.
- No "How It Works" explainer with numbered steps (1-2-3) on the landing page.

---

## Bug Report

Bugs are categorized by severity: **Critical** (blocks core flow), **High** (significant UX impact), **Medium** (noticeable issue), **Low** (minor polish).

### Updated Status Notes

- **B1 (Button Overflow):** During the second testing pass, the "Next: Course" and "Generate Plan" buttons rendered correctly on mobile. This may have been fixed, or it may be an intermittent layout issue. Recommend monitoring.
- **B2 (Plan Generation Failure):** During the second pass, the plan generated successfully. The backend error appears resolved.

### Active Bugs

| ID | Severity | Area | Description |
|----|----------|------|-------------|
| **B5** | 🟡 Medium | Landing Page | The heading "The difference between finishing strongand walking the marathon" has a missing space between "strong" and "and". Should read "finishing strong and walking the marathon." |
| **B6** | 🟡 Medium | Landing Page | The text "The average age-grouper leaves 15\u201330 minutes on the course" displays a raw Unicode escape sequence (\u2013) instead of an en-dash character (–). Should render as "15–30 minutes." Confirmed still present on second pass. |
| **B7** | 🟡 Medium | Landing Page | The heading shows "line.We get you to the finish line" with no space after the period following "start line." Should be "start line. We get you to the finish line." Confirmed still present. |
| **B8** | 🟡 Medium | Wizard Step 2 | The date field uses dd.mm.yyyy format (European) with no locale detection. Many US triathletes would expect mm/dd/yyyy. |
| **B9** | 🟡 Medium | Wizard Step 2 | Selecting a known race from the database (e.g., IRONMAN 70.3 Dubai) does not auto-fill the Race Date. A helpful message appears ("Pre-filled from typical race month — please confirm the exact date") but the actual date should come from the race database. |
| **B10** | 🟢 Low | Wizard | Step 1 uses an orange theme, while Steps 2–3 switch to a blue theme for the step indicator and progress elements. This visual inconsistency feels unintentional. |
| **B11** | 🟢 Low | Wizard Step 3 | RideWithGPS search results for "IRONMAN 70.3 Dubai bike course" return courses of varying distances (40km, 35km, 27km, 51km) — none matching the expected 90km. No guidance is provided on which result is the official course. |

### New Bugs (Second Pass)

| ID | Severity | Area | Description |
|----|----------|------|-------------|
| **B12** | 🔴 Critical | Navigation | The "Features" link in the site footer navigates to /features which returns a 404 "Page Not Found." The hamburger menu "Features" link correctly goes to /#features (anchor on homepage). The footer link is broken. |
| **B13** | 🔴 Critical | Dashboard | Clicking "My Dashboard" in the hamburger menu goes directly to /dashboard without any login or authentication gate. The dashboard shows "Welcome back, Billing Test User" — a test account is exposed to all visitors. No login/signup flow exists. Any visitor can access the dashboard, settings, and billing page. |
| **B14** | 🟠 High | Wizard Step 1 | No units displayed for Run Threshold (is "5:15" per km or per mile?) or Swim CSS (per 100m or per 100yd?). A first-time user would not know what values to enter. |
| **B15** | 🟠 High | Wizard Step 1 | No "I don't know" option or estimation helper for FTP, Run Threshold, or Swim CSS. A first-time triathlete likely doesn't know any of these metrics. Should offer "Help me estimate" based on recent race times or training data. |
| **B16** | 🟡 Medium | Wizard Step 1 | Weight field is kg-only with no lb toggle. US athletes (a large target market) would expect an option for pounds. |
| **B17** | 🟡 Medium | Generated Plan | "TSS: 170" shown in the bike section with no explanation of what TSS (Training Stress Score) means or whether 170 is high/low/normal for this race. |
| **B18** | 🟡 Medium | Generated Plan | Finish Time Range shows "Best case (P10)", "Most likely (P50)", "Conservative (P90)" — the P-values in parentheses add confusion for non-statistical users. The natural language labels are great but the P-values undermine the simplicity. |
| **B19** | 🟢 Low | Generated Plan | "Data-driven bike intensity factor: 71.4% of FTP — derived from cohort performance, replacing heuristic defaults" is highly technical language that would lose most consumers. Should be simplified to something like "Your bike power target is based on what similar athletes actually ride, not textbook theory." |
| **B20** | 🟢 Low | Settings | Garmin Connect shows "Coming Soon" with no timeline or email signup for notification. |

---

## Wizard Flow Experience

### Step 1: Fitness Profile

The fitness profile step is well-designed for experienced athletes. Default values (Age: 35, Weight: 75kg, FTP: 250W) are sensible starting points. The fields cover the key metrics: gender, age, weight, bike FTP, run threshold pace, swim CSS, and triathlon experience level.

The "Connect Apps" tab (Strava integration + Garmin Coming Soon) is a smart feature. The privacy reassurance ("We will only read your activity data. We never post to your feed.") is helpful.

**Major gap for beginners:** There's no help text explaining what FTP, CSS, or threshold pace mean. No tooltips, no "What's this?" links, no "I don't know" buttons that could estimate values from simpler inputs (e.g., "What's your typical 5K time?" → estimate threshold pace). Run Threshold and Swim CSS don't even show units (per km? per mile? per 100m?). A first-time sprint triathlete would abandon at this step.

### Step 2: Race Details

The race search functionality is impressive — typing "IRONMAN 70.3 Dubai" immediately shows matching races with distance badges, athlete counts, and estimated finish times. Distance auto-selects based on the race, which is smart.

The date field shows a helpful note "Pre-filled from typical race month — please confirm the exact date" but the actual race date should just auto-populate from the database. The dd.mm.yyyy format still lacks locale detection.

### Step 3: Course Profile

The RideWithGPS integration is a differentiator, but "GPX file" jargon would lose a non-technical user. The message "No GPX file in our library yet" is confusing — what library? Why don't they have it?

The search results for known races return courses with incorrect distances, and some require a RideWithGPS account. The GPX upload option is good for power users but intimidating for beginners.

### Generated Plan (Now Working!)

The generated plan is the strongest part of the product:
- Clear total time prediction (5:19:00) with "High Confidence" badge
- Weather integration showing 22°C / 60% humidity / "Optimal Conditions"
- Nutrition summary (90g/hr, 500mg Sodium, 750ml Fluid)
- Per-discipline breakdown with specific targets (Swim: 1:52/100m, Bike: 172W @ 78% intensity, Run: 5:31/km)
- "Data-Driven Insights" section with predicted placement (71.3% faster than cohort — based on 840,075 race records)
- Finish time range with probability bands (Best: 4:50, Most Likely: 5:43, Conservative: 6:46)
- Optimal split strategy visualization
- Share and PDF download buttons

This is genuinely impressive output and the strongest selling point for the product.

---

## Recommendations

### Immediate Fixes (Pre-Launch Critical)

1. **Fix the three landing page text bugs** (missing space in "strongand", unicode escape \u2013, missing space in "line.We"). These undermine the "precision" brand message. Still present as of Feb 13.
2. **Fix the broken /features footer link** — currently returns a 404 while the hamburger menu link works correctly (goes to /#features anchor).
3. **Add authentication to the dashboard** — currently any visitor can access /dashboard and see "Billing Test User" data. This is both a security issue and a bad first impression.
4. **Add units to Run Threshold and Swim CSS fields** — users need to know if they're entering min/km, min/mile, or min/100m.

### UX Improvements (High Impact)

5. **Add "I don't know" helpers** for FTP, CSS, and threshold pace — let users estimate from simpler inputs like recent race times or training paces. This is critical for the first-timer market.
6. **Add tooltips/help text** for all technical terms throughout: FTP, CSS, threshold pace, TSS, P10/P50/P90, GPX, WBGT, Na. Every piece of jargon should have a tap-to-explain option.
7. Auto-fill the race date when a known race is selected from the database.
8. Detect user locale for date format (mm/dd/yyyy for US, dd.mm.yyyy for Europe) and weight units (kg/lb toggle).
9. **Add an FAQ section directly on the landing page** — don't bury it in the footer.
10. Persist all form fields when navigating between wizard steps (date field previously reset on back navigation — may now be fixed).

### Trust & Conversion

11. **Add aggregate social proof** to the landing page ("840,000+ race records analyzed", "Athletes in 50+ countries").
12. **Upgrade testimonials** — add last names, race photos, Strava/social links, and specific race results. Current initials-only format reads as potentially fake.
13. **Add an About section with founder story** — "We're triathletes building tools for triathletes." Team photos, race finisher photos, and personal bests build instant credibility.
14. **Prominently feature the PDF race-day card** on the landing page — this is a killer feature (tape it to your top tube!) that's currently buried in Settings.
15. **Clarify the free tier vs. demo** — the landing page sample plan shows weather data, but the free tier excludes it. This creates a bait-and-switch perception.
16. **Reconcile pricing copy** — "$150 per plan" vs. "$600+/year for coaching" should use consistent math.
17. **Soften the refund policy** — "All sales are final" is harsh for a $39 product from an unknown brand. Consider a 7-day money-back guarantee.

### Strategic Suggestions

18. Consider adding a "Race Week" email drip with reminders to review the plan, check gear, and adjust for final weather updates.
19. Offer a printable "wrist card" format for the nutrition timeline — most age-groupers tape nutrition plans to their top tube or forearm.
20. Filter RideWithGPS results by distance proximity to the expected course length to reduce confusion.
21. **Simplify technical language in the generated plan** for non-power-user audiences. "71.4% of FTP — derived from cohort performance, replacing heuristic defaults" should be "Your bike target is based on what similar athletes actually ride, not textbook theory."
22. Add a "Share your result" social feature after plan generation — let athletes share their predicted finish time to Instagram/Facebook. Free marketing.
23. Build a "Race Report" feature post-race — let athletes compare their plan vs. actual performance. This creates long-term engagement and data flywheel.
