# Junior Backend Learning Guide For EduMatch

Tai lieu nay giup nam chac 6 mang nen biet khi moi vao nghe va dang lam he thong nhu EduMatch:

1. HTTP/API
2. Database
3. Backend service
4. Microservice
5. Cache
6. Deploy/debug

Muc tieu khong phai hoc het nhu senior. Muc tieu la:

- hieu he thong dang chay qua dau
- biet soi loi cham/loi API/loi DB
- biet noi trade-off co ly
- khong bi dung hinh khi phong van
- biet phan biet code chay duoc voi code chiu duoc production

## 0. Ban Do Hoc Nhanh

| Mang | Can nam toi thieu | Trong EduMatch nhin vao dau |
| --- | --- | --- |
| HTTP/API | method, status code, DTO, pagination, error format | `docs/02-api-contract.md`, `docs/API_STANDARDIZATION_GUIDE.md` |
| Database | index, EXPLAIN, N+1, transaction | `docs/DB_OPTIMIZATION_REPORT.md`, repository Java |
| Backend service | Controller-Service-Repository, validation, authz, transaction | `backend-java/*/src/main/java` |
| Microservice | service boundary, sync vs async, event consistency | `docs/01-system-architecture.md`, `docs/06-data-flow.md` |
| Cache | hit/miss, TTL, invalidation, private/public cache | `docs/CACHE_LAYER_OPTIMIZATION_GUIDE.md` |
| Deploy/debug | Docker, logs, health, smoke, rollback, observability | `docs/07-deployment.md`, `docs/08-runbook.md`, `docs/OBSERVABILITY_RUNBOOK.md` |

Nguyen tac hoc:

```txt
Doc flow -> chay lenh -> xem output -> giai thich bang loi cua minh.
```

Neu chi doc ma khong chay lenh, luc phong van rat de bi hoi sau la dung.

## 0.5 Request Flow - EduMatch Chay Nhu The Nao

Day la phan can nam truoc khi hoc tung mang rieng le. Neu khong hieu request di qua dau, minh se biet nhieu khai niem nhung van khong biet debug tu dau.

### 0.5.1 Public Scholarship List

```txt
User mo trang scholarships
  -> Next.js page/component
  -> service layer / React Query
  -> HTTP request den Nginx Gateway
  -> Gateway route /api/v1/scholarships
  -> scholarship-service Spring Security filter
  -> V1ScholarshipController
  -> ScholarshipService / PublicReadCacheService
  -> Redis cache check
  -> OpportunityRepository
  -> MySQL scholarship_db
  -> DTO/Page mapping
  -> response ve Gateway
  -> response ve FE
  -> FE render cards
```

Can nho:

- Gateway cua EduMatch la **Nginx**, khong phai Spring Cloud Gateway.
- JWT validation nam chu yeu trong tung service, khong phai gateway.
- Public list khong nen chua personalized fields nhu `matchScore`, `isBookmarked`, `hasApplied`.

### 0.5.2 Authenticated Scholarship List

```txt
FE lay public scholarship list
  -> nhan 12 scholarship cards

Neu user da login:
  -> batch request application statuses cho 12 ids
  -> batch request bookmark statuses cho 12 ids
  -> batch request matching scores cho 12 ids
  -> merge vao UI state
```

Dung:

```txt
1 list request + 3 batch requests
```

Sai:

```txt
1 list request + 12 application requests + 12 bookmark requests + 12 score requests
```

Sai nay goi la FE/API N+1.

### 0.5.3 Apply Scholarship

```txt
Student click Apply
  -> FE POST /api/v1/applications
  -> Gateway
  -> scholarship-service
  -> validate request + auth role
  -> ApplicationService
  -> MySQL transaction: save application/documents
  -> response success ve FE
  -> publish RabbitMQ event
  -> chat-service notification consumer
  -> save notification
  -> WebSocket push ve FE
```

Can nho:

- Application save la sync/strong consistency.
- Notification la async/eventual consistency.
- Neu notification den cham hon response apply, khong nhat thiet la bug.

### 0.5.4 Matching Update

```txt
User update profile hoac provider update scholarship
  -> service owner save DB
  -> publish event vao RabbitMQ
  -> matching-consumer nhan event
  -> worker update feature/cache
  -> recommendation_cache duoc refresh
  -> FE doc recommendation sau do
```

Can nho:

- Matching nang nen chay nen/background.
- Recommendation co the stale vai giay.
- Hot API nen doc `recommendation_cache`/`matching_scores`, khong full scan moi request.

### 0.5.5 Debug Order Khi API Cham

Dung thu tu nay, dung nhay vao code ngay:

```txt
1. FE Network waterfall
   - request nao cham?
   - co N+1 khong?
   - status code la gi?

2. Gateway latency/log
   - gateway co route dung service khong?
   - upstream response time cao khong?

3. Service log
   - controller nao nhan request?
   - co exception/timeout/dependency fail khong?
   - requestId co di qua cac service khong?

4. DB
   - query nao chay?
   - EXPLAIN co table scan/sort lon khong?
   - index co dung khong?

5. Cache
   - cache hit hay miss?
   - key co dung user/filter/version khong?
   - stale data do TTL/invalidation khong?

6. External dependency
   - Auth/Matching/Redis/RabbitMQ/DB co song khong?
   - timeout/retry co lam request cham hon khong?

7. Async worker
   - RabbitMQ queue co backlog khong?
   - matching-consumer/celery-worker co loi khong?
   - DLQ/retry co bi loop khong?
```

### 0.5.6 Debug Order Khi API Loi

```txt
401 -> token thieu/sai/het han
403 -> token dung nhung role/owner khong du
404 -> resource khong ton tai hoac user khong duoc thay resource
409 -> duplicate/conflict/idempotency conflict
500 -> bug trong service
503 -> dependency fail hoac service khong san sang
```

Neu khong biet bat dau tu dau:

```txt
curl endpoint -> xem status -> xem service log -> xem DB/cache/dependency.
```

## 1. HTTP/API

### 1.1 Can Hieu Gi

HTTP/API la hop dong giua client va backend.

Can nam:

- `GET`: lay du lieu, khong lam thay doi state.
- `POST`: tao command moi, co the tao resource.
- `PUT`: replace/idempotent update.
- `PATCH`: update mot phan.
- `DELETE`: xoa resource.
- `2xx`: thanh cong.
- `400`: request sai validation.
- `401`: chua dang nhap/token sai.
- `403`: da dang nhap nhung khong co quyen.
- `404`: khong tim thay resource.
- `409`: conflict, duplicate, idempotency conflict.
- `500`: loi server.
- `503`: dependency/service down.

Trong API tot, FE khong nen phai doan response shape.

List response nen on dinh:

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

Error response nen on dinh:

```json
{
  "timestamp": "2026-05-16T12:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "title is required",
  "path": "/api/v1/scholarships"
}
```

### 1.1.1 Idempotency Cho Command API

Idempotency nghia la cung mot request duoc retry nhieu lan nhung khong tao side effect trung lap.

Vi du loi hay gap:

```txt
Student click Apply
  -> POST /api/v1/applications
  -> backend tao application thanh cong
  -> network timeout truoc khi FE nhan response
  -> FE retry
  -> backend tao application lan 2
```

Ket qua: double application.

Cach chong:

```txt
Idempotency-Key: <uuid-or-stable-key>
```

Backend luu:

```txt
user + endpoint + idempotency_key + request_hash + response
```

Neu retry cung key + cung body:

```txt
return lai response cu
```

Neu cung key nhung body khac:

```txt
409 Conflict
```

Trong EduMatch, `POST /api/v1/applications` da co idempotency service. Van nen co unique constraint/application duplicate guard lam lop bao ve cuoi.

### 1.1.2 API Latency Budget

Latency budget giup minh khong toi uu lung tung.

Vi du target cho hot endpoint:

| Layer | Target tham khao |
| --- | --- |
| Gateway overhead | `<5-10ms` |
| Service logic + serialization | `<30-50ms` |
| DB query hot path | `<10-30ms` |
| Redis cache hit | `<5-10ms` |
| External service call | `<50-100ms` |
| Public list p95 | `<150ms` |
| Recommendation cached p95 | `<200ms` |

Can nho:

```txt
API 300ms khong co nghia DB cham.
```

No co the cham vi:

- FE goi qua nhieu request
- gateway routing/proxy
- auth filter
- service mapping DTO
- count query
- external service call
- cache miss
- cold start/container resource

### 1.2 EduMatch Dang Dung Ra Sao

Gateway route qua cac service:

```txt
/api/auth              -> auth-service
/api/v1/scholarships   -> scholarship-service
/api/v1/applications   -> scholarship-service
/api/v1/me/bookmarks   -> scholarship-service
/api/v1/chat           -> chat-service
/api/v1/matching       -> matching-service
/api/v1/recommendations-> matching-service
```

File nen doc:

```txt
docs/02-api-contract.md
docs/API_STANDARDIZATION_GUIDE.md
backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/controller/v1
backend-java/chat-service/src/main/java/com/edumatch/chat/controller
frontend/src/services
frontend/src/lib/api-config.ts
```

### 1.3 Lenh Tu Test

Health gateway:

```powershell
curl.exe http://localhost:19080/gateway/health
```

Public scholarship list:

```powershell
curl.exe "http://localhost:19080/api/v1/scholarships?page=0&size=12"
```

Unauthorized chat:

```powershell
curl.exe -i "http://localhost:19080/api/v1/chat/conversations"
```

Expected:

```txt
401 UNAUTHENTICATED
```

### 1.4 Cau Hoi Phong Van Hay Gap

**Hoi:** Vi sao can API versioning?

**Tra loi mau:**

> Vi FE/mobile va backend deploy khong phai luc nao cung cung luc. Neu doi response shape ma khong versioning, client cu co the vo. `/api/v1` giup giu contract on dinh va cho phep migrate endpoint cu dan dan.

**Hoi:** 401 khac 403 the nao?

**Tra loi mau:**

> 401 la chua xac thuc hoac token khong hop le. 403 la da xac thuc nhung khong co quyen truy cap resource.

**Hoi:** Vi sao khong tra raw entity?

**Tra loi mau:**

> Entity la model noi bo cua DB/JPA. Neu tra thang entity, API bi phu thuoc schema noi bo, de leak field va kho versioning. DTO giup contract ro rang hon.

### 1.5 Checklist Nam Chac

- Giai thich duoc `GET/POST/PUT/PATCH/DELETE`.
- Doc duoc response `401/403/404/409/500`.
- Biet vi sao list endpoint can pagination.
- Biet DTO khac entity the nao.
- Biet API contract quan trong vi FE/backend phu thuoc nhau.

## 2. Database

### 2.1 Can Hieu Gi

Database cham thuong do:

- thieu index
- query scan qua nhieu row
- sort tren tap du lieu lon
- N+1 query
- transaction lock
- query `%keyword%` khong an B-tree index

Index la cau truc giup DB tim nhanh hon, nhung lam write cham hon va ton disk hon.

Composite index can theo thu tu cot:

```sql
INDEX(is_public, moderation_status, created_at)
```

Hop voi query:

```sql
WHERE is_public = 1
  AND moderation_status = 'APPROVED'
ORDER BY created_at DESC
LIMIT 12;
```

Khong hop voi moi query bat ky. Index phai di theo `WHERE + ORDER BY`.

### 2.1.1 Cardinality / Selectivity

Junior hay nghi:

```txt
co index = nhanh
```

Khong dung.

Index tot khi cot giup loc bo duoc nhieu row. Do goi la selectivity/cardinality.

Vi du cot selectivity thap:

```txt
is_public: true/false
gender: male/female/other
status: PENDING/APPROVED/REJECTED
```

Index don le tren boolean/status thuong khong manh neu phan bo du lieu lech.

Nhung composite index lai co ich:

```sql
INDEX(is_public, moderation_status, created_at)
```

Vi query can:

```sql
WHERE is_public = 1
  AND moderation_status = 'APPROVED'
ORDER BY created_at DESC
LIMIT 12
```

No khong chi loc, ma con giup lay dung thu tu moi nhat.

Nguyen tac:

```txt
Index khong phai cho tung cot.
Index la cho query pattern.
```

### 2.1.2 COUNT(*) Problem Trong Pagination

Pagination kieu Spring `Page` thuong co 2 query:

```txt
1 query lay data page
1 query COUNT(*) de tinh totalElements/totalPages
```

Khi bang lon, query `COUNT(*)` co the dat hon query lay data.

Vi du:

```sql
SELECT COUNT(*)
FROM opportunities
WHERE is_public = 1
  AND moderation_status = 'APPROVED';
```

Neu filter phuc tap/search keyword/join nhieu bang, count co the cham.

Cach xu ly khi scale:

- dung `Slice` thay vi `Page` neu FE chi can `hasNext`
- cache count cho dashboard
- approximate count cho admin analytics
- keyset pagination cho feed/list lon
- chi tinh total khi UI that su can

Can nho:

```txt
Query lay 12 rows co the nhanh, nhung query count 1M rows co the moi la thu cham.
```

### 2.2 N+1 La Gi

N+1 la:

```txt
1 query lay list 12 scholarships
+ 12 query lay tags/skills/status/score tung card
```

Dung hon:

```txt
1 query lay list
+ 1 batch query lay status cho 12 ids
+ 1 batch query lay score cho 12 ids
```

### 2.3 EduMatch Dang Dung Ra Sao

Database:

| Service | DB |
| --- | --- |
| auth-service | MySQL |
| scholarship-service | MySQL |
| chat-service | MySQL |
| matching-service | PostgreSQL |

File nen doc:

```txt
docs/DB_OPTIMIZATION_REPORT.md
docs/DB_SCHEMA_OVERVIEW.md
db/optimization/scholarship-indexes.sql
backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/repository
matching-service/app/models.py
```

### 2.4 Lenh Can Biet

Xem so dong:

```powershell
docker compose exec -T scholarship-db mysql -uroot -prootpass scholarship_db -e "SELECT 'opportunities' table_name, COUNT(*) rows_count FROM opportunities UNION ALL SELECT 'applications', COUNT(*) FROM applications UNION ALL SELECT 'bookmarks', COUNT(*) FROM bookmarks;"
```

Xem index:

```powershell
docker compose exec -T scholarship-db mysql -uroot -prootpass scholarship_db -e "SHOW INDEX FROM opportunities; SHOW INDEX FROM applications; SHOW INDEX FROM bookmarks;"
```

EXPLAIN query:

```powershell
docker compose exec -T scholarship-db mysql -uroot -prootpass scholarship_db -e "EXPLAIN ANALYZE SELECT id, title FROM opportunities WHERE is_public = 1 AND moderation_status = 'APPROVED' ORDER BY created_at DESC LIMIT 12;"
```

PostgreSQL matching:

```powershell
docker compose exec -T matching-db psql -U matching_user -d matching_db -c "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM recommendation_cache WHERE target_type='applicant' AND target_id='1001' ORDER BY matching_score DESC LIMIT 20;"
```

### 2.5 Doc EXPLAIN The Nao

Can nhin:

- `Table scan` / `Seq Scan`: can canh giac neu bang lon.
- `Index lookup` / `Index Scan`: tot hon.
- `Covering index`: rat tot.
- `Sort`: neu sort qua nhieu row, co the can index.
- `actual time`: thoi gian thuc te.
- `rows`: DB phai doc bao nhieu row.
- `Buffers` trong Postgres: doc tu cache/disk.

### 2.6 Cau Hoi Phong Van Hay Gap

**Hoi:** Vi sao `LIKE '%keyword%'` cham?

**Tra loi mau:**

> B-tree index can so sanh tu dau chuoi. Pattern `%keyword%` co wildcard o dau nen DB khong biet bat dau tim tu dau, thuong phai scan nhieu row. Neu search noi dung lon thi dung FULLTEXT/search engine.

**Hoi:** FULLTEXT khac B-tree index the nao?

**Tra loi mau:**

> B-tree tot cho exact/range/prefix/filter/sort. FULLTEXT tot cho search van ban dai, co tokenization va ranking relevance.

**Hoi:** DB query nhanh roi ma API van 100ms+ vi sao?

**Tra loi mau:**

> API con overhead cua network, gateway, Spring/JPA, serialization, auth, cache lookup, count query, mapping DTO, dependency call. DB chi la mot phan latency.

### 2.7 Checklist Nam Chac

- Biet index giup query nao.
- Chay duoc `EXPLAIN ANALYZE`.
- Nhan ra table scan/index scan.
- Giai thich duoc N+1.
- Biet MySQL vs PostgreSQL trong he thong nay.

## 3. Backend Service

### 3.1 Can Hieu Gi

Spring Boot flow co ban:

```txt
Controller
  -> validate request/auth
  -> Service
      -> business logic
      -> transaction
      -> Repository
          -> DB
  -> DTO response
```

Khong nen de controller lam qua nhieu business logic.

Khong nen de service qua to, om tat ca use case.

### 3.2 Transaction La Gi

Transaction dam bao nhieu thao tac DB thanh mot don vi:

```txt
all succeed -> commit
any fail    -> rollback
```

Vi du apply scholarship:

```txt
create application
save documents
update status
```

Neu save document fail, application khong nen bi tao nua.

### 3.2.1 Transaction Boundary Mistake

Sai pho bien:

```java
@Transactional
public void updateSomething() {
    repository.save(entity);
    restTemplate.postForObject(otherServiceUrl, payload, Void.class);
    rabbitTemplate.convertAndSend(exchange, routingKey, event);
}
```

Van de:

- transaction DB bi giu trong luc goi network
- external service cham lam lock DB lau hon
- external call thanh cong nhung DB rollback thi state lech
- DB commit thanh cong nhung publish event fail thi service khac khong biet

Nguyen tac:

```txt
Transaction chi nen bao quanh DB mutation can atomic.
Khong nen giu DB transaction trong luc goi external service.
```

Production pattern tot hon:

```txt
DB transaction:
  save business data
  save outbox event
commit

background publisher:
  read outbox
  publish RabbitMQ
  mark published
```

Day goi la outbox pattern.

### 3.3 Validation Va Authorization

Validation:

- title required
- GPA hop le
- deadline khong sai
- receiverId ton tai

Authorization:

- user co duoc xem resource nay khong?
- provider co phai chu scholarship khong?
- admin co duoc approve/reject khong?

Validation tra `400`.
Authorization tra `403`.

### 3.4 EduMatch Nen Nhin File Nao

Scholarship:

```txt
backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/controller/v1
backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/service/ScholarshipService.java
backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/service/ApplicationService.java
backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/repository
```

Auth:

```txt
backend-java/auth-service/src/main/java/com/example/jwt/example/controller
backend-java/auth-service/src/main/java/com/example/jwt/example/service
backend-java/auth-service/src/main/java/com/example/jwt/example/security
```

Chat:

```txt
backend-java/chat-service/src/main/java/com/edumatch/chat/controller
backend-java/chat-service/src/main/java/com/edumatch/chat/service
backend-java/chat-service/src/main/java/com/edumatch/chat/security
```

### 3.5 Smell Can Nho

God service:

```txt
ScholarshipService qua dai, om create/update/delete/search/admin analytics/cache/event.
```

Huong sua:

```txt
OpportunityCommandService
OpportunityQueryService
ProviderAnalyticsService
ScholarshipEventPublisher
```

Guideline:

```txt
Split service theo use case/read-write boundary, khong phai cu moi entity la mot service.
```

Vi du nen tach:

- command service: create/update/delete
- query service: list/detail/search
- analytics service: dashboard aggregate
- event publisher: build/publish domain events

Khong nen de mot class om:

```txt
HTTP use case + DB transaction + analytics + cache + event + external calls
```

Entity leak:

```txt
Controller tra entity/Map tuy tien.
```

Huong sua:

```txt
DTO + ApiResponse wrapper + PageResponse
```

### 3.6 Cau Hoi Phong Van Hay Gap

**Hoi:** Controller, Service, Repository khac nhau the nao?

**Tra loi mau:**

> Controller nhan HTTP request va tra response. Service chua business logic va transaction. Repository noi chuyen voi DB. Tach nhu vay de code de test, de bao tri, va khong tron HTTP voi business rule.

**Hoi:** Transaction dat o dau?

**Tra loi mau:**

> Thuong dat o service method vi service biet use case can gom nhung thao tac DB nao thanh mot transaction.

**Hoi:** Vi sao khong validate o FE la du?

**Tra loi mau:**

> FE co the bi bypass. Backend moi la source of truth. FE validation giup UX, backend validation giup bao mat va data integrity.

### 3.7 Checklist Nam Chac

- Ve duoc flow Controller-Service-Repository.
- Biet khi nao dung `@Transactional`.
- Phan biet validation/authentication/authorization.
- Biet DTO de lam gi.
- Nhan ra service qua to.

## 4. Microservice

### 4.1 Can Hieu Gi

Microservice khong phai cu tach service la hay.

Tach service hop ly khi:

- domain khac nhau
- data ownership ro
- scale/traffic khac nhau
- team boundary khac nhau
- co async workload rieng

EduMatch co:

| Service | Ownership |
| --- | --- |
| auth-service | user, role, organization |
| scholarship-service | scholarship, application, bookmark |
| chat-service | chat, notification, FCM/WebSocket |
| matching-service | matching features, scores, recommendation cache |

### 4.2 Sync REST Vs Async Event

Sync REST dung khi caller can ket qua ngay:

```txt
Login
Create application
Load scholarship detail
Get chat messages
```

Async event dung khi side effect khong can block user:

```txt
send notification
precompute matching
refresh recommendation cache
send email
```

### 4.2.1 Distributed System Reality

Microservice nguy hiem o cho request co the di qua nhieu service:

```txt
Gateway
  -> Service A
      -> Service B
          -> Service C
              -> DB
```

Neu moi hop mat 80ms:

```txt
80ms x 3 = 240ms chua tinh DB/serialization/network
```

Neu Service C chet:

```txt
Service B timeout
Service A timeout
Gateway tra 503
```

Day goi la cascade failure.

Can co:

- timeout: khong doi vo han
- retry co gioi han: khong retry bao luc
- circuit breaker: dependency chet thi fail fast
- bulkhead: loi mot dependency khong lam het thread pool chet
- fallback: vi du matching fail thi page van render khong score

Can nho:

```txt
Microservice khong lam he thong tu dong scale tot.
No doi minh quan ly latency, failure, versioning va consistency tot hon.
```

### 4.3 Eventual Consistency

Microservice async co nghia la data co the tre.

Vi du:

```txt
User update profile success
Matching recommendations refresh after worker runs
```

Day la eventual consistency.
Khong phai luc nao cung bug.

Can declare:

```txt
Recommendation can be stale for 5-30 seconds after profile/scholarship update.
```

### 4.4 EduMatch Data Flow

Doc:

```txt
docs/06-data-flow.md
docs/01-system-architecture.md
docs/04-matching-design.md
```

Flow tong quan:

```txt
FE -> Gateway -> Service -> DB
              -> RabbitMQ -> Consumer/Worker -> DB/cache/WebSocket
```

### 4.5 Architectural Smells Can Nho

Sync coupling:

```txt
Scholarship/Chat goi Auth service sync de resolve user.
```

Huong sua:

```txt
Dua userId/role/orgId vao JWT hoac dung local read model.
```

Event contract lan:

```txt
scholarship.updated vua la event update matching, vua co the la notification payload.
```

Huong sua:

```txt
scholarship.updated
scholarship.approved
scholarship.rejected
notification.scholarship.approved
```

Missing outbox:

```txt
DB save xong publish RabbitMQ truc tiep.
```

Huong sua:

```txt
save DB + outbox event cung transaction
background publisher day event ra RabbitMQ
```

### 4.6 Cau Hoi Phong Van Hay Gap

**Hoi:** Vi sao dung RabbitMQ?

**Tra loi mau:**

> Dung RabbitMQ cho side effect khong can tra ket qua ngay, nhu notification va matching precompute. No giup request user nhanh hon va tach service dependency.

**Hoi:** Neu RabbitMQ down thi sao?

**Tra loi mau:**

> Neu publish truc tiep thi co nguy co mat event. Cach tot hon la outbox pattern: luu event vao DB cung transaction, worker/publisher retry day event sau. Consumer can retry va DLQ.

**Hoi:** Eventual consistency la gi?

**Tra loi mau:**

> Write thanh cong o service owner, nhung read model/cache o service khac cap nhat tre qua event. Trong khoang tre do user co the thay data cu.

### 4.7 Checklist Nam Chac

- Biet service nao so huu data nao.
- Phan biet sync REST va async event.
- Giai thich eventual consistency.
- Biet outbox/DLQ dung de lam gi.
- Biet microservice co cost: deploy, observability, versioning, data consistency.

## 5. Cache

### 5.1 Can Hieu Gi

Cache la ban sao tam thoi cua du lieu de doc nhanh hon.

Tu khoa can nam:

- Cache hit: co trong cache.
- Cache miss: khong co, phai doc DB/compute.
- TTL: thoi gian cache song.
- Invalidation: xoa/cache refresh khi data thay doi.
- Stale data: cache cu hon DB.
- Cache key: dinh danh data trong cache.

Khong cache command:

```txt
POST/PUT/PATCH/DELETE
login/register/token
```

Can can than voi private data:

```txt
notification
admin lists
user profile
```

### 5.1.1 Cache Invalidation Moi La Phan Kho

TTL chi la mot cach giam stale data, nhung khong giai quyet het.

Ba pattern hay gap:

**Cache-aside**

```txt
Read:
  check cache
  miss -> read DB
  store cache

Write:
  update DB
  evict cache
```

Hop voi EduMatch public scholarship list/detail.

**Write-through**

```txt
Write:
  write cache + DB cung flow
```

Doc nhanh nhung write phuc tap hon.

**Write-around**

```txt
Write:
  write DB only
Read:
  cache only when data is requested
```

Hop khi data moi write chua chac duoc doc ngay.

Versioned key:

```txt
scholarship:list:v1:{hash}
scholarship:list:v2:{hash}
scholarship:list:v3:{hash}
```

Khi response shape/filter logic doi, tang version de tranh doc cache cu sai contract.

Can nho:

```txt
Cache dung khi minh biet luc nao no duoc tao, song bao lau, va bi xoa khi nao.
```

### 5.2 EduMatch Cache Layers

| Layer | Vi du |
| --- | --- |
| Browser/React Query | FE server state |
| HTTP Cache-Control | public scholarship list/detail short TTL |
| Redis | public scholarship list/detail, auth lookup |
| DB read model | matching_scores, recommendation_cache |
| Worker precompute | top-N recommendations |

Doc:

```txt
docs/CACHE_LAYER_OPTIMIZATION_GUIDE.md
docs/DB_OPTIMIZATION_REPORT.md
matching-service/app/service.py
backend-java/*/config/CacheConfig.java
```

### 5.3 Nen Cache Cai Gi

Nen cache:

- public scholarship detail approved
- public scholarship list page dau
- auth user lookup service-to-service
- provider/admin analytics aggregate TTL ngan
- recommendation read model

Khong nen cache hoac can rat can than:

- notification private feed
- admin raw list
- login/token
- write commands
- data co quyen rieng tung user neu key khong co userId

### 5.4 Cache Key Nen Co Gi

Public list:

```txt
scholarship:list:v1:{hash(q,filters,page,size,sort)}
```

Public detail:

```txt
scholarship:detail:v1:{id}
```

Auth lookup:

```txt
auth:user-by-username:v1:{username}
auth:user-by-id:v1:{id}
```

Matching:

```txt
matching:recs:v1:{applicantId}:{profileVersion}:{algorithmVersion}
```

### 5.5 Cau Hoi Phong Van Hay Gap

**Hoi:** Cache invalidation la gi?

**Tra loi mau:**

> Khi data goc thay doi, cache cu co the sai. Invalidation la xoa hoac refresh cache lien quan, vi du update scholarship thi evict detail/list/provider analytics cache.

**Hoi:** Redis cache hay DB index cai nao truoc?

**Tra loi mau:**

> Thuong toi uu query/index truoc, vi cache khong nen che loi query qua te. Sau khi query on, cache hot read path de giam load va latency.

**Hoi:** Co nen cache notification khong?

**Tra loi mau:**

> Notification la private data, khong nen public/shared cache. Neu cache thi key phai co userId, TTL ngan, va can invalidation khi mark read/new notification. MVP doc DB voi index la du.

### 5.6 Checklist Nam Chac

- Phan biet hit/miss/TTL/invalidation.
- Biet cache cai gi va khong cache cai gi.
- Biet Redis khac DB read model.
- Biet stale data la trade-off.
- Biet cache key phai chua user/version/filter khi can.

## 6. Deploy And Debug

### 6.1 Can Hieu Gi

Deploy/debug la kha nang dua code len moi truong chay that va tim loi khi no hong.

Can nam:

- Docker image la gi.
- Container la gi.
- `docker compose` chay multi-service local.
- Health check.
- Logs.
- Smoke test.
- CI gate.
- Rollback.
- Observability: logs, metrics, traces.

### 6.1.1 Golden Signals

Golden signals la 4 tin hieu nen nhin khi van hanh service.

| Signal | Y nghia | Vi du trong EduMatch |
| --- | --- | --- |
| Latency | request cham | scholarship list p95 tang |
| Traffic | luong request | public search bi spike |
| Errors | loi 4xx/5xx | chat 503 do auth/Redis |
| Saturation | tai nguyen sap het | CPU/RAM/connection pool/queue depth cao |

Neu chi xem log thi chua du.

Can co:

- metrics de biet co bao nhieu loi/cham
- logs de biet request nao loi
- traces de biet request cham o service nao

### 6.1.2 Debug Order Production

Khi co loi tren moi truong chay that:

```txt
1. Service alive khong?
   - health endpoint
   - container status

2. Dependency alive khong?
   - DB
   - Redis
   - RabbitMQ
   - Auth/Matching service

3. Error rate co tang khong?
   - 5xx nao?
   - endpoint nao?

4. Latency tang o dau?
   - gateway
   - service
   - DB
   - external dependency

5. DB co cham khong?
   - slow query
   - EXPLAIN
   - lock/connection pool

6. Cache co van de khong?
   - Redis down
   - cache miss spike
   - serializer/key sai

7. Async co backlog khong?
   - RabbitMQ queue depth
   - worker errors
   - message retry loop
```

Dung debug theo lop, khong doan mo.

### 6.2 EduMatch Local Ports

```txt
Frontend:           http://localhost:3000
Gateway:            http://localhost:19080
Auth service:       http://localhost:19081
Scholarship service:http://localhost:19082
Chat service:       http://localhost:19083
Matching service:   http://localhost:8000
RabbitMQ UI:        http://localhost:15672
Redis:              localhost:6379
```

### 6.3 Lenh Can Biet

Build/run:

```powershell
docker compose up -d --build
```

Check container:

```powershell
docker compose ps
```

Logs:

```powershell
docker compose logs --tail=120 auth-service scholarship-service chat-service matching-service
```

Health:

```powershell
curl.exe http://localhost:19080/gateway/health
curl.exe http://localhost:19080/api/v1/chat/health
curl.exe http://localhost:8000/health
```

Seed data:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed-dev-data.ps1
```

Chat QC:

```powershell
node scripts/qc-chat-edge-api.mjs
```

### 6.4 Debug Theo Trieu Chung

API 401:

```txt
Check token co gui Authorization header khong.
Check token het han khong.
Check gateway co forward header khong.
```

API 403:

```txt
User da login nhung role khong du.
Check Spring Security rule.
Check owner resource.
```

API 500:

```txt
Xem service log.
Tim stack trace.
Check DB connection/serialization/null pointer.
```

API 503:

```txt
Service dependency loi.
Vi du chat goi auth fail, Redis serializer fail, matching down.
```

Page cham:

```txt
Network tab -> request nao cham?
Backend log -> endpoint nao cham?
DB EXPLAIN -> query nao scan nhieu?
```

Recommendation khong cap nhat:

```txt
Check RabbitMQ queue.
Check matching-consumer log.
Check celery-worker log.
Check matching_db recommendation_cache.
```

Notification khong realtime:

```txt
Check RabbitMQ notification event.
Check chat-service NotificationConsumer.
Check WebSocket connection/subscription.
Check FE hook/store.
```

### 6.5 CI/CD Can Hieu

CI gate nen chay truoc deploy:

```txt
mvn test
pytest
npm type-check
npm lint
npm build
```

Deploy nen co:

- staging truoc production
- environment approval cho production
- smoke test sau deploy
- rollback workflow
- concurrency cancel de tranh 2 deploy dap nhau

### 6.6 Cau Hoi Phong Van Hay Gap

**Hoi:** Smoke test la gi?

**Tra loi mau:**

> La tap test nhanh sau deploy de dam bao service chay duoc cac luong toi thieu, vi du health, login, list scholarship, chat health. No khong thay unit test, nhung giup phat hien deploy hong.

**Hoi:** Observability gom nhung gi?

**Tra loi mau:**

> Logs de biet event/request nao loi, metrics de biet latency/error rate/resource, traces de theo request qua nhieu service. Microservice can ca ba vi loi co the nam o service khac.

**Hoi:** Rollback la gi?

**Tra loi mau:**

> La quay lai version/revision truoc khi release moi bi loi. Can co image tag/revision cu va smoke test sau rollback.

### 6.7 Checklist Nam Chac

- Chay duoc Docker compose.
- Xem duoc logs.
- Goi duoc health endpoint.
- Hieu smoke test.
- Biet debug 401/403/500/503.
- Hieu CI gate va rollback de lam gi.

## 6.8 Production Thinking

Day la phan nen nho khi phong van backend.

```txt
Code chay duoc local != production ready.
```

So sanh:

| Junior thuong lam | Production can co |
| --- | --- |
| Works locally | health check + smoke test |
| Console/log tuy tien | structured logs + requestId |
| Khong timeout | timeout moi external call |
| Retry vo toi va | retry co gioi han + backoff |
| Khong rate limit | rate limit hot/auth/search APIs |
| Khong metric | latency/error/cache/DB metrics |
| Khong rollback | rollback workflow |
| Publish event truc tiep | outbox + retry + DLQ |
| Response Map/entity | API DTO/contract |
| Query chay duoc | EXPLAIN + index + load test |

Noi ve production nen dung logic:

```txt
Neu dependency chet thi sao?
Neu request bi retry thi sao?
Neu data lon gap 10 lan thi sao?
Neu deploy loi thi rollback the nao?
Neu user bao cham thi minh xem metric/log nao?
```

Day la khac biet giua "viet feature" va "so huu feature".

## 7. Lo Trinh Hoc 14 Ngay

### Ngay 1: Request Flow

Doc:

```txt
docs/06-data-flow.md
docs/10-junior-backend-learning-guide.md section 0.5
```

Lam:

- Ve lai flow public scholarship list.
- Ve lai flow apply scholarship.
- Giai thich cho nao sync, cho nao async.
- Tu tra loi: neu scholarship list cham thi debug theo thu tu nao?

### Ngay 2-3: HTTP/API

Doc:

```txt
docs/02-api-contract.md
docs/API_STANDARDIZATION_GUIDE.md
```

Lam:

- Goi 5 endpoint bang `curl`.
- Ghi lai endpoint nao public, endpoint nao can token.
- Tu giai thich 401 vs 403.
- Giai thich idempotency bang flow apply scholarship retry.

### Ngay 4-6: Database

Doc:

```txt
docs/DB_OPTIMIZATION_REPORT.md
```

Lam:

- Chay `SHOW INDEX`.
- Chay `EXPLAIN ANALYZE`.
- So sanh query co index va khong index neu co the.
- Giai thich vi sao browse list dung index `(is_public, moderation_status, created_at)`.
- Giai thich cardinality va vi sao boolean index don le thuong yeu.
- Tim endpoint nao co the bi COUNT query cham.

### Ngay 7-8: Backend Service

Doc code:

```txt
V1ScholarshipController.java
ScholarshipService.java
ApplicationService.java
NotificationController.java
ChatService.java
```

Lam:

- Ve flow `POST /api/v1/applications`.
- Danh dau controller/service/repository.
- Tim noi dung `@Transactional`.
- Tim mot cho transaction co external call/event publish va giai thich rui ro.

### Ngay 9-10: Microservice

Doc:

```txt
docs/01-system-architecture.md
docs/06-data-flow.md
```

Lam:

- Ve flow user update profile -> matching worker.
- Giai thich sync vs async trong he thong.
- Tim 3 event RabbitMQ dang dung.
- Giai thich cascade failure bang vi du service A goi service B.

### Ngay 11-12: Cache

Doc:

```txt
docs/CACHE_LAYER_OPTIMIZATION_GUIDE.md
```

Lam:

- Goi public scholarship list/detail 2 lan.
- Xem Redis key.
- Giai thich cache hit/miss.
- Giai thich vi sao notification khong nen public cache.
- Giai thich cache-aside va versioned key.

### Ngay 13: Deploy/Debug

Doc:

```txt
docs/07-deployment.md
docs/08-runbook.md
docs/OBSERVABILITY_RUNBOOK.md
```

Lam:

- `docker compose up -d --build`
- `docker compose ps`
- xem logs 4 service
- chay chat QC script
- debug mot loi gia lap: goi endpoint can token ma khong co token.
- Giai thich 4 golden signals.

### Ngay 14: Tong Hop

Tu tra loi 10 cau:

1. EduMatch co may service?
2. Service nao so huu DB nao?
3. Request scholarship list di qua dau?
4. N+1 la gi?
5. Vi sao index giup query nhanh?
6. RabbitMQ dung cho luong nao?
7. Matching service sync hay async?
8. Cache public list co rui ro gi?
9. Neu API 503 thi check dau tien o dau?
10. Architectural smell lon nhat hien tai la gi?
11. Code chay local khac production-ready the nao?
12. Outbox pattern giai quyet van de gi?

## 8. 30 Cau Phong Van Tu Luyen

1. REST API la gi?
2. DTO dung de lam gi?
3. 401 va 403 khac nhau the nao?
4. Pagination vi sao quan trong?
5. Index la gi?
6. Composite index dung the nao?
7. `EXPLAIN ANALYZE` cho biet gi?
8. N+1 query la gi?
9. Transaction rollback khi nao?
10. Controller/Service/Repository tach de lam gi?
11. Microservice co loi va hai gi?
12. Service ownership la gi?
13. Sync REST khi nao, async event khi nao?
14. Eventual consistency la gi?
15. Outbox pattern giai quyet van de gi?
16. Cache hit/miss/TTL la gi?
17. Cache invalidation la gi?
18. Redis khac DB index the nao?
19. Smoke test la gi?
20. Observability gom nhung gi?
21. Request scholarship list di qua nhung layer nao?
22. Khi API cham, debug theo thu tu nao?
23. Cardinality/selectivity cua index la gi?
24. Vi sao COUNT query trong pagination co the cham?
25. Vi sao khong nen goi external service trong transaction?
26. Cascade failure la gi?
27. Circuit breaker dung de lam gi?
28. Cache-aside khac write-through the nao?
29. Golden signals gom nhung gi?
30. Production ready khac works locally the nao?

## 9. Cach Noi Ve Viec Dung AI Khi Moi Vao Nghe

Khong nen noi:

```txt
AI lam het.
```

Nen noi:

```txt
Em dung AI nhu pair programmer de tang toc implementation, nhung em tu review flow, chay test, doc log, doc EXPLAIN, va kiem tra architectural risk. Em hieu phan nao em da lam, phan nao con yeu va can cai thien.
```

Neu bi hoi sau, noi that:

```txt
Em moi vao nghe nen chua dam nhan minh thiet ke production system tu dau. Nhung qua project nay em da hoc cach doc flow microservice, tim N+1, toi uu DB bang index/EXPLAIN, chuan hoa API, them cache, dung RabbitMQ cho async va viet smoke test/deploy checklist.
```

Noi nhu vay vua that, vua co luc.

## 10. Ket Luan

Sau khi hoc 6 mang nay, muc tieu la co the nhin mot loi va biet bat dau tu dau:

```txt
API loi -> status code + log
Page cham -> network + endpoint + DB explain
Data khong cap nhat -> consistency + event/worker
Cache sai -> key + TTL + invalidation
Deploy loi -> container + health + logs + rollback
```

Do la nen tang quan trong nhat cho junior backend/fullstack.
