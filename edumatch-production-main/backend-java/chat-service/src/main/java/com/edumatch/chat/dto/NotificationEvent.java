package com.edumatch.chat.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.Map;
import java.util.Optional;

/**
 * DTO đại diện cho dữ liệu Event gửi đến từ RabbitMQ.
 * Cần đủ trường để xử lý cả event Application Status và event New Match.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true) // Bỏ qua field không khớp
public class NotificationEvent {
    // Thông tin người nhận
    private Long applicantUserId; // Từ ScholarshipService hoặc MatchingService
    private Long userId; // Dùng để fallback nếu applicantUserId không có
    private Long recipientId; // Trường mới - trực tiếp chỉ định người nhận
    private Long creatorUserId; // Từ notification.scholarship.* - gửi cho người tạo

    // Nội dung thông báo
    private String title;
    private String body;
    private String status; // Ví dụ: "APPROVED" (Từ Application Status)
    private String type; // Loại notification: SCHOLARSHIP_APPROVED, NEW_MATCH, etc.
    private String opportunityTitle; // Tên học bổng để hiển thị chi tiết trong thông báo

    // Thông tin tham chiếu
    private String opportunityId; // Từ MatchingService (New Match)
    private Long applicationId; // Từ ScholarshipService (Status Change)
    private String referenceId; // Reference ID chung

    // Logic: Lấy ID người nhận cuối cùng
    public Long getRecipientId() {
        return Optional.ofNullable(recipientId)
                .or(() -> Optional.ofNullable(applicantUserId))
                .or(() -> Optional.ofNullable(creatorUserId))
                .orElse(userId);
    }
}
