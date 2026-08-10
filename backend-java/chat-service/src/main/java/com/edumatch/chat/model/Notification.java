package com.edumatch.chat.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
// SỬA Ở ĐÂY: Thêm 'indexes' vào @Table
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notification_user_id", columnList = "user_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * ID của người nhận thông báo.
     */
    // SỬA Ở ĐÂY: Xóa 'index = true'
    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    // Ví dụ: 'APPLICATION_APPROVED'
    @Column(name = "type")
    private String type;

    // Ví dụ: application_id
    @Column(name = "reference_id")
    private String referenceId;

    @Builder.Default
    @Column(name = "is_read")
    @JsonProperty("isRead") // Map to isRead in JSON
    private boolean isRead = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    // Add getter for frontend compatibility (message = body)
    @JsonProperty("message")
    public String getMessage() {
        return this.body;
    }
    
    // Add getter for frontend compatibility (read = isRead)
    @JsonProperty("read")
    public boolean isRead() {
        return this.isRead;
    }
}