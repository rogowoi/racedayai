**RaceDayAI**

**Mobile UX Bug Report**

Tested: February 14, 2026 \| Device: iPhone 14 Pro (390×844) \| Tester:
Age-Group Triathlete Persona

**25 bugs found \| 4 Critical \| 3 High \| 10 Medium \| 8 Low**

Executive Summary

A comprehensive mobile UX audit of racedayai.com was conducted from the
perspective of an age-group triathlete evaluating the product for the
first time. Testing covered the full user journey: landing page,
sign-up/login, wizard, plan creation, plan viewing, pricing, upgrade
flows, and all navigation links. The audit identified 18 bugs across 4
severity levels. Four critical issues block core functionality: Strava
OAuth login is completely broken due to a newline character in the
client_id, Stripe checkout is in test mode (preventing real payments),
and both Settings and Billing pages return 404 errors. Three
high-severity issues affect conversion and user trust, including a
broken Unicode character on the pricing page, a silent PDF button
failure, and the primary CTA sending new users to a login page instead
of signup. A deeper testing pass also uncovered form validation gaps
on the signup page, missing SEO metadata, React hydration errors on
page navigation, a contact form using GET instead of POST (exposing
user data in URLs), undersized mobile tap targets in the footer, and
no cookie consent banner for GDPR compliance. A fourth testing pass
focused on the wizard flow (plan creation), plan generation, plan detail
actions, and upgrade flow. This uncovered additional issues: the wizard
allows proceeding without selecting gender (validation gap), the Course
Profile step shows contradictory messaging about course data
availability, the Share button on plan detail pages provides no visual
feedback when clicked, and the "View Plans" button on the Plan Limit
Reached screen uses ambiguous wording that could be confused with
viewing existing race plans. A fifth testing pass covered the remaining
untested wizard controls, Stripe test card upgrade flow, and premium
feature validation. The upgrade flow via Stripe checkout works correctly
(test mode), but both PDF export and Share remain non-functional even
for paid Season Pass users — the buttons highlight but produce no
output. A critical discovery: the Settings page (B02) only works for
paid users; free-tier users still get a 404, meaning Settings/Billing
access is incorrectly gated behind a subscription. Info tooltip (?)
icons on fitness metrics (Bike FTP, Run Threshold, Swim CSS, TSS) don't
display any content when tapped on mobile. A sixth testing pass tested
the full upgrade path from Season Pass to Pro (Unlimited) tier at $99/
year. The upgrade completed successfully via Stripe, and the dashboard
correctly reflects "Pro / Unlimited plans available." However, two new
issues were discovered: (1) the Stripe checkout displays "Unlimited"
instead of "Pro" and mentions "API access" not advertised on the site
(B24), and (2) upgrading from Season Pass to Pro creates a second Stripe
subscription with no proration or automatic cancellation of the lower
tier (B25). Most critically, network-level analysis of B05 and B21
confirmed that both the PDF and Share API endpoints return HTTP 200 OK —
the backend works correctly, but the frontend JavaScript silently fails
to process the response. This means both bugs are client-side download/
response handler issues, not backend failures.

Bug Summary Table

  --------- -------------- ------------------------------------------------------------------------ ------------------------------------------------------- --------------------------------------------------------------------------------------
  **ID**    **Severity**   **Bug Title**                                                            **Location**                                            **Impact**
  **B01**   **Critical**   Stripe checkout in TEST mode on production                               Pricing → Get Season Pass → Stripe checkout             Blocks all revenue. No user can actually upgrade to a paid plan.
  **B02**   **Critical**   Settings page returns 404 for free users (works after upgrade)           Hamburger menu → Settings                               Free users cannot access settings, connect Strava/Garmin, or manage profile.\...
  **B03**   **Critical**   Billing page returns 404 (Page Not Found)                                Hamburger menu → Billing                                Paying users cannot manage their subscription. This is a legal/compliance concer\...
  **B04**   **High**       Unicode escape \\u00B7 renders as raw text on pricing page               /pricing → Season Pass tier                             Looks unprofessional and amateurish. Erodes trust at the exact moment a user is \...
  **B05**   **High**       PDF button broken on all tiers (API returns 200, frontend drops response) Plan detail page → PDF button                           Paid feature broken. Backend works but JS download handler fails silently.\...
  **B06**   **High**       \"Build My Race Plan\" CTA sends new users to login instead of signup    Homepage → \"Build My Race Plan\" button (logged out)   Conversion killer. New users may bounce because the page implies they need an ex\...
  **B07**   **Medium**     Pricing inconsistency between landing page and pricing page              Homepage pricing section vs. /pricing                   Creates confusion and undermines trust. Users may question which information is \...
  **B08**   **Medium**     Weather Impact shows dashes (\--) with no meaningful context             Plan detail page → Weather Impact card                  Looks like a broken component. Users may think the feature is not working.
  **B09**   **Low**        No Google/Apple SSO options on sign-up and login                         /signup and /login                                      Increased friction for users who don't have Strava. Minor conversion impact.
  **B10**   **Low**        Race plan detail page lacks nutrition timeline and transition details    Plan detail page                                        The core value proposition (detailed execution plan) is not delivered. Users who\...
  **B11**   **Medium**     Dashboard says \"Upgrade to Create Plans\" even though user has a plan   /dashboard → top button                                 Minor confusion. The wording could be more precise.
  **B12**   **Critical**   Strava OAuth login completely broken (Bad Request error)                 Login → Continue with Strava                            Users cannot log in or sign up via Strava. Total authentication blocker.
  **B13**   **Medium**     Signup form silently accepts invalid email and weak password             /signup → Create Free Account button                    Users may submit invalid data with no error feedback, or think the form is broken.
  **B14**   **Low**        SEO metadata missing on login, signup, privacy, and terms pages         /login, /signup, /privacy, /terms                       All pages use homepage title/description. Hurts SEO and looks unprofessional in search results.
  **B15**   **Medium**     Contact form uses GET method, exposing user data in URL                 /contact → Send Message form                           User name, email, and message appear in URL and browser history. Privacy concern.
  **B16**   **Medium**     React hydration error #418 on page navigation                          Multiple pages (detected on /pricing)                   Server-rendered HTML doesn't match client. Can cause UI flickering and broken interactivity.
  **B17**   **Low**        Footer links have tiny tap targets (17px height)                       Footer on all pages                                     Below Apple's 44px minimum. Hard to tap on mobile, especially for older users.
  **B18**   **Low**        No cookie consent banner                                               All pages                                               Potential GDPR/privacy compliance issue if any analytics or tracking is active.
  **B19**   **Medium**     Wizard Step 1 allows proceeding without selecting Gender               Wizard → Step 1 (Your Fitness Profile) → Gender field   Gender affects prediction accuracy. Skipping it silently reduces plan quality.
  **B20**   **Medium**     Course Profile step shows contradictory text about course data         Wizard → Step 3 (Course Profile)                        Confusing UX. Header says "We have course data" but body says "No GPX file."
  **B21**   **Medium**     Share button broken on all tiers (API returns 200, frontend drops response) Plan detail page → Share button                      Backend works but JS response handler fails silently. Dead-end interaction.
  **B22**   **Low**        "View Plans" button text ambiguous on Plan Limit screen                Wizard → Plan Limit Reached → "View Plans" button       "View Plans" sounds like viewing race plans, not pricing. Should say "Upgrade" or "See Pricing."
  **B23**   **Low**        Info tooltip (?) icons don't display content on mobile tap             Wizard Step 1 & Plan detail → (?) icons                 Users can't access explanatory info for FTP, Run Threshold, Swim CSS, TSS.
  **B24**   **Medium**     Plan naming mismatch: "Pro" on site vs "Unlimited" on Stripe checkout  /pricing → Get Pro → Stripe checkout                    Confuses users at the critical payment step. "API access" sets false expectations.
  **B25**   **Low**        No subscription proration or upgrade handling between paid tiers       /pricing → upgrade from Season Pass to Pro              Double-charging risk. Users end up with two active subscriptions.
  --------- -------------- ------------------------------------------------------------------------ ------------------------------------------------------- --------------------------------------------------------------------------------------

Detailed Bug Reports

**B01: Stripe checkout in TEST mode on production**

**Severity:** Critical **Location:** Pricing → Get Season Pass → Stripe
checkout

**Description:** Stripe checkout page shows \"RaceDayAI TEST\" badge in
the header. The checkout session URL contains cs\_test\_ prefix,
confirming this is Stripe test mode. No real payments can be processed.
Users who attempt to upgrade will not be charged and will not receive
the paid tier.

**Steps to Reproduce:** 1. Go to /pricing 2. Click \"Get Season Pass\"
3. Observe Stripe checkout header shows \"TEST\" label

**Expected Behavior:** Live Stripe checkout (cs\_live\_ prefix) with no
TEST badge

**Business Impact:** Blocks all revenue. No user can actually upgrade to
a paid plan.

**B02: Settings page returns 404 for free-tier users (works for paid)**

**Severity:** Critical **Location:** Hamburger menu → Settings

**Description:** Clicking \"Settings\" in the logged-in navigation menu
navigates to /dashboard/settings. For **free-tier users**, this returns
a 404 Page Not Found error. However, after upgrading to a paid Season
Pass via Stripe, the Settings page loads correctly, showing Connected
Accounts (Garmin, Strava) and Billing & Usage sections. This means
Settings access is incorrectly gated behind a paid subscription. Free
users have no way to connect Strava/Garmin, update their profile, or
view account information.

**Steps to Reproduce:** 1. Log in on free Starter plan 2. Open hamburger
menu 3. Click \"Settings\" 4. Page shows 404 5. Upgrade to Season Pass
6. Settings now loads correctly

**Expected Behavior:** Settings page should be accessible to all
authenticated users regardless of subscription tier

**Business Impact:** Free users cannot access settings, connect fitness
accounts, or manage their profile. This blocks the Strava/Garmin
integration funnel and reduces trust.

**B03: Billing page returns 404 (Page Not Found)**

**Severity:** Critical **Location:** Hamburger menu → Billing

**Description:** Clicking \"Billing\" in the logged-in navigation menu
navigates to /billing, which returns a 404 Page Not Found error. Users
cannot view their subscription status, invoices, or cancel/change their
plan through the app.

**Steps to Reproduce:** 1. Log in 2. Open hamburger menu 3. Click
\"Billing\" 4. Page shows 404

**Expected Behavior:** A billing page showing subscription details,
invoices, and plan management options

**Business Impact:** Paying users cannot manage their subscription. This
is a legal/compliance concern --- users must be able to cancel.

**B04: Unicode escape \\u00B7 renders as raw text on pricing page**

**Severity:** High **Location:** /pricing → Season Pass tier

**Description:** The Season Pass pricing card displays the literal
string \"\\u00B7\" instead of the middle dot character (·). The text
reads: \"Just \$6.50 per race \\u00B7 6 races per season\" instead of
\"Just \$6.50 per race · 6 races per season\". This is a string
interpolation bug where the Unicode escape sequence is not being
processed.

**Steps to Reproduce:** 1. Navigate to /pricing 2. Scroll to Season Pass
card 3. Observe raw \\u00B7 in the sub-price text

**Expected Behavior:** Middle dot character (·) rendered properly
between the two phrases

**Business Impact:** Looks unprofessional and amateurish. Erodes trust
at the exact moment a user is deciding whether to pay.

**B05: PDF button non-functional for both free AND paid users**

**Severity:** High **Location:** Plan detail page → PDF button

**Description:** Clicking the PDF button on a race plan detail page turns
the button blue but produces no visible result: no download, no error
message, no upgrade prompt. This affects ALL tiers — Starter, Season
Pass, AND Pro (Unlimited). Network monitoring reveals the API call
(`GET /api/plans/{id}/pdf`) returns HTTP 200 OK, confirming the backend
successfully generates the PDF. However, the frontend JavaScript fails
to trigger the actual browser download from the response. No file save
dialog appears, no blob URL is created, and no error is logged to the
console. This is a **client-side download handler bug**, not a backend
issue. The button simply highlights blue and then returns to its default
state. Tested across all three paid tiers with freshly generated plans.

**Steps to Reproduce:** 1. Log in on any plan (Starter, Season Pass, or Pro)
2. Go to a plan detail page 3. Click the PDF button 4. Button turns
blue momentarily, nothing else happens — no download initiated 5. Check
network tab: API returns 200 OK but browser never triggers download

**Expected Behavior:** For paid users: generate and download a PDF race
card. For free users: show an upgrade prompt explaining PDF is a paid
feature.

**Business Impact:** Paid feature not working. Users who upgraded
specifically for PDF export will feel cheated. This is a broken premium
feature promise that directly affects customer satisfaction and
retention.

**B06: \"Build My Race Plan\" CTA sends new users to login instead of
signup**

**Severity:** High **Location:** Homepage → \"Build My Race Plan\"
button (logged out)

**Description:** The primary CTA on the landing page (\"Build My Race
Plan\") redirects logged-out users to /login?callbackUrl=/wizard. The
page says \"Welcome back\" and \"Sign in to access your race plans.\" A
brand-new user who just arrived at the site has never created an account
--- this messaging is confusing and creates unnecessary friction. The
small \"Sign up free\" link at the bottom is easy to miss.

**Steps to Reproduce:** 1. Visit racedayai.com while logged out 2. Click
\"Build My Race Plan\" 3. Arrive at /login with \"Welcome back\"
messaging

**Expected Behavior:** Should redirect to /signup (or a combined auth
page defaulting to sign-up) since this is the primary acquisition CTA

**Business Impact:** Conversion killer. New users may bounce because the
page implies they need an existing account.

**B07: Pricing inconsistency between landing page and pricing page**

**Severity:** Medium **Location:** Homepage pricing section vs. /pricing

**Description:** The landing page pricing section and the dedicated
/pricing page have inconsistencies: (1) Landing page shows \"\$0\" while
pricing page shows \"\$0 /forever\". (2) Landing page Season Pass shows
\"Just \$6.50 per race · 6 races per season\" (rendered correctly with
the dot) while pricing page shows the broken \\u00B7 version. (3)
Pricing page has \"Save 35%\" badge on Season Pass and \"Save 36%\" on
Pro, while landing page has no savings badges. These should be
consistent.

**Steps to Reproduce:** 1. View pricing section on homepage 2. Navigate
to /pricing 3. Compare the two

**Expected Behavior:** Identical pricing information, feature lists, and
formatting across both locations

**Business Impact:** Creates confusion and undermines trust. Users may
question which information is correct.

**B08: Weather Impact shows dashes (\--) on some plans, historical data
on others**

**Severity:** Medium **Location:** Plan detail page → Weather Impact
card

**Description:** The Weather Impact section behaves inconsistently
across plans. On a newly created plan for IRONMAN 70.3 Austria / St.
Polten (June 2026), it correctly shows historical averages (14°C, 65%
Humidity) with the note \"Historical average (forecast available 10
days before race).\" However, on some plans it shows two dashes
(\"\-- \--\") with \"Weather data will update closer to race day.\" This
inconsistency suggests the weather feature works for known races in
the database but fails silently for custom or unrecognized races.

**Steps to Reproduce:** 1. Create a plan for a known race (e.g.,
IRONMAN 70.3 Austria) — weather shows historical data 2. Create a
plan for a custom/unknown race — weather may show dashes

**Expected Behavior:** Show historical averages for all races based on
location/date, or clearly explain why data is unavailable

**Business Impact:** Inconsistent behavior confuses users. The dash
display looks like a broken component.

**B09: No Google/Apple SSO options on sign-up and login**

**Severity:** Low **Location:** /signup and /login

**Description:** The sign-up and login pages only offer Strava SSO and
email/password. While Strava is relevant for triathletes, many users may
not have a Strava account or may prefer to sign in with Google or Apple.
The absence of mainstream SSO options creates friction, especially for
casual users exploring the product.

**Steps to Reproduce:** 1. Navigate to /signup or /login 2. Observe only
Strava and email options

**Expected Behavior:** Google and/or Apple SSO alongside Strava

**Business Impact:** Increased friction for users who don't have Strava.
Minor conversion impact.

**B10: Race plan detail page lacks nutrition timeline and transition
details**

**Severity:** Low **Location:** Plan detail page

**Description:** The actual race plan only shows basic swim/bike/run
splits with target pace/power. It does not include the detailed
nutrition timeline (gel schedule, hydration timing) or transition
checklists that are prominently advertised on the landing page and in
the sample plan. The sample plan on the homepage shows T+0:15, T+0:40,
T+1:05 gel timing, hydration strategy, and heat adjustments --- but the
real plan has none of this detail.

**Steps to Reproduce:** 1. Create a race plan 2. View plan details 3.
Compare to the sample plan on the homepage

**Expected Behavior:** Actual plan should include nutrition timeline,
transition details, and weather-specific adjustments as advertised

**Business Impact:** The core value proposition (detailed execution
plan) is not delivered. Users who saw the demo will feel misled.

**B11: Dashboard says \"Upgrade to Create Plans\" even though user has a
plan**

**Severity:** Medium **Location:** /dashboard → top button

**Description:** On the dashboard, the primary CTA shows \"+ Upgrade to
Create Plans\" for a Starter user who has used their 1 free plan. This
wording implies the user cannot create ANY plans without upgrading,
which is misleading for users who haven't used their free plan yet
(since this same button might appear). The button label should be more
specific about what upgrading unlocks.

**Steps to Reproduce:** 1. Log in on Starter plan (1 plan used) 2.
Observe dashboard header button

**Expected Behavior:** More specific CTA like \"Upgrade for More Plans\"
or \"Create New Plan\" (which then shows the limit/upgrade prompt)

**Business Impact:** Minor confusion. The wording could be more precise.

**B12: Strava OAuth login completely broken (Bad Request error)**

**Severity:** Critical **Location:** Login → Continue with Strava

**Description:** Clicking "Continue with Strava" on the login (or
signup) page redirects to Strava's OAuth endpoint, but the request
fails with a raw JSON error: `{"message":"Bad Request","errors":
[{"resource":"Application","field":"redirect_uri","code":"invalid"}]}`.
The root cause is visible in the URL: the `client_id` parameter
contains a URL-encoded newline character (`client_id=136365%0A`).
This trailing `\n` in the client ID causes Strava to reject the
entire OAuth request. No user can log in or sign up via Strava.

**Steps to Reproduce:** 1. Go to /login or /signup 2. Click "Continue
with Strava" 3. Strava returns raw JSON error page

**Expected Behavior:** Redirect to Strava authorization page where
user can grant access

**Business Impact:** Total authentication blocker for Strava users.
Since Strava SSO is the primary login method for the target audience
(triathletes), this effectively locks out the majority of potential
users. This is the highest-priority bug in the entire report.

**B13: Signup form silently accepts invalid email and weak password**

**Severity:** Medium **Location:** /signup → Create Free Account button

**Description:** When submitting the signup form with an invalid email
format ("notanemail") and a weak password ("short") that fails all
strength requirements, clicking "Create Free Account" produces no
visible error message. The password strength indicator shows the
requirements in real-time (at least 8 characters, one uppercase, one
lowercase, one number) but does not block form submission. No inline
error appears on the email field, no toast notification, and no
server-side error message is displayed. The browser's password manager
popup intercepts, suggesting the form attempted to submit.

**Steps to Reproduce:** 1. Go to /signup 2. Enter name: "Test User" 3.
Enter email: "notanemail" (no @ symbol) 4. Enter password: "short" 5.
Click "Create Free Account" 6. No error appears

**Expected Behavior:** Form should either prevent submission (disable
button when validation fails) or show clear inline error messages on
invalid fields

**Business Impact:** Users may submit invalid data and get confused
when nothing happens. Creates a poor first impression of product
quality.

**B14: SEO metadata missing on login, signup, privacy, and terms pages**

**Severity:** Low **Location:** /login, /signup, /privacy, /terms

**Description:** The login, signup, privacy policy, and terms of
service pages all use the default homepage title ("RaceDayAI — AI Race
Execution Coach for Triathletes") and the homepage meta description.
They do not have page-specific titles or descriptions. Additionally,
the canonical URL on /login and /signup points to the homepage
(`https://racedayai.com/`) rather than to their own URLs, which tells
search engines these pages are duplicates of the homepage.

**Steps to Reproduce:** 1. View page source on /login, /signup,
/privacy, or /terms 2. Check `<title>`, `<meta name="description">`,
and `<link rel="canonical">` tags

**Expected Behavior:** Each page should have a unique, descriptive
title (e.g., "Sign Up | RaceDayAI", "Privacy Policy | RaceDayAI") and
a relevant meta description. Canonical URLs should point to each
page's own URL.

**Business Impact:** Hurts SEO rankings, looks unprofessional in
search engine results, and may cause crawl confusion due to incorrect
canonical tags.

**B15: Contact form uses GET method, exposing user data in URL**

**Severity:** Medium **Location:** /contact → Send Message form

**Description:** The contact form uses `method="GET"` instead of
`method="POST"`. When submitted, the user's name, email address, and
message content are appended to the URL as query parameters (e.g.,
`/contact?name=John&email=john@test.com&message=Hello`). This exposes
personal data in the browser address bar, browser history, server
access logs, and any analytics tools tracking page URLs. The form
also has no CSRF protection or honeypot field for spam prevention.

**Steps to Reproduce:** 1. Go to /contact 2. Inspect form element in
DevTools 3. Observe `method="get"` 4. Fill form and submit 5. Data
appears in URL

**Expected Behavior:** Form should use POST method. Sensitive user
data should never appear in URL parameters.

**Business Impact:** Privacy concern. User data exposed in browser
history and server logs. Spam vulnerability without CSRF/honeypot.

**B16: React hydration error #418 on page navigation**

**Severity:** Medium **Location:** Multiple pages (detected on
/pricing and during navigation)

**Description:** The browser console shows repeated React error #418
("Hydrated content doesn't match server-rendered HTML") during
client-side page navigation. This occurs at least 3 times per
navigation. Error #418 is a React hydration mismatch, meaning the
HTML generated on the server differs from what React renders on the
client. This is likely caused by the `\u00B7` Unicode escape sequence
issue (B04) or dynamic content that renders differently between
server and client (e.g., date formatting, user-agent-specific content).

**Steps to Reproduce:** 1. Open browser DevTools console 2. Navigate
between pages (e.g., from homepage to /pricing) 3. Observe "Minified
React error #418" exceptions in console

**Expected Behavior:** No hydration errors. Server and client HTML
should match exactly.

**Business Impact:** Can cause UI flickering, broken interactive
elements, and degraded performance. May also affect SEO since search
engines may see different content than users.

**B17: Footer links have tiny tap targets (17px height)**

**Severity:** Low **Location:** Footer on all pages

**Description:** Footer navigation links (Create Plan, Pricing,
Features, About, FAQ, Contact, Privacy Policy, Terms of Service, Log
In, Sign Up) are only 17px tall, well below Apple's Human Interface
Guideline minimum of 44×44px for touch targets. The hamburger menu
button is also slightly undersized at 40×40px (should be 44×44px).
These small targets make it difficult for users to tap accurately on
mobile, especially for users with larger fingers or reduced dexterity.

**Steps to Reproduce:** 1. Scroll to footer on any page 2. Attempt to
tap links 3. Observe the small hit area

**Expected Behavior:** All interactive elements should have a minimum
tap target of 44×44px per Apple HIG / WCAG 2.5.5

**Business Impact:** Usability issue on mobile. May cause frustration
and accidental taps. Accessibility concern for users with motor
impairments.

**B18: No cookie consent banner**

**Severity:** Low **Location:** All pages

**Description:** The site does not display any cookie consent banner
or privacy notice on first visit. If the site uses any analytics
(Google Analytics, Vercel Analytics, etc.), tracking cookies, or
third-party scripts, this may violate GDPR, CCPA, and other privacy
regulations that require explicit consent before storing cookies or
tracking user behavior.

**Steps to Reproduce:** 1. Clear all cookies 2. Visit racedayai.com
for the first time 3. No consent banner appears

**Expected Behavior:** A cookie consent banner should appear on first
visit if any non-essential cookies or tracking are in use

**Business Impact:** Potential legal/compliance risk under GDPR and
CCPA. May not be an issue if the site uses no tracking cookies, but
should be verified.

**B19: Wizard Step 1 allows proceeding without selecting Gender**

**Severity:** Medium **Location:** Wizard → Step 1 (Your Fitness Profile)
→ Gender dropdown

**Description:** The wizard's Step 1 (Your Fitness Profile) has a Gender
dropdown that defaults to "Select" (no selection). The user can click
"Next: Race Details" and proceed to Step 2 without ever choosing a
gender. All other fields (Age, Weight, Bike FTP, Run Threshold, Swim
CSS, Triathlon Experience) are pre-populated with reasonable defaults,
but Gender is left unselected with no validation preventing progression.
Since gender is a significant factor in performance prediction models
(it affects pace/power estimates from cohort data), skipping this field
silently degrades prediction accuracy.

**Steps to Reproduce:** 1. Start the wizard (Step 1) 2. Leave Gender as
"Select" (do not choose Male/Female/Non-binary) 3. Click "Next: Race
Details" 4. Successfully moves to Step 2 with no error

**Expected Behavior:** Either (a) require Gender selection before
allowing progression (show inline validation error), or (b) default to a
reasonable value and clearly indicate it can be changed

**Business Impact:** Gender affects prediction accuracy. Users who skip
it unknowingly get less accurate plans. This undermines the "data-driven"
value proposition.

**B20: Course Profile step shows contradictory text about course data**

**Severity:** Medium **Location:** Wizard → Step 3 (Course Profile)

**Description:** The Course Profile step (Step 3) displays two
contradictory messages. The subheading below the "Course Profile" title
says: "We have course data for your race. You can also search
RideWithGPS or upload your own." However, the info box directly below
states: "No GPX file in our library yet — Search RideWithGPS below to
find this course, or upload your own GPX." These two statements conflict:
one says the system has course data, the other says it doesn't. This
confusion is likely caused by the subheading being static text that
doesn't update based on whether the database actually contains GPX data
for the selected race.

**Steps to Reproduce:** 1. Go through wizard to Step 3 2. Select a race
(e.g., IRONMAN 70.3 Austria / St. Polten) 3. Observe the contradiction
between the subheading and the info box

**Expected Behavior:** If no course data exists, the subheading should
say "No course data yet — search RideWithGPS or upload your own GPX."
If course data exists, the info box should reflect that.

**Business Impact:** Confusing UX. Users may not trust the data accuracy
if the app contradicts itself about what data it has.

**B21: Share button non-functional for both free AND paid users**

**Severity:** Medium **Location:** Plan detail page → Share button

**Description:** On the plan detail page, clicking the "Share" button
causes the button to turn orange/highlighted, but produces no other
visible feedback: no toast notification ("Link copied!"), no share
dialog, no modal, and no URL change. This affects ALL tiers — Starter,
Season Pass, AND Pro (Unlimited). Network monitoring reveals the API
call (`POST /api/plans/{id}/share`) returns HTTP 200 OK, confirming the
backend successfully processes the share request (likely generating a
public share link). However, the frontend JavaScript never displays the
result to the user — no toast notification, no modal with the share URL,
no clipboard copy action. This is a **client-side response handler bug**,
identical in nature to B05 (PDF). The backend works; the frontend
silently drops the response. Compare this to the Delete button which
correctly shows a confirmation dialog and the Rename button which opens
a proper dialog.

**Steps to Reproduce:** 1. View a plan detail page (on any plan tier —
Starter, Season Pass, or Pro) 2. Click the "Share" button 3. Button
turns orange, nothing else happens 4. No confirmation that a link was
copied or that any action occurred 5. Check network tab: POST to
/api/plans/{id}/share returns 200 OK but UI shows no response

**Expected Behavior:** Either (a) copy a share link and show a toast
notification confirming it, or (b) open a share dialog (native OS share
sheet or custom modal with link)

**Business Impact:** Dead-end interaction on a paid feature. Users
expect feedback when clicking action buttons. Silent failure erodes
trust, especially for users who upgraded expecting sharing to work.

**B22: "View Plans" button text ambiguous on Plan Limit Reached screen**

**Severity:** Low **Location:** Wizard → Plan Limit Reached → "View
Plans" button

**Description:** When a free-tier user attempts to create a new plan
after using their 1 free slot, the wizard shows a "Plan Limit Reached"
screen. The primary CTA button says "View Plans" with an arrow icon.
This wording is ambiguous — "View Plans" could mean "view my existing
race plans" (which is what a user might logically expect) rather than
"view pricing plans to upgrade." The button actually navigates to
/pricing, which is an upgrade flow. The secondary button "Go to
Dashboard" reinforces this confusion because "View Plans" and "Go to
Dashboard" sound like they serve similar purposes (viewing your stuff).

**Steps to Reproduce:** 1. Use your 1 free plan 2. Try to create a new
plan 3. See "Plan Limit Reached" screen 4. Read "View Plans" button —
ambiguous whether it means race plans or pricing plans

**Expected Behavior:** The button should say "Upgrade" or "See Pricing"
or "Unlock More Plans" to clearly indicate it leads to a purchase flow

**Business Impact:** Missed upgrade opportunity. Users who interpret
"View Plans" as "view my race plans" will click Go to Dashboard instead,
bypassing the upgrade funnel.

**B23: Info tooltip (?) icons don't display content on mobile tap**

**Severity:** Low **Location:** Wizard Step 1 (Bike FTP, Run Threshold,
Swim CSS) and Plan detail page (TSS)

**Description:** Several form fields and metric cards feature a small
circled question mark (?) icon intended to provide explanatory tooltip
content. On mobile, tapping these icons produces no visible response —
no tooltip, no popover, no modal, and no bottom sheet. The icons are
clearly interactive (they have a hover/focus state and appear clickable)
but no content is displayed when tapped. This affects the (?) icons
next to: Bike FTP (W), Run Threshold (min/km), Swim CSS (min/100m) in
the wizard, and TSS on the plan detail page. These tooltips are
important for user education — many age-group triathletes may not know
what FTP or CSS means, and the tooltips are the only in-context
explanation available.

**Steps to Reproduce:** 1. Open wizard Step 1 2. Tap the (?) icon next
to "Bike FTP (W)" 3. Nothing happens — no tooltip or explanation
appears 4. Repeat for Run Threshold, Swim CSS, and TSS on plan detail

**Expected Behavior:** Tapping the (?) icon should display a tooltip,
popover, or bottom sheet explaining the metric (e.g., "FTP (Functional
Threshold Power) is the maximum power you can sustain for 1 hour...")

**Business Impact:** Educational gap for new users. Triathletes
unfamiliar with training metrics can't learn what FTP, CSS, or TSS mean
in context, reducing engagement and plan accuracy.

**B24: Plan naming mismatch between pricing page and Stripe checkout**

**Severity:** Medium **Location:** /pricing → "Get Pro" → Stripe checkout

**Description:** The pricing page calls the top tier "Pro" ($99/year),
but the Stripe checkout page shows "Subscribe to Unlimited — $99.00 per
year." The Stripe product description also mentions "API access" which
is not listed anywhere on the pricing page or features page. After
purchase, the app correctly shows "Pro" in the dashboard and settings,
so the mismatch is only on the Stripe checkout. This inconsistency
creates doubt at the critical payment moment — users may wonder if
they're buying the right product. The Stripe product name ("Unlimited")
appears to be an older internal name that was never updated when the
public-facing tier was renamed to "Pro."

**Steps to Reproduce:** 1. Log in on any plan 2. Go to /pricing 3.
Click "Get Pro" ($99/year) 4. Stripe checkout shows "Subscribe to
Unlimited" instead of "Subscribe to Pro" 5. Description mentions "API
access" not advertised on pricing page

**Expected Behavior:** Stripe checkout should show "Subscribe to Pro —
$99.00 per year" and the description should match features listed on
the pricing page

**Business Impact:** Creates confusion at the payment step. Users may
hesitate or abandon checkout if the product name doesn't match what
they clicked. "API access" mention sets false expectations for a feature
that may not exist.

**B25: No subscription proration or upgrade handling between paid tiers**

**Severity:** Low **Location:** /pricing → upgrade from Season Pass to Pro

**Description:** When a Season Pass subscriber ($39/year) clicks "Get
Pro" ($99/year) on the pricing page, they are taken to a fresh Stripe
checkout for the full $99/year with no mention of their existing Season
Pass subscription. There is no proration, no credit for the remaining
Season Pass period, and no indication that the existing subscription
will be cancelled or replaced. After completing the Pro checkout, the
user effectively has two active Stripe subscriptions ($39 + $99). The
app correctly recognizes the Pro tier, but the billing situation is
messy. The Settings/Billing page shows "Current Plan: Pro" with a
"Manage Billing" button, but there's no in-app way to cancel the
orphaned Season Pass subscription. Users would need to go through
Stripe's billing portal to clean this up.

**Steps to Reproduce:** 1. Subscribe to Season Pass ($39/year) 2. Go to
/pricing 3. Click "Get Pro" ($99/year) 4. Complete Stripe checkout
(no mention of existing subscription) 5. Now have two active Stripe
subscriptions 6. Pricing page shows no "Current Plan" indicator on
Season Pass tier before upgrading

**Expected Behavior:** Upgrade flow should (a) show current plan status
on pricing page, (b) prorate the Season Pass credit toward Pro, and
(c) automatically cancel the lower-tier subscription upon upgrade

**Business Impact:** Revenue leakage risk (double-charging customers)
and potential chargeback/dispute liability. Poor customer experience
when users discover duplicate charges.

Testing Methodology

Testing was performed on a simulated iPhone 14 Pro viewport (390×844px)
using Chrome DevTools mobile emulation. The full user journey was tested
across both logged-in and logged-out states. Pages tested include:
homepage/landing page, sign-up page, login page, dashboard, plan detail
page, wizard (plan creation), pricing page, features page, about page,
FAQ page, contact page, privacy policy, and terms of service. Navigation
was tested via the hamburger menu, footer links, in-page CTAs, and
direct URL entry. Upgrade flows were tested from three entry points:
dashboard, wizard (plan limit reached), and pricing page.

A deeper testing pass additionally covered: form validation on the
signup page (empty fields, invalid email, weak password), the forgot
password flow (which works correctly), horizontal scroll checks on all
pages (no issues found), all footer link destinations (all return 200),
anchor link navigation (#features, #how-it-works, #demo, #pricing),
SEO metadata audit across all key pages, and Strava OAuth
authentication (which was found to be completely broken). The delete
plan confirmation dialog could not be tested due to the Strava OAuth
failure preventing login.

A third testing pass covered: contact form structure and method
(found GET method privacy issue), FAQ page content and CTAs (20
questions, all functional), pricing page CTA destinations for all
three tiers (Try Free → /wizard, Get Season Pass → /signup?plan=season,
Get Pro → /signup?plan=unlimited), demo/sample plan interaction
(fully functional, rich content), browser console error monitoring
(found React hydration error #418 on navigation), login with invalid
credentials (proper generic error message), accessibility checks
(tap target sizes, image alt text, viewport meta), cookie consent
banner check (none found), wizard access while logged out (redirects
to /login), and direct URL access to protected routes (/dashboard,
/plan/[id] — return 200 with client-side redirect, not server-side).
Additionally tested: About page, Features page, "View FAQ" link on
contact page, "Contact Support" mailto link on FAQ page, and signup
page with plan parameter (/signup?plan=season — correctly shows
contextual CTA text).

A fourth testing pass focused on the authenticated wizard flow, plan
generation, and upgrade paths. A fresh account was created via email
signup (testtriathlete2026@gmail.com). Testing covered: the onboarding
welcome page (3-step overview with "Let's Build Your First Plan" and
"Sync from Strava" CTAs), wizard Step 1 — Your Fitness Profile (Manual
Entry and Connect Apps tabs, Gender dropdown, Age, Weight with kg/lb
toggle, Bike FTP with Estimate button, Run Threshold, Swim CSS with
Estimate button, Triathlon Experience dropdown), wizard Step 2 — Race
Details (race search with autocomplete dropdown showing race name,
location, athlete count, and estimated time; race date picker; distance
selector with Sprint/Olympic/70.3/140.6 cards; auto-selection of
distance from race database), wizard Step 3 — Course Profile (course
data status messaging, RideWithGPS search integration, GPX file
upload area with drag-and-drop), plan generation (successfully
generated a 70.3 plan in ~3 seconds), plan detail page (Total Time
with confidence indicator, Weather Impact with historical averages,
Nutrition summary, Race Execution with Swim/Bike/Run cards showing
pace/power/speed/TSS targets), plan action buttons (Rename dialog
with character counter — works; Share — no feedback; PDF — no feedback;
Delete — proper confirmation dialog with warning), dashboard with
plan listing and upgrade prompts, and the upgrade flow from wizard
(Plan Limit Reached → View Plans → /pricing). Settings and Billing
pages confirmed still returning 404 even when authenticated.

A fifth testing pass focused on remaining untested wizard controls,
the Stripe upgrade flow, and premium feature validation. A second test
account was created (qatester2racedayai@gmail.com) to test wizard
controls that were inaccessible on the first account (plan limit
reached). Testing covered: Connect Apps tab (shows Strava active +
Garmin "Coming 2026" greyed out), Gender dropdown options (Male/Female
only — no Non-binary/Other/Prefer not to say), "Switch to lb" weight
toggle (works correctly, 79kg → 174lb with bidirectional conversion),
info (?) tooltip icons on Bike FTP, Run Threshold, Swim CSS (tappable
but no content displayed — B23), FTP Estimate button (opens modal with
20-Minute Test and Ramp Test calculator tabs), Swim CSS Estimate button
(opens modal with distance/time calculator), Triathlon Experience
dropdown (4 options: Beginner, Intermediate 2-5, Advanced 6-15, Elite/
Pro 15+), Back button between wizard steps (preserves form data
correctly), empty field validation (FTP/CSS show "optional" placeholder,
form proceeds — expected), negative/extreme value validation. The Stripe
upgrade flow was tested end-to-end using test card 4242 4242 4242 4242:
checkout loaded correctly in test mode, payment processed successfully,
redirect to /dashboard/settings?billing=success with green confirmation
banner "Payment successful! Your subscription has been updated" and
CTAs "Create Your First Plan" and "Go to Dashboard." Post-upgrade
testing confirmed: Settings page now accessible (was 404 on free tier
— updated B02), Billing & Usage section shows "Season Pass / 1 of 6
plans used / Season ends: 2/15/2027", dashboard shows "Season Pass /
5 plans remaining," plan generation works correctly as paid user (5:23:00
IRONMAN 70.3 plan with full Race Strategy Narrative). Premium feature
testing: PDF button still non-functional on paid plan (B05 updated —
broken for all tiers), Share button still non-functional on paid plan
(B21 updated — broken for all tiers). Manage Billing button and
hamburger menu Billing link (/dashboard/billing) confirmed still 404
even for paid users — billing is embedded in Settings page only.

A sixth testing pass tested the upgrade path from Season Pass to Pro
(Unlimited) tier ($99/year) using Stripe test card. Testing covered:
pricing page display for existing subscribers (no "Current Plan"
indicator on Season Pass card), Stripe checkout naming consistency
("Pro" on site vs "Unlimited" on Stripe — B24), subscription upgrade
handling (no proration, creates second subscription — B25), post-upgrade
dashboard verification (correctly shows "Pro / Unlimited plans
available" with plan count updated), unlimited plan creation (duplicate
plan detection works correctly with "Create Anyway" option — second
plan created successfully), Settings/Billing page after Pro upgrade
(correctly shows "Current Plan: Pro / Unlimited race plans" with
Manage Billing button), and premium feature re-testing at Pro tier.
Network-level analysis was performed on B05 (PDF) and B21 (Share) using
browser DevTools: both API endpoints (`GET /api/plans/{id}/pdf` and
`POST /api/plans/{id}/share`) return HTTP 200 OK with no console errors,
confirming the backend generates responses correctly but the frontend
JavaScript fails to process them. This pinpoints both bugs as client-
side response handler issues.
