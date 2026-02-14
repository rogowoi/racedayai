# RaceDayAI - Claude Context & Decision History

This file provides context about architectural decisions and motivations for this project. Refer to this when making changes or adding features.

## Documentation Structure

### Current State
- [**CURRENT_STATUS.md**](CURRENT_STATUS.md) - Weekly sprint updates, active bugs, blockers, key metrics
- [**ROADMAP.md**](ROADMAP.md) - Product roadmap with prioritized phases and milestones

### Strategic Decisions
- [**docs/strategy/BRAND_STRATEGY.md**](docs/strategy/BRAND_STRATEGY.md) - Brand positioning, pricing strategy, color psychology, psychological triggers
- [**docs/strategy/PROJECT_OVERVIEW.md**](docs/strategy/PROJECT_OVERVIEW.md) - Competitive analysis, break-even calculations, market viability

### Technical Architecture Decisions
- [**docs/technical/ML_PIPELINE.md**](docs/technical/ML_PIPELINE.md) - Complete ML pipeline: why XGBoost, why TypeScript inference, tier-based imputation strategy
- [**docs/technical/VERCEL_BLOB.md**](docs/technical/VERCEL_BLOB.md) - Model serving: why Vercel Blob vs. bundling vs. R2, performance characteristics
- [**docs/technical/DATA_DRIVEN_PLAN.md**](docs/technical/DATA_DRIVEN_PLAN.md) - Statistical engine architecture and data models
- [**docs/technical/RACE_SEARCH_PLAN.md**](docs/technical/RACE_SEARCH_PLAN.md) - Race catalog management system

### Deployment & Operations
- [**docs/deployment/DEPLOYMENT.md**](docs/deployment/DEPLOYMENT.md) - Production infrastructure, environment variables, monitoring
- [**docs/deployment/CLOUDFLARE_405_ISSUE.md**](docs/deployment/CLOUDFLARE_405_ISSUE.md) - Resolved: Cloudflare WAF blocking POST requests (use direct Vercel URL)

### SEO & Growth
- [**docs/seo/SEO_FOUNDATION.md**](docs/seo/SEO_FOUNDATION.md) - Technical SEO implementation (completed ✅)
- [**docs/seo/SEO_ACTION_PLAN.md**](docs/seo/SEO_ACTION_PLAN.md) - Week-by-week growth strategy

### Implementation Plans (with rationale)
- [**plans/**](plans/) - Numbered execution plans with dependencies and effort estimates
- [**plans/README.md**](plans/README.md) - Status dashboard showing active, planned, and research work
- [**archive/completed/**](archive/completed/) - Historical plans with decision context

---

## Key Architectural Decisions

### 1. Model Serving: Vercel Blob
**Decision:** Use Vercel Blob storage for ML models instead of bundling or R2.

**Motivation:**
- **Size**: 52 models × ~10MB = 488MB total (too large for serverless bundle limit)
- **Deploy speed**: Separating models from code = faster deploys (~2min vs. ~8min)
- **Independent updates**: Can update models without redeploying app
- **Performance**: Acceptable cold start (~150ms from Blob vs. <10ms bundled but deploy issues)
- **Cost**: ~$5-10/month with caching vs. R2 setup complexity

**See:** [docs/technical/VERCEL_BLOB.md](docs/technical/VERCEL_BLOB.md)

---

### 2. ML Inference: Pure TypeScript
**Decision:** Implement XGBoost inference in TypeScript instead of calling Python models.

**Motivation:**
- **Serverless compatibility**: No Python runtime needed in Vercel functions
- **Cold start**: TypeScript inference + Blob loading = 150-500ms (acceptable)
- **Type safety**: Full type checking across prediction pipeline
- **Maintenance**: Single language stack for web app
- **Trade-off**: Had to implement tree traversal logic, but models are simple decision trees

**See:** [docs/technical/ML_PIPELINE.md](docs/technical/ML_PIPELINE.md)

---

### 3. Tier-Based Imputation (Cold Start)
**Decision:** Use 6-tier system (0-5) for feature imputation based on data availability.

**Motivation:**
- **Tier 0-1**: New users with no history → Use cohort medians (gender + age)
- **Tier 2**: One prior race → Distance transfer learning
- **Tier 3**: Fitness metrics (FTP, weight) → Physics-based estimates
- **Tier 5**: Multiple races → Full race history analysis
- **Why**: Enables predictions for cold-start users while maintaining quality for experienced athletes

**See:** [docs/technical/ML_PIPELINE.md#imputation](docs/technical/ML_PIPELINE.md) (imputation.ts section)

---

### 4. Database: Neon PostgreSQL with Pooler
**Decision:** Use Neon PostgreSQL with pooler endpoint for serverless connections.

**Motivation:**
- **Serverless-first**: Pooler endpoint handles connection pooling for Vercel functions
- **Direct endpoint**: Use for migrations only (not serverless)
- **Separate projects**: Each indie project gets own Neon project (never share DBs)
- **Cost**: Generous free tier, scales with usage

**See:** [docs/deployment/DEPLOYMENT.md](docs/deployment/DEPLOYMENT.md)

---

### 5. Background Jobs: Inngest
**Decision:** Use Inngest for ML predictions and async processing.

**Motivation:**
- **Prediction latency**: ML inference takes 2-10s depending on cold start
- **User experience**: Immediate response, prediction runs in background
- **Retries**: Built-in retry logic for failed predictions
- **Monitoring**: Inngest dashboard for job tracking
- **Future**: Will use for scheduled model retraining

**See:** [docs/technical/ML_PIPELINE.md](docs/technical/ML_PIPELINE.md) (Inngest section)

---

### 6. Pricing Strategy: Freemium with Annual Push
**Decision:** Free tier with limited plans, $10/mo or $96/yr ($8/mo) for unlimited.

**Motivation:**
- **Free tier**: 1 active plan → lets users try before buying
- **Monthly option**: $10/mo for flexibility (higher LTV if retained)
- **Annual discount**: 20% off ($96/yr) to lock in revenue upfront
- **Psychology**: Annual framing as "$8/mo when billed annually" emphasizes savings

**Critical Bug Fixed:** Pricing page toggle (monthly/annual) was crashing → Plan 01 audit found and fixed

**See:** [docs/strategy/BRAND_STRATEGY.md](docs/strategy/BRAND_STRATEGY.md)

---

### 7. SEO Foundation (Completed)
**Decision:** Implement basic technical SEO before marketing launch.

**Completed:**
- ✅ robots.txt and XML sitemap
- ✅ Metadata (title, description, OG tags)
- ✅ Schema.org markup (Organization, SportsEvent)
- ✅ Google Search Console setup

**Next:** Content marketing (pillar pages, blog) via SEO_ACTION_PLAN

**See:** [docs/seo/SEO_FOUNDATION.md](docs/seo/SEO_FOUNDATION.md)

---

## Current Focus (As of Feb 14, 2026)

### P0 - Critical (Blocking Launch)
- **Mobile UX Fixes** - 11 bugs identified in comprehensive testing
  - Pricing page toggle crash (B1)
  - Save button validation issues (B2)
  - Race calendar navigation (B3)
  - See: [plans/11-mobile-ux-fixes.md](plans/11-mobile-ux-fixes.md)

### P1 - High Priority
- **Email Verification** - Security enhancement (DB schema ready)
  - See: [plans/12-email-verification.md](plans/12-email-verification.md)

### Future Phases
- **Phase 2**: Statistical Engine Deployment (Plans 04-05)
- **Phase 3**: Hybrid + ML Prediction Engine (Plans 06-07)
- **Phase 4**: Advanced Models & Research (Plans 08-10)

**See:** [ROADMAP.md](ROADMAP.md) for complete timeline

---

## Quick Reference: File Organization

```
/
├── CURRENT_STATUS.md          # Weekly updates
├── ROADMAP.md                 # Product roadmap
├── README.md                  # Project overview + nav
├── CLAUDE.md                  # This file
│
├── docs/
│   ├── technical/             # ML, architecture, data
│   ├── deployment/            # Production setup
│   ├── seo/                   # SEO strategy
│   └── strategy/              # Brand, positioning
│
├── plans/                     # Numbered execution plans
│   ├── 04-deploy-statistical-engine.md
│   ├── 11-mobile-ux-fixes.md
│   └── ...
│
├── archive/
│   ├── completed/             # Finished plans
│   └── reviews/               # UX review history
│
└── research/                  # Python ML training scripts
    ├── scripts/               # ETL, train_models.py, export
    └── notebooks/             # Jupyter notebooks (NB01-08)
```

---

## Tips for Working on RaceDayAI

1. **Before making changes**: Check CURRENT_STATUS.md for known issues
2. **Before adding features**: Check ROADMAP.md for planned work (avoid duplicates)
3. **Technical questions**: Check docs/technical/ for architecture decisions
4. **ML changes**: Read ML_PIPELINE.md first (training + inference flow)
5. **Deployment**: Review DEPLOYMENT.md for env vars and production setup
6. **Bugs**: Check if already tracked in plans/11-mobile-ux-fixes.md
7. **Dependencies**: Always install and commit package.json + pnpm-lock.yaml changes when adding new dependencies. Don't assume packages are already installed.

---

**Last Updated:** February 14, 2026
