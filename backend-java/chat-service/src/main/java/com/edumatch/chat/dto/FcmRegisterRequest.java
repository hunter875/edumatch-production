package com.edumatch.chat.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * DTO này đại diện cho request body
 * khi client đăng ký FCM token.
 * Khớp với yêu cầu: POST /api/fcm/register
 * Body: { "fcmToken": "..." }
 */
@Data
public class FcmRegisterRequest {

    @NotBlank(message = "FCM token là bắt buộc")
    private String fcmToken;
}