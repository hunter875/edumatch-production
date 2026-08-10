package com.edumatch.chat.controller;

import com.edumatch.chat.model.Notification;
import com.edumatch.chat.service.ChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final ChatService chatService; // Sử dụng lại ChatService để lấy UserID

    /**
     * API: GET /api/notifications
     * Mục tiêu: Lấy danh sách thông báo đã lưu trong DB cho user.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getMyNotifications(
            Pageable pageable, // Ví dụ: ?page=0&size=20
            Authentication authentication) {

        // Lấy thông báo (Logic nằm trong ChatService)
        Pageable cappedPageable = PageRequest.of(
                Math.max(pageable.getPageNumber(), 0),
                Math.min(Math.max(pageable.getPageSize(), 1), 100),
                pageable.getSort()
        );
        Page<Notification> notifications = chatService.getMyNotifications(cappedPageable, authentication);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("content", notifications.getContent());
        response.put("number", notifications.getNumber());
        response.put("size", notifications.getSize());
        response.put("totalElements", notifications.getTotalElements());
        response.put("totalPages", notifications.getTotalPages());
        response.put("first", notifications.isFirst());
        response.put("last", notifications.isLast());
        return ResponseEntity.ok(response);
    }

    /**
     * API: PATCH /api/notifications/{id}/read
     * Mục tiêu: Đánh dấu 1 thông báo là "đã đọc".
     */
    @PatchMapping("/{notificationId}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT) // Trả về 204 No Content
    public void markAsRead(
            @PathVariable Long notificationId,
            Authentication authentication) {

        // Đánh dấu đã đọc (Logic nằm trong ChatService)
        chatService.markNotificationAsRead(notificationId, authentication);
    }
}
