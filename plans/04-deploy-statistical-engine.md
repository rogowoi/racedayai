# RaceDayAI — Deploy Plan

Deploy the data-driven statistical engine (840K race records).

---

## 1. Clean up git

```bash
rm -f .git/HEAD.lock

git add \
  docs/ \
  prisma/schema.prisma \
  prisma/migrations/20260212173637_statistical_context/ \
  scripts/analytics/ \
  scripts/scrapers/*.py scripts/scrapers/README.md \
  src/app/actions/generate-plan.ts \
  src/app/dashboard/page.tsx \
  "src/app/plan/[id]/page.tsx" \
  "src/app/share/[token]/page.tsx" \
  src/components/wizard/step-1-fitness.tsx \
  src/components/plan/statistical-insights.tsx \
  src/lib/engine/narrative.ts \
  src/lib/engine/statistics.ts \
  src/lib/engine/course-model.ts \
  src/lib/engine/fade-model.ts \
  src/stores/wizard-store.ts \
  src/data/

git commit -m "feat: data-driven statistical engine backed by 840K race records"
```

## 2. Generate Prisma client & migrate

```bash
npx prisma generate
npx prisma migrate dev --name add-statistical-context
```

## 3. Verify locally

```bash
npx tsc --noEmit          # should be 0 errors
npm run build             # full Next.js production build
npm run dev               # smoke-test: create a plan with gender + age filled in
```

## 4. Push & deploy

```bash
git push origin main
```

Vercel auto-deploys on push. `postinstall` runs `prisma generate` during build.

## 5. Run production migration

```bash
# Set your production DATABASE_URL, then:
npx prisma migrate deploy
```

## 6. Verify in prod

- Create a new race plan with gender + age
- Confirm statistical insights card appears on plan page
- Confirm AI narrative references course difficulty / fade prediction

---

**Do NOT commit:** `creds.json`, `Half_Ironman_df6.csv`, `.claude/`, `__pycache__/`
