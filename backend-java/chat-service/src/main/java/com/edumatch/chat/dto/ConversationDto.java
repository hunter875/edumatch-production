package com.edumatch.chat.dto;

import com.edumatch.chat.model.Conversation;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * DTO đại diện cho một cuộc hội thoại trong danh sách
 * Khớp với yêu cầu: GET /api/conversations
 */
@Data
@Builder
public class ConversationDto {
    private Long conversationId;
    private Long otherParticipantId; // (Bị buộc phải thay đổi so với tài liệu)
    private String otherUserName; // Tên của người tham gia kia
    private String lastMessage; // Tin nhắn cuối cùng
    private LocalDateTime lastMessageAt;

    /**
     * Hàm helper để chuyển đổi
     * @param conversation Entity từ CSDL
     * @param currentUserId ID của người đang xem
     * @param otherUserName Tên của người tham gia kia
     * @param lastMessage Nội dung tin nhắn cuối
     * @return DTO
     */
    public static ConversationDto fromEntity(Conversation conversation, Long currentUserId, String otherUserName, String lastMessage) {
        // Tìm ID của người "kia"
        Long otherId = conversation.getParticipant1Id().equals(currentUserId)
                ? conversation.getParticipant2Id()
                : conversation.getParticipant1Id();

        return ConversationDto.builder()
                .conversationId(conversation.getId())
                .otherParticipantId(otherId)
                .otherUserName(otherUserName)
                .lastMessage(lastMessage)
                .lastMessageAt(conversation.getLastMessageAt())
                .build();
    }
}