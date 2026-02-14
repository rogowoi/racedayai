# RaceDayAI Product Roadmap

**Last Updated:** February 14, 2026

## Overview

This roadmap outlines the technical evolution of RaceDayAI from current state through advanced prediction capabilities. Plans are organized by priority and dependency chains.

---

## 🎯 Phase 1: Foundation & Polish (Current)

### ✅ Completed
- [x] Homepage and marketing pages
- [x] Legal pages (Privacy, Terms)
- [x] Stripe billing integration
- [x] Race catalog analysis (195 venues)
- [x] Basic race prediction UI
- [x] Strava OAuth integration
- [x] SEO foundation (robots.txt, sitemap, schema)
- [x] PostHog analytics integration

### 🚧 In Progress

**Plan 11: Mobile UX Fixes** ⚠️ **CRITICAL**
- **Priority:** P0 (Blocking launch)
- **Effort:** 2-3 days
- **Issues:** 11 identified bugs (5 critical, 4 high, 2 medium)
- **Link:** [plans/11-mobile-ux-fixes.md](plans/11-mobile-ux-fixes.md)
- **Status:** QA complete, fixes pending

**Plan 12: Email Verification**
- **Priority:** P1 (Security & UX)
- **Effort:** 1-2 days
- **Dependencies:** None (DB schema ready)
- **Link:** [plans/12-email-verification.md](plans/12-email-verification.md)
- **Status:** Planned, not started

---

## 📊 Phase 2: Statistical Engine Deployment

### Plan 04: Deploy Statistical Engine
- **Priority:** P1
- **Effort:** 1 day
- **Scope:** Deploy 840K race records to production database
- **Dependencies:** None
- **Link:** [plans/04-deploy-statistical-engine.md](plans/04-deploy-statistical-engine.md)
- **Deliverables:**
  - Database migration for race results
  - Data upload scripts
  - Performance validation

### Plan 05: Architecture Evolution
- **Priority:** P1
- **Effort:** 3-5 days
- **Scope:** Migrate from static JSON predictions → DB-backed with Inngest
- **Dependencies:** Plan 04 must complete first
- **Link:** [plans/05-architecture-evolution.md](plans/05-architecture-evolution.md)
- **Deliverables:**
  - Inngest functions for async prediction generation
  - Database schema for predictions cache
  - Migration path from current static system

---

## 🤖 Phase 3: Advanced Predictions

### Plan 06: Hybrid Prediction Engine
- **Priority:** P2
- **Effort:** 5-7 days
- **Scope:** Combine statistical percentiles with ML models
- **Dependencies:** Plans 04-05
- **Link:** [plans/06-hybrid-prediction-engine.md](plans/06-hybrid-prediction-engine.md)
- **Deliverables:**
  - Hybrid scoring algorithm
  - Confidence intervals
  - A/B testing framework

### Plan 07: ML Prediction Engine
- **Priority:** P2
- **Effort:** 7-10 days
- **Scope:** Full XGBoost model integration for all race types
- **Dependencies:** Plan 06 (testing framework)
- **Link:** [plans/07-ml-prediction-engine.md](plans/07-ml-prediction-engine.md)
- **Deliverables:**
  - Model serving infrastructure
  - Feature engineering pipeline
  - Prediction API endpoints

---

## 🔬 Phase 4: Research & Advanced Models (Future)

### Plan 08: Advanced Models
- **Priority:** P3 (Research)
- **Effort:** 10-15 days
- **Scope:** Deep learning, weather integration, course topology
- **Dependencies:** Plan 07 complete + production data
- **Link:** [plans/08-advanced-models-future.md](plans/08-advanced-models-future.md)
- **Research Areas:**
  - Neural networks for complex patterns
  - Weather API integration
  - Elevation/terrain analysis
  - Training plan analysis

### Plan 09: Future Recommendations
- **Priority:** P3 (R&D)
- **Effort:** Ongoing research
- **Scope:** Experimental features and production pipeline optimization
- **Dependencies:** Production traffic and user feedback
- **Link:** [plans/09-recommendations-future.md](plans/09-recommendations-future.md)
- **Topics:**
  - User personalization
  - Race recommendations
  - Training insights
  - Performance tracking

### Plan 10: Production Implementation Strategy
- **Priority:** P2 (Process)
- **Effort:** 3-5 days
- **Scope:** Production ML pipeline and monitoring
- **Dependencies:** Plan 07
- **Link:** [plans/10-production-prediction-implementation-plan.md](plans/10-production-prediction-implementation-plan.md)
- **Deliverables:**
  - Model versioning strategy
  - A/B testing infrastructure
  - Monitoring and alerting
  - Rollback procedures

---

## 📈 Milestone Summary

| Milestone | Plans | Target Completion | Status |
|-----------|-------|-------------------|--------|
| **Launch Ready** | 11-12 | Feb 2026 | 🚧 In Progress |
| **Statistical Engine** | 04-05 | Mar 2026 | ⏸️ Planned |
| **Hybrid Predictions** | 06-07 | Apr 2026 | ⏸️ Planned |
| **Advanced R&D** | 08-10 | May+ 2026 | 📝 Research |

---

## 🎯 Success Metrics by Phase

### Phase 1 (Foundation)
- ✅ Zero critical bugs in mobile experience
- ✅ Email verification rate > 95%
- ✅ Payment conversion rate baseline established

### Phase 2 (Statistical Engine)
- 🎯 Query performance < 200ms for predictions
- 🎯 95% coverage of US triathlon races
- 🎯 Database scales to 1M+ race results

### Phase 3 (Advanced Predictions)
- 🎯 Prediction accuracy within ±5% of actual finish time
- 🎯 User confidence score > 4/5
- 🎯 Model latency < 500ms

### Phase 4 (Research)
- 🎯 New model performance beats baseline by 10%+
- 🎯 User engagement with advanced features > 60%
- 🎯 Zero ML infrastructure incidents

---

## 🔗 Related Documentation

- [Current Status](CURRENT_STATUS.md) - Weekly sprint updates
- [Plans Directory](plans/) - Detailed implementation plans
- [Technical Docs](docs/technical/) - Architecture and ML guides
- [Deployment Guide](docs/deployment/DEPLOYMENT.md) - Production setup

---

## Notes

- **Critical Path:** Plan 11 must complete before marketing launch
- **Architecture Decision:** Plans 04-05 represent major system evolution
- **Research Nature:** Plans 08-10 are experimental; timelines are estimates
- **User Feedback Loop:** Phase 3 success depends on production data from Phase 2
