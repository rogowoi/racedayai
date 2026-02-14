# RaceDayAI Production Deployment Checklist

## Pre-Deployment Setup

### 1. Stripe Production Configuration

#### Create Products in Stripe Dashboard (Production Mode)
1. Switch to **Live mode** in Stripe Dashboard
2. Go to **Products** → **Add Product**

**Season Pass Product:**
- Name: `Season Pass`
- Description: `6 race plans per season with PDF export, GPX analysis, weather integration, and Strava sync`
- Create two prices:
  - Annual: `$39.00/year` (recurring)
  - Monthly: `$4.99/month` (recurring)
- Save price IDs

**Unlimited Product:**
- Name: `Unlimited`
- Description: `Unlimited race plans with AI narratives, advanced weather warnings, sharing, and API access`
- Create two prices:
  - Annual: `$99.00/year` (recurring)
  - Monthly: `$12.99/month` (recurring)
- Save price IDs

#### Get Production API Keys
1. Go to **Developers** → **API Keys**
2. Copy **Live Secret Key** (starts with `sk_live_...`)
3. Save securely - never commit to git

#### Setup Webhook for Production
1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy **Signing secret** (starts with `whsec_...`)

### 2. Environment Variables for Vercel

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Database (already set if using Neon)
DATABASE_URL="postgresql://..."

# NextAuth
AUTH_SECRET="<run: openssl rand -base64 32>"

# Strava OAuth
STRAVA_CLIENT_ID="<your-production-strava-client-id>"
STRAVA_CLIENT_SECRET="<your-production-strava-client-secret>"

# Stripe PRODUCTION Keys
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_SEASON_ANNUAL_PRICE_ID="price_..."
STRIPE_SEASON_MONTHLY_PRICE_ID="price_..."
STRIPE_UNLIMITED_ANNUAL_PRICE_ID="price_..."
STRIPE_UNLIMITED_MONTHLY_PRICE_ID="price_..."

# Anthropic (for AI narratives - optional for MVP)
ANTHROPIC_API_KEY="<your-api-key>"

# App URL
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### 3. Strava OAuth Production Setup

1. Go to [Strava Developer Portal](https://www.strava.com/settings/api)
2. Update **Authorization Callback Domain** to your production domain
3. Update redirect URI: `https://yourdomain.com/api/auth/callback/strava`
4. Use production Client ID and Secret in Vercel env vars

### 4. Database Migration

Ensure Prisma migrations are up to date:

```bash
# In your production environment (Vercel runs this automatically)
DATABASE_URL="<production-db-url>" pnpm prisma migrate deploy
```

---

## Deployment Steps

### Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

Or connect GitHub repo to Vercel for automatic deployments.

---

## Post-Deployment Verification

### 1. Test Stripe Webhooks

After deploying, test the webhook:

```bash
# From Stripe Dashboard → Webhooks → Your endpoint
# Click "Send test webhook"
# Choose: checkout.session.completed
```

Verify in your app logs that the webhook was received and processed.

### 2. Test Complete Flow

1. **Sign Up**: Create account with email/password
2. **Free Plan**: Try creating 1 plan (should work)
3. **Hit Limit**: Try creating 2nd plan (should be blocked)
4. **Visit Settings**: Go to `/dashboard/settings` - should show 1/1 plans used
5. **Upgrade**: Click upgrade → should redirect to Stripe checkout
6. **Complete Payment**: Use real card (you'll be charged)
7. **Verify Webhook**: Check user plan updated in database
8. **Create Plans**: Should now be able to create 6 or unlimited plans

### 3. Monitor Logs

Check these in Vercel Dashboard → Deployments → Logs:

- Webhook processing logs
- Plan creation logs
- Any Stripe API errors

### 4. Test Billing Portal

1. As a paid user, go to `/dashboard/settings`
2. Click "Manage Billing"
3. Should redirect to Stripe Customer Portal
4. Test updating payment method, canceling subscription

---

## Monitoring & Maintenance

### Failed Webhooks

- Check **Stripe Dashboard** → **Developers** → **Webhooks**
- Look for failed attempts
- Stripe retries failed webhooks automatically

### Database Health

```bash
# Check user plan distribution
SELECT plan, COUNT(*) FROM "User" GROUP BY plan;

# Check subscription sync
SELECT plan, "stripeSubscriptionId", "plansCreatedThisSeason"
FROM "User"
WHERE "stripeCustomerId" IS NOT NULL;
```

### Key Metrics to Track

- Conversion rate (Free → Paid)
- Plan usage (avg plans per user)
- Churn rate
- Stripe webhook success rate

---

## Rollback Plan

If issues arise after deployment:

1. **Revert Vercel Deployment**: Vercel → Deployments → Previous deployment → Promote to Production
2. **Database**: Migrations are forward-only, but can manually revert in Prisma
3. **Stripe**: Webhooks can be disabled temporarily in Stripe Dashboard

---

## Security Checklist

- [ ] All sensitive keys in Vercel environment variables (not in code)
- [ ] `.env` file in `.gitignore`
- [ ] Webhook signature verification enabled
- [ ] HTTPS only (enforced by Vercel)
- [ ] Database connection uses SSL
- [ ] NextAuth session strategy is JWT for credentials (already set)
- [ ] CORS properly configured (Next.js handles this)

---

## Cost Estimates

**Vercel (Hobby Plan - Free):**
- 100GB bandwidth/month
- Sufficient for MVP

**Neon (Free Tier):**
- 512 MB storage
- 1 compute unit
- Upgrade if needed (~$5/mo for more compute)

**Stripe:**
- 2.9% + $0.30 per transaction
- No monthly fee

**Estimated Monthly Costs for MVP:**
- $0 (all free tiers)
- Only Stripe transaction fees when you get customers

---

## Support & Troubleshooting

### Common Issues

**"Missing Stripe environment variables" error:**
- Check all 7 Stripe env vars are set in Vercel
- Redeploy after setting them

**Webhook not updating user plan:**
- Verify webhook secret matches Stripe Dashboard
- Check Vercel logs for webhook errors
- Ensure webhook events are selected correctly

**User stuck on free plan after payment:**
- Check Stripe Dashboard → Payments → Find customer
- Manually update in database if needed:
  ```sql
  UPDATE "User"
  SET plan = 'season', "stripeSubscriptionId" = 'sub_...'
  WHERE email = 'user@example.com';
  ```

**Plan limit not enforcing:**
- Check `plansCreatedThisSeason` counter in database
- Verify `seasonStartDate` is set
- May need to manually reset if season expired

---

## Next Steps After Launch

1. **Monitor Conversions**: Track free → paid upgrades
2. **Gather Feedback**: Survey users on pricing
3. **Add Analytics**: PostHog, Plausible, or similar
4. **Email Marketing**: Drip campaign for free users
5. **Customer Support**: Set up Intercom or email support
6. **Iterate Pricing**: A/B test different price points

---

## Contact

For deployment issues, check:
- Vercel logs
- Stripe webhook logs
- Database query logs in Neon
