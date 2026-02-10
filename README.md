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
