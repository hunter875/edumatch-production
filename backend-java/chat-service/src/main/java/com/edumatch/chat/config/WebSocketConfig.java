package com.edumatch.chat.config;

import com.edumatch.chat.security.WebSocketAuthInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker // Kích hoạt WebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthInterceptor webSocketAuthInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Cấu hình Message Broker (bộ định tuyến tin nhắn)

        // 1. Các kênh mà Client sẽ ĐĂNG KÝ (Subscribe)
        // Server sẽ gửi tin nhắn đến các kênh bắt đầu bằng "/topic"
        // Ví dụ: /topic/messages/{userId}
        // Ví dụ: /topic/notifications/{userId}
        registry.enableSimpleBroker("/topic");

        // 2. Các kênh mà Client sẽ GỬI (Send)
        // Client gửi tin nhắn đến các kênh bắt đầu bằng "/app"
        // Ví dụ: /app/chat.send
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Đăng ký endpoint chính cho WebSocket
        // Khớp với yêu cầu: GET /api/ws
        registry.addEndpoint("/api/ws")
                .setAllowedOriginPatterns("*"); // Cho phép mọi nguồn (thay đổi ở production)

        // (Tùy chọn: Thêm .withSockJS() nếu cần hỗ trợ trình duyệt cũ)
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        // Đăng ký Interceptor (bộ chặn) mà chúng ta đã tạo
        // Mọi kết nối (inbound) sẽ phải đi qua WebSocketAuthInterceptor
        registration.interceptors(webSocketAuthInterceptor);
    }
}