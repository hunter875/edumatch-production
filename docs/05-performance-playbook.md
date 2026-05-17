# Performance Playbook

## Purpose

This playbook explains how to find, fix, and prove performance improvements in EduMatch.

Rule:

```txt
No optimization without baseline.
No claim without measurement.
```

## Performance Layers

Optimize in this order:

1. Correctness and stability
2. Frontend request/render behavior
3. API shape and batch endpoints
4. Database indexes/query plans
5. Caching/precompute
6. Bundle/runtime optimization
7. Infrastructure tuning

API standardization reference:

```txt
docs/API_STANDARDIZATION_GUIDE.md
```

Do not start with Grafana/Kubernetes/vector DB if FE is still render-looping.

## Baseline Checklist

Run:

```powershell
docker compose --profile workers up -d --build
docker compose --profile workers ps
```

Check main routes:

```powershell
curl.exe -I http://localhost:3000
curl.exe -I http://localhost:3000/user/scholarships
curl.exe -I http://localhost:3000/admin
```

Check API:

```powershell
curl.exe -s -o NUL -w "status=%{http_code} time=%{time_total}`n" "http://localhost:8080/api/scholarships?isPublic=true&page=0&size=12"
```

Read logs:

```powershell
docker compose --profile workers logs --tail=120 frontend api-gateway auth-service scholarship-service matching-service chat-service
```

Record:

```txt
route
HTTP status
API latency
visible error
log error
request count
```

## Frontend Render Loop Detection

Search:

```powershell
rg -n "useEffect|set[A-Z].*\\(|new Set|new Map|\\|\\| \\[\\]|\\|\\| \\{\\}" frontend/src/app frontend/src/components frontend/src/contexts
```

Common bad pattern:

```tsx
const items = data?.items || [];

useEffect(() => {
  setIds(new Set(items.map(x => x.id)));
}, [items]);
```

Why bad:

- `[]` creates new array every render when data is empty.
- Effect runs every render.
- `setIds(new Set())` creates new object every render.
- React re-renders again.

Fix:

```tsx
const items = useMemo(
  () => Array.isArray(data?.items) ? data.items : [],
  [data?.items]
);

const ids = useMemo(
  () => items.map(item => String(item.id)),
  [items]
);

useEffect(() => {
  if (ids.length === 0) {
    setIds(prev => prev.size === 0 ? prev : new Set());
    return;
  }
}, [ids]);
```

## Fetch Loop Detection

Search:

```powershell
rg -n "fetch\\(|axios\\.|getMyApplications|getMyBookmarks|checkApplicationStatus|getMatchingScore" frontend/src
```

Symptoms:

- Network tab keeps growing.
- Docker logs show same endpoint repeatedly.
- Route cannot transition.
- CPU spikes.

Fix rules:

- Effects must have stable dependencies.
- Use React Query for server state.
- Use `enabled` flag when auth/user id is required.
- Use batch endpoint for card/list status.
- Cancel async effects on unmount.

Pattern:

```tsx
useEffect(() => {
  let cancelled = false;

  async function load() {
    setLoading(true);
    try {
      const result = await serviceCall();
      if (!cancelled) setData(result);
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  load();

  return () => {
    cancelled = true;
  };
}, [stableDependency]);
```

## API Layer Smell Detection

Search:

```powershell
rg -n "mock-data|api-client|@/lib/api\\b|localStorage\\.getItem\\('auth_token'\\)|fetch\\(" frontend/src
```

Bad:

```tsx
fetch("http://localhost:8082/api/...")
localStorage.getItem("auth_token")
import { SCHOLARSHIPS } from "@/lib/mock-data"
```

Good:

```tsx
scholarshipServiceApi.getScholarships(params)
adminService.getStats()
matchingService.batchGetMatchingScores(applicantId, ids)
```

## N+1 Detection

Search:

```powershell
rg -n "map\\(async|Promise\\.all|forEach\\(async|checkApplicationStatus|getMatchingScore|getMyApplications|getMyBookmarks" frontend/src
```

N+1 example:

```tsx
scholarships.map(s => checkApplicationStatus(s.id))
```

Fix:

```tsx
const statuses = await getMyApplicationStatuses(ids);
```

Network target for scholarship list:

```txt
1 request scholarship list
1 request batch application status if logged in
1 request batch bookmark status if logged in
1 request batch matching score if logged in
0 per-card requests
```

## API Latency Measurement

Simple curl:

```powershell
curl.exe -s -o NUL -w "status=%{http_code} time=%{time_total}`n" "http://localhost:8080/api/scholarships?isPublic=true&page=0&size=12"
```

Loop 100 times in PowerShell:

```powershell
1..100 | ForEach-Object {
  curl.exe -s -o NUL -w "%{time_total}`n" "http://localhost:8080/api/scholarships?isPublic=true&page=0&size=12"
}
```

Better later:

- write a small benchmark script
- calculate min/p50/p95/p99
- store result in docs/perf-reports

## Backend Logs

Target log shape:

```txt
requestId=req_abc method=GET path=/api/scholarships status=200 durationMs=78
```

Current useful logs:

```powershell
docker compose --profile workers logs --tail=200 scholarship-service
docker compose --profile workers logs --tail=200 matching-service
```

Look for:

- status 401/403/500
- repeated same path
- high duration
- auth-service repeated calls
- matching cache misses
- worker failures

## Database EXPLAIN

MySQL example:

```sql
EXPLAIN ANALYZE
SELECT *
FROM opportunities
WHERE is_public = true
  AND moderation_status = 'APPROVED'
  AND application_deadline >= CURRENT_DATE
ORDER BY application_deadline
LIMIT 12;
```

PostgreSQL example:

```sql
EXPLAIN ANALYZE
SELECT candidate_id, matching_score
FROM recommendation_cache
WHERE target_type = 'applicant'
  AND target_id = '2'
ORDER BY matching_score DESC
LIMIT 10;
```

Things to record:

```txt
query
table
index used
rows examined/scanned
duration
filesort/temp
before/after
```

## Seed Data Levels

Weak local machine strategy:

```txt
small: 10k opportunities, enough for full-stack test
medium: 50k-100k rows, API/DB only if machine weak
stress: 1M rows, cloud/staging
dirty: edge-case data
```

Do not load 10k rows into FE. Use pagination.

## Frontend Bundle Performance

Build output shows route size:

```powershell
docker compose --profile workers up -d --build frontend
```

Watch:

```txt
/user/scholarships First Load JS
/user/dashboard First Load JS
/admin First Load JS
```

Improve by:

- lazy load charts
- lazy load heavy modals
- avoid importing realtime provider on public pages if not needed
- limit Framer Motion on large lists
- split admin/employer/user layout if needed

## URL State Performance And UX

Scholarship list should support:

```txt
/user/scholarships?q=ai&page=2&level=MASTER
```

Benefits:

- refresh keeps filter
- browser back/forward works
- easier QA
- easier sharing/debugging

Checklist:

- [ ] search query from URL
- [ ] page from URL
- [ ] filters from URL
- [ ] debounced search updates URL
- [ ] API query derived from URL

## Matching Performance

Target:

```txt
batch score p95 < 500ms
recommendation cache hit p95 < 200ms
constraint violation = 0
```

Check:

- cache hit/miss logs
- DB index on recommendation cache
- worker precompute duration
- no full scan per request

## Before/After Report Template

Use this after every optimization:

```md
## Optimization Report: <name>

Date:
Scope:

### Before
- route/API:
- p50:
- p95:
- request count:
- DB rows scanned:
- known error:

### Change
- files changed:
- reason:
- tradeoff:

### After
- route/API:
- p50:
- p95:
- request count:
- DB rows scanned:
- result:

### Regression Checks
- build:
- route:
- logs:
- edge cases:
```

## Done Criteria

Performance work is done only when:

- [ ] root cause identified
- [ ] code changed narrowly
- [ ] build passes
- [ ] route/API tested
- [ ] logs checked
- [ ] before/after recorded
- [ ] no new request spam
- [ ] no obvious role/auth regression
