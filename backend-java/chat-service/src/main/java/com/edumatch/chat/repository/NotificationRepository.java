package com.edumatch.chat.repository;

import com.edumatch.chat.model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /**
     * Tìm thông báo cho một user ID, có phân trang.
     * (Sắp xếp theo thời gian tạo giảm dần (DESC) để lấy thông báo mới nhất trước)
     */
    Page<Notification> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);
}