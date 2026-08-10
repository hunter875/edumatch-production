# QA test checklist

Local Docker URLs:

- Frontend: `http://localhost:3000`
- API gateway: `http://localhost:19080`
- WebSocket: `ws://localhost:19080/api/ws`
- Direct debug ports: auth `19081`, scholarship `19082`, chat `19083`, matching `8000`

Use this after running:

```powershell
.\scripts\seed-dev-data.ps1 -LoadTest
.\scripts\seed-dev-data.ps1 -MatchingOnly
.\scripts\seed-dev-data.ps1 -ChatOnly
```

For DB/index benchmarking:

```powershell
.\scripts\seed-dev-data.ps1 -LargeLoadTest
Get-Content .\db\optimization\scholarship-indexes.sql | docker compose exec -T scholarship-db mysql -uroot "-p$env:SCHOLARSHIP_DB_ROOT_PASSWORD" scholarship_db
```

## Auth and role boundaries

- Login with `admin.test@edumatch.dev` / `admin123`.
- Login with `teacher1@edumatch.dev` / `admin123`.
- Login with `student1@edumatch.dev` / `admin123`.
- Confirm admin can access admin pages and teacher/student pages are blocked where expected.
- Confirm teacher/provider can access `/employer/*` but cannot access `/admin/*`.
- Confirm student can access `/user/*`, browse scholarships, apply, bookmark, and cannot access `/admin/*` or `/employer/*`.
- Logout must clear token/cookies/local storage enough that protected API calls return 401/403.

## Admin

- Dashboard counts load from backend aggregates, not from pulling all rows into frontend.
- Analytics page calls `GET /api/admin/analytics` and `GET /api/opportunities/analytics` style aggregate endpoints.
- Scholarships page can list, search, paginate, view detail, approve/reject, and delete/admin-delete.
- Applications page can list, filter by status, view details, and update status.
- User management can list seeded users and distinguish USER, EMPLOYER/provider, ADMIN roles.
- Admin cannot accidentally mutate provider-only ownership rules when moderating.

## Teacher/provider

- Dashboard and analytics show only the logged-in provider's own scholarships/applications.
- `teacher1` should see load-test scholarships whose `creator_user_id = 2004`.
- Create scholarship flow saves tags, skills, dates, amount, GPA, visibility, and moderation status correctly.
- Edit scholarship flow preserves fields not changed by the user.
- Application review can move PENDING -> UNDER_REVIEW -> ACCEPTED/REJECTED.
- Provider cannot see or update applications for another provider's scholarships.

## Student/user

- Scholarship listing handles 100+ rows with pagination/search/filter/sort.
- Scholarship detail loads tags, skills, amount, GPA, deadline, contact, and provider display.
- Bookmark add/remove works and survives refresh.
- Apply flow creates exactly one application for the chosen scholarship and prevents duplicate apply if the product expects uniqueness.
- My applications shows seeded and newly submitted applications with status changes.
- Recommendations/matching page has data for `student1`, `student2`, and `student3`.

## Performance and server-state

- Network tab should show one paged list request per list load, not one request per row.
- Scholarship list should call `POST /api/v1/matching/batch-scores` once per visible page, not one score request per card.
- Matching score response with `includeBreakdown=true` should include `hardFiltersPassed`, `constraintViolations`, and `explanations`.
- GPA/deadline/public/moderation hard-filter failures must return score `0` and must not appear in cached top-N recommendations.
- Recommendation API should read `recommendation_cache` or `matching_scores` cache; request path must not full-scan all applicants/opportunities.
- Run `python scripts/evaluate_matching.py` inside matching-service and confirm `constraint_violation_rate = 0`.
- Admin analytics payload should be small aggregate JSON, not 100/1000 scholarship rows.
- Provider analytics should not fetch all provider scholarships then compute everything in React.
- Scholarship DB list/application/bookmark queries should use index lookup or range scan under `EXPLAIN ANALYZE`, not full table scan.
- React Query/server-state cache should have one owner per resource; avoid duplicate context state for the same server data.
- Back/forward navigation should reuse cached data where intended and refetch only stale resources.
- Large list pages should stay responsive while searching/filtering.

## Production-readiness guardrails

- Hot APIs should have p95 budgets documented in `docs/PRODUCTION_READINESS_CHECKLIST.md`.
- Recommendation and analytics APIs should read cache/read models where possible, not build heavy feeds directly from OLTP tables.
- Cross-service flows should declare whether they are strong or eventually consistent.
- Duplicate submit/apply/bookmark scenarios should be blocked by idempotency behavior or unique constraints.
- Matching/recommendation/batch endpoints should have max batch size and rate-limit rules.
- Rate-limited responses should use the standard `RATE_LIMITED` error shape.

## Data integrity

- Status update in provider/admin views is reflected in student application history.
- Counts in dashboard match list totals after status changes.
- Deleted or hidden scholarships should not appear in public student browse.
- Expired deadline rows should be displayed/filtered consistently.
- Empty states still render correctly after filters return zero rows.

## Negative cases

- Wrong password returns a user-friendly login error.
- Missing/expired token redirects or blocks protected pages.
- Student cannot update application status via provider/admin endpoints.
- Provider cannot moderate scholarships via admin endpoint.
- Admin/provider/student APIs return 403, not 500, on forbidden access.
