# Production Hardening Curriculum

This section explains the gaps that still separate EduMatch from a confident
production-scale system. It is written as learning material first and
implementation guidance second.

Use this section when you want to understand why a scaling issue matters, what
good systems usually do, and how to upgrade EduMatch without adding random
complexity.

## Topics

| Topic | Why It Matters |
| --- | --- |
| [Benchmark 10k/100k Records](benchmark-10k-100k.md) | Capacity claims are weak until p50/p95/p99 are measured on seeded data. |
| [Cloud Replicas And Autoscale](cloud-replicas-autoscale.md) | `minReplicas: 0` causes cold starts and `maxReplicas: 2` caps burst capacity. |
| [CDN, Front Door, And WAF](edge-cdn-front-door-waf.md) | Burst traffic should be absorbed at the edge before it reaches services and DBs. |
| [Versioned Matching Cache](versioned-matching-cache.md) | Score cache must stay fast and correct when profiles or opportunities change. |
| [Matching Worker Full Scan](matching-worker-full-scan.md) | Worker `query.all()` is fine for small data and dangerous for large datasets. |
| [Redis Public Cache And Coalescing](redis-public-cache-coalescing.md) | Popular public reads should become cache hits, not repeated DB queries. |

## Recommended Order

1. Learn and run benchmarks first.
2. Fix obvious app/query bottlenecks found by benchmark.
3. Add Redis cache and request coalescing for public reads.
4. Make matching cache version-aware and idempotent.
5. Replace matching worker full scans with candidate retrieval and chunking.
6. Tune cloud min/max replicas and add an edge layer.

## One Mental Model

Scaling is not one trick. It is pressure control:

```txt
Edge absorbs burst
Gateway shapes traffic
Cache removes repeated reads
Services scale horizontally
Queues isolate slow side effects
DB handles only necessary queries
Benchmarks prove the claim
```

If a request can be answered from CDN or Redis, it should not reach MySQL.
If a task can be done asynchronously, it should not block the user request.
If a score can be cached with a valid version, it should not be recalculated.

## What Counts As Done

- A benchmark report exists for small, medium, and stress datasets.
- Public scholarship list has a measured cache hit rate.
- Gateway and cloud autoscale settings are based on observed p95 latency.
- Matching score cache has a uniqueness rule and version validation.
- Matching workers process candidates in chunks and do not load entire tables.
- Production docs explain how to detect, debug, and roll back each change.
