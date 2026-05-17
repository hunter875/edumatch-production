# Production Readiness Checklist

Ngay ghi nhan: 2026-05-13

Tai lieu nay bien cac missing pieces quan trong thanh checklist co the thuc thi. Muc tieu khong phai lam he thong "enterprise qua da", ma la biet ro nhung lop nao bat buoc co neu EduMatch muon chay production-like.

## 1. Priority map

| Priority | Item | Trang thai hien tai | Ly do |
| --- | --- | --- | --- |
| P0 | Read model strategy | Can thiet ke ro hon | Giam query phuc tap, tranh OLTP DB bi dung lam feed/analytics engine |
| P0 | Consistency model declaration | Chua khai bao day du | Microservice can noi ro strong vs eventual consistency |
| P0 | Idempotency strategy | Chua co rule chung | Chong double apply/retry duplicate |
| P0 | API performance budget | Chua co budget chinh thuc | Co target thi moi toi uu dung |
| P1 | Rate limit strategy | Chua define cu the trong runtime | Bao ve matching/recommendation/batch APIs |

## 2. P0 - Read model strategy

### Goal

API hot paths khong doc truc tiep nhieu bang normalized moi request neu response la feed/card/dashboard.

### Target architecture

```txt
Write Model (normalized service DB)
        ↓ domain event / worker
Read Model (denormalized table/cache)
        ↓
API response
```

### Required read models

| Read model | Owner service | Source events | Main API |
| --- | --- | --- | --- |
| `scholarship_card_view` | scholarship-service | scholarship created/updated/moderated/deleted | public scholarship list |
| `user_application_status_view` | scholarship-service | application created/status updated/deleted | application status batch |
| `user_bookmark_status_view` | scholarship-service | bookmark toggled/deleted | bookmark status batch |
| `recommendation_feed_view` | matching-service | profile updated, scholarship approved/updated, application/bookmark changed | recommendation API |
| `provider_analytics_view` | scholarship-service | scholarship/application changed | provider dashboard |
| `admin_stats_view` | scholarship-service/auth-service | user/scholarship/application changed | admin dashboard |

### Done criteria

- Each read model has owner service.
- Each read model can be rebuilt from source-of-truth tables.
- Each read model has trigger events documented.
- API hot path reads read model/cache first.
- Cache/read model miss does not full-scan all large tables in request path.

### First implementation candidate

Start with:

```txt
recommendation_feed_view / recommendation_cache
scholarship_card_view
```

Reason:

- Recommendation already has `recommendation_cache`.
- Scholarship list is high-traffic and easiest to measure.

## 3. P0 - Consistency model declaration

### Goal

Tat ca developer biet khi nao du lieu phai cap nhat ngay, khi nao chap nhan stale vai giay.

### System rule

```txt
Writes inside one service database are strongly consistent.
Cross-service projections, notifications, analytics, and recommendation feeds are eventually consistent.
Normal propagation target: under 5 seconds.
```

### Flow guarantees

| Flow | Guarantee |
| --- | --- |
| Submit application | Strong in scholarship DB |
| My applications after submit | Strong, must show immediately |
| Application status batch | Strong enough for UX, read from scholarship DB/read model |
| Recommendation feed after apply/bookmark | Eventual, may be stale under 5 seconds |
| Provider analytics | Eventual or TTL cache |
| Admin stats | Eventual or TTL cache |
| Notifications | Eventual |
| Matching score cache | Eventual, invalidated by profile/opportunity version |

### Done criteria

- Architecture docs state consistency rules.
- UI flows know which data is optimistic vs eventually refreshed.
- Events include enough identifiers to refresh affected read models.
- QA checklist includes stale-data scenarios.

## 4. P0 - Idempotency strategy

### Goal

Retry cua browser/mobile/gateway khong tao duplicate command.

### Rule

```txt
POST commands MUST support idempotency when duplicate execution can change state incorrectly.
```

### Header

```txt
Idempotency-Key: <uuid>
```

### Required endpoints

| Endpoint/command | Required behavior |
| --- | --- |
| `POST /api/v1/applications` | Same key/body returns same application result |
| document upload | Same key/body does not create duplicate document |
| future payment-like commands | Same key/body does not charge/process twice |
| status/moderation command | Retry returns final command result, does not duplicate side effects |
| event consumers | Duplicate event is ignored or upserted safely |

### Storage rule

Store:

```txt
idempotency_key
request_hash
response_status
response_body/reference_id
created_at
expires_at
user_id
```

### Conflict rule

```txt
Same key + same body  -> return original result
Same key + different body -> 409 CONFLICT
```

### DB safety net

Minimum constraints:

```txt
applications: unique(applicant_user_id, opportunity_id)
bookmarks: unique(applicant_user_id, opportunity_id)
```

Even with idempotency, constraints are still needed as the final guard.

### Done criteria

- Duplicate apply cannot create two applications.
- Retry after timeout returns a stable result.
- Same idempotency key with different payload returns 409.
- Event consumers tolerate duplicated events.

## 5. P0 - API performance budget

### Goal

Toi uu theo target, khong toi uu cam tinh.

### Initial budgets

| Endpoint/flow | P95 target |
| --- | --- |
| Public scholarship list | `<150ms` through gateway |
| Scholarship detail | `<150ms` public detail path |
| Batch bookmark/application status | `<80ms` |
| Batch matching scores for 12 cards | `<500ms` mixed cache/compute |
| Recommendation cache hit | `<200ms` |
| Provider analytics | `<300ms` from cache/read model |
| Admin stats | `<300ms` |
| Login/current user | `<200ms` |

### Measurement rule

Measure with:

```txt
load-test data
gateway endpoint
warm runs
p50/p95/p99
error rate
DB query plan for slow endpoints
```

### Done criteria

- Hot endpoint list exists.
- Each hot endpoint has p95 budget.
- Benchmark command/result is recorded.
- Any endpoint over budget has owner and next action.

## 6. P1 - Rate limit strategy

### Goal

Bao ve hot APIs, dac biet matching/recommendation/batch endpoints.

### Initial limits

| API/client | Limit |
| --- | --- |
| Anonymous public browse | `60 req/min/IP` |
| Authenticated normal API | `300 req/min/user` |
| Auth/login sensitive endpoints | `10 req/min/IP` |
| Batch matching scores | `30 req/min/user`, max `50 opportunityIds/request` |
| Recommendations | `30 req/min/user` |
| Admin analytics | `60 req/min/admin` |
| File upload | `10 req/min/user` |

### 429 response

```json
{
  "timestamp": "2026-05-13T12:00:00Z",
  "status": 429,
  "code": "RATE_LIMITED",
  "message": "Too many requests",
  "path": "/api/v1/matching/batch-scores"
}
```

Headers:

```txt
Retry-After: 30
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1760000000
```

### Responsibility split

| Layer | Responsibility |
| --- | --- |
| Gateway | Coarse IP/user/path limits |
| Service | Domain-specific validation, e.g. max batch size |
| Matching service | Protect CPU-heavy score/recommendation endpoints |
| Auth service | Protect login/register/password flows |

### Done criteria

- Gateway has rate limit policy for public/auth/matching routes.
- Matching batch rejects too many IDs.
- 429 response follows standard error shape.
- Rate-limit metrics are visible in logs/dashboard.

## 7. Execution order

### Step 1 - Document and align

- Add this checklist to architecture review.
- Link it from API and performance docs.
- Agree on initial budgets and consistency target.

### Step 2 - Add guardrails

- Add unique constraints for application/bookmark duplicates.
- Define idempotency table/behavior for `POST /applications`.
- Add max batch size validation for matching score endpoint.

### Step 3 - Build first read models

- Use existing `recommendation_cache` as first production-style read model.
- Design `scholarship_card_view` for public list.
- Add rebuild scripts/jobs for read models.

### Step 4 - Add performance checks

- Measure p95 through gateway using load-test data.
- Record baseline in docs.
- Add warning threshold for endpoints above budget.

### Step 5 - Add gateway/service rate limits

- Start with matching/recommendation/auth.
- Keep limits conservative in dev.
- Tune after measuring real traffic.

## 8. Interview summary

Short answer:

```txt
Sau khi chuan hoa API naming/response, em xac dinh cac missing pieces production quan trong gom read model strategy, consistency model, idempotency, performance budget va rate limiting. Read model giup API khong query OLTP DB phuc tap tren hot path. Consistency model giup giai thich stale data trong microservices. Idempotency chong duplicate commands khi retry. Performance budget giup toi uu theo target. Rate limit bao ve matching/recommendation endpoints khoi request spike.
```
