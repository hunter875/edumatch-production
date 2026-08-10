# Tài liệu đánh giá hiệu năng hệ thống EduMatch

Ngày lập: 2026-05-07

## 1. Kết luận nhanh

He thong hien tai **chua toi uu tot cho luong du lieu tang**. Nhan dinh "frontend dang bi N+1" la dung: trang danh sach hoc bong render moi card roi moi card lai tu goi API de kiem tra trang thai apply. Voi 12 hoc bong tren mot trang, FE co the tao ra 1 request lay danh sach, 1 request batch matching, va them 12 request lay applications cua user. Neu dashboard dung cung `ScholarshipCard` thi loi lap lai o dashboard.

Ngoai FE, backend cung co cac diem N+1 va full-table scan: mapping applications lay documents theo tung application, bookmarks lay opportunity theo tung bookmark, list opportunity co nguy co lazy-load tags/skills theo tung row, admin stats doc ca bang nhieu lan. Matching-service co endpoint batch nhung van tinh tung item tuan tu va commit cache tung diem, nen "batch" hien moi chi giam so request FE, chua giam nhieu chi phi DB/CPU.

Muc do uu tien: **High** cho FE N+1, backend application/bookmark N+1, gateway/docker port mismatch, va matching endpoint URL. **Medium** cho admin stats, RestTemplate timeout, cache/invalidation, React state duplication.

## 2. Kien truc hien tai

Thanh phan chinh:

- `frontend`: Next.js 14, React Query, AppContext legacy, API clients trong `src/lib/api.ts`, `src/services/*.service.ts`, `src/lib/api-client.ts`.
- `backend-java/auth-service`: Spring Boot auth/user/org.
- `backend-java/scholarship-service`: Spring Boot scholarships, applications, bookmarks.
- `backend-java/chat-service`: chat/notification/websocket.
- `matching-service`: FastAPI + PostgreSQL, tinh matching/recommendation, co consumer/Celery.
- `nginx-gateway`: route request den tung service.

Van de kien truc dang lam he thong kho toi uu: frontend co **nhieu API layer song song**. `AppContext` dung `apiClient` mock (`frontend/src/lib/api-client.ts:5`, `frontend/src/lib/api-client.ts:22`), trong khi nhieu page lai dung real services (`frontend/src/services/scholarship.service.ts`) va React Query (`frontend/src/hooks/useApi.ts`). Dieu nay gay chong state, kho cache dung, va de tao request trung lap.

## 3. Bang chung FE N+1

Luon request theo tung card:

- `frontend/src/components/ScholarshipCard.tsx:26`: moi card khoi tao `useApplications()`.
- `frontend/src/components/ScholarshipCard.tsx:30-42`: moi card chay `useEffect` theo `scholarship.id`.
- `frontend/src/components/ScholarshipCard.tsx:33`: moi card goi `checkApplicationStatus(scholarship.id)`.
- `frontend/src/hooks/api.ts:127-138`: `checkApplicationStatus` khong goi endpoint status rieng, ma goi `scholarshipServiceApi.getMyApplications()` roi filter client-side.

Tac dong:

- Trang `frontend/src/app/user/scholarships/page.tsx` hien 12 card/trang. Moi lan vao trang: 1 request list scholarship + 1 request matching batch + 12 request `GET /api/applications/my`.
- Neu React Strict Mode/dev render lai, so request co the nhan doi trong dev.
- Dashboard cung render `ScholarshipCard`, nen tiep tuc bi request theo tung card (`frontend/src/app/user/dashboard/page.tsx:199-240`).

Huong sua de xoa N+1:

1. Lay applications cua user **mot lan** o page/container.
2. Tao `Set<string>` cac `opportunityId` da apply.
3. Truyen `hasApplied` xuong `ScholarshipCard`.
4. Bo `useApplications()` va `useEffect` trong card.
5. Tot hon nua: backend them endpoint `GET /api/applications/my/statuses?opportunityIds=1,2,3` tra ve map `{ [opportunityId]: boolean }`.

## 4. Matching service va matching score

Frontend da co y tuong batch score, nhung implementation con van de:

- `frontend/src/services/matching.service.ts` dat base URL mac dinh la `/api/matching`, nhung lai goi endpoint bat dau bang `/api/v1/...`. Khi qua nginx rewrite `nginx-gateway/nginx.conf:558-574`, request co nguy co thanh duong dan lap `/api/v1/matching/api/v1/...`.
- `matching-service/app/main.py:149-176` la endpoint batch, nhung ben trong van `for opp_id in request.opportunityIds`.
- `matching-service/app/service.py:32` va `matching-service/app/service.py:49` query applicant/opportunity rieng cho moi lan tinh.
- `matching-service/app/service.py:84-129` cache score va `commit()` tung score.

Tac dong:

- Request batch co the bi 404 hoac bi rewrite sai tuy env.
- Neu chay duoc, batch 12 item van co it nhat 12 lan query opportunity + 12 lan query matching cache + 12 lan commit, chua tinh query applicant lap lai.

Huong sua:

- Chuan hoa base URL: neu dung nginx `/api/matching`, endpoint FE chi nen la `/batch-scores`, de gateway rewrite sang `/api/v1/matching/batch-scores`.
- Trong batch endpoint, query applicant 1 lan, query opportunities bang `IN (...)`, query existing matching scores bang composite filters, roi bulk upsert/cache 1 transaction.
- Cache score co TTL va invalidate theo event applicant/opportunity update.

## 5. Backend N+1 va full-table scan

### Application service

N+1 documents:

- `backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/service/ApplicationService.java:134-140`: lay applications cho opportunity, sau do moi application goi `findByApplicationId`.
- `backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/service/ApplicationService.java:243-248`: lay applications cua user, sau do moi application goi `findByApplicationId`.
- `backend-java/scholarship-service/src/main/java/com/edumatch/scholarship/service/ApplicationService.java:265-275`: admin page map tung application, vua lay docs tung row vua lay opportunity title tung row.
- Repository hien chi co `findByApplicationId` (`ApplicationDocumentRepository.java:14`), chua co batch `findByApplicationIdIn`.

Huong sua:

- Them `List<ApplicationDocument> findByApplicationIdIn(Collection<Long> ids)`.
- Group docs theo `applicationId` trong service roi map DTO.
- Them query projection/join cho admin list de lay opportunity title cung luc.
- Them endpoint status theo batch cho FE.

### Bookmark service

N+1 opportunity:

- `BookmarkService.java:77`: lay danh sach bookmarks.
- `BookmarkService.java:83`: moi bookmark lai `opportunityRepository.findById`.

Huong sua:

- Lay opportunityIds tu bookmarks.
- Them `findAllById(opportunityIds)` hoac query join/projection.
- Neu FE chi can saved status, tra ve `List<Long>` opportunityIds thay vi DTO full opportunity.

### Scholarship/opportunity list

Lazy-load tags/skills:

- `Opportunity.java:96` va `Opportunity.java:104`: `tags` va `requiredSkills` la `FetchType.LAZY`.
- `OpportunityDto.java:88-92`: DTO map `opp.getTags().stream()` va `opp.getRequiredSkills().stream()`.
- `ScholarshipService.java:316` va `ScholarshipService.java:407`: list page map `OpportunityDto::fromEntity`.

Tac dong: neu Hibernate khong fetch join/entity graph, moi opportunity co the trigger query rieng cho tags va skills.

Huong sua:

- Dung `@EntityGraph(attributePaths = {"tags", "requiredSkills"})` cho list query can hien tags/skills.
- Hoac tach DTO list nhe: khong tra tags/skills full tren list, chi tra trong detail.
- Can than voi pagination + fetch join many-to-many vi co the duplicate rows; co the dung projection hoac query 2 buoc.

### Admin stats

Full-table scan trong Java:

- `ScholarshipService.java:517-535`: `count()` xong goi `findAll().stream()` nhieu lan cho scholarships/applications.

Huong sua:

- Them repository methods `countByModerationStatus`, `countByStatusIn`, `countByStatus`.
- Mot query aggregate `GROUP BY status` cho dashboard.

## 6. Deployment/gateway co loi cau hinh nghiem trong

Neu chay local qua `docker-compose.yml` va `nginx-gateway/nginx.conf`, gateway dang co nguy co route sai port/service:

- Nginx upstream dung `auth-service:80`, `scholarship-service:80`, `chat-service:80`, `matching-service:80`, `frontend-app:80` (`nginx-gateway/nginx.conf:18-34`).
- Trong Docker/compose, services listen `8081`, `8082`, `8083`, `8000`, `3000`; frontend service ten la `frontend`, khong phai `frontend-app` (`docker-compose.yml:256-278`, `docker-compose.yml:298-337`).
- Scholarship Dockerfile expose `8083` trong khi `application.properties` la `server.port=8082`.

Tac dong: gateway local co the 502/timeout hoac request chay truc tiep vao port service thay vi qua gateway, lam FE behavior khac giua dev/prod.

Huong sua:

- Local nginx upstream nen la `auth-service:8081`, `scholarship-service:8082`, `chat-service:8083`, `matching-service:8000`, `frontend:3000`.
- Sua Scholarship Dockerfile `EXPOSE 8082`.
- Dong bo env var: dung ten Spring relaxed binding hop le, vi du `APP_SERVICES_AUTH_SERVICE_URL` thay cho bien co dau `-`.

## 7. Toi uu caching/state phia frontend

Dang co 2 co che state chong nhau:

- `AppProvider` load initial data bang mock client va `Promise.all` (`AppContext.tsx:228-234`).
- Page/hook khac dung React Query va real service.
- `layout.tsx:31-33` boc `AppProvider`, `QueryProvider`, `AuthProvider`; user/app state co the bi tach lam nhieu nguon su that.

Huong sua:

- Chon mot nguon chinh: React Query cho server state, Zustand/Context chi cho UI/local state.
- Loai bo hoac tach `AppContext` mock khoi production path.
- Moi list page nen cache theo query key co filters/page.
- `ScholarshipCard` phai la presentational component, khong tu fetch server state theo item.

## 8. Uu tien sua theo thu tu

### P0 - sua ngay

1. Xoa FE N+1 trong `ScholarshipCard`.
2. Chuan hoa matching service URL va nginx rewrite.
3. Sua nginx upstream port/service name cho local compose.
4. Them timeout cho RestTemplate trong scholarship/chat service.

### P1 - sua trong sprint gan nhat

1. Batch documents cho applications.
2. Batch opportunities cho bookmarks.
3. EntityGraph/projection cho opportunity tags/skills.
4. Aggregate count queries cho admin stats.
5. Endpoint `GET /api/applications/my/statuses` hoac gan `hasApplied` vao response list scholarships theo user.

### P2 - cai thien sau

1. Cache matching score dung TTL + invalidation theo event.
2. Precompute recommendations sau event thay vi tinh ML on-demand cho moi request.
3. Them load test script cho 100/1,000 scholarships va 10,000 applications.
4. Them metrics: request count per page, p95 latency API, DB query count/request.

## 9. Chi so nen do sau khi sua

Trang danh sach scholarships:

- Truoc sua: `1 + 1 + N` request chinh voi N la so card, cong cac request global tu AppContext.
- Sau sua muc tieu: `1` request scholarships + `1` request application statuses/applications + `1` request matching batch.
- DB query target: khong vuot qua so query hang so theo page, khong tang tuyen tinh theo so card ngoai query list/pagination.

Applications:

- Truoc sua: 1 query applications + N query documents.
- Sau sua: 1 query applications + 1 query documents by `applicationId in (...)`.

Bookmarks:

- Truoc sua: 1 query bookmarks + N query opportunities.
- Sau sua: 1 query bookmarks + 1 query opportunities by `id in (...)`, hoac 1 projection query.

## 10. Ket luan

He thong co kien truc microservice ro rang va da co pagination/batch y tuong, nhung hien tai **chua toi uu** vi request/query bi phan tan o ca FE va BE. Diem cham nguoi dung cam thay ro nhat la FE N+1 trong `ScholarshipCard`. Tuy nhien neu chi fix FE ma khong fix backend application/bookmark/opportunity mapping thi khi data lon van cham. Nen sua theo huong: card khong fetch, page fetch theo batch, backend co endpoint batch/projection, matching service batch that su, va gateway/docker dong bo lai port/path.
