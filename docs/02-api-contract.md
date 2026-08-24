# API Contract

## Purpose

This document defines the API contract expected by the frontend and services. It is not a full OpenAPI spec yet. It is a practical contract for implementation, testing, and refactoring.

The long-term target is to generate or maintain OpenAPI specs per service.

## API Principles

1. FE calls only the gateway.
2. Gateway routes to services.
3. FE page/component never hardcodes service ports.
4. Auth token handling is centralized.
5. Error response format is consistent.
6. Pagination response is stable DTO, not raw framework internals.
7. Batch endpoints are required for list/card status data.
8. Mutations should be idempotent where duplicate user actions are common.

## Base URLs

Local:

```txt
Frontend:    http://localhost:3000
Gateway:     http://localhost:8080
API Root:    http://localhost:8080/api
Matching v1: http://localhost:8080/api/v1
WebSocket:   ws://localhost:8080/api/ws
```

Frontend config:

```txt
NEXT_PUBLIC_API_GATEWAY=http://localhost:8080
NEXT_PUBLIC_SOCKET_URL=ws://localhost:8080/api/ws
NEXT_PUBLIC_API_TIMEOUT_MS=10000
```

## Auth

Header:

```http
Authorization: Bearer <access_token>
```

Token should include:

```json
{
  "sub": "user@example.com",
  "userId": 2,
  "roles": ["ROLE_USER"],
  "iat": 1710000000,
  "exp": 1710086400
}
```

Target rule:

- FE can store token in `auth_token` cookie/localStorage.
- `apiRequest` reads token centrally.
- Backend services validate JWT with shared secret or public key.
- Services should use `userId` claim when possible to avoid repeated auth-service calls.

## Roles

Accepted role forms:

```txt
USER / ROLE_USER
EMPLOYER / ROLE_EMPLOYER
ADMIN / ROLE_ADMIN
```

Backend should standardize internally to authorities:

```txt
ROLE_USER
ROLE_EMPLOYER
ROLE_ADMIN
```

Frontend should normalize display/navigation role:

```txt
ROLE_USER -> USER
ROLE_EMPLOYER -> EMPLOYER
ROLE_ADMIN -> ADMIN
```

## Target Error Format

All services should eventually return:

```json
{
  "timestamp": "2026-05-09T10:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "code": "VALIDATION_ERROR",
  "message": "applicationDeadline must be in the future",
  "path": "/api/opportunities",
  "requestId": "req_abc123",
  "details": {
    "field": "applicationDeadline"
  }
}
```

Status code meaning:

| Code | Meaning | Example |
|---|---|---|
| 400 | Invalid request | bad form data |
| 401 | No/invalid/expired token | missing Authorization |
| 403 | Authenticated but wrong role | USER accessing admin route |
| 404 | Resource not found | opportunity id not found |
| 409 | Conflict/idempotency conflict | duplicate application |
| 422 | Semantic validation failed | GPA below valid range |
| 429 | Rate limited | login spam |
| 500 | Unexpected server error | uncaught exception |
| 502 | Gateway upstream failure | service down |
| 504 | Gateway/service timeout | matching too slow |

## Pagination Contract

Target stable shape:

```json
{
  "data": [],
  "page": 0,
  "size": 12,
  "totalElements": 120,
  "totalPages": 10,
  "hasNext": true,
  "hasPrevious": false,
  "sort": "applicationDeadline,asc"
}
```

Frontend can map to:

```ts
{
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
```

Avoid returning raw Spring `PageImpl` long-term because structure is framework-specific.

## Auth Service Endpoints

Base path:

```txt
/api/auth
```

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/auth/health` | public | health |
| POST | `/api/auth/login` | public | login |
| POST | `/api/auth/register` | public | register |
| POST | `/api/auth/signin` | public | legacy signin |
| POST | `/api/auth/signup` | public | legacy signup |
| POST | `/api/auth/refresh` | refresh token | refresh access token |
| GET | `/api/auth/me` | user | current user |
| GET | `/api/auth/verify` | user | verify token |

Login response target:

```json
{
  "accessToken": "jwt",
  "tokenType": "Bearer",
  "user": {
    "id": 2,
    "email": "student@example.com",
    "username": "student",
    "roles": ["ROLE_USER"],
    "enabled": true
  }
}
```

## Admin Auth Endpoints

Base path:

```txt
/api/admin
```

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/admin/stats` | ADMIN | admin dashboard stats |
| GET | `/api/admin/users` | ADMIN | list users |
| GET | `/api/admin/users/{id}` | ADMIN | user detail |
| POST | `/api/admin/create-user` | ADMIN | create user |
| POST | `/api/admin/create-employer` | ADMIN | create employer |
| DELETE | `/api/admin/users/{id}` | ADMIN | delete user |
| GET | `/api/admin/employer/requests` | ADMIN | employer request list |
| GET | `/api/admin/employer/requests/{id}` | ADMIN | request detail |
| PUT | `/api/admin/employer/requests/{id}/approve` | ADMIN | approve |
| PUT | `/api/admin/employer/requests/{id}/reject` | ADMIN | reject |

## Employer/User Profile Endpoints

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/employer/request` | USER | request employer role |
| GET | `/api/employer/request/my` | USER | my employer request |
| GET | `/api/user/me` | USER/EMPLOYER/ADMIN | current profile |
| PUT | `/api/user/me` | USER/EMPLOYER/ADMIN | update profile |
| POST | `/api/users/avatar` | USER/EMPLOYER/ADMIN | upload avatar |
| GET | `/api/internal/user/{username}` | internal | resolve user |
| GET | `/api/internal/user/id/{userId}` | internal | resolve user by id |

Internal endpoints should not be exposed publicly in production.

## Organization Endpoints

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/organizations` | EMPLOYER/ADMIN | create |
| GET | `/api/organizations` | ADMIN | list |
| GET | `/api/organizations/{id}` | EMPLOYER/ADMIN | detail |
| PUT | `/api/organizations/{id}` | EMPLOYER/ADMIN | update |
| DELETE | `/api/organizations/{id}` | ADMIN | delete |
| GET | `/api/organizations/me` | EMPLOYER | my org |
| PUT | `/api/organizations/me` | EMPLOYER | update my org |
| POST | `/api/organizations/me/logo` | EMPLOYER | upload logo |

## Scholarship Public Endpoints

Base path:

```txt
/api/scholarships
```

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/scholarships` | optional/public | search/list public scholarships |
| GET | `/api/scholarships/{id}` | optional | detail |
| POST | `/api/scholarships/{id}/view` | optional | increment view |

Search query params:

```txt
q
gpa
studyMode
level
isPublic
currentDate
page
size
sort
```

Example:

```http
GET /api/scholarships?q=ai&level=MASTER&isPublic=true&currentDate=2026-05-09&page=0&size=12
```

## Opportunity Endpoints

Base path:

```txt
/api/opportunities
```

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/opportunities` | EMPLOYER | create opportunity |
| GET | `/api/opportunities/my` | EMPLOYER | employer opportunities |
| PUT | `/api/opportunities/{id}` | EMPLOYER | update |
| DELETE | `/api/opportunities/{id}` | EMPLOYER | delete |
| GET | `/api/opportunities/all` | ADMIN | admin list |
| PUT | `/api/opportunities/{id}/moderate` | ADMIN | approve/reject |
| GET | `/api/opportunities/{id}` | ADMIN/EMPLOYER | detail |
| DELETE | `/api/opportunities/{id}/admin` | ADMIN | admin delete |
| GET | `/api/opportunities/stats` | ADMIN/internal | stats |

Create request target:

```json
{
  "title": "AI Research Scholarship",
  "fullDescription": "Long description",
  "applicationDeadline": "2026-12-31",
  "startDate": "2027-01-15",
  "endDate": "2027-12-31",
  "scholarshipAmount": 5000,
  "minGpa": 3.2,
  "studyMode": "FULL_TIME",
  "level": "MASTER",
  "isPublic": true,
  "contactEmail": "contact@example.com",
  "website": "https://example.com",
  "tags": ["AI", "ML"],
  "requiredSkills": ["Python", "Machine Learning"]
}
```

## Application Endpoints

Base path:

```txt
/api/applications
```

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/applications` | USER | submit application |
| GET | `/api/applications/my` | USER | current user's applications |
| GET | `/api/applications/my/statuses` | USER | batch applied status |
| GET | `/api/applications/opportunity/{opportunityId}` | EMPLOYER | applications for opportunity |
| PUT | `/api/applications/{applicationId}/status` | EMPLOYER | update status |
| GET | `/api/applications/all` | ADMIN | admin list |
| GET | `/api/applications/{id}` | ADMIN/EMPLOYER/USER | detail |
| PUT | `/api/applications/{id}/admin/status` | ADMIN | admin status update |

Batch status:

```http
GET /api/applications/my/statuses?opportunityIds=1&opportunityIds=2
```

Response:

```json
{
  "1": true,
  "2": false
}
```

Submit application target:

```json
{
  "opportunityId": 1,
  "applicantUserName": "Minh Le",
  "applicantEmail": "minh@example.com",
  "phone": "0900000000",
  "gpa": 3.5,
  "coverLetter": "I am interested...",
  "motivation": "Because...",
  "additionalInfo": "Optional",
  "portfolioUrl": "https://portfolio.example.com",
  "linkedinUrl": "https://linkedin.com/in/example",
  "githubUrl": "https://github.com/example",
  "documents": [
    {
      "documentName": "cv.pdf",
      "documentUrl": "s3://..."
    }
  ]
}
```

Duplicate submit should return either:

- `200/201` with existing application if idempotency is implemented, or
- `409 APPLICATION_ALREADY_EXISTS` with clean response.

Do not allow silent duplicate rows.

## Bookmark Endpoints

Base path:

```txt
/api/bookmarks
```

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/bookmarks/{opportunityId}` | USER | toggle bookmark |
| GET | `/api/bookmarks/my` | USER | my bookmarks |
| GET | `/api/bookmarks/my/statuses` | USER | batch bookmark status |

Batch bookmark status:

```http
GET /api/bookmarks/my/statuses?opportunityIds=1&opportunityIds=2
```

Response:

```json
{
  "1": true,
  "2": false
}
```

## Matching Endpoints

Base path:

```txt
/api/v1
```

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | public/internal | health |
| POST | `/api/v1/match/score` | user | single `RULE_COMPATIBILITY` pair score |
| POST | `/api/v1/matching/batch-scores` | user | batch card scores |
| GET | `/api/v1/recommendations/applicant/{applicantId}` | user/admin | applicant recommendations |
| GET | `/api/v1/recommendations/opportunity/{opportunityId}` | employer/admin | candidate recommendations |

Batch score request:

```json
{
  "applicantId": "2",
  "opportunityIds": ["1", "2", "3"]
}
```

Response:

```json
{
  "1": 87.5,
  "2": 64.0,
  "3": 92.1
}
```

Single score response:

```json
{
  "overallScore": 87.5,
  "scoreType": "RULE_COMPATIBILITY",
  "modelVersion": "hybrid-v2.0",
  "corpusVersion": null
}
```

`/api/v1/match/score` is a pairwise compatibility/card score. It does not fit TF-IDF and must not be interpreted as the same score as the recommendation ranking feed.

Recommendation response:

```json
{
  "metadata": {
    "total": 50,
    "page": 1,
    "limit": 10
  },
  "data": [
    {
      "opportunityId": "1",
      "matchingScore": 92.1,
      "scoreType": "HYBRID_RANKING",
      "modelVersion": "hybrid-v2.0",
      "corpusVersion": "opportunity-corpus:hybrid-v2.0:..."
    }
  ]
}
```

Target improvement:

- Include score breakdown when requested.
- Read from recommendation cache first.
- Do not full scan each request.

## Chat/Notification Endpoints

Base path:

```txt
/api
```

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/health` | public/internal | health |
| POST | `/api/chat/send` | USER/EMPLOYER/ADMIN | send message |
| GET | `/api/conversations` | USER/EMPLOYER/ADMIN | list conversations |
| GET | `/api/messages/{conversationId}` | USER/EMPLOYER/ADMIN | messages |
| POST | `/api/fcm/register` | logged in | register FCM token |
| GET | `/api/notifications` | logged in | notifications |

WebSocket:

```txt
ws://localhost:8080/api/ws
```

## FE Service Layer Mapping

| Domain | FE Service |
|---|---|
| Auth | `frontend/src/services/auth.service.ts` |
| Scholarship/Application/Bookmark | `frontend/src/services/scholarship.service.ts` |
| Admin | `frontend/src/services/admin.service.ts` |
| Matching | `frontend/src/services/matching.service.ts` |
| Chat | `frontend/src/services/chat.service.ts` |
| Base config | `frontend/src/lib/api-config.ts` |

Rules:

- No production component imports `mock-data`.
- No production component imports old `api-client`.
- No production component fetches raw URL unless it is an intentional low-level service.

## Contract Test Checklist

For each important endpoint:

- [ ] no auth returns expected public/401 behavior
- [ ] wrong role returns 403
- [ ] invalid input returns 400/422
- [ ] resource not found returns 404
- [ ] duplicate mutation returns 409 or idempotent success
- [ ] response shape stable
- [ ] request duration logged
- [ ] pagination works at page 0/1/out-of-range
- [ ] frontend service maps response correctly
