# RaceDayAI Documentation

This folder contains technical references and architecture documentation for the RaceDayAI project.

## Directory Structure

```
docs/
├── technical/          # Technical architecture and ML pipeline
├── deployment/         # Production deployment guides
├── seo/                # SEO strategy and implementation
└── strategy/           # Business strategy and positioning
```

---

## Technical Documentation

### Machine Learning
- [**ML_PIPELINE.md**](technical/ML_PIPELINE.md) - Complete ML pipeline guide (training + inference)
  - Python training scripts (ETL, model training, export)
  - TypeScript inference engine
  - Vercel Blob deployment
  - Inngest integration

- [**VERCEL_BLOB.md**](technical/VERCEL_BLOB.md) - Model serving via Vercel Blob
  - Setup instructions and configuration
  - Model versioning and rollback
  - Performance optimization
  - Cost estimates

### System Architecture
- [**DATA_DRIVEN_PLAN.md**](technical/DATA_DRIVEN_PLAN.md) - Statistical engine specification
  - Architecture for race predictions
  - Data models and analytics pipeline
  - Implementation strategy

- [**RACE_SEARCH_PLAN.md**](technical/RACE_SEARCH_PLAN.md) - Race catalog management
  - Race search functionality
  - Catalog management system
  - Database schema

---

## Deployment & Operations

- [**DEPLOYMENT.md**](deployment/DEPLOYMENT.md) - Production deployment checklist
  - Stripe configuration
  - Environment variables
  - Strava OAuth setup
  - Monitoring and alerts

- [**CLOUDFLARE_405_ISSUE.md**](deployment/CLOUDFLARE_405_ISSUE.md) - Resolved WAF issue (reference)

---

## SEO & Growth

- [**SEO_FOUNDATION.md**](seo/SEO_FOUNDATION.md) - Technical SEO implementation ✅
  - robots.txt and sitemap
  - Metadata and schema markup
  - Completed Feb 2026

- [**SEO_ACTION_PLAN.md**](seo/SEO_ACTION_PLAN.md) - Growth strategy
  - Week-by-week checklist (Month 1-3)
  - Google Search Console setup
  - Content calendar and pillar pages

---

## Strategy & Positioning

- [**BRAND_STRATEGY.md**](strategy/BRAND_STRATEGY.md) - Conversion playbook
  - Brand positioning
  - Color psychology
  - Pricing strategy
  - Psychological triggers

- [**PROJECT_OVERVIEW.md**](strategy/PROJECT_OVERVIEW.md) - Project viability analysis
  - Competitive landscape
  - Break-even analysis
  - Market positioning

---

## Related Documentation

- [Plans Directory](../plans/) - Numbered execution plans (Plans 04-12)
- [Current Status](../CURRENT_STATUS.md) - Weekly sprint updates
- [Roadmap](../ROADMAP.md) - Product roadmap and milestones
- [Archive](../archive/) - Completed work and historical reviews

---

For execution plans and active work items, see the [plans/](../plans/) folder at the project root.
