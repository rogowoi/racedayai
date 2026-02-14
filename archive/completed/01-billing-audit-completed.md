# RaceDayAI Billing Audit Report

**Date:** February 12, 2026
**Scope:** All Stripe billing flows, upgrade/purchase paths, production configuration, webhook handling


## CRITICAL — Breaks Revenue

### 1. Pricing Page Crashes on Monthly Toggle

**Severity:** Critical — blocks purchases
**Where:** `/pricing` page (production — confirmed live at racedayai.com)

**What happens:** Clicking the "Monthly" billing toggle on the pricing page crashes the entire page, showing the "Something went wrong — Our systems hit a pothole" error screen.

**Root cause:** The pricing page (`src/app/pricing/page.tsx`) is marked `"use client"` but directly imports and renders the `Navbar` component (`src/components/layout/navbar.tsx`), which is an **async server component** that calls `auth()` → `headers()`. On the initial server render this works fine, but when the client-side state changes (clicking Monthly toggles `setBilling("monthly")`), React tries to re-render the tree on the client. The Navbar's `headers()` call fails because `headers()` is only available in server request scope.

**Console error:**
```
Error: `headers` was called outside a request scope.
```

**Impact:** Users cannot see monthly pricing at all. Any user who clicks "Monthly" before "Get Season Pass" loses the page entirely and sees a crash screen.

**Fix:** Either remove `"use client"` from the pricing page (refactor state to a child client component), or create a separate client-side Navbar that doesn't call `auth()`/`headers()`.

---

### 2. Test Stripe Keys Active in Local `.env`

**Severity:** Critical — needs Vercel dashboard verification
**Where:** `.env` (root)

**What's happening:** The local `.env` file has **test mode keys active** and **live keys commented out**:

```
# Live keys (COMMENTED OUT):
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_51Syc4H..."
# STRIPE_SECRET_KEY="sk_live_51Syc4H..."
# STRIPE_WEBHOOK_SECRET="whsec_85YmlI..."
# STRIPE_SEASON_ANNUAL_PRICE_ID="price_1Szh3v..."
# ...

# Test keys (ACTIVE):
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51Syc4H..."
STRIPE_SECRET_KEY="sk_test_51Syc4H..."
STRIPE_WEBHOOK_SECRET="whsec_Ma54k7..."
STRIPE_SEASON_ANNUAL_PRICE_ID="price_1SzOFD..."
# ...
```

The `.env` file is in `.gitignore`, so Vercel uses its own environment variables from the dashboard. **I could not verify Vercel's production env vars because the Vercel CLI is not authenticated.** If someone deployed using these local test keys, or if Vercel dashboard env vars mirror the test config, then:

- All checkout sessions create **test mode** subscriptions (no real charges)
- Webhooks use test signing secret (live Stripe events would fail signature verification)
- Price IDs point to test products (wrong prices or nonexistent in live mode)

**⚠️ ACTION REQUIRED:** Log into Vercel Dashboard → Project Settings → Environment Variables and confirm all Stripe variables use `sk_live_`, `whsec_` (live), and the **live-mode price IDs** (`price_1Szh3v...` not `price_1SzOFD...`).

---

### 3. Webhook `subscription.updated` Handler Defaults to Wrong Plan

**Severity:** Critical — silently downgrades paying users
**Where:** `src/app/api/stripe/webhook/route.ts`, lines 74–78

**Code:**
```typescript
const plan = isActive
  ? (subscription.metadata?.plan ?? "season")  // <-- BUG
  : "free";
```

**Problem:** When a Stripe checkout session is created, the `plan` metadata is set on the **checkout session**, not on the **subscription** itself. Stripe does NOT automatically copy checkout session metadata to the subscription. So `subscription.metadata?.plan` will almost always be `undefined`, and the fallback `"season"` kicks in.

**Impact:** If an **Unlimited ($99/yr)** subscriber's subscription triggers a `customer.subscription.updated` event (card change, renewal, trial end, Stripe retry), the webhook sets their plan to `"season"` instead of `"unlimited"`. They lose access to unlimited race plans.

**Fix:** Either:
- Copy `plan` to subscription metadata during checkout: `subscription_data: { metadata: { plan } }` in the `stripe.checkout.sessions.create()` call
- Or look up the user's current plan from the database instead of relying on subscription metadata

---

### 4. Purchase Intent Lost During Signup

**Severity:** High — kills conversion funnel
**Where:** `/pricing` → `/signup` → `/onboarding`

**Flow:**
1. User visits pricing page, decides on "Season Pass"
2. Clicks "Get Season Pass" → links to `/signup` (no plan param)
3. Signs up → redirected to `/onboarding` (auth-actions.ts line 116)
4. User is now on the **free** plan with **no prompt to upgrade**
5. To actually purchase, they'd need to discover `/dashboard/settings` on their own

**No plan parameter is carried through.** The signup form doesn't accept or pass a `plan` query parameter. The entire pricing page effectively funnels users to free signups.

**Fix:** Pass plan as URL parameter (`/signup?plan=season&billing=annual`), persist through signup, and either auto-redirect to Stripe checkout or show an upgrade prompt after onboarding.


## HIGH — Impacts Billing Reliability

### 5. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` Defined but Never Used

**Severity:** Medium — dead config, causes confusion
**Where:** `.env`, `.env.example`

The `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` environment variable is defined and validated at startup (`src/lib/stripe.ts`)... wait, actually it's NOT validated there — only the server-side variables are validated. But it IS defined in the `.env` file.

Searching the entire `src/` directory: **zero references** to `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in any source file. The app uses server-side Stripe (`stripe` npm package) exclusively and redirects to Stripe's hosted checkout. There is no `@stripe/stripe-js` or `loadStripe()` client-side integration.

**Impact:** The key is unused dead config. This isn't harmful but causes confusion when switching between test/live — someone might think switching this key matters, when it doesn't.

**Fix:** Remove `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` from `.env`, `.env.example`, and any deployment docs. Add a comment that the app uses server-side Stripe only.

---

### 6. Webhook Secret Mismatch Risk

**Severity:** High — if test webhook secret is deployed, all live webhooks fail silently

The test webhook secret (`whsec_Ma54k7...`) and live webhook secret (`whsec_85YmlI...`) are different. If the wrong one is set in Vercel, webhook signature verification fails:

```typescript
event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
```

This means:
- `checkout.session.completed` never fires → user pays but plan stays "free"
- `customer.subscription.deleted` never fires → cancelled users keep paid features
- All webhook errors return 400 but Stripe retries silently

**Impact:** Users pay but never get upgraded. Or cancel but keep access.

**ACTION REQUIRED:** Verify the webhook secret in Vercel matches the Stripe Dashboard webhook endpoint signing secret for `https://racedayai.com/api/stripe/webhook`.

---

### 7. No Webhook Failure Recovery

**Severity:** Medium
**Where:** Checkout flow + webhook handler

If the webhook for `checkout.session.completed` fails (network issue, deployment in progress, wrong secret), there is **no fallback mechanism**:
- No scheduled job to reconcile Stripe subscriptions with database
- No admin panel to manually sync
- The `success_url` redirect happens regardless of webhook success (Stripe redirects immediately)
- User sees "Payment successful!" but their plan is still "free"

The only resolution path documented is a manual SQL query in `DEPLOYMENT.md`.


## MEDIUM — UX & Flow Issues

### 8. Pricing Page "Get Season Pass" and "Get Pro" Link to Generic Signup

**Severity:** Medium
**Where:** `src/app/pricing/page.tsx` lines 192-197, 241-242

Both CTAs link to `/signup` with no differentiation:
```tsx
<Link href="/signup">Get Season Pass</Link>
<Link href="/signup">Get Pro</Link>
```

Users who click "Get Pro" at $99/year land on the exact same signup page as "Get Season Pass" at $39/year. There's zero indication of which plan they selected.

---

### 9. Homepage Pricing Shows Annual Only, No Toggle

**Severity:** Low
**Where:** `src/components/home/pricing-preview.tsx`

The homepage pricing preview hardcodes annual prices ("$39/year", "$99/year") with no monthly toggle. Users who prefer monthly billing don't see those prices until they navigate to `/pricing` — where clicking Monthly crashes the page (see Issue #1).

---

### 10. Downgrade Button Is Disabled (No-op)

**Severity:** Low
**Where:** `src/components/dashboard/billing-section.tsx` line 213

```tsx
<Button disabled variant="ghost" className="w-full">
  Downgrade to Free
</Button>
```

The downgrade button is always disabled with no explanation. Users must use the Stripe billing portal to cancel, but the "Manage Billing" button only appears if they already have a `stripeCustomerId`.

---

### 11. Billing Portal Inaccessible If Webhook Failed

**Severity:** Medium
**Where:** `src/components/dashboard/billing-section.tsx` line 143

```tsx
{hasStripeCustomer && (
  <Button onClick={handleManageBilling}>Manage Billing</Button>
)}
```

If the webhook fails to save `stripeCustomerId`, the user has no way to access the billing portal even though they're actively being charged by Stripe. They can't cancel, update payment, or manage their subscription.


## CONFIGURATION SUMMARY

| Config Item | Local `.env` | Expected in Prod | Status |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` | ⚠️ Verify Vercel |
| `STRIPE_WEBHOOK_SECRET` | `whsec_Ma54k7...` (test) | `whsec_85YmlI...` (live) | ⚠️ Verify Vercel |
| `STRIPE_SEASON_ANNUAL_PRICE_ID` | `price_1SzOFD...` (test) | `price_1Szh3v...` (live) | ⚠️ Verify Vercel |
| `STRIPE_SEASON_MONTHLY_PRICE_ID` | `price_1SzOFL...` (test) | `price_1Szh3z...` (live) | ⚠️ Verify Vercel |
| `STRIPE_UNLIMITED_ANNUAL_PRICE_ID` | `price_1SzOFn...` (test) | `price_1Szh4F...` (live) | ⚠️ Verify Vercel |
| `STRIPE_UNLIMITED_MONTHLY_PRICE_ID` | `price_1SzOG8...` (test) | `price_1Szh4H...` (live) | ⚠️ Verify Vercel |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | Not needed (unused) | Dead config |


## RECOMMENDED PRIORITY

1. **Immediately verify Vercel env vars** — confirm live Stripe keys are deployed
2. **Fix pricing page crash** — remove `"use client"` or split Navbar usage
3. **Fix webhook metadata bug** — add `subscription_data.metadata` to checkout session creation
4. **Add plan parameter to signup flow** — carry purchase intent through registration
5. **Add webhook reconciliation** — scheduled job or admin tool to sync Stripe ↔ database
6. **Clean up dead `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`** config
