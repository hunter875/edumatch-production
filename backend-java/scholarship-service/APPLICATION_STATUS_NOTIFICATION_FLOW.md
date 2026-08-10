# Application Status Notification Flow

## 📋 Tổng quan

Khi employer hoặc admin accept/reject đơn application, hệ thống sẽ:
1. Cập nhật status trong database
2. Gửi email notification
3. **Gửi real-time notification qua RabbitMQ → Chat Service → User**

## 🔄 Notification Flow

```
Employer/Admin changes application status
          ↓
ApplicationService.updateApplicationStatus() / updateApplicationStatusByAdmin()
          ↓
Save to Database (status updated)
          ↓
┌─────────┴──────────┐
│                    │
↓                    ↓
Email Event      Notification Event
(notification.send.email)  (notification.application.status)
          ↓                    ↓
RabbitMQ Exchange      RabbitMQ Exchange
          ↓                    ↓
Email Service       Chat Service (NotificationConsumer)
(chưa implement)            ↓
                    ┌───────┼───────┐
                    ↓       ↓       ↓
                   DB   WebSocket  FCM
                         ↓         ↓
                    Web User   Mobile User
```

## 🎯 Endpoints

### 1. Employer Update Application Status
```bash
PUT /api/opportunities/applications/{applicationId}/status
Authorization: Bearer <EMPLOYER_JWT>
Content-Type: application/json

{
  "status": "ACCEPTED"  # or "REJECTED", "UNDER_REVIEW", "WAITLISTED"
}
```

**Method:** `ApplicationService.updateApplicationStatus()`

**Notification Flow:**
- ✅ Gửi email event
- ✅ **Gửi notification event với routing key `notification.application.status`**

### 2. Admin Update Application Status
```bash
PUT /api/admin/applications/{applicationId}/status
Authorization: Bearer <ADMIN_JWT>
Content-Type: application/json

{
  "status": "ACCEPTED"
}
```

**Method:** `ApplicationService.updateApplicationStatusByAdmin()`

**Notification Flow:**
- ✅ Gửi email event
- ✅ Gửi notification event

## 📦 Notification Event Payload

```json
{
  "recipientId": 123,
  "title": "✅ Đơn ứng tuyển được chấp nhận!",
  "body": "Chúc mừng! Đơn ứng tuyển của bạn đã được chấp nhận bởi nhà tuyển dụng.",
  "type": "APPLICATION_STATUS",
  "applicationId": 456,
  "status": "ACCEPTED",
  "referenceId": "789"  // opportunityId
}
```

## 🎨 Status Messages

### ACCEPTED
- **Title:** ✅ Đơn ứng tuyển được chấp nhận!
- **Body:** Chúc mừng! Đơn ứng tuyển của bạn đã được chấp nhận bởi nhà tuyển dụng.

### REJECTED
- **Title:** ❌ Đơn ứng tuyển bị từ chối
- **Body:** Rất tiếc, đơn ứng tuyển của bạn không được chấp nhận lần này.

### UNDER_REVIEW
- **Title:** 🔍 Đơn đang được xem xét
- **Body:** Đơn ứng tuyển của bạn đang được nhà tuyển dụng xem xét.

### WAITLISTED
- **Title:** ⏳ Đơn trong danh sách chờ
- **Body:** Đơn ứng tuyển của bạn đã được đưa vào danh sách chờ.

## 🔧 Implementation Details

### ApplicationService.java

**Method: `updateApplicationStatus()`** (Employer update)
```java
// Line ~160-210
// 1. Find application
// 2. Check ownership
// 3. Update status
// 4. Send email event
// 5. Send notification event ← NEW ADDITION
// 6. Return DTO
```

**Key Code:**
```java
Map<String, Object> notificationEvent = new HashMap<>();
notificationEvent.put("recipientId", savedApp.getApplicantUserId());
notificationEvent.put("title", notificationTitle);
notificationEvent.put("body", notificationBody);
notificationEvent.put("type", "APPLICATION_STATUS");
notificationEvent.put("applicationId", savedApp.getId());
notificationEvent.put("status", newStatus);

rabbitTemplate.convertAndSend(
    RabbitMQConfig.EXCHANGE_NAME, 
    "notification.application.status", 
    notificationEvent
);
```

### RabbitMQ Configuration

**Exchange:** `events_exchange` (TopicExchange)

**Routing Keys:**
- `notification.send.email` → Email Service (future)
- `notification.application.status` → Chat Service → Notification

**Queue:** `notification_queue`

**Bindings in Chat Service:**
```java
// RabbitMQConfig.java
public static final String APPLICATION_STATUS_ROUTING_KEY = "notification.application.status";

@Bean
public Binding applicationStatusBinding() {
    return BindingBuilder.bind(notificationQueue)
        .to(exchange)
        .with(APPLICATION_STATUS_ROUTING_KEY);
}
```

### Chat Service Processing

**NotificationConsumer.java:**
```java
@RabbitListener(queues = RabbitMQConfig.NOTIFICATION_QUEUE)
public void handleNotificationEvent(NotificationEvent event) {
    // 1. Get recipient ID
    // 2. Build notification content based on type
    // 3. Save to DB
    // 4. Send via WebSocket to /topic/notifications/{userId}
    // 5. Send via Firebase FCM
}
```

**Processing for APPLICATION_STATUS:**
```java
else if (event.getApplicationId() != null) {
    type = "APPLICATION_STATUS";
    title = String.format("Cập nhật đơn: %s", event.getStatus());
    referenceId = event.getApplicationId().toString();
}
```

## 🧪 Testing

### Step 1: User Submit Application
```bash
POST /api/opportunities/{opportunityId}/apply
Authorization: Bearer <STUDENT_JWT>

{
  "coverLetter": "...",
  "documents": [...]
}
```

### Step 2: Employer Update Status
```bash
PUT /api/opportunities/applications/{applicationId}/status
Authorization: Bearer <EMPLOYER_JWT>

{
  "status": "ACCEPTED"
}
```

### Step 3: Check Logs

**Scholarship Service:**
```
📨 [Application Status] Employer changed application 123 status to: ACCEPTED
✅ [Application Status] Sent notification event to RabbitMQ for applicant userId: 456
📤 [Application Status] Event published to routing key: notification.application.status
```

**Chat Service:**
```
📬 [NotificationConsumer] ============================================
📬 [NotificationConsumer] Received new event from RabbitMQ
📬 [NotificationConsumer] Recipient User ID: 456
📬 [NotificationConsumer] Event Type: APPLICATION_STATUS
📬 [NotificationConsumer] Processing APPLICATION status event
💾 [NotificationConsumer] Saving to database...
✅ [NotificationConsumer] Saved Notification ID: 789 for User 456
📡 [NotificationConsumer] WebSocket sent to: /topic/notifications/456
🔔 [FCM] Bắt đầu gửi notification cho User ID: 456
✅ [FCM] Gửi thành công! User: 456, Response ID: xxx
```

### Step 4: Verify Frontend

**Web (WebSocket):**
- User 456 online → Notification bell updates
- Click bell → See "✅ Đơn ứng tuyển được chấp nhận!"

**Mobile (FCM):**
- User 456 có app → Nhận push notification
- Click notification → Mở app đến application detail

### Step 5: Verify Database
```sql
SELECT * FROM notifications 
WHERE user_id = 456 
AND type = 'APPLICATION_STATUS'
ORDER BY created_at DESC;
```

## 🔍 Troubleshooting

### Notification không đến user

**Check 1: Scholarship Service logs**
```bash
docker logs scholarship-service | grep "Application Status"
```
- Phải thấy: "Sent notification event to RabbitMQ"

**Check 2: RabbitMQ**
```bash
# RabbitMQ Management UI: http://localhost:15672
# Check queue: notification_queue
# Should have messages consumed
```

**Check 3: Chat Service logs**
```bash
docker logs chat-service | grep "NotificationConsumer"
```
- Phải thấy: "Received new event from RabbitMQ"
- Phải thấy: "Processing APPLICATION status event"

**Check 4: Database**
```sql
SELECT * FROM notifications WHERE user_id = {userId} ORDER BY created_at DESC LIMIT 5;
```

**Check 5: WebSocket (Browser Console)**
```javascript
// Should see message on /topic/notifications/{userId}
```

**Check 6: Firebase**
```bash
docker logs chat-service | grep FCM
```
- Phải thấy: "Gửi thành công!"

## 📊 Event Types Comparison

| Event Type | Trigger | Recipient | Routing Key |
|------------|---------|-----------|-------------|
| APPLICATION_STATUS | Employer/Admin accept/reject | Applicant | `notification.application.status` |
| SCHOLARSHIP_APPROVED | Admin approve scholarship | Creator | `scholarship.updated` |
| SCHOLARSHIP_REJECTED | Admin reject scholarship | Creator | `scholarship.updated` |
| NEW_MATCH | Matching Service finds match | Matched users | `scholarship.new.match` |

## ✅ Completed

- ✅ `updateApplicationStatusByAdmin()` đã có notification flow
- ✅ `updateApplicationStatus()` đã được thêm notification flow
- ✅ RabbitMQ routing key `notification.application.status` đã được bind
- ✅ NotificationConsumer xử lý APPLICATION_STATUS events
- ✅ Gửi qua 3 channels: Database + WebSocket + FCM
- ✅ Detailed logging ở mọi bước

## 🚀 Summary

**Luồng notification khi employer accept/reject application:**

1. ✅ Employer/Admin gọi API update status
2. ✅ ApplicationService cập nhật DB
3. ✅ ApplicationService publish event to RabbitMQ (`notification.application.status`)
4. ✅ Chat Service nhận event qua `NotificationConsumer`
5. ✅ Lưu vào DB notifications table
6. ✅ Gửi real-time qua WebSocket (`/topic/notifications/{userId}`)
7. ✅ Gửi push notification qua Firebase FCM
8. ✅ User nhận notification trên web hoặc mobile

**Tất cả các bước đều có log chi tiết để debug!** 🎉
