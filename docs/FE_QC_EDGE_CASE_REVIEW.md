# Bao cao QC edge case FE va Chat Service

Ngay cap nhat: 2026-05-14

Tai lieu nay ghi lai ket qua QC sau happy path, cac bug da sua, output test lai, va nhung diem con can review. Trong dot nay uu tien sua cac loi P0/P1 lien quan chat security, validation, error format, route `/messages`, va DB index cho chat.

## 1. Cach test da chay

Script QC:

```powershell
node scripts\qc-chat-edge-api.mjs
node scripts\fe-qc-edge-cases-cdp.mjs
```

Build lai service:

```powershell
docker compose up -d --build auth-service chat-service frontend
```

Kiem tra chat DB:

```powershell
docker compose exec -T chat-db mysql -uroot "-p$env:CHAT_DB_ROOT_PASSWORD" chat_db -e "SHOW INDEX FROM conversations; SHOW INDEX FROM messages; SHOW INDEX FROM notifications;"
docker compose exec -T chat-db mysql -uroot "-p$env:CHAT_DB_ROOT_PASSWORD" chat_db -e "EXPLAIN ANALYZE SELECT * FROM messages WHERE conversation_id = 9001 ORDER BY sent_at DESC LIMIT 50;"
```

## 2. Bug da sua

### P0 - WebSocket chat authentication/authorization

Da sua:

- `CONNECT` WebSocket bat buoc co `TOKEN_AUTH: Bearer <token>` hop le.
- Token sai/thieu bi reject bang STOMP `ERROR` frame.
- `SUBSCRIBE` chi cho user subscribe topic cua chinh minh:
  - `/topic/messages/{ownUserId}`
  - `/topic/notifications/{ownUserId}`
- `SEND` bat buoc co authenticated user trong session.

File da sua:

```txt
backend-java/chat-service/src/main/java/com/edumatch/chat/security/WebSocketAuthInterceptor.java
```

Output test lai:

```txt
stomp-connect-no-token              -> rejected
stomp-connect-valid-token           -> CONNECTED
stomp-subscribe-other-user-topic    -> rejected
```

### P0 - Chat message validation

Da sua:

- `receiverId` bat buoc khac null.
- `content` bat buoc khong rong va gioi han toi da 4000 ky tu.
- Trim content truoc khi luu.
- Chan self-message.
- Kiem tra receiver ton tai ben auth-service truoc khi tao conversation/message.

File da sua:

```txt
backend-java/chat-service/src/main/java/com/edumatch/chat/dto/ChatMessageRequest.java
backend-java/chat-service/src/main/java/com/edumatch/chat/service/ChatService.java
```

Output test lai:

```txt
send-message-empty-content          -> 400 VALIDATION_ERROR, savedUnexpectedly=false
send-message-missing-receiver       -> 400 VALIDATION_ERROR
send-message-nonexistent-receiver   -> 404 RESOURCE_NOT_FOUND, savedUnexpectedly=false
```

### P1 - Chat error response format

Da sua:

- Them global exception handler cho chat-service.
- 401/403/400/404/503 tra JSON format thong nhat thay vi body null hoac raw error.
- Security entrypoint/access-denied handler tra JSON wrapper.

Format:

```json
{
  "timestamp": "...",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "...",
  "path": "/api/..."
}
```

File da sua:

```txt
backend-java/chat-service/src/main/java/com/edumatch/chat/exception/GlobalExceptionHandler.java
backend-java/chat-service/src/main/java/com/edumatch/chat/security/JwtAuthenticationEntryPoint.java
backend-java/chat-service/src/main/java/com/edumatch/chat/security/JwtAccessDeniedHandler.java
```

Output test lai:

```txt
unauth-conversations       -> 401 UNAUTHENTICATED
other-user-conversation    -> 403 ACCESS_DENIED
missing receiver           -> 400 VALIDATION_ERROR
missing notification       -> 404 RESOURCE_NOT_FOUND
```

### P1 - Chat health route qua gateway

Da sua:

- Them alias `GET /api/chat/health`.
- Cho phep route health trong security config.

File da sua:

```txt
backend-java/chat-service/src/main/java/com/edumatch/chat/controller/ChatHttpController.java
backend-java/chat-service/src/main/java/com/edumatch/chat/config/SecurityConfig.java
```

Output test lai:

```txt
GET /api/chat/health -> 200 {"service":"chat-service","status":"UP"}
```

### P1 - `/messages` route guard va login link

Da sua:

- Them `/messages/:path*` vao middleware matcher.
- Logged-out vao `/messages` redirect ve `/auth/login?redirect=/messages`.
- Link login trong page messages doi tu `/login` sang `/auth/login?redirect=/messages`.

File da sua:

```txt
frontend/src/middleware.ts
frontend/src/app/messages/page.tsx
```

Output test lai:

```txt
logged-out /messages -> http://localhost:3000/auth/login?redirect=/messages
khong con GET /login 404
```

### P1 - FE chat HTTP fallback khi WebSocket offline

Da sua:

- Khi STOMP connected, page van gui realtime nhu cu.
- Khi STOMP offline, page fallback `POST /api/chat/send`.
- Khong disable input/button chi vi realtime offline.
- Neu HTTP send fail, optimistic message bi remove va UI bao loi.

File da sua:

```txt
frontend/src/app/messages/page.tsx
```

### P1 - Chat DB indexes

Da them:

```txt
db/optimization/chat-indexes.sql
```

Index:

```sql
idx_conversations_p1_last(participant_1_id, last_message_at DESC)
idx_conversations_p2_last(participant_2_id, last_message_at DESC)
idx_messages_conversation_sent(conversation_id, sent_at DESC)
idx_notifications_user_created(user_id, created_at DESC)
```

Output `EXPLAIN ANALYZE` sau index cho messages:

```txt
Index lookup on messages using idx_messages_conversation_sent (conversation_id=9001)
```

Ghi chu: query conversations co dieu kien `participant_1_id = ? OR participant_2_id = ?` van co the table scan khi dev DB chi co vai row. Index da co cho data lon; neu can toi uu that ky, tach thanh 2 query/UNION hoac tao read model conversation summary.

## 3. Output QC sau khi sua

Chat API edge:

```txt
health                           200
unauth-conversations             401 UNAUTHENTICATED
unauth-send-message              401 UNAUTHENTICATED
unauth-notifications             401 UNAUTHENTICATED
valid student -> provider chat   200
provider sees conversation       200
other student read conversation  403 ACCESS_DENIED
empty content                    400 VALIDATION_ERROR
missing receiver                 400 VALIDATION_ERROR
nonexistent receiver             404 RESOURCE_NOT_FOUND
nonexistent notification         404 RESOURCE_NOT_FOUND
STOMP no token                   rejected
STOMP valid token                connected
STOMP subscribe other topic      rejected
```

FE edge:

```txt
logged-out role routes redirect dung ve /auth/login?redirect=...
sai role bi day ve dashboard dung role
invalid login hien loi, khong luu token
/messages logged-out redirect dung
/messages logged-in render duoc, khong horizontal overflow
```

## 4. Cac fix bo sung sau vong QC tiep theo

### P1 - Chat conversation list bot N+1

Da sua:

- Them internal batch endpoint auth-service:

```txt
GET /api/internal/users?ids=1001&ids=2001
```

- `getConversations()` khong con goi Auth-Service tung conversation de lay `otherUserName`.
- `getConversations()` khong con query `findTopByConversationIdOrderBySentAtDesc` tung conversation.
- Them batch query latest messages:

```txt
MessageRepository.findLatestMessagesByConversationIds(conversationIds)
```

File da sua:

```txt
backend-java/auth-service/src/main/java/com/example/jwt/example/controller/UserController.java
backend-java/chat-service/src/main/java/com/edumatch/chat/repository/MessageRepository.java
backend-java/chat-service/src/main/java/com/edumatch/chat/service/ChatService.java
```

Sau sua, list conversation chinh con:

```txt
1 query conversations
+ 1 query latest messages
+ 1 HTTP batch call sang auth-service
```

Ghi chu: neu muon production hon nua, nen tao read model `conversation_summaries` de API doc 1 bang denormalized.

### P1 - Student dashboard employer request 404

Da sua:

- `GET /api/employer/request/my` khong con tra 404 khi user chua co request.
- Neu chua co request, backend tra:

```json
{
  "hasRequest": false,
  "status": "NONE",
  "message": "No employer request found"
}
```

File da sua:

```txt
backend-java/auth-service/src/main/java/com/example/jwt/example/controller/EmployerRequestController.java
backend-java/auth-service/src/main/java/com/example/jwt/example/repository/OrganizationRequestRepository.java
backend-java/auth-service/src/main/java/com/example/jwt/example/service/OrganizationRequestService.java
```

Output FE QC:

```txt
/user/dashboard -> khong con badNetwork /api/employer/request/my 404
```

### P2 - Scholarship detail 404 duplicate/view call

Da sua:

- Chi increment view sau khi detail scholarship load thanh cong.
- Nonexistent scholarship khong con goi `/api/scholarships/{id}/view`.
- Dedupe request detail bang `fetchedScholarshipRef`.

File da sua:

```txt
frontend/src/app/user/scholarships/[id]/page.tsx
```

Output FE QC:

```txt
/user/scholarships/999999
- chi con 1 request /api/v1/scholarships/999999 -> 404 expected
- khong con request /api/scholarships/999999/view
```

### P2 - Admin nonexistent user raw error

Da sua:

- Admin service map HTTP error sang user-friendly fallback.
- `/admin/users/999999` khong con hien `HTTP error! status: 404`, thay bang:

```txt
Khong tim thay du lieu yeu cau.
```

File da sua:

```txt
frontend/src/services/admin.service.ts
```

### P2 - Admin dashboard placeholder

Da sua:

- Thay text placeholder bang cac block co data that:
  - User Distribution
  - Application Status
  - System Snapshot

File da sua:

```txt
frontend/src/app/admin/dashboard/page.tsx
```

## 5. Ton dong con lai

Nhung muc con lai khong phai bug crash/security:

- Mot so request bi `net::ERR_ABORTED` khi middleware redirect role. Day la browser abort request cu luc route doi trang, khong phai API 4xx/5xx.
- Nonexistent detail/admin route van co 404 API expected. UI khong crash va khong goi cascade sai.
- Neu muon chat scale lon hon, nen lam read model `conversation_summaries`.
- Neu muon API error contract dep hon nua, nen chuan hoa not-found wrapper cho auth-service admin endpoints thay vi de 404 body rong.

## 6. Ket luan ngan

Dot nay da xu ly cac bug quan trong:

```txt
Chat WebSocket security
Chat validation/data quality
Chat error wrapper
Messages route guard
HTTP fallback khi realtime offline
Chat DB index
Chat conversation N+1 giam ve batch
Student dashboard employer request 404
Scholarship detail duplicate/view 404
Admin raw 404 message
Admin dashboard placeholder
```

Sau khi build lai va chay QC, cac flow admin/provider/student/chat deu on hon de demo va tiep tuc toi uu.
