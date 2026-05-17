# API Standardization Guide for EduMatch

Ngay ghi nhan: 2026-05-13

Tai lieu nay mo ta huong chuan hoa API cho EduMatch theo cach an toan: them contract moi `/api/v1`, giu endpoint cu de tuong thich FE hien tai, va chuan hoa response de frontend khong phai doan shape.

## 0. Trang thai thuc thi

Da implement slice dau tien cho `scholarship-service`:

- Them wrapper DTO:
  - `ApiResponse<T>`
  - `PageResponse<T>`
  - `PageMetadata`
- Them public v1 endpoints:
  - `GET /api/v1/scholarships`
  - `GET /api/v1/scholarships/{id}`
- Them provider v1 endpoints:
  - `POST /api/v1/scholarships`
  - `PATCH /api/v1/scholarships/{id}`
  - `DELETE /api/v1/scholarships/{id}`
  - `GET /api/v1/provider/scholarships`
  - `GET /api/v1/provider/analytics`
- Them application/bookmark v1 endpoints:
  - `POST /api/v1/applications`
  - `GET /api/v1/me/applications`
  - `GET /api/v1/me/application-statuses`
  - `GET /api/v1/provider/applications`
  - `GET /api/v1/provider/scholarships/{scholarshipId}/applications`
  - `PATCH /api/v1/provider/applications/{applicationId}/status`
  - `PUT /api/v1/me/bookmarks/{scholarshipId}`
  - `DELETE /api/v1/me/bookmarks/{scholarshipId}`
  - `GET /api/v1/me/bookmarks`
  - `GET /api/v1/me/bookmark-statuses`
- Them admin v1 endpoints:
  - `GET /api/v1/admin/scholarships`
  - `GET /api/v1/admin/scholarships/{id}`
  - `PATCH /api/v1/admin/scholarships/{id}/moderation`
  - `DELETE /api/v1/admin/scholarships/{id}`
  - `GET /api/v1/admin/applications`
  - `GET /api/v1/admin/applications/{id}`
  - `PATCH /api/v1/admin/applications/{id}/status`
- Cap nhat security rules cho `/api/v1`.
- Cap nhat Nginx gateway route `/api/v1/...` ve `scholarship-service`.
- Gateway da forward `Idempotency-Key` header cho v1 scholarship/application/bookmark routes.
- Gateway da duoc lam mem hon: frontend upstream resolve theo request, tranh gateway crash khi frontend container chua chay.
- Gateway da co coarse rate limit va JSON `RATE_LIMITED` response cho HTTP 429.
- Them error contract chuan cho scholarship-service:
  - `ApiError`
  - `GlobalExceptionHandler`
  - JSON error cho 400/401/403/404/409/500/503.
- Them OpenAPI cho scholarship-service:
  - `/api/v1/openapi.json`
  - `/api/v1/docs`
- Them idempotency persistence cho `POST /api/v1/applications`.
- Them cache behavior cho API v1:
  - Public scholarship list/detail co `Cache-Control: public, max-age=30`.
  - Admin/provider/me/application/bookmark response co `Cache-Control: no-store`.
  - Public scholarship list/detail doc qua Redis cache trong `scholarship-service`.
  - Provider/admin analytics duoc cache TTL ngan bang Redis aggregate cache.
- Migrate FE service layer chinh sang `/api/v1` cho scholarship/application/bookmark/admin.

Da verify:

```txt
docker compose build scholarship-service
docker compose up -d --force-recreate api-gateway
GET http://localhost:19080/gateway/health -> 200
GET http://localhost:19080/api/v1/scholarships?page=0&size=2 -> 200
GET http://localhost:19080/api/v1/scholarships/1001 -> 200
GET http://localhost:19080/api/v1/scholarships/99999999 -> 404 ApiError
GET http://localhost:19080/api/v1/me/bookmarks without token -> 401 ApiError
GET http://localhost:19080/api/v1/openapi.json -> 200
POST http://localhost:19080/api/v1/applications + Idempotency-Key retry -> same application id
Gateway recommendation burst test -> 429 RATE_LIMITED
```

Con la roadmap/chua implement het:

- OpenAPI diff / breaking-change gate trong CI.
- Consumer-driven contract tests cho FE.
- Ap dung cung chuan error/OpenAPI/idempotency cho auth/matching/chat.
- Rate limit nang cao theo user/API key thay vi chi coarse IP limit o gateway.
- Read model rieng cho scholarship cards/status/recommendation.
- Cache stampede protection/stale-while-revalidate/CDN cache.

## 1. Muc tieu

Muc tieu cua viec chuan hoa API:

- Giam request thua va N+1 tu frontend.
- Moi list lon deu co pagination.
- Response shape thong nhat giua cac service.
- Error format thong nhat de FE xu ly de hon.
- Public API va personalized API tach ro.
- Co versioning `/api/v1` de sau nay doi contract khong pha client cu.
- Co OpenAPI/API contract lam source of truth.

Gioi han ban dau cua slice implement:

- Khong xoa endpoint cu.
- Legacy endpoint van giu de tranh lam vo client cu.
- Chua them contract diff gate trong CI.
- Chua build read model denormalized rieng.
- Moi implement sau nhat tren scholarship-service; cac service khac can lam tiep theo cung pattern.

## 2. Hien trang API hien tai

### Diem tot

- He thong da co API gateway Nginx.
- Matching service da co versioning voi `/api/v1`.
- Scholarship public list va admin list da co pagination bang Spring `Pageable`.
- Da co batch endpoints de giam FE fan-out:
  - `GET /api/applications/my/statuses`
  - `GET /api/bookmarks/my/statuses`
  - `POST /api/v1/matching/batch-scores`
- Scholarship service phan lon tra DTO thay vi entity.
- Frontend da co React Query va query key cho nhieu resource.
- Co health endpoints cho cac service/gateway.

### Diem chua chuan

- Cung mot domain hoc bong nhung dung ca `scholarships` va `opportunities`.
- Mot so service co `/api/v1`, mot so chi co `/api`.
- Mot so list endpoint tra raw `List` va chua pagination:
  - `GET /api/opportunities/my`
  - `GET /api/applications/my`
  - `GET /api/applications/provider`
  - `GET /api/bookmarks/my`
- Public/admin list dang tra raw Spring `Page`, frontend phai xu ly nhieu shape khac nhau.
- Error response giua Java services va FastAPI chua dong nhat.
- Public scholarship detail co the kem personalized data nhu `matchScore`.
- Admin action path chua that dep REST, vi du `DELETE /api/opportunities/{id}/admin`.
- Gateway dang route nhieu legacy path va rewrite rieng le.

## 3. Nguyen tac API chuan

### 3.1 Versioning

Canonical API moi nen dung:

```txt
/api/v1/...
```

Endpoint cu van duoc giu trong giai doan compatibility:

```txt
/api/scholarships
/api/opportunities
/api/applications
/api/bookmarks
```

Quy tac:

- `/api/v1` la contract moi.
- Endpoint cu la alias/deprecated path.
- Khong xoa endpoint cu cho den khi FE va tai lieu da migrate xong.
- Neu doi response shape lon, chi doi tren `/api/v1`, khong lam vo legacy path.

### 3.2 Naming

Dung mot resource name chinh:

```txt
scholarships
```

Ly do:

- Nguoi dung san pham hieu "scholarship" hon "opportunity".
- FE va domain hien thi dang dung scholarship.
- `opportunities` co the giu lam internal/legacy alias.

Mapping:

| Legacy | Canonical |
| --- | --- |
| `/api/scholarships` | `/api/v1/scholarships` |
| `/api/opportunities` | `/api/v1/scholarships` |
| `/api/applications` | `/api/v1/applications` |
| `/api/bookmarks` | `/api/v1/bookmarks` |
| `/api/v1/match`, `/api/v1/matching` | `/api/v1/matching` |
| `/api/v1/recommendations` | `/api/v1/recommendations` |

### 3.3 HTTP methods

Dung method theo y nghia:

| Method | Dung cho |
| --- | --- |
| `GET` | Doc data |
| `POST` | Tao moi, command/action co side effect |
| `PATCH` | Cap nhat mot phan |
| `PUT` | Replace toan bo resource neu that su can |
| `DELETE` | Xoa resource |

Vi du:

```txt
GET    /api/v1/scholarships
GET    /api/v1/scholarships/{id}
POST   /api/v1/scholarships
PATCH  /api/v1/scholarships/{id}
DELETE /api/v1/scholarships/{id}
PATCH  /api/v1/scholarships/{id}/moderation
```

## 4. Response contract chuan

### 4.1 Single resource response

```json
{
  "data": {
    "id": 1001,
    "title": "MIT AI Research Fellowship 2026"
  }
}
```

### 4.2 List response

Tat ca list co the lon nen tra wrapper:

```json
{
  "data": [],
  "page": {
    "number": 0,
    "size": 12,
    "totalElements": 100,
    "totalPages": 9
  }
}
```

Neu can sort metadata:

```json
{
  "data": [],
  "page": {
    "number": 0,
    "size": 12,
    "totalElements": 100,
    "totalPages": 9
  },
  "sort": {
    "field": "createdAt",
    "direction": "DESC"
  }
}
```

Khong nen de FE phai support dong thoi:

```txt
Array
Spring Page
{ data: [] }
{ content: [] }
```

### 4.3 Command/action response

Voi action nho:

```json
{
  "data": {
    "bookmarked": true
  }
}
```

Voi delete thanh cong:

```txt
204 No Content
```

### 4.4 Error response

Tat ca service nen tra mot shape:

```json
{
  "timestamp": "2026-05-13T12:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Invalid request body",
  "path": "/api/v1/scholarships"
}
```

Ma loi goi y:

| Code | HTTP | Khi nao |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Request body/query param sai |
| `UNAUTHENTICATED` | 401 | Chua login/token sai |
| `FORBIDDEN` | 403 | Khong du quyen |
| `NOT_FOUND` | 404 | Resource khong ton tai |
| `CONFLICT` | 409 | Duplicate apply/bookmark constraint |
| `RATE_LIMITED` | 429 | Qua nhieu request |
| `INTERNAL_ERROR` | 500 | Loi khong mong muon |
| `DOWNSTREAM_UNAVAILABLE` | 503 | Service phu thuoc loi |

## 5. De xuat endpoint canonical

### 5.1 Scholarships

Public browse:

```txt
GET /api/v1/scholarships?q=&gpa=&studyMode=&level=&page=0&size=12&sort=createdAt,desc
```

Response:

```json
{
  "data": [
    {
      "id": 1001,
      "title": "MIT AI Research Fellowship 2026",
      "applicationDeadline": "2026-08-11",
      "scholarshipAmount": 50000,
      "level": "MASTER",
      "studyMode": "FULL_TIME"
    }
  ],
  "page": {
    "number": 0,
    "size": 12,
    "totalElements": 100,
    "totalPages": 9
  }
}
```

Detail public:

```txt
GET /api/v1/scholarships/{id}
```

Create/update/delete provider:

```txt
POST   /api/v1/scholarships
PATCH  /api/v1/scholarships/{id}
DELETE /api/v1/scholarships/{id}
```

Provider-owned scholarships:

```txt
GET /api/v1/provider/scholarships?page=0&size=20
```

Admin moderation:

```txt
GET   /api/v1/admin/scholarships?status=PENDING&page=0&size=20
GET   /api/v1/admin/scholarships/{id}
PATCH /api/v1/admin/scholarships/{id}/moderation
DELETE /api/v1/admin/scholarships/{id}
```

### 5.2 Applications

Create application:

```txt
POST /api/v1/applications
```

Current user applications:

```txt
GET /api/v1/me/applications?page=0&size=20
```

Batch applied status for visible cards:

```txt
GET /api/v1/me/application-statuses?opportunityIds=1001&opportunityIds=1002
```

Provider applications:

```txt
GET /api/v1/provider/applications?page=0&size=20&status=UNDER_REVIEW
GET /api/v1/provider/scholarships/{scholarshipId}/applications?page=0&size=20
PATCH /api/v1/provider/applications/{applicationId}/status
```

Admin applications:

```txt
GET /api/v1/admin/applications?status=&opportunityId=&keyword=&page=0&size=20
GET /api/v1/admin/applications/{id}
PATCH /api/v1/admin/applications/{id}/status
```

### 5.3 Bookmarks

Toggle bookmark:

```txt
PUT /api/v1/me/bookmarks/{scholarshipId}
DELETE /api/v1/me/bookmarks/{scholarshipId}
```

Neu giu action toggle de don gian:

```txt
POST /api/v1/me/bookmarks/{scholarshipId}/toggle
```

My bookmarks:

```txt
GET /api/v1/me/bookmarks?page=0&size=20
```

Batch status:

```txt
GET /api/v1/me/bookmark-statuses?opportunityIds=1001&opportunityIds=1002
```

### 5.4 Matching and recommendations

Giu matching service theo version hien co, nhung nen gom naming:

```txt
POST /api/v1/matching/scores
POST /api/v1/matching/batch-scores
GET  /api/v1/recommendations/applicant/{applicantId}?limit=20&page=1
GET  /api/v1/recommendations/opportunity/{opportunityId}?limit=20&page=1
```

Luu y:

- Recommendation API phai doc cache/read model.
- Batch score khong duoc tinh full scan moi request.
- Response co the giu shape rieng, nhung nen co metadata thong nhat.

## 6. Public vs personalized data

Can tach ro:

### Public scholarship list

Khong nen kem:

```txt
matchScore
isBookmarked
hasApplied
private provider fields
```

Nen chi tra:

```txt
title
summary
deadline
amount
level
studyMode
location
public status fields
```

### Personalized status

Dung batch endpoints:

```txt
GET  /api/v1/me/application-statuses?opportunityIds=...
GET  /api/v1/me/bookmark-statuses?opportunityIds=...
POST /api/v1/matching/batch-scores
```

Ly do:

- Public list co the cache HTTP/CDN/Redis de hon.
- Data ca nhan khong bi leak.
- FE van tranh N+1 bang batch.

## 7. Pagination va sorting

Moi endpoint tra list lon phai co:

```txt
page
size
sort
```

Default:

```txt
page=0
size=20
max size=100
sort=createdAt,desc
```

Endpoint can chuyen tu `List` sang paginated response:

```txt
GET /api/opportunities/my
GET /api/applications/my
GET /api/applications/provider
GET /api/bookmarks/my
GET /api/conversations
```

Quy tac:

- Khong cho `size` qua lon.
- Neu data cuc lon, can xem keyset pagination sau.
- Count query can duoc do bang `EXPLAIN ANALYZE`.

## 8. Compatibility strategy

### Giai doan 1 - Additive

- Them `/api/v1` routes moi.
- Giu legacy routes cu.
- FE co the migrate tung module.
- Gateway route ca legacy va v1.

### Giai doan 2 - Deprecation

- Add response header cho legacy:

```txt
Deprecation: true
Sunset: 2026-12-31
Link: </api/v1/scholarships>; rel="successor-version"
```

- Ghi log legacy endpoint usage.
- Cap nhat docs/FE sang v1.

### Giai doan 3 - Cleanup

- Khi khong con FE/client dung legacy, moi xoa alias.
- Xoa code transform legacy shape trong FE.

## 9. Gateway routing recommendation

Gateway nen route ro:

```txt
/api/v1/auth            -> auth-service
/api/v1/users           -> auth-service
/api/v1/admin/users     -> auth-service
/api/v1/scholarships    -> scholarship-service
/api/v1/applications    -> scholarship-service
/api/v1/bookmarks       -> scholarship-service
/api/v1/matching        -> matching-service
/api/v1/recommendations -> matching-service
/api/v1/chat            -> chat-service
/api/v1/notifications   -> chat-service
/api/ws                 -> chat-service
```

Legacy route giu lai:

```txt
/api/auth
/api/user
/api/users
/api/admin
/api/scholarships
/api/opportunities
/api/applications
/api/bookmarks
/api/v1/match
/api/matching
/recommendations
```

## 10. Observability cho API

Moi service nen log/metric:

```txt
request id
method
path template
status
latency ms
user id/role neu co
downstream service latency
DB query time/count neu do duoc
cache hit/miss neu co
```

Header goi y:

```txt
X-Request-Id
X-Response-Time
```

Metric can theo doi:

| Metric | Muc tieu |
| --- | --- |
| p95 API latency | Theo endpoint |
| 4xx/5xx rate | Phat hien bug/client issue |
| request count by route | Biet endpoint nao hot |
| DB query count/request | Bat N+1 |
| downstream latency | Bat service call cham |
| cache hit rate | Do cache co tac dung |

## 11. OpenAPI contract

Nen them OpenAPI cho tung service:

- Java Spring Boot: springdoc-openapi.
- FastAPI matching service da co OpenAPI mac dinh.
- Gateway/Docs gom link cua tung service.

Muc tieu:

- FE va backend cung nhin mot contract.
- Giam sai shape response.
- Co the generate TypeScript types sau nay.
- Test contract de phat hien breaking changes.

Endpoint docs goi y:

```txt
/api/v1/docs
/api/v1/openapi.json
```

Neu gateway gom docs, co the route:

```txt
/docs/auth
/docs/scholarship
/docs/matching
/docs/chat
```

## 12. Test checklist khi implement sau nay

Compatibility:

- Legacy endpoint van tra response nhu cu.
- New `/api/v1` endpoint tra wrapper chuan.
- Gateway route dung service.

Response:

- List response co `data` va `page`.
- Single response co `data`.
- Error 400/401/403/404/409/500 cung mot shape.

Performance:

- Public scholarship list la mot request paginated.
- 12 visible cards khong tao 12 score requests.
- Bookmark/application status dung batch.
- List endpoint lon khong tra raw unbounded `List`.

Security:

- Public endpoint khong tra private/personalized data.
- Admin/provider endpoint co role check.
- User khong xem duoc application/bookmark cua user khac.

Cache:

- Public response co the cache TTL ngan neu khong personalized.
- Private response co `Cache-Control: private` hoac `no-store`.

## 13. Production missing pieces

Phan API standardization o tren giup he thong sach hon ve naming, versioning, response shape va compatibility. Tuy nhien neu nhin theo production/microservice architecture, EduMatch van can them cac lop governance sau.

Execution checklist:

```txt
docs/PRODUCTION_READINESS_CHECKLIST.md
```

### 13.1 P0 - Read model strategy

Hien trang implied cua mot so flow van la:

```txt
OLTP DB -> API -> User
```

Khi scale, cach nay se lam query ngay cang phuc tap vi moi UI card can them count/status/score/bookmark/provider data.

Huong production nen la:

```txt
Write Model (normalized DB)
        ↓
Async projection/event worker
        ↓
Read Model (denormalized/cache table)
        ↓
API
```

Read model nen co cho EduMatch:

| Read model | Muc dich |
| --- | --- |
| `scholarship_card_view` | Du lieu card public/list, tranh join/lazy load nhieu bang |
| `user_application_status_view` | Batch status applicant da apply scholarship nao |
| `user_bookmark_status_view` | Batch bookmark status theo user |
| `recommendation_feed_view` | Top-N recommendations da precompute |
| `provider_analytics_view` | Dashboard/analytics cho provider |
| `admin_stats_view` | Aggregate stats cho admin |

Rule:

- Write model la source of truth.
- Read model la projection, co the rebuild duoc.
- API list/feed/dashboard nen doc read model khi data lon.
- Worker phai invalidate/rebuild read model theo event.

### 13.2 P0 - Consistency model declaration

Microservice phai noi ro consistency guarantee. Khong phai flow nao cung strong consistency.

De xuat cho EduMatch:

```txt
Writes inside one service DB are strongly consistent.
Cross-service projections and recommendation feeds are eventually consistent.
Target propagation delay: under 5 seconds in normal conditions.
```

Vi du:

| Flow | Consistency |
| --- | --- |
| Create application | Strong trong scholarship DB |
| My applications | Strong sau khi write thanh cong |
| Recommendation feed sau khi apply | Eventual, co the stale toi da vai giay |
| Provider analytics | Eventual hoac cache TTL ngan |
| Notification delivery | Eventual |
| Matching score cache | Eventual, invalidated by profile/opportunity version |

UX rule:

- Sau khi user apply, `my applications` phai cap nhat ngay.
- Recommendation neu con hien scholarship vua apply trong vai giay thi chap nhan duoc neu co consistency declaration.
- FE co the optimistic update hoac an item vua apply de tranh UX xau.

### 13.3 P0 - Idempotency strategy

Cac command API co side effect phai chong duplicate request.

Rui ro neu khong co:

- User double click apply.
- Mobile retry khi network timeout.
- Gateway/client retry tao duplicate.
- Worker/event consumer xu ly lai event.

Endpoint can idempotency:

| Endpoint | Ly do |
| --- | --- |
| `POST /api/v1/applications` | Chong double apply |
| document upload | Chong upload trung/retry loi |
| payment-like commands sau nay | Chong charge/ghi nhan trung |
| moderation/status update | Chong replay command neu co retry |
| event consumers | Chong xu ly event trung |

Rule:

```txt
POST commands MUST support idempotency when duplicate execution can change state incorrectly.
```

HTTP header de xuat:

```txt
Idempotency-Key: <uuid>
```

Response behavior:

- Lan dau: xu ly command va luu key + response hash/result.
- Retry cung key/body: tra lai ket qua cu.
- Cung key nhung body khac: tra `409 CONFLICT`.

DB rule bo sung:

- `applications` nen co unique constraint tren `(applicant_user_id, opportunity_id)`.
- Event consumer nen co processed-event table hoac idempotent upsert.

### 13.4 P0 - API performance budget

Khong co performance budget thi dev se toi uu cam tinh.

Budget de xuat:

| Endpoint/Flow | P95 target |
| --- | --- |
| Public scholarship list | `<150ms` end-to-end qua gateway |
| Scholarship detail public | `<150ms` neu cache hit/detail nhe |
| Batch bookmark/application status | `<80ms` |
| Batch matching scores, 12 cards | `<500ms` compute/cache mixed |
| Recommendation cache hit | `<200ms` |
| Provider analytics | `<300ms` neu cache/read model |
| Admin stats | `<300ms` |
| Login/me | `<200ms` |

Rule:

- Moi endpoint hot phai co p95 target.
- Neu vuot target, chay theo thu tu: request count -> API profiling -> DB explain -> cache/read model.
- Benchmark phai dung data load-test, khong chi dung data demo 10 rows.

### 13.5 P1 - Rate limit strategy

Rate limit rat can cho matching/recommendation/batch APIs vi day la noi ton CPU/DB nhat.

Rate limit de xuat ban dau:

| Client/API | Limit goi y |
| --- | --- |
| Anonymous public browse | `60 req/min/IP` |
| Authenticated normal API | `300 req/min/user` |
| Login/auth sensitive endpoints | `10 req/min/IP` |
| Batch matching scores | `30 req/min/user`, max `50 opportunityIds/request` |
| Recommendations | `30 req/min/user` |
| Admin analytics | `60 req/min/admin` |
| File upload | `10 req/min/user` |

Response khi bi limit:

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

Implementation place:

- Gateway handles coarse IP/user route limits.
- Service handles domain-specific limits, vi du max batch size.
- Matching service phai validate `opportunityIds.length <= 50`.

## 14. Roadmap de implement

### P0 - Documentation, contract, and production guarantees

1. Chot tai lieu nay lam API direction.
2. Liet ke endpoint legacy va canonical.
3. Them OpenAPI/springdoc cho scholarship-service truoc.
4. Dinh nghia wrapper DTO:
   - `ApiResponse<T>`
   - `PageResponse<T>`
   - `ApiError`
5. Dinh nghia consistency model trong architecture docs.
6. Them idempotency rule cho command APIs.
7. Dat API performance budget cho endpoint hot.
8. Thiet ke read model dau tien cho scholarship cards/recommendations.

### P1 - Scholarship service v1 and rate limits

1. Them `/api/v1/scholarships` public browse/detail.
2. Them `/api/v1/provider/scholarships`.
3. Them `/api/v1/admin/scholarships`.
4. Giu `/api/scholarships` va `/api/opportunities` legacy.
5. Chuyen cac list lon sang paginated response.
6. Them rate limit cho public browse va matching/recommendation routes.

### P2 - Applications/bookmarks v1

1. Them `/api/v1/applications`.
2. Them `/api/v1/me/applications`.
3. Them `/api/v1/provider/applications`.
4. Them `/api/v1/me/bookmarks`.
5. Giu batch status endpoints va standardize response.

### P3 - Gateway and frontend migration

1. Them route `/api/v1/...` trong Nginx.
2. FE service layer doi sang v1 tung module.
3. Xoa logic "backend may return array/page/data" sau khi migrate.
4. Them deprecation header/log cho legacy.

### P4 - Enterprise hardening

1. OpenAPI contract tests.
2. Request tracing.
3. API latency dashboard.
4. Rate limit theo route/user.
5. Idempotency key cho command nhay cam.

## 15. Cau tra loi phong van ngan gon

Neu bi hoi "API system cua em da thiet ke chuan chua?", tra loi:

```txt
He thong hien tai o muc MVP kha on: co microservices, gateway, pagination cho mot so list, batch endpoints de tranh FE N+1, va matching service da co /api/v1. Tuy nhien de dat chuan enterprise, em de xuat chuan hoa them API versioning, response wrapper, error format, pagination cho moi list lon, tach public data khoi personalized data, va dung OpenAPI lam contract. Em chon cach migrate an toan: them /api/v1 lam canonical contract, giu endpoint cu lam backward-compatible alias de khong lam vo frontend hien tai.
```

Cau ngan hon:

```txt
Toi uu API khong chi la query nhanh, ma la giam so request, response gon va dong nhat, co pagination, batch, cache-friendly public endpoints, error contract ro rang, va co observability de biet bottleneck nam o dau.
```
