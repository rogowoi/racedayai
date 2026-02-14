# Plans & Execution Documents

This folder contains chronologically-numbered execution plans and work items for the RaceDayAI project.

## Naming Convention

- **Format:** `XX-description.md` where `XX` is a zero-padded sequence number
- **Completed items:** Moved to [archive/completed/](../archive/completed/)
- **Active/Planned items:** Remain in this directory

---

## Status Dashboard

### 🚧 In Progress (Critical)

| Plan | Title | Priority | Status |
|------|-------|----------|--------|
| **12** | [Email Verification](12-email-verification.md) | P1 | 📝 Planned |

### ⏸️ Planned (Phase 2: Statistical Engine)

| Plan | Title | Dependencies | Est. Effort |
|------|-------|--------------|-------------|
| **04** | [Deploy Statistical Engine](04-deploy-statistical-engine.md) | None | 1 day |
| **05** | [Architecture Evolution](05-architecture-evolution.md) | Plan 04 | 3-5 days |

### 🔬 Planned (Phase 3: Advanced Predictions)

| Plan | Title | Dependencies | Est. Effort |
|------|-------|--------------|-------------|
| **06** | [Hybrid Prediction Engine](06-hybrid-prediction-engine.md) | Plans 04-05 | 5-7 days |
| **07** | [ML Prediction Engine](07-ml-prediction-engine.md) | Plan 06 | 7-10 days |

### 🧪 Research (Phase 4: Future Work)

| Plan | Title | Dependencies | Type |
|------|-------|--------------|------|
| **08** | [Advanced Models (Future)](08-advanced-models-future.md) | Plan 07 + production data | Research |
| **09** | [Recommendations & Experiments](09-recommendations-future-experiments-and-production-pipeline.md) | Production traffic | R&D |
| **10** | [Production Implementation Strategy](10-production-prediction-implementation-plan.md) | Plan 07 | Process |

---

## Completed Work

Completed plans have been moved to [archive/completed/](../archive/completed/):

- **01-billing-audit-completed.md** - Billing system audit (completed Feb 12)
- **03-race-catalog-analysis-completed.md** - 195-venue catalog analysis (completed Feb 12)
- **11-mobile-ux-fixes.md** - Mobile UX fixes completed (completed Feb 14)
- **ds-implementation-ideas.md** - Data science implementation concepts (reference)

---

## Quick Links

- [Current Status](../CURRENT_STATUS.md) - Weekly sprint updates
- [Roadmap](../ROADMAP.md) - High-level product roadmap
- [Technical Docs](../docs/) - Architecture and implementation guides
- [Archive](../archive/) - Completed work and historical reviews

---

For technical references and architecture documentation, see the [docs/](../docs/) folder.
