# Documentation Inventory

This page explains which EduMatch documents are canonical, which are operational
runbooks, and which are historical or supporting references.

The goal is to keep the docs useful without deleting valuable notes.

## Reading Path

For a new engineer or reviewer, read in this order:

1. [Documentation Home](index.md)
2. [Architecture Map](architecture/index.md)
3. [Matching Design](04-matching-design.md)
4. [Deployment Map](deployment/index.md)
5. [Operations Map](operations/index.md)
6. [Performance Map](performance/index.md)
7. [Production Hardening Curriculum](learning/production-hardening/index.md)

## Status Labels

| Status | Meaning |
| --- | --- |
| Canonical | Current source of truth for the topic. |
| Runbook | Operational steps used during deploy/debug/incidents. |
| Report | Time-bound analysis or investigation. Useful, but may become stale. |
| Reference | Supporting detail, checklist, or learning material. |
| Archive Candidate | Keep for now, but do not treat as current truth without review. |

## Canonical Docs

| Document | Status | Purpose |
| --- | --- | --- |
| [index.md](index.md) | Canonical | Docs landing page and reading path. |
| [00-overview.md](00-overview.md) | Canonical | Project goals, current architecture, and health definition. |
| [01-system-architecture.md](01-system-architecture.md) | Canonical | Service architecture and tradeoffs. |
| [02-api-contract.md](02-api-contract.md) | Canonical | API contract and expected behavior. |
| [03-data-model.md](03-data-model.md) | Canonical | Data ownership, indexes, and schema responsibilities. |
| [04-matching-design.md](04-matching-design.md) | Canonical | Matching strategy, hard filters, cache, workers, AI phases. |
| [06-data-flow.md](06-data-flow.md) | Canonical | Main sync and async workflows. |

## Deployment And Operations

| Document | Status | Purpose |
| --- | --- | --- |
| [07-deployment.md](07-deployment.md) | Runbook | Local and cloud deployment path. |
| [08-runbook.md](08-runbook.md) | Runbook | Troubleshooting symptoms and fixes. |
| [OBSERVABILITY_RUNBOOK.md](OBSERVABILITY_RUNBOOK.md) | Runbook | Logs, metrics, traces, and Application Insights. |
| [DB_MIGRATION_RUNBOOK.md](DB_MIGRATION_RUNBOOK.md) | Runbook | Migration handling and safety checks. |
| [DEPLOY_CONTROL_RUNBOOK.md](DEPLOY_CONTROL_RUNBOOK.md) | Runbook | Deployment control and rollback notes. |
| [CLOUD_DEPLOYMENT_GUIDE.md](CLOUD_DEPLOYMENT_GUIDE.md) | Runbook | Azure Container Apps deployment guide. |
| [CLOUD_DEPLOYMENT_MAINTENANCE_RUNBOOK.md](CLOUD_DEPLOYMENT_MAINTENANCE_RUNBOOK.md) | Runbook | Cloud staging maintenance. |

## Performance And Hardening

| Document | Status | Purpose |
| --- | --- | --- |
| [05-performance-playbook.md](05-performance-playbook.md) | Canonical | How to find and prove performance fixes. |
| [SYSTEM_PERFORMANCE_REVIEW.md](SYSTEM_PERFORMANCE_REVIEW.md) | Report | Snapshot of known bottlenecks and fixes. |
| [DB_OPTIMIZATION_REPORT.md](DB_OPTIMIZATION_REPORT.md) | Report | Database optimization review. |
| [CACHE_LAYER_OPTIMIZATION_GUIDE.md](CACHE_LAYER_OPTIMIZATION_GUIDE.md) | Reference | Cache strategy and implementation guidance. |
| [09-optimization-roadmap.md](09-optimization-roadmap.md) | Reference | Optimization roadmap and priorities. |
| [learning/production-hardening/index.md](learning/production-hardening/index.md) | Reference | Learning path for benchmark, autoscale, cache, and worker hardening. |

## Quality And Product Support

| Document | Status | Purpose |
| --- | --- | --- |
| [QA_TEST_CHECKLIST.md](QA_TEST_CHECKLIST.md) | Reference | Manual QA checklist. |
| [PRODUCTION_READINESS_CHECKLIST.md](PRODUCTION_READINESS_CHECKLIST.md) | Reference | Production readiness checklist. |
| [FE_QC_EDGE_CASE_REVIEW.md](FE_QC_EDGE_CASE_REVIEW.md) | Report | Frontend edge-case review. |
| [API_STANDARDIZATION_GUIDE.md](API_STANDARDIZATION_GUIDE.md) | Reference | API standardization guidance. |
| [SEED_DATA.md](SEED_DATA.md) | Reference | Seed data notes. |

## Decision Records

| Document | Status | Purpose |
| --- | --- | --- |
| [decisions/index.md](decisions/index.md) | Canonical | ADR index and template. |
| [SEARCH_ARCHITECTURE_DECISION.md](SEARCH_ARCHITECTURE_DECISION.md) | Canonical | Search architecture decision. |
| [decisions/0001-rule-based-matching-first.md](decisions/0001-rule-based-matching-first.md) | Canonical | Matching strategy decision. |
| [decisions/0002-container-apps-first.md](decisions/0002-container-apps-first.md) | Canonical | Cloud runtime decision. |

## Archive Candidates

These are useful, but should not be read first:

| Document | Reason |
| --- | --- |
| [CLOUD_STAGING_PERFORMANCE_INCIDENT_REPORT.md](CLOUD_STAGING_PERFORMANCE_INCIDENT_REPORT.md) | Historical incident/report. |
| `docs/cv/*` | Portfolio artifacts, not system documentation. |

## Maintenance Rules

- Every new doc must have a clear type: canonical, runbook, report, reference, or archive candidate.
- Reports should include date, environment, commit, and whether the findings are still current.
- Canonical docs should stay short enough to read and link to details instead of duplicating everything.
- Runbooks should be action-oriented and command-heavy.
- Do not delete old reports just because they are stale; mark them as reports or archive candidates.
- Update this inventory when adding or retiring a document.
