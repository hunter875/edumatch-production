# EduMatch Data Flow

Tai lieu nay gom cac luong du lieu chinh cua EduMatch. Muc tieu la nhin vao biet request di qua service nao, DB nao, cho nao sync REST, cho nao async RabbitMQ/worker/WebSocket.

## 1. Tong Quan Sync Va Async

```mermaid
flowchart LR
  FE["Next.js Frontend"] --> Gateway["Nginx API Gateway"]

  Gateway --> Auth["Auth Service"]
  Gateway --> Scholarship["Scholarship Service"]
  Gateway --> Chat["Chat Service"]
  Gateway --> Matching["Matching Service"]

  Auth --> AuthDB["auth_db MySQL"]
  Scholarship --> ScholarshipDB["scholarship_db MySQL"]
  Chat --> ChatDB["chat_db MySQL"]
  Matching --> MatchingDB["matching_db PostgreSQL"]

  Auth -. "user.profile.updated" .-> Rabbit["RabbitMQ"]
  Scholarship -. "scholarship/application events" .-> Rabbit
  Matching -. "match notification events" .-> Rabbit

  Rabbit --> MatchingConsumer["matching-consumer"]
  MatchingConsumer --> Worker["Celery Worker"]
  Worker --> MatchingDB

  Rabbit --> NotificationConsumer["Chat Notification Consumer"]
  NotificationConsumer --> ChatDB
  NotificationConsumer --> WS["WebSocket/STOMP"]
  WS --> FE
```

Nhan xet nhanh:

- Sync path: FE -> Gateway -> Service -> DB -> response.
- Async path: Service publish RabbitMQ event -> consumer/worker xu ly nen -> DB/cache/WebSocket.
- Matching va notification la hai phan async quan trong nhat.
- Chat realtime dung WebSocket, nhung van co HTTP fallback.

## 2. Login Va Lay Thong Tin User

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant GW as API Gateway
  participant AUTH as Auth Service
  participant DB as auth_db

  FE->>GW: POST /api/auth/login
  GW->>AUTH: forward login request
  AUTH->>DB: find user + roles
  DB-->>AUTH: user data
  AUTH-->>GW: JWT + user response
  GW-->>FE: auth response

  FE->>GW: GET /api/auth/me or /api/user/me
  GW->>AUTH: Authorization: Bearer token
  AUTH->>DB: load current user
  DB-->>AUTH: user profile
  AUTH-->>FE: current user
```

Ghi nho:

- Auth service la source of truth cho user, role, organization.
- Cac service khac dang goi Auth service sync de resolve user detail trong mot so luong.
- Nen toi uu tiep: dua `userId` vao JWT de bot goi Auth service o chat/notification.

## 3. User Update Profile -> Matching Async

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant GW as Gateway
  participant AUTH as Auth Service
  participant AuthDB as auth_db
  participant MQ as RabbitMQ
  participant MC as matching-consumer
  participant W as Celery Worker
  participant MDB as matching_db

  FE->>GW: PUT /api/user/me
  GW->>AUTH: update profile
  AUTH->>AuthDB: save user profile
  AUTH-->>FE: update success
  AUTH-->>MQ: publish user.profile.updated

  MQ-->>MC: deliver event
  MC-->>W: process_user_profile_updated
  W->>MDB: update applicant_features
  W->>MDB: invalidate old scores/recommendations
  W->>MDB: precompute recommendations
```

Consistency:

- Profile update thanh cong ngay khi Auth DB save xong.
- Recommendation co the tre vai giay vi chay async.
- Day la eventual consistency, khong phai bug neu recommendation chua doi lap tuc.

## 4. Public Scholarship Browse/Search

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant GW as Gateway
  participant S as Scholarship Service
  participant Redis as Redis Cache
  participant DB as scholarship_db

  FE->>GW: GET /api/v1/scholarships?q=&filters&page=&size=
  GW->>S: forward request
  S->>Redis: check public list cache
  alt cache hit
    Redis-->>S: cached page
  else cache miss
    S->>DB: query public + approved + filters
    DB-->>S: page result
    S->>Redis: cache short TTL
  end
  S-->>FE: paged scholarship list
```

Ghi nho:

- Public list khong nen chua `matchScore`, `isBookmarked`, `hasApplied`.
- Du lieu personalized phai lay bang batch endpoint rieng neu user da login.
- Search keyword lon nen dung FULLTEXT/filter hybrid, khong dung `LIKE '%keyword%'`.

## 5. Authenticated Scholarship List With Batch Extras

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant GW as Gateway
  participant S as Scholarship Service
  participant M as Matching Service

  FE->>GW: GET /api/v1/scholarships?page=0&size=12
  GW->>S: public base list
  S-->>FE: 12 scholarship cards

  FE->>GW: POST /api/v1/applications/statuses
  GW->>S: applicantId + opportunityIds[]
  S-->>FE: hasApplied map

  FE->>GW: POST /api/v1/bookmarks/statuses
  GW->>S: applicantId + opportunityIds[]
  S-->>FE: isBookmarked map

  FE->>GW: POST /api/v1/matching/batch-scores
  GW->>M: applicantId + opportunityIds[]
  M-->>FE: score map + breakdown
```

Ghi nho:

- Day la flow dung de tranh FE N+1.
- List 12 cards khong duoc goi 12 request score/bookmark/application rieng le.
- Matching batch nen doc `matching_scores` cache truoc, compute fallback neu can.

## 6. Student Apply Scholarship

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant GW as Gateway
  participant S as Scholarship Service
  participant DB as scholarship_db
  participant MQ as RabbitMQ
  participant Chat as Chat Service
  participant ChatDB as chat_db
  participant WS as WebSocket

  FE->>GW: POST /api/v1/applications
  GW->>S: create application
  S->>DB: transaction insert application + documents
  DB-->>S: saved application
  S-->>FE: application created

  S-->>MQ: publish application/notification event
  MQ-->>Chat: consume notification event
  Chat->>ChatDB: save notification
  Chat-->>WS: push notification to receiver
  WS-->>FE: realtime notification
```

Consistency:

- Apply result phai strong consistent trong scholarship DB.
- Notification la async, co the den cham hon response apply.
- Can idempotency/unique constraint de chong double apply.

## 7. Provider Create/Update Scholarship

```mermaid
sequenceDiagram
  participant FE as Provider FE
  participant GW as Gateway
  participant S as Scholarship Service
  participant Auth as Auth Service
  participant DB as scholarship_db
  participant MQ as RabbitMQ
  participant MC as matching-consumer
  participant W as Celery Worker
  participant MDB as matching_db

  FE->>GW: POST/PUT /api/v1/scholarships
  GW->>S: create/update opportunity
  S->>Auth: validate provider + organization
  Auth-->>S: user detail
  S->>DB: save opportunity + tags + skills
  DB-->>S: saved opportunity
  S-->>FE: success

  S-->>MQ: publish scholarship.created/updated
  MQ-->>MC: deliver event
  MC-->>W: process scholarship event
  W->>MDB: update opportunity_features
  W->>MDB: invalidate old matching cache
  W->>MDB: precompute recommendation_cache
```

Ghi nho:

- Create/update scholarship khong nen doi matching tinh xong moi tra response.
- Matching refresh la side effect async.
- Neu RabbitMQ fail, can log/retry/DLQ de khong mat event.

## 8. Admin Moderate Scholarship

```mermaid
sequenceDiagram
  participant Admin as Admin FE
  participant GW as Gateway
  participant S as Scholarship Service
  participant DB as scholarship_db
  participant MQ as RabbitMQ
  participant Matching as Matching Worker
  participant Chat as Chat Notification

  Admin->>GW: PATCH /api/v1/admin/scholarships/{id}/moderation
  GW->>S: update moderation status
  S->>DB: set APPROVED/REJECTED
  DB-->>S: saved
  S-->>Admin: success

  alt APPROVED
    S-->>MQ: scholarship.updated
    MQ-->>Matching: refresh matching/recommendations
    MQ-->>Chat: notify provider approved
  else REJECTED
    S-->>MQ: notification event
    MQ-->>Chat: notify provider rejected
  end
```

Ghi nho:

- Admin decision la sync write trong scholarship DB.
- Provider notification va matching refresh la async.
- Event naming hien tai co the con lan `scholarship.updated` voi notification payload; ve lau dai nen tach event ro hon.

## 9. Matching Recommendation Read Path

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant GW as Gateway
  participant M as Matching Service
  participant MDB as matching_db

  FE->>GW: GET /api/v1/recommendations/applicant/{id}
  GW->>M: forward request
  M->>MDB: read recommendation_cache top N
  alt recommendation cache hit
    MDB-->>M: cached recommendations
    M-->>FE: fast top-N response
  else recommendation cache miss
    M->>MDB: read matching_scores fallback
    alt score cache hit
      MDB-->>M: ranked scores
      M-->>FE: fallback recommendations
    else no cache
      M-->>FE: empty/fallback response
    end
  end
```

Ghi nho:

- Hot path khong nen full scan applicant x opportunity moi request.
- Worker la noi nen tinh nang; API la noi nen doc cache/read model.
- Neu them AI/vector sau nay, van nen chay offline/background truoc.

## 10. Chat Message Flow

```mermaid
sequenceDiagram
  participant Sender as Sender FE
  participant GW as Gateway
  participant Chat as Chat Service
  participant Auth as Auth Service
  participant DB as chat_db
  participant WS as WebSocket/STOMP
  participant Receiver as Receiver FE

  Sender->>GW: POST /api/v1/chat/messages or STOMP /app/chat.sendMessage
  GW->>Chat: forward
  Chat->>Auth: resolve sender/receiver if needed
  Auth-->>Chat: user detail
  Chat->>DB: save message + conversation
  DB-->>Chat: saved message
  Chat-->>Sender: saved message response
  Chat-->>WS: publish /topic/messages/{receiverId}
  WS-->>Receiver: realtime message
  Chat-->>WS: publish /topic/messages/{senderId}
  WS-->>Sender: realtime echo/update
```

Ghi nho:

- Chat co ca WebSocket va HTTP fallback.
- WebSocket subscribe da check user chi subscribe topic cua chinh minh.
- Toi uu tiep: bot sync Auth call bang `userId` trong JWT.

## 11. Notification Feed Flow

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant GW as Gateway
  participant Chat as Chat Service
  participant Auth as Auth Service
  participant DB as chat_db

  FE->>GW: GET /api/notifications?page=0&size=20
  GW->>Chat: forward
  Chat->>Auth: resolve current user
  Auth-->>Chat: userId
  Chat->>DB: query notifications by user_id, created_at DESC
  DB-->>Chat: paged notifications
  Chat-->>FE: page wrapper

  FE->>GW: PATCH /api/notifications/{id}/read
  GW->>Chat: forward
  Chat->>Auth: resolve current user
  Chat->>DB: check notification ownership + update is_read
  Chat-->>FE: 204 No Content
```

Ghi nho:

- Notification feed da co pagination cap va index `(user_id, created_at DESC)`.
- Khong nen public cache notification vi la private data.
- Toi uu tiep: atomic update `WHERE id=? AND user_id=?`, unread count, mark all read.

## 12. Consistency Cheat Sheet

| Flow | Sync/Async | Consistency |
| --- | --- | --- |
| Login | Sync REST | Strong after auth DB read |
| Update profile | Sync write + async matching | Profile strong, recommendations eventual |
| Public scholarship list | Sync read + Redis cache | Stale short TTL allowed |
| Apply scholarship | Sync DB write + async notification | Application strong, notification eventual |
| Create/update scholarship | Sync DB write + async matching | Opportunity strong, matching eventual |
| Admin moderation | Sync DB write + async matching/notification | Moderation strong, side effects eventual |
| Recommendation feed | Sync API read from read model | Eventual, depends on worker/cache |
| Chat message save | Sync DB write + realtime push | Message save strong, delivery best effort |
| Notification feed | Sync private read | Strong from chat DB |

## 13. Dieu Can Nho Khi Debug

1. FE loi UI/list cham: xem Network truoc, tim N+1 request.
2. API cham: xem service log + DB EXPLAIN.
3. Matching khong cap nhat: xem `matching-consumer`, `celery-worker`, RabbitMQ queue.
4. Notification khong hien realtime: xem Chat service, WebSocket subscribe, RabbitMQ notification event.
5. Data da write nhung read chua thay trong recommendation: co the do eventual consistency.
6. Cross-service call loi 503: xem Auth service, Redis cache, requestId trace.

