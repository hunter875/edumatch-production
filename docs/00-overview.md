# EduMatch Overview

## Muc Dich

EduMatch la nen tang ket noi sinh vien voi hoc bong, co hoi nghien cuu va nha tuyen dung/to chuc cap hoc bong. He thong co 3 nhom nguoi dung chinh:

- `USER`: sinh vien/applicant, tim hoc bong, xem goi y, nop application, bookmark, nhan thong bao.
- `EMPLOYER`: nha cung cap co hoi, tao/sua/xoa opportunity, xem applications, cap nhat trang thai.
- `ADMIN`: quan tri user, scholarships, applications, employer requests, analytics va moderation.

Muc tieu ky thuat cua du an khong chi la CRUD. Du an dung de luyen:

- full-stack architecture
- API gateway
- auth/role security
- database modeling va indexing
- matching/recommendation service
- async worker/event-driven design
- frontend performance
- observability va deploy production-like

## Gia Tri Portfolio

Neu du an nay duoc lam dung, no co the chung minh cac ky nang mid-level:

- Biet chia domain thanh service hop ly.
- Biet debug loi that: route treo, 401 spam, gateway 502, service timeout.
- Biet toi uu FE: render loop, N+1, data fetching, URL state.
- Biet toi uu DB: index, constraint, EXPLAIN, seed large data.
- Biet chuan hoa API: versioning, response/error contract, pagination, batch endpoint.
- Biet toi uu matching: batch score, cache, precompute, worker.
- Biet dung AI dung cho: embedding/normalization/explanation, khong goi LLM tren hot path.
- Biet deploy va van hanh: Docker, env, gateway, logs, healthcheck.

## Tech Stack Hien Tai

### Frontend

- Next.js 14 App Router
- React
- React Query
- Tailwind CSS
- Framer Motion
- STOMP/WebSocket cho realtime chat/notification

Nguyen tac:

- FE chi goi API qua API Gateway.
- Component/page khong tu hardcode service URL.
- Server state nen dung React Query.
- AppContext neu con giu thi chi nen giu UI state nho.

### API Gateway

- Nginx
- Local config: `nginx-gateway/nginx.local.conf`
- Production config: `nginx-gateway/nginx.prod.conf`

Vai tro:

- FE chi biet mot endpoint gateway.
- Gateway route sang auth/scholarship/chat/matching.
- Xu ly CORS, timeout, rate limit, security headers.
- Tach local/prod routing.

### Auth Service

- Java Spring Boot
- MySQL
- JWT auth
- Role/authority: `ROLE_USER`, `ROLE_EMPLOYER`, `ROLE_ADMIN`
- Employer request, organization, admin user management

Vai tro:

- Dang ky/dang nhap.
- Quan ly user profile, roles.
- Publish event `user.profile.updated` cho matching.
- Admin stats tong hop tu auth + scholarship service.

### Scholarship Service

- Java Spring Boot
- MySQL
- Opportunities, applications, bookmarks, moderation
- RabbitMQ event publish cho notification/matching

Vai tro:

- Public scholarship search/list/detail.
- Employer CRUD opportunity.
- User submit application/bookmark.
- Admin moderate/list/statistics.

### Chat Service

- Java Spring Boot
- MySQL
- STOMP/WebSocket
- RabbitMQ notification consumer
- Firebase local co the disable

Vai tro:

- Conversations/messages.
- Realtime notifications.
- Receive events tu scholarship/matching.

### Matching Service

- FastAPI
- PostgreSQL
- SQLAlchemy
- RabbitMQ consumer
- Task-compatible matching handlers
- Score cache va recommendation cache

Vai tro:

- Batch matching score.
- Recommendation API.
- Precompute recommendations khi user/opportunity update.
- Sau nay co the them embedding/vector search.

## Cac URL Local Quan Trong

```txt
Frontend:          http://localhost:3000
API Gateway:       http://localhost:8080
Auth Service:      http://localhost:8081
Scholarship:       http://localhost:8082
Chat Service:      http://localhost:8083
Matching Service:  http://localhost:8000
RabbitMQ UI:       http://localhost:15672
```

## Command Local

Build/run full stack:

```powershell
docker compose --profile workers up -d --build
```

Check status:

```powershell
docker compose --profile workers ps
```

Logs chinh:

```powershell
docker compose --profile workers logs --tail=120 frontend api-gateway auth-service scholarship-service matching-service chat-service
```

Test gateway:

```powershell
curl.exe -I http://localhost:3000
curl.exe -I http://localhost:3000/user/scholarships
curl.exe -s -o NUL -w "status=%{http_code} time=%{time_total}`n" "http://localhost:8080/api/scholarships?isPublic=true&page=0&size=12"
```

## Main User Flows

### Public Scholarship Browsing

```txt
Browser -> Next.js /user/scholarships
Next.js -> Gateway /api/scholarships
Gateway -> Scholarship Service
Scholarship Service -> MySQL
```

Important:

- Public list/detail should not require auth.
- If user is logged in, FE may additionally fetch application/bookmark/matching status.
- Those secondary calls must be batch calls, not per card.

### User Apply To Scholarship

```txt
User -> FE Apply Dialog
FE -> Gateway /api/applications
Gateway -> Scholarship Service
Scholarship Service -> MySQL transaction
Scholarship Service -> RabbitMQ notification event
Chat Service -> notification/WebSocket
```

Important:

- DB must prevent duplicate application.
- Backend should return clean response for duplicate/idempotent submit.
- FE should not rely only on local state.

### Employer Creates Opportunity

```txt
Employer -> FE create form
FE -> Gateway /api/opportunities
Gateway -> Scholarship Service
Scholarship Service -> MySQL
Scholarship Service -> RabbitMQ scholarship.created
Matching Consumer -> matching task handler
Handler -> precompute candidate recommendations
```

Important:

- Matching side effect should not block opportunity creation.
- Event publish failure should be logged and retried if needed.

### Matching Recommendation

```txt
FE -> Gateway /api/v1/recommendations/applicant/{id}
Gateway -> Matching Service
Matching Service -> recommendation_cache
Cache hit -> return immediately
Cache miss -> fallback compute or enqueue worker
```

Important:

- Do not full scan opportunities on every request.
- Recommendation cache can be eventually consistent.
- Hard constraints like GPA/deadline/public status should never be violated.

## Current Known Risks

| Risk | Why It Matters | Target Fix |
|---|---|---|
| FE had multiple API clients | Data flow unpredictable | Standardize service layer |
| AppContext contains server data | Global fetch can slow unrelated pages | React Query for server state |
| Public/auth route boundaries unclear | 401 spam and unnecessary calls | Split public base data and logged-in extras |
| N+1 card fetching | Network/API spam | Batch endpoints |
| Raw PageImpl response | Unstable API shape | DTO pagination |
| Service-to-service localhost | Broken in Docker | Use Docker service names |
| Matching compute on request path | High latency | Worker/cache/precompute |
| No seed/perf baseline | Optimization by feeling | Seed + metrics + EXPLAIN |

## Definition Of Done For Project Health

The system is in a healthy state when:

- Full stack starts with Docker.
- `/user/scholarships` loads without auth and without route hang.
- Admin pages redirect correctly when no token and work with admin token.
- Gateway routes all backend APIs correctly.
- Scholarship list uses server pagination/filter.
- Card status/bookmark/matching uses batch endpoints.
- Backend returns consistent error format.
- DB has constraints for duplicate application/bookmark.
- Matching recommendations read cache/top-N.
- Logs contain request path/status/duration.
- Docs explain tradeoffs and operational steps.
