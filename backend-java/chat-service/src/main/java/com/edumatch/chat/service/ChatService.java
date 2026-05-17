package com.edumatch.chat.service;

import com.edumatch.chat.dto.ChatMessageRequest;
import com.edumatch.chat.dto.ConversationDto;
import com.edumatch.chat.dto.FcmRegisterRequest;
import com.edumatch.chat.dto.UserDetailDto;
import com.edumatch.chat.exception.BadRequestException;
import com.edumatch.chat.exception.ResourceNotFoundException;
import com.edumatch.chat.model.Conversation;
import com.edumatch.chat.model.FcmToken;
import com.edumatch.chat.model.Message;
import com.edumatch.chat.model.Notification;
import com.edumatch.chat.repository.ConversationRepository;
import com.edumatch.chat.repository.FcmTokenRepository;
import com.edumatch.chat.repository.MessageRepository;
import com.edumatch.chat.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final FcmTokenRepository fcmTokenRepository;
    private final NotificationRepository notificationRepository;
    private final FirebaseMessagingService firebaseMessagingService;
    private final RestTemplate restTemplate;

    @Value("${app.services.auth-service.url:http://auth-service:8081}") // Lấy URL từ properties
    private String authServiceUrl;

    /**
     * Xử lý và lưu tin nhắn mới
     */
    @Transactional
    public Message saveAndProcessMessage(ChatMessageRequest request, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication is required to send chat messages.");
        }
        validateMessageRequest(request);
        // 1. Lấy thông tin người gửi (Sender)
        // Lấy username và token từ Authentication (đã được Interceptor xác thực)
        String username = authentication.getName();
        String token = (String) authentication.getCredentials();

        // Gọi Auth-Service để lấy ID (Long) của người gửi
        UserDetailDto sender = getUserDetailsFromAuthService(username, token);
        Long senderId = sender.getId();
        Long receiverId = request.getReceiverId();
        if (Objects.equals(senderId, receiverId)) {
            throw new BadRequestException("receiverId must be different from senderId.");
        }
        validateReceiverExists(receiverId, token);

        // 2. Tìm hoặc Tạo cuộc hội thoại (Conversation)
        Conversation conversation = findOrCreateConversation(senderId, receiverId);

        // 3. Tạo và Lưu tin nhắn (Message)
        Message message = Message.builder()
                .conversationId(conversation.getId())
                .senderId(senderId)
                .content(request.getContent())
                // sentAt được tự động điền bởi @CreationTimestamp
                .build();

        Message savedMessage = messageRepository.save(message);
        log.info("Đã lưu tin nhắn mới (ID: {}) vào cuộc hội thoại (ID: {})",
                savedMessage.getId(), conversation.getId());

        // 4. Gửi Push Notification cho người nhận
        try {
            // Cắt nội dung tin nhắn nếu dài quá 50 ký tự
            String notificationBody = request.getContent();
            if (notificationBody != null && notificationBody.length() > 50) {
                notificationBody = notificationBody.substring(0, 50) + "...";
            }
            
            // Gửi thông báo qua Firebase
            firebaseMessagingService.sendNotification(
                receiverId,
                "Bạn có tin nhắn mới",
                notificationBody,
                "CHAT_MESSAGE",
                conversation.getId().toString()
            );
            log.info("Đã gửi push notification cho User {}", receiverId);
        } catch (Exception e) {
            // Không rollback transaction nếu gửi thông báo lỗi
            log.error("Lỗi khi gửi push notification cho User {}: {}", receiverId, e.getMessage(), e);
        }

        return savedMessage;
    }

    private void validateMessageRequest(ChatMessageRequest request) {
        if (request == null) {
            throw new BadRequestException("Message request is required.");
        }
        if (request.getReceiverId() == null) {
            throw new BadRequestException("receiverId is required.");
        }
        if (!StringUtils.hasText(request.getContent())) {
            throw new BadRequestException("content is required.");
        }
        request.setContent(request.getContent().trim());
    }

    private void validateReceiverExists(Long receiverId, String token) {
        UserDetailDto receiver = getUserDetailsByIdFromAuthService(receiverId, token);
        if (receiver == null || receiver.getId() == null) {
            throw new ResourceNotFoundException("Receiver user not found: " + receiverId);
        }
    }

    private Map<Long, UserDetailDto> getUserDetailsByIdsFromAuthService(List<Long> userIds, String token) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }

        String url = UriComponentsBuilder
                .fromHttpUrl(authServiceUrl + "/api/internal/users")
                .queryParam("ids", userIds.toArray())
                .toUriString();

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<List<UserDetailDto>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    new ParameterizedTypeReference<List<UserDetailDto>>() {}
            );
            List<UserDetailDto> users = response.getBody();
            if (users == null || users.isEmpty()) {
                return Map.of();
            }
            return users.stream()
                    .filter(user -> user.getId() != null)
                    .collect(Collectors.toMap(
                            UserDetailDto::getId,
                            user -> user,
                            (first, ignored) -> first
                    ));
        } catch (Exception ex) {
            log.error("Loi khi goi Auth-Service batch user lookup: {}", ex.getMessage());
            return Map.of();
        }
    }

    /**
     * Tìm cuộc hội thoại giữa 2 người, nếu không có thì tạo mới.
     */
    private Conversation findOrCreateConversation(Long senderId, Long receiverId) {
        return conversationRepository.findByParticipants(senderId, receiverId)
                .map(conv -> {
                    // Nếu tìm thấy, cập nhật thời gian
                    conv.setLastMessageAt(LocalDateTime.now());
                    return conversationRepository.save(conv);
                })
                .orElseGet(() -> {
                    // Nếu không tìm thấy, tạo mới
                    Conversation newConv = Conversation.builder()
                            .participant1Id(senderId)
                            .participant2Id(receiverId)
                            .lastMessageAt(LocalDateTime.now())
                            .build();
                    log.info("Tạo cuộc hội thoại mới giữa User {} và User {}", senderId, receiverId);
                    return conversationRepository.save(newConv);
                });
    }
    /**
     * (Logic cho API: POST /api/fcm/register)
     * Đăng ký hoặc cập nhật FCM token cho user
     */
    @Transactional
    public void registerFcmToken(FcmRegisterRequest request, Authentication authentication) {
        log.info("📱 [FCM Register] Bắt đầu đăng ký FCM token");
        log.debug("📱 [FCM Register] Auth principal: {}", authentication.getName());
        
        // 1. Lấy UserID (Long)
        UserDetailDto user = getUserDetailsFromAuthService(
                authentication.getName(),
                (String) authentication.getCredentials()
        );
        Long userId = user.getId();
        log.info("📱 [FCM Register] User ID: {}", userId);

        // Validate token
        if (request.getFcmToken() == null || request.getFcmToken().trim().isEmpty()) {
            log.error("❌ [FCM Register] FCM token is null or empty for User {}", userId);
            throw new BadRequestException("FCM token cannot be empty");
        }
        
        log.debug("📱 [FCM Register] New token: {}...", 
                  request.getFcmToken().length() > 20 ? request.getFcmToken().substring(0, 20) : request.getFcmToken());

        // 2. Tìm token cũ (nếu có)
        FcmToken token = fcmTokenRepository.findByUserId(userId)
                .orElse(new FcmToken()); // Nếu không có, tạo mới

        boolean isNewToken = token.getId() == null;
        if (isNewToken) {
            log.info("📱 [FCM Register] Creating NEW token entry for User {}", userId);
        } else {
            log.info("📱 [FCM Register] UPDATING existing token (ID: {}) for User {}", token.getId(), userId);
        }

        // 3. Cập nhật
        token.setUserId(userId);
        token.setDeviceToken(request.getFcmToken());
        fcmTokenRepository.save(token);
        
        log.info("✅ [FCM Register] Token {} successfully for User {}", isNewToken ? "created" : "updated", userId);
    }

    /**
     * (Logic cho API: GET /api/conversations)
     * Lấy danh sách cuộc hội thoại của user
     */
    @Transactional(readOnly = true)
    public List<ConversationDto> getConversations(Authentication authentication) {
        // 1. Lấy UserID (Long)
        UserDetailDto user = getUserDetailsFromAuthService(
                authentication.getName(),
                (String) authentication.getCredentials()
        );
        Long currentUserId = user.getId();
        String token = (String) authentication.getCredentials();

        // 2. Lấy danh sách Entity
        List<Conversation> conversations = conversationRepository.findByParticipantId(currentUserId);
        if (conversations.isEmpty()) {
            return List.of();
        }

        List<Long> conversationIds = conversations.stream()
                .map(Conversation::getId)
                .collect(Collectors.toList());
        Map<Long, String> lastMessagesByConversationId = messageRepository
                .findLatestMessagesByConversationIds(conversationIds)
                .stream()
                .collect(Collectors.toMap(
                        Message::getConversationId,
                        Message::getContent,
                        (first, ignored) -> first
                ));

        List<Long> otherUserIds = conversations.stream()
                .map(conv -> conv.getParticipant1Id().equals(currentUserId)
                        ? conv.getParticipant2Id()
                        : conv.getParticipant1Id())
                .distinct()
                .collect(Collectors.toList());
        Map<Long, UserDetailDto> usersById = getUserDetailsByIdsFromAuthService(otherUserIds, token);

        // 3. Chuyển đổi sang DTO với thông tin user name
        return conversations.stream()
                .map(conv -> {
                    // Tìm ID của người "kia"
                    Long otherId = conv.getParticipant1Id().equals(currentUserId)
                            ? conv.getParticipant2Id()
                            : conv.getParticipant1Id();
                    
                    // Lấy tên user từ Auth-Service
                    UserDetailDto otherUser = usersById.get(otherId);
                    String otherUserName = (otherUser != null && otherUser.getUsername() != null) 
                            ? otherUser.getUsername() 
                            : "User " + otherId;
                    
                    // Lấy tin nhắn cuối cùng
                    String lastMessage = lastMessagesByConversationId.get(conv.getId());
                    
                    return ConversationDto.fromEntity(conv, currentUserId, otherUserName, lastMessage);
                })
                .collect(Collectors.toList());
    }

    /**
     * (Logic cho API: GET /api/messages/{conversationId})
     * Lấy lịch sử tin nhắn (phân trang)
     */
    @Transactional(readOnly = true)
    public Page<Message> getMessagesForConversation(Long conversationId, Pageable pageable, Authentication authentication) {
        // 1. Lấy UserID (Long)
        UserDetailDto user = getUserDetailsFromAuthService(
                authentication.getName(),
                (String) authentication.getCredentials()
        );
        Long currentUserId = user.getId();

        // 2. Kiểm tra quyền
        // (User phải là 1 trong 2 người tham gia hội thoại)
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found: " + conversationId));

        if (!conversation.getParticipant1Id().equals(currentUserId) &&
                !conversation.getParticipant2Id().equals(currentUserId)) {
            log.warn("User {} cố gắng truy cập trái phép vào cuộc hội thoại {}",
                    currentUserId, conversationId);
            throw new AccessDeniedException("Bạn không có quyền xem cuộc hội thoại này");
        }

        // 3. Lấy dữ liệu (phân trang)
        // (Chúng ta trả về Page<Message> (Entity) vì MessageDto gần như giống hệt Message Entity)
        return messageRepository.findByConversationIdOrderBySentAtDesc(conversationId, pageable);
    }

    /**
     * Lấy thông tin user bằng ID từ Auth-Service
     */
    private UserDetailDto getUserDetailsByIdFromAuthService(Long userId, String token) {
        String url = authServiceUrl + "/api/internal/user/id/" + userId;
        log.info("ChatService: Calling Auth-Service to get user details for userId: {}", userId);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<UserDetailDto> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, UserDetailDto.class
            );
            UserDetailDto user = response.getBody();
            if (user == null || user.getId() == null) {
                log.warn("Không thể lấy thông tin user ID {} từ Auth-Service.", userId);
                return null;
            }
            log.info("ChatService: Successfully received user details, username={}", user.getUsername());
            return user;
        } catch (Exception ex) {
            log.error("Lỗi khi gọi Auth-Service để lấy user ID {}: {}", userId, ex.getMessage());
            return null;
        }
    }

    /**
     * Hàm helper gọi sang Auth-Service để lấy UserID (Long) từ Username (String).
     */
    private UserDetailDto getUserDetailsFromAuthService(String username, String token) {
        String url = authServiceUrl + "/api/internal/user/" + username;
        log.info("ChatService: Calling Auth-Service to get user details for: {}", username);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<UserDetailDto> response = restTemplate.exchange(
                    url, HttpMethod.GET, entity, UserDetailDto.class
            );
            UserDetailDto user = response.getBody();
            if (user == null || user.getId() == null) {
                throw new IllegalStateException("Cannot resolve user details from Auth-Service.");
            }
            log.info("ChatService: Successfully received user details, userId={}", user.getId());
            return user;
        } catch (Exception ex) {
            log.error("Lỗi khi gọi Auth-Service: {}", ex.getMessage());
            throw new IllegalStateException("Không thể kết nối hoặc xác thực với Auth-Service.");
        }
    }
    /**
     * (Logic cho API: GET /api/notifications)
     * Lấy danh sách thông báo đã lưu trong DB của user
     */
    @Transactional(readOnly = true)
    public Page<Notification> getMyNotifications(Pageable pageable, Authentication authentication) {
        // 1. Lấy UserID (Long)
        UserDetailDto user = getUserDetailsFromAuthService(
                authentication.getName(),
                (String) authentication.getCredentials()
        );
        Long currentUserId = user.getId();

        // 2. Lấy dữ liệu (đã được sắp xếp và phân trang)
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(currentUserId, pageable);
    }

    /**
     * (Logic cho API: PATCH /api/notifications/{id}/read)
     * Đánh dấu thông báo là đã đọc
     */
    @Transactional
    public void markNotificationAsRead(Long notificationId, Authentication authentication) {
        // 1. Lấy UserID (Long)
        UserDetailDto user = getUserDetailsFromAuthService(
                authentication.getName(),
                (String) authentication.getCredentials()
        );
        Long currentUserId = user.getId();

        // 2. Tìm thông báo
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found: " + notificationId));

        // 3. Kiểm tra quyền sở hữu (Bắt buộc)
        if (!notification.getUserId().equals(currentUserId)) {
            log.warn("User {} cố gắng đánh dấu thông báo {} của người khác là đã đọc.",
                    currentUserId, notificationId);
            throw new AccessDeniedException("Bạn không có quyền chỉnh sửa thông báo này.");
        }

        // 4. Đánh dấu đã đọc và lưu
        notification.setRead(true);
        notificationRepository.save(notification);
        log.info("Notification {} của User {} đã được đánh dấu là đã đọc.", notificationId, currentUserId);
    }
}
