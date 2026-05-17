# Troubleshooting Runbook

## Purpose

This runbook is for debugging EduMatch quickly. Use it when something breaks.

Format:

```txt
Symptom -> Check -> Likely Cause -> Fix
```

## First Commands

Always start here:

```powershell
docker compose --profile workers ps
docker compose --profile workers logs --tail=120 frontend api-gateway auth-service scholarship-service matching-service chat-service
```

Check key routes:

```powershell
curl.exe -I http://localhost:3000
curl.exe -I http://localhost:3000/user/scholarships
curl.exe -s -o NUL -w "status=%{http_code} time=%{time_total}`n" "http://localhost:8080/api/scholarships?isPublic=true&page=0&size=12"
```

## FE Route Hangs

Symptom:

- browser freezes
- route does not transition
- CPU high
- Network tab keeps increasing

Check:

```powershell
docker compose --profile workers logs --tail=200 frontend api-gateway scholarship-service matching-service
rg -n "useEffect|set[A-Z].*\\(|new Set|new Map|\\|\\| \\[\\]" frontend/src/app frontend/src/components frontend/src/contexts
```

Likely causes:

- render loop from unstable array/object dependency
- effect updates state every render
- request loop from effect dependency
- global provider fetching unrelated data
- auth redirect loop

Fix:

- memoize arrays/objects
- avoid `setState(new Set())` if state already empty
- add `cancelled` flag in async effect
- use React Query `enabled`
- move logged-in extras behind auth check
- separate public page data from authenticated user-specific data

Done check:

- route changes normally
- Network tab stops after expected requests
- no repeated identical backend logs

## 401 Spam

Symptom:

- many 401 logs
- admin/user pages throw unauthorized repeatedly
- user is redirected unexpectedly

Check:

```powershell
docker compose --profile workers logs --tail=200 api-gateway auth-service scholarship-service
```

Look for:

```txt
Unauthorized error
Full authentication is required
ROLE_USER vs USER
```

Likely causes:

- token missing/expired
- FE calls protected endpoint on public route
- role normalization mismatch
- backend uses `hasRole('ROLE_ADMIN')` instead of authority correctly
- cookies/localStorage stale

Fix:

- FE should not call user-only endpoints without token.
- Normalize roles in middleware/layout.
- Backend should use consistent authorities.
- Clear stale token and login again.
- On 401, FE should clear session and redirect once.

## 403 Wrong Role

Symptom:

- logged-in user gets forbidden
- admin cannot access admin route
- employer routed to user dashboard incorrectly

Check:

- token roles
- frontend `auth_user`
- middleware role parsing
- backend preauthorize annotations

Likely causes:

- `ROLE_ADMIN` not normalized to `ADMIN`
- backend checks wrong role string
- user has multiple roles and frontend picks wrong primary role

Fix:

- Backend: authority checks consistent.
- Frontend: prioritize ADMIN > EMPLOYER > USER.
- Middleware: `ROLE_` prefix stripped for navigation decision.

## Gateway 502

Symptom:

```txt
502 Bad Gateway
```

Check:

```powershell
docker compose --profile workers ps
docker compose --profile workers logs --tail=120 api-gateway
```

Likely causes:

- upstream service down/unhealthy
- backend container recreated but Nginx still has old IP
- route path wrong
- service name mismatch

Fix:

```powershell
docker compose --profile workers up -d --force-recreate api-gateway
```

Long-term fix:

- configure Docker DNS resolver in Nginx
- add gateway health route
- add upstream timeout/failover

## Gateway 504 / Timeout

Symptom:

- request hangs then gateway timeout
- matching/recommendations slow

Check:

```powershell
docker compose --profile workers logs --tail=200 api-gateway matching-service scholarship-service
```

Likely causes:

- service query too slow
- matching full scan
- DB locked
- downstream auth call slow

Fix:

- add backend timeout
- use batch/cache
- inspect DB EXPLAIN
- avoid sync heavy work
- worker precompute

## Scholarship List Empty

Symptom:

- `/user/scholarships` loads but shows no scholarships

Check:

```powershell
curl.exe "http://localhost:8080/api/scholarships?isPublic=true&currentDate=2026-05-09&page=0&size=12"
```

Likely causes:

- local DB has no opportunities
- opportunities expired
- not approved/public
- page index mismatch: FE sends page 1 but backend expects page 0
- response mapper mismatch

Fix:

- seed scholarship DB
- ensure moderation/public fields
- convert FE page to backend zero-based page
- inspect API response shape

## Admin Analytics Shows Zero

Symptom:

- analytics page loads but stats are zero

Check:

```powershell
docker compose --profile workers logs --tail=200 auth-service scholarship-service api-gateway
```

Likely causes:

- local DB empty
- auth-service calls scholarship-service using localhost inside container
- admin endpoint swallows downstream error
- analytics page still using mock/zero fallback

Fix:

- set `APP_SERVICES_SCHOLARSHIP_SERVICE_URL=http://scholarship-service:8082`
- seed data
- ensure admin analytics uses real API
- log downstream failure with requestId

## Matching Scores Missing

Symptom:

- scholarship cards show no match score
- matching request fails

Check:

```powershell
docker compose --profile workers logs --tail=200 matching-service api-gateway frontend
```

Likely causes:

- user not logged in
- user id missing from auth state
- matching-service down
- gateway route missing
- batch score endpoint error
- no matching cache/data

Fix:

- FE should hide score for anonymous users.
- Ensure batch request has applicantId and opportunityIds.
- Test:

```powershell
curl.exe -s http://localhost:8000/health
```

- If matching fails, page should still render without scores.

## Matching Recommendations Slow

Symptom:

- `/api/v1/recommendations/...` takes seconds

Check:

```powershell
docker compose --profile workers logs --tail=200 matching-service celery-worker matching-consumer
```

Likely causes:

- cache miss triggers fallback full compute
- recommendation cache not precomputed
- worker not running
- missing indexes

Fix:

- ensure worker profile is running
- inspect `recommendation_cache`
- add indexes
- precompute on profile/opportunity events
- return cached/stale/fallback response instead of blocking long

## Apply Duplicate

Symptom:

- user can apply twice
- duplicate applications appear
- concurrent submit creates duplicate rows

Check:

- DB unique constraint
- application service transaction
- response on duplicate

Likely causes:

- only frontend prevents duplicate
- backend check-then-insert race condition
- no unique DB index

Fix:

```sql
CREATE UNIQUE INDEX uq_applications_applicant_opportunity
ON applications(applicant_user_id, opportunity_id);
```

Backend:

- catch duplicate key
- return `409 APPLICATION_ALREADY_EXISTS` or existing application

## Bookmark Duplicate

Same pattern as application:

```sql
CREATE UNIQUE INDEX uq_bookmarks_applicant_opportunity
ON bookmarks(applicant_user_id, opportunity_id);
```

Toggle should be idempotent.

## DB Query Slow

Symptom:

- API response slow
- DB CPU high
- logs show long duration

Check:

- identify endpoint
- find query
- run EXPLAIN

MySQL:

```sql
EXPLAIN ANALYZE
SELECT ...
```

Likely causes:

- missing composite index
- OFFSET too deep
- select too many columns
- filesort/temp table
- N+1 joins

Fix:

- add targeted index
- use DTO projection
- use keyset pagination for deep pages
- batch queries

## RabbitMQ/Worker Not Processing

Symptom:

- profile update does not refresh recommendations
- notifications not delivered

Check:

```powershell
docker compose --profile workers ps
docker compose --profile workers logs --tail=200 rabbitmq matching-consumer celery-worker chat-service
```

RabbitMQ UI:

```txt
http://localhost:15672
guest / guest
```

Likely causes:

- worker profile not started
- queue binding wrong
- event routing key wrong
- task error/retry loop

Fix:

- start with `--profile workers`
- verify exchange/queue bindings
- inspect worker logs
- add dead-letter queue later

## WebSocket Not Connecting

Symptom:

- messages/notifications not realtime
- console websocket close

Check:

- `NEXT_PUBLIC_SOCKET_URL`
- gateway websocket route
- chat service health
- token present

Fix:

```txt
NEXT_PUBLIC_SOCKET_URL=ws://localhost:8080/api/ws
```

FE should only connect websocket when authenticated.

## Build Fails

Frontend:

```powershell
docker compose --profile workers up -d --build frontend
```

Common causes:

- TypeScript syntax issue
- missing `public` folder in Docker
- import path wrong
- server/client component mismatch

Backend:

```powershell
docker compose --profile workers up -d --build scholarship-service
```

Common causes:

- Java compile error
- missing property
- test compile issue if tests enabled

## Incident Note Template

Use after fixing important bug:

```md
## Incident: <title>

Date:
Route/API:
Symptom:

Root cause:

Fix:

Files changed:

Verification:

Regression test to add:

Lessons:
```

