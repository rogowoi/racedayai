# RaceDayAI — Your AI Race Execution Coach

Enter your fitness data + race details → get a personalized race-day execution plan with pacing, nutrition, hydration, and real-time weather adjustments.

## Stack

- **Frontend**: Next.js 16 + Tailwind CSS v4 + shadcn/ui
- **Database**: Neon PostgreSQL + Prisma
- **AI**: Claude 3.5 Sonnet (narrative race plan generation)
- **APIs**: Garmin Connect, Strava, Open-Meteo (weather)

## Getting Started

```bash
pnpm install
cp .env.example .env.local
# Fill in DATABASE_URL from Neon console
pnpm db:migrate
pnpm dev
```

## Scripts

| Command           | Description           |
| ----------------- | --------------------- |
| `pnpm dev`        | Start dev server      |
| `pnpm build`      | Production build      |
| `pnpm db:migrate` | Run Prisma migrations |
| `pnpm db:studio`  | Open Prisma Studio    |

## Documentation

### Project Status
- [Current Status](CURRENT_STATUS.md) - Weekly sprint updates and known issues
- [Roadmap](ROADMAP.md) - High-level product roadmap and milestones

### Implementation Plans
- [Plans Directory](plans/) - Numbered execution plans (Plans 04-12)
- [Mobile UX Fixes](plans/11-mobile-ux-fixes.md) - Current critical bugs
- [Email Verification](plans/12-email-verification.md) - Planned security enhancement

### Technical Documentation
- [ML Pipeline Guide](docs/technical/ML_PIPELINE.md) - Complete machine learning pipeline (training + inference)
- [Vercel Blob Deployment](docs/technical/VERCEL_BLOB.md) - Model serving infrastructure
- [Data-Driven Plan](docs/technical/DATA_DRIVEN_PLAN.md) - Statistical engine specification
- [Race Search System](docs/technical/RACE_SEARCH_PLAN.md) - Race catalog management

### Deployment & Operations
- [Deployment Guide](docs/deployment/DEPLOYMENT.md) - Production setup checklist
- [Cloudflare 405 Issue](docs/deployment/CLOUDFLARE_405_ISSUE.md) - Resolved WAF issue (reference)

### Strategy & Marketing
- [Brand Strategy](docs/strategy/BRAND_STRATEGY.md) - Conversion playbook and positioning
- [Project Overview](docs/strategy/PROJECT_OVERVIEW.md) - Competitive analysis and viability

### SEO
- [SEO Foundation](docs/seo/SEO_FOUNDATION.md) - Technical SEO implementation
- [SEO Action Plan](docs/seo/SEO_ACTION_PLAN.md) - Week-by-week growth checklist

### Archive
- [Completed Work](archive/completed/) - Finished plans and audits
- [UX Reviews](archive/reviews/) - Historical mobile and journey reviews
