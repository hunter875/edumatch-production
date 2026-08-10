# Benchmark 10k/100k Records

## Purpose

EduMatch should not claim it can handle thousands of users without a benchmark.
A benchmark turns a vague scaling claim into numbers:

```txt
dataset size -> traffic scenario -> p50/p95/p99 -> error rate -> bottleneck
```

For this project, the important benchmark sizes are:

| Dataset | Purpose |
| --- | --- |
| 10k opportunities | proves normal search/list pages do not fall apart |
| 100k opportunities | proves indexes, pagination, cache, and gateway are realistic |
| 1M applications/bookmarks | tests user-specific status endpoints and analytics pressure |

## What To Measure

Do not measure only average latency. Average hides bad user experience.

Measure:

- `p50`: median, normal user experience
- `p95`: slow but common enough to matter
- `p99`: tail latency and burst pressure signal
- error rate: failed requests divided by total requests
- throughput: requests per second
- cache hit rate
- DB CPU and slow queries
- queue lag for async workers

Target table:

| Endpoint | p95 Target |
| --- | ---: |
| public scholarship list | `<300ms` |
| logged-in scholarship page API group | `<800ms` |
| matching batch, 12-50 ids | `<500ms` |
| recommendation cache hit | `<200ms` |
| apply workflow | `<700ms` for request, async side effects later |

## EduMatch Scenarios

### Scenario 1: Public Scholarship Search

Simulates anonymous users browsing scholarships.

```txt
GET /api/scholarships?isPublic=true&page=0&size=12
GET /api/scholarships?isPublic=true&q=ai&page=0&size=12
GET /api/scholarships?isPublic=true&level=MASTER&page=0&size=12
```

This tests:

- MySQL filtering
- full-text search index
- pagination
- gateway routing
- Redis/CDN cache if enabled

### Scenario 2: Logged-In Scholarship Page

One page load should be roughly:

```txt
GET /api/scholarships
POST /api/applications/my/statuses
GET or POST bookmark statuses
POST /api/v1/matching/batch-scores
```

This tests:

- request fan-out
- auth overhead
- batch endpoints
- matching cache
- Redis user lookup cache

### Scenario 3: Matching Batch

```txt
POST /api/v1/matching/batch-scores
body: applicantId + 12/50/100 opportunityIds
```

This tests:

- matching score cache
- one applicant query
- one opportunity `IN (...)` query
- cache write transaction

### Scenario 4: Recommendation Cache Hit

```txt
GET /api/v1/recommendations/applicant/{id}?limit=10&page=1
```

This must read `recommendation_cache`, not scan all opportunities.

### Scenario 5: Apply Workflow

```txt
POST /api/applications
```

This tests:

- duplicate application constraint
- transaction time
- async event publishing
- cache invalidation side effects

## Tool Options

Use one of these:

| Tool | Best For |
| --- | --- |
| k6 | HTTP load testing with good summary output |
| autocannon | quick Node.js API load testing |
| Locust | user-flow simulation in Python |
| JMeter | heavy GUI-style test plans |

For EduMatch, use `k6` first. It is simple and professional enough.

## Example k6 Script

Create `scripts/load-test-scholarships.js` later:

```javascript
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    public_browse: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 200 },
        { duration: "30s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:19080";

export default function () {
  const response = http.get(
    `${BASE_URL}/api/scholarships?isPublic=true&page=0&size=12`
  );

  check(response, {
    "status is 200": (r) => r.status === 200,
    "body is not empty": (r) => r.body && r.body.length > 0,
  });

  sleep(1);
}
```

Run:

```powershell
k6 run -e BASE_URL=http://localhost:19080 scripts/load-test-scholarships.js
```

## Benchmark Report Template

Create reports under `docs/performance/reports/`.

```md
# Benchmark Report: <scenario>

Date:
Commit:
Environment:
Dataset:

## Setup

- service replicas:
- DB size:
- cache enabled:
- tool:
- command:

## Results

| Metric | Value |
| --- | ---: |
| RPS | |
| p50 | |
| p95 | |
| p99 | |
| error rate | |
| cache hit rate | |

## Observations

## Bottleneck

## Next Fix
```

## How To Interpret Results

If p95 is high but DB CPU is low:

- gateway timeout or service thread pool may be the issue
- service-to-service calls may be slow
- frontend may be firing too many requests

If DB CPU is high:

- missing index
- query scanning too many rows
- count query is expensive
- cache miss rate is high

If p99 is terrible but p50 is fine:

- burst pressure
- connection pool exhaustion
- cold starts
- lock contention

If error rate increases as users increase:

- service replicas are too low
- DB connections are exhausted
- gateway rate limits are too strict or too loose
- downstream service timeout is cascading

## AI Handoff Prompt

Use this prompt with another AI:

```txt
You are reviewing EduMatch benchmark readiness.
Read docs/learning/production-hardening/benchmark-10k-100k.md,
docs/05-performance-playbook.md, and docs/SYSTEM_PERFORMANCE_REVIEW.md.
Create k6 scripts for:
1. public scholarship list
2. logged-in scholarship page API group
3. matching batch scores
4. recommendation cache hit
Also create docs/performance/reports/<date>-baseline.md with p50/p95/p99 tables.
Do not change application behavior yet.
```
