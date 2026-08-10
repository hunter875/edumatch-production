package com.edumatch.chat.dto;

import com.edumatch.chat.model.Message;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class MessageDto {
    private Long id;
    private Long conversationId;
    private Long senderId;
    private String content;
    private LocalDateTime sentAt;

    /**
     * Hàm helper để chuyển từ Entity (Database) -> DTO (API)
     */
    public static MessageDto fromEntity(Message message) {
        return MessageDto.builder()
                .id(message.getId())
                .conversationId(message.getConversationId())
                .senderId(message.getSenderId())
                .content(message.getContent())
                .sentAt(message.getSentAt())
                .build();
    }
}