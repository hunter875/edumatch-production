package com.edumatch.chat.security;

import com.edumatch.chat.dto.UserDetailDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    private static final String AUTH_HEADER = "TOKEN_AUTH";
    private static final String SESSION_USER_ID = "userId";

    private final JwtTokenProvider tokenProvider;
    private final RestTemplate restTemplate;

    @Value("${app.jwt.prefix}")
    private String headerPrefix;

    @Value("${app.services.auth-service.url:http://auth-service:8081}")
    private String authServiceUrl;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticateConnect(accessor);
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            authorizeSubscribe(accessor);
        }

        if (StompCommand.SEND.equals(accessor.getCommand()) && accessor.getUser() == null) {
            throw new AccessDeniedException("WebSocket authentication is required.");
        }

        return message;
    }

    private void authenticateConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader(AUTH_HEADER);
        String jwt = getJwtFromHeader(authHeader);

        if (!StringUtils.hasText(jwt) || !tokenProvider.validateToken(jwt)) {
            log.warn("WebSocketAuth: rejected CONNECT because token is missing or invalid.");
            throw new AccessDeniedException("Invalid WebSocket token.");
        }

        Authentication authentication = tokenProvider.getAuthentication(jwt);
        Long userId = resolveUserId(authentication.getName(), jwt);

        SecurityContextHolder.getContext().setAuthentication(authentication);
        accessor.setUser(authentication);
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes != null) {
            sessionAttributes.put(SESSION_USER_ID, userId);
        }

        log.info("WebSocketAuth: authenticated user={} userId={}", authentication.getName(), userId);
    }

    private void authorizeSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (!StringUtils.hasText(destination)) {
            throw new AccessDeniedException("Subscription destination is required.");
        }

        if (!destination.startsWith("/topic/messages/") && !destination.startsWith("/topic/notifications/")) {
            return;
        }

        Long userId = getSessionUserId(accessor);
        String expectedMessagesDestination = "/topic/messages/" + userId;
        String expectedNotificationsDestination = "/topic/notifications/" + userId;

        if (!destination.equals(expectedMessagesDestination) && !destination.equals(expectedNotificationsDestination)) {
            log.warn("WebSocketAuth: userId={} tried to subscribe to {}", userId, destination);
            throw new AccessDeniedException("Cannot subscribe to another user's topic.");
        }
    }

    private Long getSessionUserId(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        Object userId = sessionAttributes == null ? null : sessionAttributes.get(SESSION_USER_ID);
        if (userId instanceof Long value) {
            return value;
        }
        if (userId instanceof Number value) {
            return value.longValue();
        }
        throw new AccessDeniedException("WebSocket session is not authenticated.");
    }

    private Long resolveUserId(String username, String token) {
        String url = authServiceUrl + "/api/internal/user/" + username;
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", headerPrefix + " " + token);

        try {
            ResponseEntity<UserDetailDto> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    UserDetailDto.class
            );
            UserDetailDto user = response.getBody();
            if (user == null || user.getId() == null) {
                throw new AccessDeniedException("Cannot resolve WebSocket user.");
            }
            return user.getId();
        } catch (AccessDeniedException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("WebSocketAuth: failed to resolve userId for username={}: {}", username, ex.getMessage());
            throw new AccessDeniedException("Cannot resolve WebSocket user.");
        }
    }

    private String getJwtFromHeader(String bearerToken) {
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(headerPrefix + " ")) {
            return bearerToken.substring(headerPrefix.length() + 1);
        }
        return null;
    }
}
