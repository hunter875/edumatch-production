package com.edumatch.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO này đại diện cho tin nhắn mà Client GỬI lên server
 * Payload: { "receiverId": "...", "content": "..." }
 */
@Data
public class ChatMessageRequest {

    // ID của người nhận
    @NotNull(message = "receiverId is required")
    private Long receiverId;

    @NotBlank(message = "content is required")
    @Size(max = 4000, message = "content must not exceed 4000 characters")
    private String content;
}
