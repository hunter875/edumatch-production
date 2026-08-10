# Operations Map

Operations docs answer one question: what should the on-call engineer do when
something breaks?

## Runbooks

| Topic | Page |
| --- | --- |
| Troubleshooting | [Troubleshooting Runbook](../08-runbook.md) |
| Observability | [Observability Runbook](../OBSERVABILITY_RUNBOOK.md) |
| DB migrations | [DB Migration Runbook](../DB_MIGRATION_RUNBOOK.md) |
| QA checks | [QA Checklist](../QA_TEST_CHECKLIST.md) |
| Production readiness | [Production Readiness Checklist](../PRODUCTION_READINESS_CHECKLIST.md) |

## First Response Flow

```txt
symptom -> gateway logs -> service logs -> DB/queue/cache checks -> rollback or fix
```

Always capture:

- route or job name
- request ID if available
- status code
- p95/p99 latency
- recent deploy revision
- queue lag if async behavior is involved

## Golden Signals

| Signal | Why It Matters |
| --- | --- |
| request latency | user-facing performance |
| error rate | correctness and stability |
| DB CPU / slow queries | likely bottleneck for growth |
| cache hit rate | burst protection |
| queue lag | async system health |
| container restarts | infra/runtime health |
