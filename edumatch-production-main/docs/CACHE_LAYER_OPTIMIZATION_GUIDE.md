# Cache Layer Optimization Guide

Ngay ghi nhan: 2026-05-13

Tai lieu nay chia cache layer theo tung muc do de de quan sat, de implement dan dan, va de giai thich trong bao cao/phong van.

## 0. Trang thai thuc thi hien tai

Cap nhat sau implementation cache layer dau tien:

### Da lam

- Them Redis local vao `docker-compose.yml`:
  - service: `redis`
  - image: `redis:7-alpine`
  - container: `redis-cache-test`
  - healthcheck: `redis-cli ping`
- `auth-service` va `scholarship-service` da connect Redis qua:
  - `SPRING_CACHE_TYPE=redis`
  - `SPRING_DATA_REDIS_HOST=redis`
  - `SPRING_DATA_REDIS_PORT=6379`
- Them Spring Cache + Redis dependencies cho:
  - `backend-java/auth-service/pom.xml`
  - `backend-java/scholarship-service/pom.xml`
- Them cache config rieng cho tung service:
  - `scholarship:` prefix cho scholarship cache.
  - `auth:` prefix cho auth cache.
  - TTL mac dinh `60s`.
  - JSON serializer ho tro Java time.
  - Khong cache `null`.
  - Redis loi thi log warn va fallback DB/service, khong lam sap request.
- Scholarship cache:
  - Public list/search cache TTL `60s`.
  - Public detail cache TTL `5m`.
  - Provider analytics TTL `60s`.
  - Admin stats/analytics TTL `60s`.
  - Evict khi scholarship create/update/delete/moderate.
  - Evict analytics khi application create/status update.
- HTTP cache headers:
  - Public `/api/v1/scholarships` va `/api/v1/scholarships/{id}`: `Cache-Control: public, max-age=30`.
  - Provider/admin/private endpoints: `Cache-Control: no-store`.
- Auth cache:
  - Cache internal user lookup by username TTL `5m`.
  - Cache internal user lookup by id TTL `5m`.
  - Evict khi register/update profile/upload avatar/toggle status/approve employer.
- Matching service:
  - Chua them Redis cho matching.
  - Van dung Postgres read model hien co: `matching_scores`, `recommendation_cache`.
  - Da them Prometheus metrics:
    - `matching_cache_events_total`
    - `matching_recommendation_fallback_total`
- Cloud deploy:
  - Workflow da truyen Redis env cho auth/scholarship.
  - Can co secret `redis-host` tren Azure Container Apps/GitHub environment.

### Da verify

```txt
scholarship-service SearchEndpointSecurityTest: 6 tests pass
auth-service AdminSearchEndpointSecurityTest/UserServiceSearchGuardrailTest/PaginationUtilsTest: 7 tests pass
matching-service python -m compileall app: pass
docker compose config --quiet: pass khi set bien moi truong bat buoc
```

### Chua lam trong slice nay

- Chua them Redis cho matching-service vi Postgres read model hien tai du dung cho giai doan dau.
- Chua them cache stampede protection/per-key lock.
- Chua them stale-while-revalidate.
- Chua them CDN/edge cache.
- Chua them dashboard hien thi Redis hit/miss tu actuator/Prometheus.
- Chua cache tags/skills/options rieng.

## 1. Nguyen tac truoc khi cache

Dung cache sau khi da lam cac viec nen lam truoc:

1. Query dung index.
2. API khong bi N+1.
3. Co pagination/batch endpoint.
4. Biet endpoint nao cham bang metric.
5. Biet du lieu nao duoc phep stale trong bao lau.

Cache khong phai cach sua moi van de. Cache sai co the tao bug kho tim hon DB cham:

- Tra du lieu cu sau khi user update.
- Leak du lieu private vao response public.
- Cache authorization/role qua lau.
- Cache stampede khi nhieu request cung miss.
- Kho invalidate khi co nhieu service.

Cong thuc suy nghi:

```txt
Cache cai doc nhieu, tinh ton kem, chap nhan stale ngan.
Khong cache cai can realtime/chua ro permission/chua do metric.
```

## 2. Cac muc do toi uu cache

| Muc | Ten | Dung khi nao | Do phuc tap | Vi du trong EduMatch |
| --- | --- | --- | --- | --- |
| 0 | No cache, fix query | Chua toi uu DB/API | Thap | index, batch score, pagination |
| 1 | Frontend server-state cache | Giam request lap lai tu UI | Thap | React Query scholarship list/detail |
| 2 | HTTP/static cache | Public response/static assets | Thap-vua | Nginx static assets, public list TTL ngan |
| 3 | Service-local cache | Mot instance, du lieu reference | Vua | tags/skills, config, lookup nho |
| 4 | DB cache/read model | Can durable, inspectable cache | Vua | `matching_scores`, `recommendation_cache` |
| 5 | Redis distributed cache | Nhieu instance, hot read path | Vua-cao | scholarship detail/list, analytics aggregate |
| 6 | Worker precompute/read model | Tinh toan nang, can async | Cao | recommendation top-N, provider analytics |
| 7 | CDN/edge cache | Public traffic lon/toan cau | Cao | public landing/static/public browse |

## 3. Muc 0 - Khong cache voi query dang sai

Truoc cache phai chot:

- SQL query co index.
- `EXPLAIN ANALYZE` khong full scan vo ly.
- FE khong goi 12 request cho 12 cards.
- Backend khong lazy-load N+1.
- Endpoint tra dung page/limit.

Ly do:

- Neu query sai, cache chi che giau loi.
- Khi cache miss, he thong van cham.
- Cache miss dong loat co the lam DB sap nhanh hon.

Metric nen co:

```txt
p95 latency
query count/request
DB rows scanned
cache hit rate neu da co cache
```

## 4. Muc 1 - Frontend cache bang React Query

Repo hien co React Query:

```txt
frontend/src/providers/QueryProvider.tsx
frontend/src/hooks/useApi.ts
```

Dung cho:

- Scholarship list theo filter/page.
- Scholarship detail.
- User profile.
- Application/bookmark status batch.
- Dashboard data neu khong can realtime tung giay.

Query key phai ro rang:

```ts
['scholarships', { keyword, gpa, level, studyMode, page, size }]
['scholarship', scholarshipId]
['application-status', applicantId, opportunityIds]
['bookmark-status', applicantId, opportunityIds]
```

Gia tri goi y:

| Data | staleTime |
| --- | --- |
| public scholarship list | 30s-2m |
| scholarship detail | 1m-5m |
| tags/skills/options | 10m-1h |
| user profile | 1m-5m |
| application/bookmark status | 15s-1m |
| admin dashboard | 30s-2m |

Khi mutation:

```txt
create/update/delete scholarship -> invalidate ['scholarships'], ['scholarship', id]
bookmark toggle -> invalidate bookmark status + current list
apply scholarship -> invalidate application status + my applications
approve/reject application -> invalidate provider/admin dashboard
```

Loi hay gap:

- Dung Context/AppContext de giu server data song song voi React Query.
- Query key thieu filter/page nen data bi reuse sai.
- `staleTime` qua dai cho data ca nhan.

## 5. Muc 2 - HTTP cache va Nginx/CDN cache

Dung cho:

- Static assets: JS/CSS/images.
- Public data khong personalized.
- Response co the stale ngan.

Khong dung public cache cho:

- Response co token/user-specific.
- Match score ca nhan.
- Bookmark/application status.
- Admin/provider dashboard.

Header goi y:

```txt
Static assets:
Cache-Control: public, max-age=31536000, immutable

Public list TTL ngan:
Cache-Control: public, max-age=30, stale-while-revalidate=120

Private user data:
Cache-Control: private, no-store
```

Case EduMatch:

| Endpoint | HTTP cache? | Ghi chu |
| --- | --- | --- |
| public static assets | Co | immutable |
| public scholarship list khong login | Co, TTL ngan | chi khi response khong co matchScore/bookmark |
| scholarship detail public | Co, TTL ngan | tach matchScore ra endpoint rieng |
| `/me`, profile, application status | Khong public | private/no-store |
| admin/provider APIs | Khong public | private/no-store |

## 6. Muc 3 - Service-local in-memory cache

Dung khi:

- Du lieu nho.
- It thay doi.
- Moi service instance tu cache rieng van chap nhan duoc.

Cong nghe:

- Spring Boot: Caffeine cache.
- Python/FastAPI: in-process LRU/TTL cache cho lookup nho.

Case hop ly:

- tags/skills/options.
- static config.
- organization/provider display name TTL ngan.
- auth-service user details TTL 1-5 phut neu role khong doi lien tuc.

Case can canh giac:

- Multi-instance: instance A update, instance B van cache cu.
- Cache permission/role qua lau co the gay bug bao mat.
- Memory leak neu key khong gioi han.

Spring shape:

```java
@Cacheable(cacheNames = "tags")
public List<TagDto> getTags() { ... }

@CacheEvict(cacheNames = "tags", allEntries = true)
public TagDto createTag(...) { ... }
```

Config goi y:

```properties
spring.cache.type=caffeine
spring.cache.caffeine.spec=maximumSize=5000,expireAfterWrite=5m
```

## 7. Muc 4 - DB cache/read model

Day la cache bang database, khong nhanh bang Redis nhung ben va de debug.

Repo da co trong matching-service:

```txt
matching_scores
recommendation_cache
```

Dung khi:

- Can xem/debug cache bang SQL.
- Can durable sau restart.
- Can query top-N co index.
- Cache lien quan den logic domain.

Pattern:

```txt
request -> check cache table
cache hit -> return
cache miss -> compute nhe hoac return fallback/enqueue worker
worker -> refresh cache
```

Index quan trong:

```sql
-- matching_scores
(applicant_id, opportunity_id)
(applicant_id, overall_score DESC)
(expires_at)

-- recommendation_cache
(target_type, target_id, matching_score DESC)
(expires_at)
```

Case EduMatch:

- Batch score card page doc `matching_scores`.
- Recommendation page doc `recommendation_cache`.
- Provider analytics co the co `provider_analytics_cache` neu tinh nang.

Uu diem:

- De do bang `EXPLAIN`.
- De seed/test.
- Khong mat sau restart.

Nhuoc diem:

- Van la DB read/write.
- Neu hot traffic lon, Redis co the tot hon.

## 8. Muc 5 - Redis distributed cache

Dung khi:

- Co nhieu service instances.
- Hot read path goi rat nhieu.
- Can cache shared giua instances.
- Can TTL, atomic lock, rate limit.

Case nen cache Redis:

| Data | Key mau | TTL | Invalidate khi nao |
| --- | --- | --- | --- |
| public scholarship list | `scholarship:scholarshipPublicList::{hash(filters,page,size,sort)}` | 60s | scholarship approved/update/delete |
| scholarship detail | `scholarship:scholarshipPublicDetail::{id}` | 5m | scholarship update/delete/moderate |
| provider analytics | `scholarship:scholarshipProviderAnalytics::{username}` | 60s | application create/status update/scholarship change |
| admin stats | `scholarship:scholarshipAdminStats::all` | 60s | scholarship/application event |
| admin analytics | `scholarship:scholarshipAdminAnalytics::all` | 60s | scholarship/application event |
| auth user by username | `auth:authUserByUsername::{username}` | 5m | user/profile/role/status update |
| auth user by id | `auth:authUserById::{id}` | 5m | user/profile/role/status update |
| matching recommendations | `matching:recs:v1:{applicantId}:{profileVersion}` | 5m-15m | profile/opportunity update |

Ghi chu:

- Key mau trong bang la logical prefix. Spring Redis Cache se tu them prefix theo `computePrefixWith(...)`.
- Matching Redis key hien la huong tuong lai, chua implement trong slice nay.

Cache-aside pattern:

```txt
GET request
 -> read Redis
 -> hit: return
 -> miss: read DB/service
 -> write Redis with TTL
 -> return
```

Can co:

- TTL.
- Versioned key.
- Invalidation event.
- Metrics hit/miss.
- Lock de tranh cache stampede.

Cache stampede:

```txt
100 request cung miss mot key
 -> 100 request cung danh DB
```

Cach giam:

- per-key lock: chi 1 request rebuild cache.
- stale-while-revalidate: tra stale cache, worker refresh sau.
- random jitter TTL: tranh tat ca key het han cung luc.

Key versioning:

```txt
scholarship:detail:v2:{id}
matching:score:v1:{applicantId}:{opportunityId}:{profileVersion}:{opportunityVersion}
```

Khi schema response doi, tang `v1 -> v2` de tranh doc cache cu sai shape.

## 9. Muc 6 - Worker precompute/read model

Day la cache nang cap: khong tinh trong request path nua.

Dung khi:

- Query/tinh toan nang.
- Du lieu thay doi theo event.
- User doc nhieu hon ghi.
- Chap nhan eventual consistency.

Event:

```txt
scholarship.created
scholarship.updated
scholarship.deleted
application.created
application.status.updated
bookmark.changed
user.profile.updated
```

Worker lam:

```txt
load changed entity
recompute affected cache/read model
write cache table/Redis/search index
invalidate old key
```

Case EduMatch:

- Recommendation top-N cho applicant.
- Matching score cache cho visible opportunities.
- Provider analytics aggregate.
- Admin stats aggregate.
- Search index document.

Request path ly tuong:

```txt
GET /recommendations/applicant/{id}
 -> read recommendation_cache/Redis
 -> return top-N
```

Khong ly tuong:

```txt
GET /recommendations/applicant/{id}
 -> scan all opportunities
 -> compute score all pairs
 -> sort
 -> return
```

## 10. Muc 7 - CDN/edge cache

Dung khi:

- Public traffic lon.
- User o nhieu vung dia ly.
- Static/public response co the cache ngoai he thong.

Case:

- Static frontend assets.
- Public landing pages.
- Public scholarship detail/list khong personalized.
- Public images/files.

Khong dung cho:

- Authenticated API.
- Admin/provider/student private data.
- Match score ca nhan.

Doanh nghiep thuong dung:

```txt
Browser cache
 -> CDN/edge cache
 -> API gateway cache
 -> service cache/Redis
 -> DB/read model
```

Nhung khong can nhay len CDN cache neu traffic chua can.

## 11. Case-by-case cho EduMatch

### Public scholarship list

Muc nen dung:

```txt
Muc 1 React Query
Muc 2 HTTP cache ngan neu response public
Muc 5 Redis neu hot
```

Trang thai:

```txt
Da implement Muc 2 + Muc 5 cho /api/v1/scholarships.
Cache key hash theo q/filter/page/size/sort.
TTL Redis: 60s.
HTTP max-age: 30s.
```

Luu y:

- Neu response co `matchScore`, `isBookmarked`, `hasApplied` thi no la personalized, khong public cache.
- Nen tach public list va personalized status thanh endpoint rieng/batch.

### Scholarship detail

Muc nen dung:

```txt
Muc 1 React Query
Muc 5 Redis detail TTL 5-15m
```

Trang thai:

```txt
Da implement Redis detail cache cho /api/v1/scholarships/{id}.
Chi cache neu scholarship public + APPROVED.
TTL Redis: 5m.
HTTP max-age: 30s.
Legacy detail co user dang nhap se no-store.
```

Invalidate:

```txt
scholarship.updated/deleted/moderated
```

### Bookmark/application status

Muc nen dung:

```txt
Muc 1 React Query TTL ngan
Muc 5 Redis optional, key theo applicantId
```

Khong public cache.

### Provider analytics

Muc nen dung:

```txt
Muc 5 Redis aggregate TTL 1-5m
Muc 6 precompute neu data lon
```

Trang thai:

```txt
Da implement Redis aggregate TTL 60s.
Evict khi scholarship/application lien quan thay doi.
Chua tach thanh read model/precompute rieng.
```

Invalidate:

```txt
application.created
application.status.updated
scholarship.created/updated/deleted
```

### Matching score batch

Hien da co:

```txt
Muc 4 DB cache: matching_scores
```

Trang thai:

```txt
Da co DB cache va da them metric hit/miss.
Chua them Redis cho matching.
```

Nen tiep:

```txt
Muc 6 worker refresh
Muc 5 Redis neu traffic score rat cao
```

Cache key nen co:

```txt
applicantId + opportunityId + profileVersion + opportunityVersion + algorithmVersion
```

### Recommendations

Hien da co:

```txt
Muc 4 DB cache: recommendation_cache
```

Trang thai:

```txt
Da co recommendation_cache/read path va da them metric hit/miss/fallback empty.
Redis top-N de sau neu Postgres read model qua tai.
```

Nen tiep:

```txt
Muc 6 precompute top-N
Muc 5 Redis top-N neu page nay doc nhieu
```

### Auth user details

Muc nen dung:

```txt
Muc 3 service-local cache TTL ngan
Muc 5 Redis neu nhieu service cung goi auth-service lien tuc
```

Trang thai:

```txt
Da implement Muc 5 Redis cho internal lookup:
- /api/internal/user/{username}
- /api/internal/user/id/{userId}
TTL: 5m.
Evict khi user/profile/role/status/organizationId thay doi.
Khong cache login/register/token validation response.
```

Canh giac:

- Role/permission doi thi invalidate ngay.
- Khong cache token invalidation qua lau.

### Tags/skills/options

Muc nen dung:

```txt
Muc 3 service-local cache
Muc 1 React Query staleTime dai
```

Day la cache de, rui ro thap.

### Chat/messages

Khong nen cache tuy tien:

- Message moi can realtime.
- Unread count can dung.

Co the cache:

- conversation list TTL rat ngan.
- online presence trong Redis voi TTL.
- WebSocket session mapping.

## 12. Roadmap cache theo do uu tien

### P0 - Lam ngay, it rui ro

1. Da lam: dam bao public list/detail v1 khong cache personalized response.
2. Da lam: them `Cache-Control` ro cho public/private v1 scholarship/application/bookmark paths.
3. Da lam: do cache hit/miss cho matching DB cache bang Prometheus counter.
4. Con can lam: chuan hoa React Query keys/invalidation tren FE.
5. Con can lam: cache tags/skills/options bang React Query va service-local/Redis cache.

### P1 - Nen lam sau DB/JPA profiling

1. Da lam: them Redis vao docker-compose/dev.
2. Da lam: cache scholarship detail/list public TTL ngan.
3. Da lam: cache provider/admin analytics aggregate TTL ngan.
4. Da lam mot phan: eviction truc tiep trong service khi command chay.
5. Con can lam: event invalidation qua RabbitMQ de dong bo cross-service ro hon.
6. Con can lam: cache stampede protection/per-key lock.

### P2 - Enterprise hon

1. Worker precompute provider analytics.
2. Redis stale-while-revalidate cho hot keys.
3. Search index/read model cache.
4. CDN cache public pages/static assets.
5. Dashboard metric: hit rate, miss rate, evictions, stale serves.

## 13. Metrics can do

| Metric | Muc tieu |
| --- | --- |
| cache hit rate | > 80% voi hot endpoints |
| p95 cache hit latency | < 50ms service-level, tuy endpoint |
| p95 cache miss latency | khong vuot SLA qua cao |
| stale serve count | theo doi de biet du lieu cu |
| invalidation count | co event that su dang chay |
| Redis memory usage | khong tang vo han |
| evictions | neu cao thi can tang memory/giam TTL |
| DB load after cache | giam QPS/query time |

## 14. Cau tra loi phong van ngan gon

Neu bi hoi "em toi uu cache layer nhu the nao?", tra loi:

```txt
Em chia cache thanh nhieu muc. Dau tien em khong cache de che loi query, ma toi uu DB/index va batch endpoint truoc. Sau do em dung React Query cho server state o frontend, HTTP cache cho static/public response, service-local cache cho reference data nho, DB cache/read model cho matching_scores va recommendation_cache, Redis cho hot shared cache khi co nhieu instance, va worker precompute cho nhung phan tinh toan nang nhu recommendation top-N. Em luon gan cache voi TTL, versioned key, invalidation event va metric hit/miss de tranh stale data va cache stampede.
```

Mot cau ngan hon:

```txt
Cache tot khong phai la them Redis vao moi cho, ma la chon dung tang cache cho dung loai du lieu: client cache cho UI, HTTP cache cho public, local cache cho reference data, Redis cho hot shared data, va worker/read model cho tinh toan nang.
```
