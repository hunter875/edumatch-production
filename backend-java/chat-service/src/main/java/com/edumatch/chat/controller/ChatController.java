package com.edumatch.chat.controller;

import com.edumatch.chat.dto.ChatMessageRequest;
import com.edumatch.chat.dto.MessageDto;
import com.edumatch.chat.model.Message;
import com.edumatch.chat.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

@Controller // Dùng @Controller (không phải @RestController) cho WebSocket
@RequiredArgsConstructor
@Slf4j
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate simpMessagingTemplate; // Bean có sẵn để gửi WebSocket

    /**
     * Lắng nghe tin nhắn từ Client gửi đến kênh /app/chat.send
     * (Khớp với WebSocketConfig và Yêu cầu [cite: 1080])
     *
     * @param request       Payload tin nhắn (JSON)
     * @param authentication Được cung cấp bởi WebSocketAuthInterceptor
     */
    @MessageMapping("/chat.send")
    public void handleChatMessage(@Valid @Payload ChatMessageRequest request, Authentication authentication) {

        log.info("Nhận được tin nhắn từ '{}' gửi tới '{}'",
                authentication.getName(), request.getReceiverId());

        // 1. Lưu tin nhắn vào CSDL (và lấy UserID)
        Message savedMessage = chatService.saveAndProcessMessage(request, authentication);

        // 2. Chuyển đổi sang DTO
        MessageDto messageDto = MessageDto.fromEntity(savedMessage);

        // 3. Gửi tin nhắn đến người nhận
        // (Đẩy vào kênh cá nhân của người nhận)
        String receiverDestination = "/topic/messages/" + request.getReceiverId();
        simpMessagingTemplate.convertAndSend(receiverDestination, messageDto);
        log.info("Đã đẩy tin nhắn tới kênh người nhận: {}", receiverDestination);

        // 4. Gửi bản sao tin nhắn cho chính người gửi (để đồng bộ UI)
        String senderDestination = "/topic/messages/" + savedMessage.getSenderId();
        simpMessagingTemplate.convertAndSend(senderDestination, messageDto);
        log.info("Đã đẩy bản sao tin nhắn tới kênh người gửi: {}", senderDestination);
    }
}
