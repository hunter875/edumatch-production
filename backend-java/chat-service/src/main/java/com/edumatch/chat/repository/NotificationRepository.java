package com.edumatch.chat.repository;

import com.edumatch.chat.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Tìm thông báo cho một user ID, có phân trang.
     * (Sắp xếp theo thời gian tạo giảm dần (DESC) để lấy thông báo mới nhất trước)
     */
    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    /** Số thông báo chưa đọc của một user (cho badge). */
    long countByUserIdAndIsReadFalse(Long userId);

    /**
     * Đánh dấu tất cả thông báo chưa đọc của user là đã đọc.
     * Dùng UPDATE có điều kiện theo user_id nên không thể chạm tới bản ghi của
     * người khác, và trả về số dòng đã đổi.
     */
    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.userId = :userId AND n.isRead = false")
    int markAllReadByUserId(@Param("userId") Long userId);
}