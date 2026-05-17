# Bao cao toi uu Database EduMatch

Ngay ghi nhan: 2026-05-12

Tai lieu nay tong hop nhung viec da lam, output benchmark thuc te, nhung diem can nhin tiep, va lo trinh hoc/lap lai khi toi uu DB cho he thong microservice EduMatch.

## 1. Boi canh he thong

Database hien tai:

| Service | Database | Ghi chu |
| --- | --- | --- |
| auth-service | MySQL 8 | Spring Boot/JPA |
| scholarship-service | MySQL 8 | Spring Boot/JPA, noi co nhieu query list/count/bookmark |
| chat-service | MySQL 8 | Spring Boot/JPA |
| matching-service | PostgreSQL 14 | FastAPI/SQLAlchemy, dung UUID/ARRAY cua Postgres |
| event/worker | RabbitMQ | Matching consumer/worker nghe event |

Ket luan nhanh:

- Scholarship DB la noi can uu tien toi uu dau tien vi no phuc vu browse list, application count, bookmark, admin/provider analytics.
- Matching service dung PostgreSQL rieng, khong dung MySQL.
- Redis da duoc them vao docker-compose cho Java cache layer (`auth-service`, `scholarship-service`).
- Matching-service hien van dung PostgreSQL read model/cache table, chua dung Redis rieng.
- Hien chua co pgvector/Qdrant/vector DB; matching van la rule-based + cache DB + worker.

## 2. Van de phat hien

Truoc khi toi uu, cac bang quan trong trong scholarship DB chi co `PRIMARY KEY`, gan nhu khong co secondary index:

- `opportunities`
- `applications`
- `bookmarks`

He qua:

- Browse scholarship public co the bi full table scan.
- Provider analytics/count applications co the scan het `applications`.
- Bookmark lookup theo user co the scan het `bookmarks`.
- Khi data tu 10k len 100k/1M, query se cham theo kich thuoc bang.

Ngoai DB index, van con cac diem nen de y:

- `LIKE '%keyword%'` khong an B-tree index tot. Neu search that su lon, can FULLTEXT index hoac search engine rieng.
- `incrementViewCount` dang read-modify-write, traffic cao co the bi race/lost update. Nen doi thanh atomic update hoac async aggregate.
- `spring.jpa.hibernate.ddl-auto=update` tien cho dev nhung khong tot cho deploy/cloud. Nen dung Flyway/Liquibase migration.
- Qua nhieu index lam cham write. Index phai di theo query thuc su can toi uu, khong nen them tran lan.

## 3. Nhung gi da lam

### 3.1 Them script index cho scholarship DB

File:

```txt
db/optimization/scholarship-indexes.sql
```

Index da them:

| Table | Index | Muc dich |
| --- | --- | --- |
| opportunities | `idx_opportunities_public_status_deadline_created` | filter public/status/deadline |
| opportunities | `idx_opportunities_public_status_created` | browse top moi nhat, tranh sort lon |
| opportunities | `idx_opportunities_creator` | provider dashboard/analytics |
| opportunities | `idx_opportunities_creator_deadline` | upcoming deadlines cua provider |
| opportunities | `idx_opportunities_moderation_status` | admin/status count/filter |
| opportunities | `idx_opportunities_application_deadline` | expired/upcoming count |
| applications | `idx_applications_applicant_opportunity` | user application status theo list opportunities |
| applications | `idx_applications_opportunity_status` | count/status theo scholarship |
| applications | `idx_applications_opportunity_submitted` | recent applications/order by submitted |
| applications | `idx_applications_status` | admin stats/count by status |
| bookmarks | `idx_bookmarks_applicant_opportunity` | bookmark lookup theo user + list card |
| bookmarks | `idx_bookmarks_opportunity` | delete scholarship / cleanup bookmark |

Chay apply index:

```powershell
Get-Content .\db\optimization\scholarship-indexes.sql | docker compose exec -T scholarship-db mysql -uroot "-p$env:SCHOLARSHIP_DB_ROOT_PASSWORD" scholarship_db
```

Script duoc viet idempotent: chay lai se check `information_schema.statistics` truoc, khong tao trung index.

### 3.2 Them seed load test lon

File:

```txt
db/seed/scholarship-large-load-test.sql
```

Script:

```powershell
.\scripts\seed-dev-data.ps1 -LargeLoadTest
```

Output:

```txt
large_load_opportunities  10000
large_load_applications   30000
large_load_bookmarks      20000
```

Tong DB sau seed:

```txt
opportunities                10106
applications                 30303
bookmarks                    20246
opportunity_to_tags          10220
opportunity_required_skills  15225
```

## 4. Benchmark output

### 4.1 Public scholarship list

Query mau:

```sql
SELECT id, title, application_deadline, created_at
FROM opportunities
WHERE is_public = 1
  AND moderation_status = 'APPROVED'
  AND application_deadline >= CURDATE()
ORDER BY created_at DESC
LIMIT 12;
```

Truoc index, gia lap bang `IGNORE INDEX` tren dataset 10k:

```txt
Table scan on opportunities
rows scanned: 10106
actual time: 65.2ms
```

Sau index:

```txt
Index range scan using idx_opportunities_public_status_created
actual time: 2.79ms
```

Neu force dung dung index:

```txt
Index lookup using idx_opportunities_public_status_created
actual time: 0.38..0.40ms
```

Nhan xet:

- Index `(is_public, moderation_status, created_at)` hop voi browse list vi API thuong lay top moi nhat.
- Index `(is_public, moderation_status, application_deadline, created_at)` hop voi filter deadline, nhung neu sort theo `created_at` thi MySQL van co the phai sort.
- Voi data nho, MySQL co the van chon table scan vi scan 100 dong re hon di index. Do vay phai test bang 10k/100k.

### 4.2 Provider application count

Query mau:

```sql
SELECT opportunity_id, COUNT(*) AS application_count
FROM applications
WHERE opportunity_id IN (
    SELECT id FROM opportunities WHERE creator_user_id = 2001
)
GROUP BY opportunity_id;
```

Truoc index:

```txt
Table scan on applications
rows scanned: 30303
actual time: 244ms
```

Sau index:

```txt
Covering index lookup on opportunities using idx_opportunities_creator
Covering index lookup on applications using idx_applications_opportunity_submitted
actual time: 47.7ms
```

Nhan xet:

- Cai loi lon nhat la scan het `applications`.
- Co index `opportunities.creator_user_id` thi DB lay danh sach scholarships cua provider nhanh.
- Co index tren `applications.opportunity_id` thi count theo opportunity nhanh hon nhieu.

### 4.3 Bookmark lookup

Query mau:

```sql
SELECT opportunity_id
FROM bookmarks
WHERE applicant_user_id = 1001;
```

Truoc index:

```txt
Table scan on bookmarks
rows scanned: 20246
actual time: 15.1ms
```

Sau index:

```txt
Covering index lookup using idx_bookmarks_applicant_opportunity
actual time: 5.98ms
```

Nhan xet:

- Query bookmark theo user nen co composite index `(applicant_user_id, opportunity_id)`.
- Neu FE hien 12 cards, backend nen query bookmark batch cho 12 id, khong goi tung card.

### 4.4 Latency API qua gateway

Endpoint:

```txt
GET http://localhost:19080/api/scholarships?isPublic=true&currentDate=2026-05-12&page=0&size=12
```

Warm runs sau khi co 10k data + index:

```txt
Run  Ms
2    148.19
3    159.86
4    120.40
5    117.34
6    124.71
7    119.84
8    117.18
9    114.03
10   116.48
```

Nhan xet:

- DB query rieng da xuong rat nhieu, nhung API end-to-end van co overhead cua Spring/JPA/gateway/serialization/network.
- Lan dau thuong cham hon do cold start/cache.
- Neu muon API nhanh hon nua, phai profile service code, query count/page, DTO mapping, fetch tags/skills, va gateway.

## 5. Lenh can biet de phan tich DB

### 5.1 Xem so dong

```powershell
docker compose exec -T scholarship-db mysql -uroot "-p$env:SCHOLARSHIP_DB_ROOT_PASSWORD" scholarship_db -e "SELECT 'opportunities' AS table_name, COUNT(*) AS rows_count FROM opportunities UNION ALL SELECT 'applications', COUNT(*) FROM applications UNION ALL SELECT 'bookmarks', COUNT(*) FROM bookmarks;"
```

### 5.2 Xem index

```powershell
docker compose exec -T scholarship-db mysql -uroot "-p$env:SCHOLARSHIP_DB_ROOT_PASSWORD" scholarship_db -e "SHOW INDEX FROM opportunities; SHOW INDEX FROM applications; SHOW INDEX FROM bookmarks;"
```

### 5.3 Chay EXPLAIN ANALYZE MySQL

```powershell
docker compose exec -T scholarship-db mysql -uroot "-p$env:SCHOLARSHIP_DB_ROOT_PASSWORD" scholarship_db -e "EXPLAIN ANALYZE SELECT id, title FROM opportunities WHERE is_public = 1 AND moderation_status = 'APPROVED' ORDER BY created_at DESC LIMIT 12;"
```

Doc output:

- `Table scan`: dau hieu can canh giac neu bang lon.
- `Index lookup` / `Index range scan`: tot hon.
- `Covering index lookup`: rat tot, DB lay du lieu tu index, it phai doc table.
- `Sort`: neu sort tren nhieu row, co the can index phu hop voi `ORDER BY`.
- `actual time`: thoi gian thuc te.
- `rows`: so dong DB phai doc.

### 5.4 Gia lap truoc index bang IGNORE INDEX

Dung khi da tao index nhung muon so sanh:

```sql
EXPLAIN ANALYZE
SELECT ...
FROM opportunities IGNORE INDEX (
    idx_opportunities_public_status_created,
    idx_opportunities_public_status_deadline_created
)
WHERE ...
```

### 5.5 Do API latency bang PowerShell

```powershell
$url='http://localhost:19080/api/scholarships?isPublic=true&currentDate=2026-05-12&page=0&size=12'
1..10 | ForEach-Object {
  $ms=(Measure-Command { Invoke-WebRequest -UseBasicParsing $url | Out-Null }).TotalMilliseconds
  [pscustomobject]@{Run=$_;Ms=[math]::Round($ms,2)}
} | Format-Table -Auto
```

### 5.6 Phan tich PostgreSQL cua matching-service

```powershell
docker compose exec -T matching-db psql -U matching_user -d matching_db -c "\dt"
docker compose exec -T matching-db psql -U matching_user -d matching_db -c "\di"
docker compose exec -T matching-db psql -U matching_user -d matching_db -c "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM recommendation_cache WHERE target_type='applicant' AND target_id='1001' ORDER BY matching_score DESC LIMIT 20;"
```

Doc output Postgres:

- `Seq Scan`: scan ca bang.
- `Index Scan` / `Index Only Scan`: tot.
- `Buffers`: doc tu cache hay disk.
- `Sort Method`: sort in-memory hay spill disk.

## 6. Nen nhin vao dau trong source

### Scholarship service

| File | Can nhin gi |
| --- | --- |
| `backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/service/ScholarshipService.java` | Noi gom logic list/detail/analytics/count/bookmark/application |
| `backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/repository/OpportunityRepository.java` | Query opportunities, creator, status, deadline |
| `backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/repository/ApplicationRepository.java` | Query count/status/recent/applicant/opportunity |
| `backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/repository/BookmarkRepository.java` | Query bookmark theo user/opportunity |
| `backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/repository/specification/OpportunitySpecification.java` | Filter/search public list |
| `db/optimization/scholarship-indexes.sql` | Index da apply |
| `db/seed/scholarship-large-load-test.sql` | Dataset 10k de benchmark |

### Matching service

| File | Can nhin gi |
| --- | --- |
| `matching-service/app/models.py` | Bang `matching_scores`, `recommendation_cache`, indexes |
| `matching-service/app/service.py` | Batch score/cache/recommendation read path |
| `matching-service/app/matching.py` | Rule scorer/hard filter/breakdown |
| `matching-service/app/workers.py` | Precompute recommendations |
| `matching-service/scripts/evaluate_matching.py` | Eval quality/latency matching |
| `db/seed/matching-dev.sql` | Seed feature rows |

## 7. Nen lam gi tiep theo

### P0 - Nen lam ngay

1. Dua `db/optimization/scholarship-indexes.sql` vao quy trinh deploy/cloud.
2. Dung Flyway/Liquibase cho scholarship-service thay vi chi dua vao `ddl-auto=update`.
3. Bat slow query log o MySQL khi benchmark.
4. Chay lai `EXPLAIN ANALYZE` moi khi them endpoint/filter moi.
5. Kiem tra lai FE Network tab: list 12 cards khong duoc goi 12 request score/bookmark/application.

### P1 - Toi uu tiep khi data lon hon

1. Benchmark 100k opportunities, 300k applications, 200k bookmarks.
2. Kiem tra query keyword search. Neu keyword quan trong, xem muc "Toi uu search" ben duoi.
3. Toi uu `incrementViewCount` thanh atomic SQL:

```sql
UPDATE opportunities
SET views_cnt = COALESCE(views_cnt, 0) + 1
WHERE id = ?;
```

4. Tach dashboard/analytics thanh aggregate query SQL, tranh load tat ca rows roi tinh trong Java.
5. Them pagination/limit cho cac list provider neu provider co hang nghin scholarships.

### P2 - Matching DB/Postgres

1. Chay `EXPLAIN (ANALYZE, BUFFERS)` cho:
   - `recommendation_cache` top-N by applicant.
   - `matching_scores` score by applicant/opportunity.
   - cache cleanup by `expires_at`.
2. Can nhac unique constraint neu moi applicant-opportunity chi nen co mot score:

```sql
CREATE UNIQUE INDEX ... ON matching_scores(applicant_id, opportunity_id);
```

3. Neu them embedding:
   - MVP: Postgres + `pgvector`.
   - Khi vector search/filter nang: Qdrant.
4. LLM/vector khong nen nam trong hot path. Worker/cache phai la duong chinh.

## 8. Nen hoc them gi

Thu tu hoc de dung ngay cho project nay:

1. Index co ban: B-tree, composite index, leftmost prefix.
2. `EXPLAIN ANALYZE`: doc table scan, index scan, sort, rows, actual time.
3. Pagination: offset pagination vs keyset pagination.
4. N+1 query: FE N+1, backend JPA lazy loading, batch fetch.
5. Transaction va isolation: race condition khi count/view/update.
6. JPA performance: lazy/eager, DTO projection, entity graph, batch size.
7. Migration: Flyway/Liquibase, rollback, schema versioning.
8. MySQL slow query log va performance schema.
9. PostgreSQL EXPLAIN/BUFFERS cho matching service.
10. Cache design: cache key versioning, invalidation, stale data.

## 9. Cach suy nghi khi toi uu DB

Dung checklist nay truoc khi them index:

1. Endpoint nao cham?
2. Query SQL that su la gi?
3. Bang co bao nhieu row?
4. Query filter bang cot nao?
5. Query sort/order bang cot nao?
6. Query co limit/page khong?
7. `EXPLAIN ANALYZE` dang scan bao nhieu row?
8. Index nao phu hop voi `WHERE + ORDER BY`?
9. Them index xong actual time/rows co giam khong?
10. Index co lam write/update cham dang ke khong?

Nguyen tac ngan gon:

```txt
Do truoc -> xem EXPLAIN -> them index dung query -> do lai -> giu cai co metric tot.
```

## 10. Toi uu search

Quyet dinh kien truc search chi tiet nam o:

```txt
docs/SEARCH_ARCHITECTURE_DECISION.md
```

Search khong chi co mot cach toi uu. Chon giai phap dua theo loai search, quy mo data, yeu cau ranking, va muc doanh nghiep cua he thong.

### 10.1 Hien trang trong project

Scholarship public/admin search dang dung:

```java
LOWER(title) LIKE '%keyword%'
OR LOWER(fullDescription) LIKE '%keyword%'
```

Admin application search dang dung:

```java
LOWER(applicantUserName) LIKE '%keyword%'
OR LOWER(applicantEmail) LIKE '%keyword%'
```

Van de:

- `LIKE '%keyword%'` co wildcard o dau nen B-tree index gan nhu khong giup duoc.
- `LOWER(column)` lam DB phai tinh function tren moi row, cang kho dung index.
- Search khong co ranking tot. Ket qua chi la match/khong match.
- Khi 100k/1M rows, full scan se thay ro.

### 10.2 Case 1: Filter chinh xac, khong phai search text

Vi du:

- status = `APPROVED`
- public = true
- deadline >= today
- level = `MASTER`
- studyMode = `ONLINE`
- creatorUserId = 2001

Nen dung:

- B-tree index.
- Composite index theo `WHERE + ORDER BY`.

Vi du:

```sql
CREATE INDEX idx_opportunities_public_status_created
ON opportunities(is_public, moderation_status, created_at);
```

Dung khi:

- User chon filter dropdown.
- Admin filter status.
- Provider xem scholarships cua minh.
- Query co dieu kien ro rang va lap lai nhieu.

Khong can FULLTEXT cho case nay.

### 10.3 Case 2: Prefix search

Vi du:

- search email bat dau bang `student1`
- search title bat dau bang `MIT`
- autocomplete don gian

Nen dung:

- B-tree index.
- Query dang `keyword%`, khong phai `%keyword%`.
- Collation case-insensitive hoac cot normalize rieng.

Vi du:

```sql
CREATE INDEX idx_applications_email
ON applications(applicant_email);
```

Query:

```sql
SELECT *
FROM applications
WHERE applicant_email LIKE CONCAT(:keyword, '%')
ORDER BY submitted_at DESC
LIMIT 20;
```

Dung khi:

- Admin tim theo email/user id.
- O search co tinh autocomplete prefix.
- Can nhanh, khong can ranking semantic.

Neu van can search giua chuoi nhu `%gmail.com%`, B-tree khong giai quyet tot.

### 10.4 Case 3: Full-text search MVP trong MySQL

Dung khi:

- Search title/description hoc bong.
- Data tam muc 10k den vai tram nghin rows.
- Can ranking co ban.
- Muon giu he thong don gian, chua muon them Elasticsearch/OpenSearch.

Da them script optional:

```txt
db/optimization/scholarship-search-indexes.sql
```

Apply:

```powershell
Get-Content .\db\optimization\scholarship-search-indexes.sql | docker compose exec -T scholarship-db mysql -uroot "-p$env:SCHOLARSHIP_DB_ROOT_PASSWORD" scholarship_db
```

Index:

```sql
ALTER TABLE opportunities
ADD FULLTEXT INDEX ft_opportunities_title_description (title, full_description);
```

Query mau:

```sql
SELECT
    id,
    title,
    application_deadline,
    created_at,
    MATCH(title, full_description) AGAINST (:keyword IN NATURAL LANGUAGE MODE) AS relevance
FROM opportunities
WHERE is_public = 1
  AND moderation_status = 'APPROVED'
  AND application_deadline >= CURDATE()
  AND MATCH(title, full_description) AGAINST (:keyword IN NATURAL LANGUAGE MODE)
ORDER BY relevance DESC, created_at DESC
LIMIT 12;
```

Voi Spring Data JPA nen dung native query rieng cho search keyword, con query filter binh thuong giu Specification.

Vi du repository shape:

```java
@Query(
    value = """
        SELECT *,
               MATCH(title, full_description)
               AGAINST (:keyword IN NATURAL LANGUAGE MODE) AS relevance
        FROM opportunities
        WHERE is_public = true
          AND moderation_status = 'APPROVED'
          AND application_deadline >= CURRENT_DATE
          AND MATCH(title, full_description)
              AGAINST (:keyword IN NATURAL LANGUAGE MODE)
        ORDER BY relevance DESC, created_at DESC
        LIMIT :limit OFFSET :offset
    """,
    nativeQuery = true
)
List<Opportunity> searchFullText(@Param("keyword") String keyword, ...);
```

Luu y quan trong:

- MySQL FULLTEXT co stopword va minimum token length. Tu ngan nhu `AI` co the khong match neu cau hinh mac dinh.
- Tieng Viet co dau/khong dau can normalize trong app hoac them cot `search_text`.
- FULLTEXT tot cho keyword search, khong phai semantic matching.
- FULLTEXT index lam write/update cham hon mot chut vi phai update inverted index.

### 10.5 Case 4: Search tieng Viet, typo, fuzzy, autocomplete xin hon

Dung khi:

- User go sai chinh ta.
- Can search co dau/khong dau.
- Can autocomplete, typo tolerance, highlight.
- Ranking can tuy bien theo views, deadline, amount, popularity.

Nen dung search engine rieng:

- Meilisearch: de dung, hop MVP/product search nhe.
- Typesense: nhanh, typo/autocomplete tot, van nhe.
- OpenSearch/Elasticsearch: enterprise hon, manh hon, phuc tap hon.

Kien truc:

```txt
MySQL opportunities la source of truth
 -> scholarship.created/updated/deleted event qua RabbitMQ
 -> search-indexer worker
 -> search engine index
 -> API search doc ids
 -> Scholarship service lay details hoac tra search DTO
```

Nguyen tac doanh nghiep:

- DB chinh van la source of truth.
- Search index la read model, co the eventual consistent.
- Phai co job reindex full de rebuild khi index hong.
- Phai co fallback: search engine chet thi API co the fallback ve DB filter/FULLTEXT co ban.

### 10.6 Case 5: Semantic search / matching theo nghia

Vi du:

- User co skill "deep learning", hoc bong ghi "neural networks".
- User hoc "software engineering", hoc bong ghi "backend distributed systems".
- Can recommend khong chi theo keyword.

Nen dung:

- Rule filter truoc: GPA, deadline, public, level.
- Embedding/vector search sau.
- Rerank bang rule scorer.

Lua chon cong nghe:

- MVP: PostgreSQL + `pgvector`.
- Filter/vector search nang hon: Qdrant.
- Enterprise search da co OpenSearch: co the dung OpenSearch vector/hybrid neu team da quen.

Pipeline:

```txt
Applicant profile
 -> normalize skills/major
 -> embedding
 -> hard filter opportunities
 -> vector search top 200
 -> rule rerank top 50
 -> cache top 20
 -> FE doc recommendation cache
```

Khong nen dung LLM moi request search/list. LLM nen o background de parse CV, normalize skill, sinh explanation.

### 10.7 Case 6: Admin search applications

Voi admin application, search theo email/name khac scholarship search:

- Email nen uu tien exact/prefix search.
- Name co the prefix/contains tuy yeu cau.
- Status/opportunityId la filter chinh, phai dung B-tree.

Nen sua query theo huong:

- Neu keyword co `@`, search email exact/prefix.
- Neu keyword la text name, co the prefix search truoc.
- Neu can contains/fuzzy name, dua vao FULLTEXT/search engine.

Index nen co:

```sql
CREATE INDEX idx_applications_status_submitted
ON applications(status, submitted_at);

CREATE INDEX idx_applications_opportunity_status_submitted
ON applications(opportunity_id, status, submitted_at);

CREATE INDEX idx_applications_applicant_email
ON applications(applicant_email);
```

Khong nen mac dinh dung:

```sql
LOWER(applicant_email) LIKE '%keyword%'
```

cho moi request admin khi data lon.

### 10.8 Bang chon giai phap nhanh

| Nhu cau | Nen dung | Ly do |
| --- | --- | --- |
| Filter status/deadline/level/studyMode | B-tree/composite index | Nhanh, don gian, chinh xac |
| Search prefix email/title | B-tree + `keyword%` | Re, nhanh |
| Search title/description MVP | MySQL FULLTEXT | It them infrastructure |
| Search tieng Viet/fuzzy/autocomplete | Meilisearch/Typesense/OpenSearch | Ranking/search UX tot hon |
| Enterprise search lon, logging, highlight, analytics | OpenSearch/Elasticsearch | Manh, scale tot, van hanh phuc tap hon |
| Semantic recommendation | pgvector/Qdrant + rule rerank | Hieu nghia, khong thay rule hard filter |
| Admin exact lookup | B-tree exact/prefix | Khong can search engine |

### 10.9 Khuyen nghi rieng cho EduMatch

Thu tu lam hop ly:

1. Giu B-tree indexes da them cho filter/list.
2. Doi search scholarship keyword tu `LIKE '%keyword%'` sang MySQL FULLTEXT.
3. Them normalize search text neu can tieng Viet co dau/khong dau.
4. Neu demo/luan van can trong "enterprise architecture", ve them search-indexer worker + RabbitMQ + OpenSearch/Meilisearch.
5. Matching/recommendation thi dung hybrid rule + embedding rieng, khong tron voi public keyword search.

Quyet dinh ngan gon:

```txt
MVP search: MySQL FULLTEXT.
Product search tot hon: Meilisearch/Typesense.
Enterprise/heavy search: OpenSearch/Elasticsearch.
Semantic matching: pgvector/Qdrant + worker/cache.
```

## 11. Ket luan

He thong khong phai "built ngu", ma dang o trang thai dev/MVP nen thieu nhung thu production can co:

- index phu hop query thuc te
- load-test data
- migration schema
- slow-query/profiling
- cache/worker cho hot path

Phan da toi uu cho scholarship DB cho thay ket qua ro:

```txt
Public list:       65.2ms  -> 2.79ms DB query
Provider counts:   244ms   -> 47.7ms DB query
Bookmark lookup:   15.1ms  -> 5.98ms DB query
```

Buoc tiep theo nen lam la bien cac script nay thanh migration/deploy step, roi profile tiep API layer de giam phan overhead con lai cua Spring/JPA/gateway.

Tai lieu tiep theo:

```txt
docs/CACHE_LAYER_OPTIMIZATION_GUIDE.md
```
