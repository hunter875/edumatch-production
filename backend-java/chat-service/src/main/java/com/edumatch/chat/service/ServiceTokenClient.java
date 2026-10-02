package com.edumatch.chat.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Obtains and caches a short-lived service token from auth-service.
 *
 * <p>Endpoints under {@code /api/internal/**} require {@code ROLE_ADMIN} or
 * {@code ROLE_SERVICE}; a user token can never satisfy that guard, so forwarding
 * the caller's token is not an option. This client performs a client-credentials
 * exchange instead and caches the result until shortly before it expires.
 *
 * <p>When the exchange is disabled or fails, the client returns {@code null}.
 * Callers must treat that as an error and must never fall back to an
 * unauthenticated request.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceTokenClient {

    private final RestTemplate restTemplate;

    @Value("${app.services.auth-service.url}")
    private String authServiceUrl;

    @Value("${app.service-auth.enabled:false}")
    private boolean enabled;

    @Value("${app.service-auth.client-id:}")
    private String clientId;

    @Value("${app.service-auth.client-secret:}")
    private String clientSecret;

    /** Refresh this long before the server-side expiry to avoid a race. */
    private static final Duration SKEW = Duration.ofSeconds(30);

    private final AtomicReference<CachedToken> cached = new AtomicReference<>();

    private record CachedToken(String token, Instant refreshAfter) {
        boolean isValid() {
            return token != null && Instant.now().isBefore(refreshAfter);
        }
    }

    /** @return a bearer token, or {@code null} when no token can be obtained. */
    public String getToken() {
        if (!enabled) {
            return null;
        }
        CachedToken current = cached.get();
        if (current != null && current.isValid()) {
            return current.token();
        }
        synchronized (this) {
            current = cached.get();
            if (current != null && current.isValid()) {
                return current.token();
            }
            return fetchAndCache();
        }
    }

    private String fetchAndCache() {
        String url = authServiceUrl + "/api/service/token";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(
                Map.of("clientId", clientId, "clientSecret", clientSecret), headers);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = restTemplate.postForObject(url, entity, Map.class);
            Object token = body == null ? null : body.get("accessToken");
            if (token == null || token.toString().isBlank()) {
                log.error("Service token exchange returned no token");
                return null;
            }
            // The server issues a 300s token by default; refresh 30s early.
            cached.set(new CachedToken(token.toString(), Instant.now().plus(Duration.ofSeconds(270)).minus(SKEW)));
            log.debug("Obtained service token from auth-service");
            return token.toString();
        } catch (Exception ex) {
            // Never log the secret or the response body: it may echo credentials.
            log.error("Service token exchange failed: {}", ex.getClass().getSimpleName());
            return null;
        }
    }

    /** Drop the cached token, e.g. after auth-service reports it invalid. */
    public void invalidate() {
        cached.set(null);
    }
}
