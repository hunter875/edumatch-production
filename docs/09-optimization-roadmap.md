# Optimization Roadmap

## Purpose

This roadmap groups performance and architecture work into execution phases. Do not execute the long checklist top-to-bottom. Work by groups.

Every group follows:

```txt
Audit -> Fix -> Build/Test -> Measure -> Document
```

## Severity Definitions

### P0

Must fix soon because it causes broken user flows, data corruption, route hangs, or severe operational pain.

Examples:

- route freezes
- infinite requests
- wrong auth/role behavior
- duplicate applications/bookmarks
- gateway 502 from wrong Docker service URL
- full scan matching on request path

### P1

Important but not blocking immediate usage.

Examples:

- API response inconsistency
- missing p95 metrics
- non-critical N+1 on low-traffic route
- analytics not aggregated
- bundle too large

API contract cleanup is tracked in:

```txt
docs/API_STANDARDIZATION_GUIDE.md
```

Production readiness guardrails are tracked in:

```txt
docs/PRODUCTION_READINESS_CHECKLIST.md
```

### P2

Nice to have or scale-stage work.

Examples:

- Grafana dashboard
- OpenAPI generation
- Qdrant migration
- Kubernetes
- 1M local seed test

## Group 0: Baseline

Goal:

- Understand current health before changing code.

Tasks:

- Build Docker full stack.
- Open main routes.
- Check logs.
- Measure key endpoints.
- Note current failures.

Commands:

```powershell
docker compose --profile workers up -d --build
docker compose --profile workers ps
docker compose --profile workers logs --tail=120 frontend api-gateway auth-service scholarship-service matching-service chat-service
```

Routes:

```txt
/user/scholarships
/user/dashboard
/user/applications
/admin
/admin/analytics
/admin/scholarships
```

Done:

- baseline note exists
- P0 list identified

## Group 1: FE Stability P0

Goal:

- No route hang.
- No render loop.
- No request storm.

Tasks:

- Audit `useEffect` dependencies.
- Memoize arrays/objects used as dependencies.
- Guard `setState(new Set())` and `setState([])`.
- Add async cancellation.
- Ensure loading state exits.
- Separate public route base data from authenticated extras.

Files to inspect:

```txt
frontend/src/app/user/scholarships/page.tsx
frontend/src/app/user/dashboard/page.tsx
frontend/src/app/user/applications/page.tsx
frontend/src/contexts/AppContext.tsx
frontend/src/providers/RealTimeProvider.tsx
frontend/src/hooks/api.ts
```

Done:

- route transitions work
- Network tab stops after expected requests
- Docker logs do not show repeated spam

## Group 2: API Layer Cleanup

Goal:

- One standard way for FE to call backend.

Tasks:

- Use `api-config.ts` as base for gateway URL, token headers, timeout.
- Use service modules per domain.
- Remove production imports of `mock-data`.
- Remove production use of `api-client.ts`.
- Avoid direct `fetch()` in pages/components.
- Centralize 401 handling where appropriate.

Search:

```powershell
rg -n "mock-data|api-client|@/lib/api\\b|fetch\\(|localStorage\\.getItem\\('auth_token'\\)" frontend/src
```

Done:

- production routes use service layer
- auth token logic centralized
- timeout configured once

## Group 3: FE Data Flow

Goal:

- Server state belongs to React Query.
- UI state stays local/small.

Tasks:

- Move server data out of AppContext.
- AppContext only keeps UI state if needed.
- Standardize query keys.
- Use `enabled` for auth-dependent queries.
- Keep scholarship filters/page/search in URL.

Target route:

```txt
/user/scholarships?q=ai&page=2&level=MASTER
```

Done:

- refresh preserves filters
- browser back/forward works
- no global fetch of unrelated data

## Group 4: N+1 And Batch

Goal:

- List pages do not call one request per item.

Tasks:

- ScholarshipCard receives status props, does not fetch.
- Batch application status.
- Batch bookmark status.
- Batch matching score.
- Employer/admin list counts use batch/aggregate queries.

Search:

```powershell
rg -n "map\\(async|Promise\\.all|checkApplicationStatus|getMatchingScore|getMyApplications|getMyBookmarks" frontend/src
```

Done:

- 12 cards do not create 12+ extra status requests
- backend logs show batch calls

## Group 5: Backend Correctness

Goal:

- API behavior is correct and safe under edge cases.

Tasks:

- Standardize error format.
- Fix role/authority consistency.
- Add idempotency for application/bookmark.
- Add DB unique constraints.
- Validate inputs.
- Avoid service-to-service `localhost`.
- Put `userId` in JWT claim.

Done:

- duplicate apply/bookmark prevented
- wrong role returns 403
- missing token returns 401
- Docker service calls use service names

## Group 6: DB Performance

Goal:

- Query performance is measured and improved.

Tasks:

- Create seed script/profile.
- Seed small/medium/dirty data.
- Run EXPLAIN for hot queries.
- Add targeted indexes.
- Document before/after.

Hot endpoints:

```txt
/api/scholarships
/api/opportunities/all
/api/applications/my/statuses
/api/bookmarks/my/statuses
/api/applications/all
/api/admin/stats
```

Done:

- query uses intended indexes
- before/after report exists
- no obvious full table scans for hot paths

## Group 7: Matching Performance

Goal:

- Matching is fast, cached, and precomputed.

Tasks:

- Keep hard filters.
- Return score breakdown.
- Ensure batch score cache.
- Read recommendation cache first.
- Worker precomputes top-N.
- Invalidate cache on events.
- Create eval dataset.
- Add embedding only after rule baseline.

Done:

- recommendation cache hit p95 under target
- no full scan on common request path
- AI/embedding has evaluation metrics if added

## Group 8: Analytics/Admin

Goal:

- Admin pages use real data without heavy live scans.

Tasks:

- Remove mock data from admin runtime.
- Use real admin APIs.
- Aggregate stats in backend/read model.
- Add daily/hourly stats table later.

Done:

- analytics no mock
- stats endpoint stable
- query cost known

## Group 9: Observability

Goal:

- Failures are easy to trace.

Tasks:

- Add request ID.
- Gateway forwards `X-Request-ID`.
- Services log request id/path/status/duration.
- Track p95/p99 latency.
- Remove noisy debug logs from production.

Done:

- one request can be traced across gateway/service
- slow endpoints visible
- logs are useful, not noisy

## Group 10: Gateway/Infra

Goal:

- Local/prod environments are stable and clear.

Tasks:

- Keep local/prod Nginx split.
- Add Docker DNS resolver or recreate gateway after backend recreate.
- Add gateway timeouts/retry.
- Enable gzip/brotli for static assets.
- Add backup/restore docs.
- Add seed profile.
- Add CI/CD later.

Done:

- Docker local stable
- deploy path documented
- gateway does not randomly 502 after recreate

## Recommended Execution Order

```txt
0. Baseline
1. FE Stability P0
2. API Layer Cleanup
3. FE Data Flow
4. N+1 And Batch
5. Backend Correctness
6. DB Performance
7. Matching Performance
8. Analytics/Admin
9. Observability
10. Gateway/Infra
```

## Codex Prompt Templates

Audit:

```txt
Audit Group 1 FE Stability P0. Do not edit code.
Find render loops, repeated fetches, state cascades, loading states that never exit.
Return P0/P1/P2 table with file:line, evidence, cause, suggested fix, and tests.
```

Fix:

```txt
Fix only P0 findings from the Group 1 audit.
Do not refactor P1/P2.
Build frontend Docker and test /user/scholarships.
Report changed files and verification.
```

Performance:

```txt
Run a baseline for /api/scholarships and batch status endpoints.
Record HTTP status, latency, request count, and backend logs.
Do not change code.
```

DB:

```txt
Audit scholarship DB hot queries.
Propose indexes only for endpoints currently used by FE/admin.
Include EXPLAIN command and expected improvement.
Do not edit migrations yet.
```

Matching:

```txt
Audit matching service request path.
Find any full scans, cache misses, worker gaps, and AI/vector opportunities.
Return tradeoffs and implementation order.
Do not edit code.
```

## Roadmap Done Criteria

This roadmap is effective when:

- docs are updated after major fixes
- each group has before/after notes
- P0 count decreases over time
- bugs have regression tests
- performance claims have measurements
