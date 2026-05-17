package com.edumatch.chat.service;

import com.edumatch.chat.model.FcmToken;
import com.edumatch.chat.repository.FcmTokenRepository;
import com.google.firebase.messaging.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FirebaseMessagingService {

    private final FcmTokenRepository fcmTokenRepository;

    @Value("${app.firebase.enabled:true}")
    private boolean firebaseEnabled;

    /**
     * Gửi Push Notification đến một UserID cụ thể
     */
    public void sendNotification(Long userId, String title, String body, String type, String referenceId) {
        if (!firebaseEnabled) {
            log.debug("[FCM] Firebase disabled; skipping notification for user {}", userId);
            return;
        }

        log.info("🔔 [FCM] Bắt đầu gửi notification cho User ID: {}", userId);
        log.debug("🔔 [FCM] Notification details - Title: '{}', Body: '{}', Type: '{}', Ref: '{}'", 
                  title, body, type, referenceId);
        
        // 1. Kiểm tra input
        if (userId == null) {
            log.error("❌ [FCM] User ID is null, không thể gửi notification");
            return;
        }
        
        if (title == null || title.trim().isEmpty()) {
            log.warn("⚠️ [FCM] Title is empty for User {}, using default", userId);
            title = "EduMatch Notification";
        }
        
        if (body == null || body.trim().isEmpty()) {
            log.warn("⚠️ [FCM] Body is empty for User {}, using default", userId);
            body = "You have a new notification";
        }
        
        // 2. Lấy device token của người dùng từ CSDL
        Optional<FcmToken> fcmTokenOptional = fcmTokenRepository.findByUserId(userId);

        if (fcmTokenOptional.isEmpty()) {
            log.warn("⚠️ [FCM] Không tìm thấy FCM token cho User ID: {}. User chưa đăng ký device.", userId);
            log.info("💡 [FCM] Hint: User cần gọi POST /api/fcm/register với FCM token từ mobile app");
            return;
        }

        FcmToken fcmTokenEntity = fcmTokenOptional.get();
        String deviceToken = fcmTokenEntity.getDeviceToken();
        
        if (deviceToken == null || deviceToken.trim().isEmpty()) {
            log.error("❌ [FCM] Device token rỗng cho User ID: {}", userId);
            return;
        }
        
        log.info("✅ [FCM] Tìm thấy device token cho User {}: {}...", userId, 
                 deviceToken.length() > 20 ? deviceToken.substring(0, 20) : deviceToken);

        // 3. Xây dựng nội dung thông báo
        try {
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();
            
            Message.Builder messageBuilder = Message.builder()
                    .setNotification(notification)
                    .putData("type", type != null ? type : "GENERAL")
                    .putData("referenceId", referenceId != null ? referenceId : "")
                    .putData("userId", userId.toString())
                    .setToken(deviceToken);
            
            // Thêm Android config để hiển thị đúng
            AndroidConfig androidConfig = AndroidConfig.builder()
                    .setPriority(AndroidConfig.Priority.HIGH)
                    .setNotification(AndroidNotification.builder()
                            .setClickAction("FLUTTER_NOTIFICATION_CLICK")
                            .setSound("default")
                            .build())
                    .build();
            
            messageBuilder.setAndroidConfig(androidConfig);
            
            // Thêm APNS config cho iOS
            ApnsConfig apnsConfig = ApnsConfig.builder()
                    .setAps(Aps.builder()
                            .setSound("default")
                            .setBadge(1)
                            .build())
                    .build();
            
            messageBuilder.setApnsConfig(apnsConfig);
            
            Message message = messageBuilder.build();
            
            log.debug("📦 [FCM] Message payload created: {}", message);

            // 4. Gửi qua Firebase
            log.info("📤 [FCM] Đang gửi notification qua Firebase Cloud Messaging...");
            String response = FirebaseMessaging.getInstance().send(message);
            
            log.info("✅ [FCM] Gửi thành công! User: {}, Response ID: {}", userId, response);
            log.debug("✅ [FCM] Full response: {}", response);
            
        } catch (FirebaseMessagingException e) {
            log.error("❌ [FCM] Lỗi khi gửi notification đến User {}", userId);
            log.error("❌ [FCM] Error message: {}", e.getMessage());
            
            // Xử lý các loại lỗi cụ thể
            String errorCode = e.getMessagingErrorCode() != null ? e.getMessagingErrorCode().name() : "UNKNOWN";
            log.error("❌ [FCM] Error code: {}", errorCode);
            log.error("❌ [FCM] Stack trace: ", e);
            
            if ("NOT_FOUND".equals(errorCode) || "INVALID_ARGUMENT".equals(errorCode) || "UNREGISTERED".equals(errorCode)) {
                log.warn("🗑️ [FCM] Token không hợp lệ hoặc đã hết hạn. Xóa token khỏi DB cho User {}", userId);
                try {
                    fcmTokenRepository.deleteById(fcmTokenEntity.getId());
                    log.info("✅ [FCM] Đã xóa token không hợp lệ cho User {}", userId);
                } catch (Exception ex) {
                    log.error("❌ [FCM] Lỗi khi xóa token: {}", ex.getMessage());
                }
            } else if ("QUOTA_EXCEEDED".equals(errorCode)) {
                log.error("❌ [FCM] Vượt quá quota FCM. Kiểm tra Firebase Console.");
            } else if ("UNAVAILABLE".equals(errorCode)) {
                log.error("❌ [FCM] Firebase service tạm thời không khả dụng. Thử lại sau.");
            } else if ("INTERNAL".equals(errorCode)) {
                log.error("❌ [FCM] Lỗi internal từ Firebase. Kiểm tra cấu hình Firebase Admin SDK.");
            } else {
                log.error("❌ [FCM] Lỗi không xác định: {}", errorCode);
            }
        } catch (Exception e) {
            log.error("❌ [FCM] Lỗi không mong đợi khi gửi notification cho User {}: {}", userId, e.getMessage(), e);
        }
    }
    
    /**
     * Kiểm tra Firebase có được khởi tạo thành công không
     */
    public boolean isFirebaseInitialized() {
        if (!firebaseEnabled) {
            log.debug("[FCM] Firebase disabled");
            return false;
        }

        try {
            FirebaseMessaging.getInstance();
            log.info("✅ [FCM] Firebase Messaging instance available");
            return true;
        } catch (Exception e) {
            log.error("❌ [FCM] Firebase Messaging NOT initialized: {}", e.getMessage());
            return false;
        }
    }
}
