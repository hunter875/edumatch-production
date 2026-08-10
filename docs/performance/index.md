# Performance Map

Performance work in EduMatch follows one rule:

```txt
No optimization without baseline. No claim without measurement.
```

## Performance Pages

| Topic | Page |
| --- | --- |
| Current review | [System Performance Review](../SYSTEM_PERFORMANCE_REVIEW.md) |
| Debugging playbook | [Performance Playbook](../05-performance-playbook.md) |
| DB optimization | [DB Optimization Report](../DB_OPTIMIZATION_REPORT.md) |
| Cache strategy | [Cache Layer Optimization Guide](../CACHE_LAYER_OPTIMIZATION_GUIDE.md) |
| Roadmap | [Optimization Roadmap](../09-optimization-roadmap.md) |

## Benchmark Scenarios

| Scenario | What It Proves |
| --- | --- |
| public scholarship list | DB index and gateway behavior |
| logged-in scholarship page | frontend fan-out and batch endpoints |
| matching batch score | matching cache and query efficiency |
| recommendation cache hit | read-model latency |
| apply workflow | write transaction and async events |

## Target Budgets

| Path | p95 Target |
| --- | ---: |
| public scholarship list | `<300ms` |
| logged-in scholarship page API group | `<800ms` |
| matching batch, 12-50 ids | `<500ms` |
| recommendation cache hit | `<200ms` |
| error rate under normal load | `<1%` |
