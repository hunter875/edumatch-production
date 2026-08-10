# Chat Service - Tài Liệu Chi Tiết

## 📋 Tổng Quan

**Service**: Chat Service  
**Port**: 8084  
**Framework**: Spring Boot 3.x + Java 17  
**Database**: MySQL 8.0  
**Real-time**: WebSocket + SockJS  
**Messaging**: RabbitMQ  
**Push Notifications**: Firebase Cloud Messaging (FCM)  
**Purpose**: Real-time chat, notifications, và WebSocket communication

---

## 🏗️ Kiến Trúc

```
chat-service/
├── src/main/java/com/edumatch/chat/
│   ├── ChatServiceApplication.java            # Main application
│   ├── config/
│   │   ├── AppConfig.java                     # General config
│   │   ├── CorsConfig.java                    # CORS settings
│   │   ├── FirebaseConfig.java                # Firebase FCM setup
│   │   └── WebSocketConfig.java               # WebSocket config
│   ├── controller/
│   │   ├── ChatController.java                # Chat endpoints
│   │   ├── NotificationController.java        # Notification endpoints
│   │   └── WebSocketController.java           # WebSocket handlers
│   ├── dto/
│   │   ├── ChatMessageDTO.java
│   │   ├── NotificationDTO.java
│   │   └── NotificationEvent.java
│   ├── model/
│   │   ├── ChatMessage.java                   # Chat message entity
│   │   ├── Notification.java                  # Notification entity
│   │   └── UserConnection.java                # WebSocket connections
│   ├── repository/
│   │   ├── ChatMessageRepository.java
│   │   └── NotificationRepository.java
│   ├── security/
│   │   └── JwtAuthFilter.java                 # JWT validation
│   └── service/
│       ├── ChatService.java                   # Chat business logic
│       ├── NotificationConsumer.java          # RabbitMQ consumer
│       ├── NotificationService.java           # Notification logic
│       └── WebSocketService.java              # WebSocket management
├── src/main/resources/
│   ├── application.properties
│   └── firebase-adminsdk-key.json             # FCM credentials
└── firebase-adminsdk-key.json                 # FCM key (root)
```

---

## 🗄️ Database Schema

### Chat Messages Table
```sql
CREATE TABLE chat_messages (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    conversation_id VARCHAR(255) NOT NULL,
    sender_id BIGINT NOT NULL,
    receiver_id BIGINT NOT NULL,
    
    content TEXT NOT NULL,
    message_type ENUM('TEXT', 'IMAGE', 'FILE', 'SYSTEM') DEFAULT 'TEXT',
    attachment_url VARCHAR(500),
    
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_conversation (conversation_id),
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_created_at (created_at),
    INDEX idx_is_read (is_read),
    
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Notifications Table
```sql
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    
    -- Notification content
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Related entities
    related_entity_type VARCHAR(100),
    related_entity_id BIGINT,
    opportunity_title VARCHAR(255),  -- Scholarship title for notifications
    
    -- Notification metadata
    icon VARCHAR(255),
    action_url VARCHAR(500),
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    -- Delivery status
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP NULL,
    delivery_method VARCHAR(50),  -- WEBSOCKET, FCM, EMAIL
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user (user_id),
    INDEX idx_type (type),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### User Connections Table (In-Memory/Cache)
```sql
CREATE TABLE user_connections (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    
    connection_type VARCHAR(50),  -- WEBSOCKET, STOMP
    device_token VARCHAR(500),    -- FCM device token
    
    connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_user (user_id),
    INDEX idx_session (session_id),
    INDEX idx_active (is_active)
);
```

---

## 🔌 API Endpoints

### Chat Endpoints

#### POST /api/chats/send
**Description**: Gửi chat message

**Headers**:
```
Authorization: Bearer <token>
```

**Request Body**:
```json
{
  "receiverId": 10,
  "content": "Hello, I have a question about the scholarship",
  "messageType": "TEXT"
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "conversationId": "5-10",
  "senderId": 5,
  "receiverId": 10,
  "content": "Hello, I have a question about the scholarship",
  "messageType": "TEXT",
  "isRead": false,
  "createdAt": "2025-01-20T10:00:00Z"
}
```

**WebSocket Broadcast**: Message sent to receiver via WebSocket if online

---

#### GET /api/chats/conversations
**Description**: Lấy danh sách conversations của user

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
[
  {
    "conversationId": "5-10",
    "otherUserId": 10,
    "otherUserName": "Dr. Smith",
    "otherUserAvatar": "https://example.com/avatar.jpg",
    "lastMessage": "Hello, I have a question...",
    "lastMessageTime": "2025-01-20T10:00:00Z",
    "unreadCount": 3
  }
]
```

---

#### GET /api/chats/conversations/{conversationId}/messages
**Description**: Lấy messages trong conversation

**Query Parameters**:
- `page` (default: 0)
- `size` (default: 50)

**Response** (200 OK):
```json
{
  "content": [
    {
      "id": 1,
      "senderId": 5,
      "senderName": "Nguyen Van A",
      "content": "Hello, I have a question...",
      "messageType": "TEXT",
      "isRead": true,
      "createdAt": "2025-01-20T10:00:00Z"
    }
  ],
  "totalElements": 25,
  "totalPages": 1,
  "currentPage": 0
}
```

---

#### PUT /api/chats/messages/{id}/read
**Description**: Đánh dấu message đã đọc

**Response** (200 OK)

---

#### POST /api/chats/upload
**Description**: Upload file attachment

**Headers**:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request**:
```
file: <binary data>
```

**Response** (200 OK):
```json
{
  "url": "https://storage.example.com/chats/file123.pdf",
  "fileName": "document.pdf",
  "fileSize": 1048576,
  "mimeType": "application/pdf"
}
```

---

### Notification Endpoints

#### GET /api/notifications
**Description**: Lấy notifications của user

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (default: 0)
- `size` (default: 20)
- `isRead` (optional): true/false
- `type` (optional): Filter by notification type

**Response** (200 OK):
```json
[
  {
    "id": 1,
    "type": "APPLICATION_STATUS_CHANGED",
    "title": "Đơn được chấp nhận! 🎉",
    "message": "Chúc mừng! Đơn xin học bổng 'AI Research Fellowship 2025' đã được chấp nhận.",
    "opportunityTitle": "AI Research Fellowship 2025",
    "relatedEntityType": "APPLICATION",
    "relatedEntityId": 5,
    "actionUrl": "/user/applications/5",
    "isRead": false,
    "createdAt": "2025-01-20T10:00:00Z"
  }
]
```

---

#### GET /api/notifications/unread-count
**Description**: Lấy số lượng notifications chưa đọc

**Response** (200 OK):
```json
{
  "count": 5
}
```

---

#### PUT /api/notifications/{id}/read
**Description**: Đánh dấu notification đã đọc

**Response** (200 OK)

---

#### PUT /api/notifications/mark-all-read
**Description**: Đánh dấu tất cả notifications đã đọc

**Response** (200 OK)

---

#### DELETE /api/notifications/{id}
**Description**: Xóa notification

**Response** (204 No Content)

---

#### POST /api/notifications/device-token
**Description**: Đăng ký FCM device token

**Request Body**:
```json
{
  "token": "fcm-device-token-here",
  "platform": "WEB"
}
```

**Response** (200 OK)

---

### Health Check

#### GET /api/chats/health
**Description**: Check service health

**Response** (200 OK):
```json
{
  "status": "UP",
  "websocket": "CONNECTED",
  "rabbitmq": "CONNECTED",
  "firebase": "CONFIGURED"
}
```

---

## 🔌 WebSocket API

### Connection Endpoint

**URL**: `ws://localhost:8084/ws`  
**Protocol**: STOMP over WebSocket  
**Fallback**: SockJS

### Client Connection (JavaScript)

```javascript
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

// Create connection
const socket = new SockJS('http://localhost:8084/ws');
const stompClient = Stomp.over(socket);

// Connect with JWT token
stompClient.connect(
  { Authorization: `Bearer ${token}` },
  (frame) => {
    console.log('Connected:', frame);
    
    // Subscribe to personal notifications
    stompClient.subscribe('/user/queue/notifications', (message) => {
      const notification = JSON.parse(message.body);
      console.log('Received notification:', notification);
      showNotification(notification);
    });
    
    // Subscribe to chat messages
    stompClient.subscribe('/user/queue/messages', (message) => {
      const chatMessage = JSON.parse(message.body);
      console.log('Received message:', chatMessage);
      appendMessage(chatMessage);
    });
  },
  (error) => {
    console.error('WebSocket error:', error);
  }
);

// Send chat message
function sendMessage(receiverId, content) {
  stompClient.send('/app/chat.send', {}, JSON.stringify({
    receiverId,
    content,
    messageType: 'TEXT'
  }));
}

// Disconnect
function disconnect() {
  if (stompClient && stompClient.connected) {
    stompClient.disconnect();
  }
}
```

---

### WebSocket Destinations

#### Subscribe Destinations (Client → Server)

| Destination | Description |
|-------------|-------------|
| `/user/queue/notifications` | Personal notifications |
| `/user/queue/messages` | Chat messages |
| `/topic/global` | Global broadcasts |

#### Send Destinations (Client → Server)

| Destination | Description |
|-------------|-------------|
| `/app/chat.send` | Send chat message |
| `/app/notification.read` | Mark notification as read |

---

## 📤 RabbitMQ Integration

### Consumed Events

#### notification-events Queue

**Purpose**: Receive notification events từ các services khác

**Event Types**:

##### application.status_changed
```json
{
  "eventType": "application.status_changed",
  "applicationId": 1,
  "studentId": 5,
  "opportunityId": 1,
  "opportunityTitle": "AI Research Fellowship 2025",
  "oldStatus": "PENDING",
  "newStatus": "ACCEPTED",
  "reviewNotes": "Excellent qualifications",
  "timestamp": "2025-01-21T10:00:00Z"
}
```

**Processing**:
1. Parse event và lấy opportunityTitle
2. Tạo notification với scholarship title
3. Lưu vào database
4. Gửi qua WebSocket nếu user online
5. Gửi FCM push notification nếu offline

**Code** (NotificationConsumer.java):
```java
@RabbitListener(queues = "notification-events")
public void handleNotification(NotificationEvent event) {
    log.info("📬 Received notification: {}", event.getEventType());
    
    // Create notification
    Notification notification = new Notification();
    notification.setUserId(event.getStudentId());
    notification.setType(event.getEventType());
    
    // Set title và message based on status
    if ("ACCEPTED".equals(event.getNewStatus())) {
        notification.setTitle("Đơn được chấp nhận! 🎉");
        notification.setMessage(String.format(
            "Chúc mừng! Đơn xin học bổng '%s' đã được chấp nhận.",
            event.getOpportunityTitle()
        ));
    } else if ("REJECTED".equals(event.getNewStatus())) {
        notification.setTitle("Đơn bị từ chối");
        notification.setMessage(String.format(
            "Rất tiếc, đơn xin học bổng '%s' đã bị từ chối.",
            event.getOpportunityTitle()
        ));
    }
    
    notification.setOpportunityTitle(event.getOpportunityTitle());
    notification.setRelatedEntityType("APPLICATION");
    notification.setRelatedEntityId(event.getApplicationId());
    
    // Save to database
    notificationRepository.save(notification);
    
    // Send via WebSocket
    Map<String, Object> payload = new HashMap<>();
    payload.put("id", notification.getId());
    payload.put("type", notification.getType());
    payload.put("title", notification.getTitle());
    payload.put("message", notification.getMessage());
    payload.put("opportunityTitle", event.getOpportunityTitle());
    payload.put("timestamp", System.currentTimeMillis());
    
    webSocketService.sendToUser(
        event.getStudentId(),
        "/queue/notifications",
        payload
    );
    
    log.info("✅ Notification sent to user {}", event.getStudentId());
}
```

---

##### scholarship.published
```json
{
  "eventType": "scholarship.published",
  "opportunityId": 1,
  "title": "AI Research Fellowship 2025",
  "organizationName": "MIT Research Lab",
  "timestamp": "2025-01-20T10:00:00Z"
}
```

**Processing**: Send notification to matched students

---

##### message.sent
```json
{
  "eventType": "message.sent",
  "messageId": 1,
  "senderId": 5,
  "receiverId": 10,
  "content": "Hello!",
  "timestamp": "2025-01-20T10:00:00Z"
}
```

**Processing**: Forward message via WebSocket

---

## 🔥 Firebase Cloud Messaging (FCM)

### Configuration

**File**: `firebase-adminsdk-key.json`

```json
{
  "type": "service_account",
  "project_id": "edumatch-project",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk@edumatch-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token"
}
```

### Send Push Notification

```java
@Service
public class FirebaseNotificationService {
    
    public void sendPushNotification(Long userId, Notification notification) {
        // Get user's device token
        String deviceToken = getUserDeviceToken(userId);
        
        if (deviceToken == null) {
            log.warn("No device token for user {}", userId);
            return;
        }
        
        // Build FCM message
        Message message = Message.builder()
            .setToken(deviceToken)
            .setNotification(
                com.google.firebase.messaging.Notification.builder()
                    .setTitle(notification.getTitle())
                    .setBody(notification.getMessage())
                    .build()
            )
            .putData("notificationId", notification.getId().toString())
            .putData("type", notification.getType())
            .putData("opportunityTitle", notification.getOpportunityTitle())
            .putData("actionUrl", notification.getActionUrl())
            .build();
        
        // Send
        try {
            String response = FirebaseMessaging.getInstance().send(message);
            log.info("FCM sent successfully: {}", response);
            
            notification.setIsSent(true);
            notification.setSentAt(LocalDateTime.now());
            notification.setDeliveryMethod("FCM");
            notificationRepository.save(notification);
        } catch (FirebaseMessagingException e) {
            log.error("Failed to send FCM: {}", e.getMessage());
        }
    }
}
```

---

## 🔐 Security

### WebSocket Authentication

**JWT Token Validation**:
```java
@Configuration
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = 
                    StompHeaderAccessor.wrap(message);
                
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authToken = accessor.getFirstNativeHeader("Authorization");
                    
                    if (authToken != null && authToken.startsWith("Bearer ")) {
                        String token = authToken.substring(7);
                        Long userId = jwtService.validateAndGetUserId(token);
                        accessor.setUser(new UserPrincipal(userId));
                    }
                }
                
                return message;
            }
        });
    }
}
```

---

## 🔧 Configuration

### Environment Variables

```properties
# Database
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/chat_db
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=password

# JWT
JWT_SECRET=same-as-auth-service

# RabbitMQ
SPRING_RABBITMQ_HOST=localhost
SPRING_RABBITMQ_PORT=5672
SPRING_RABBITMQ_USERNAME=guest
SPRING_RABBITMQ_PASSWORD=guest

# WebSocket
WEBSOCKET_ALLOWED_ORIGINS=http://localhost:3000,https://edumatch.com

# Firebase
GOOGLE_APPLICATION_CREDENTIALS=firebase-adminsdk-key.json

# Server
SERVER_PORT=8084
```

---

## 🧪 Testing

### WebSocket Testing

**Using JavaScript**:
```javascript
// Test connection
const socket = new SockJS('http://localhost:8084/ws');
const stomp = Stomp.over(socket);

stomp.connect({ Authorization: 'Bearer ' + token }, () => {
  console.log('Connected!');
  
  stomp.subscribe('/user/queue/notifications', (msg) => {
    console.log('Received:', JSON.parse(msg.body));
  });
});
```

**Using Postman/Thunder Client**:
- URL: `ws://localhost:8084/ws`
- Protocol: SockJS
- Headers: `Authorization: Bearer <token>`

---

## 📊 Monitoring

### WebSocket Metrics
- Active connections
- Messages sent/received per second
- Connection errors
- Average message latency

### Notification Metrics
- Total notifications sent
- Delivery success rate (WebSocket vs FCM)
- Average read time
- Notification types distribution

---

## 🐛 Troubleshooting

### Issue: WebSocket Connection Failed
```
Error: WebSocket connection to 'ws://localhost:8084/ws' failed
```
**Solution**: Check CORS config, verify JWT token

### Issue: Notification Not Received
**Check**:
1. User is subscribed to correct destination
2. RabbitMQ connection is active
3. Notification event has correct userId
4. WebSocket connection is alive

### Issue: FCM Push Failed
```
Error: The registration token is not valid
```
**Solution**: Device token expired, re-register device

---

## 📚 References

- WebSocket Protocol
- STOMP Protocol
- Firebase Cloud Messaging
- RabbitMQ Documentation

---

**Last Updated**: January 2025  
**Service Version**: 1.0.0  
**Maintained By**: EduMatch Backend Team
