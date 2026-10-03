package com.edumatch.chat.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Covers the chat-side client that obtains a ROLE_SERVICE token.
 *
 * <p>The important behaviours are: never return a token when the exchange is
 * disabled or fails (callers must not silently fall through to an
 * unauthenticated request), and cache a valid token instead of exchanging on
 * every call.
 */
class ServiceTokenClientTest {

    private RestTemplate restTemplate;
    private ServiceTokenClient client;

    @BeforeEach
    void setUp() {
        restTemplate = mock(RestTemplate.class);
        client = new ServiceTokenClient(restTemplate);
        ReflectionTestUtils.setField(client, "authServiceUrl", "http://auth-service:8081");
        ReflectionTestUtils.setField(client, "enabled", true);
        ReflectionTestUtils.setField(client, "clientId", "chat-service");
        ReflectionTestUtils.setField(client, "clientSecret", "a-very-long-test-secret-value-0123456789");
    }

    @Test
    void returnsTokenFromASuccessfulExchange() {
        when(restTemplate.postForObject(eq("http://auth-service:8081/api/service/token"),
                any(HttpEntity.class), eq(Map.class)))
                .thenReturn(Map.of("accessToken", "service-token-value"));

        assertThat(client.getToken()).isEqualTo("service-token-value");
    }

    @Test
    void returnsNullWhenExchangeIsDisabled() {
        ReflectionTestUtils.setField(client, "enabled", false);

        // Null means "no identity available"; callers must treat it as an error.
        assertThat(client.getToken()).isNull();
    }

    @Test
    void returnsNullWhenAuthServiceRejectsTheCredentials() {
        when(restTemplate.postForObject(any(String.class), any(HttpEntity.class), eq(Map.class)))
                .thenThrow(HttpClientErrorException.Unauthorized.create(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "no", null, null, null));

        assertThat(client.getToken()).isNull();
    }

    @Test
    void returnsNullWhenTheResponseHasNoToken() {
        when(restTemplate.postForObject(any(String.class), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(Map.of("success", true));

        assertThat(client.getToken()).isNull();
    }

    @Test
    void cachesTheTokenAcrossCalls() {
        AtomicInteger exchanges = new AtomicInteger();
        when(restTemplate.postForObject(any(String.class), any(HttpEntity.class), eq(Map.class)))
                .thenAnswer(invocation -> {
                    exchanges.incrementAndGet();
                    return Map.of("accessToken", "cached-token");
                });

        assertThat(client.getToken()).isEqualTo("cached-token");
        assertThat(client.getToken()).isEqualTo("cached-token");
        assertThat(client.getToken()).isEqualTo("cached-token");

        // One exchange, not three: the client must not hammer auth-service.
        assertThat(exchanges.get()).isEqualTo(1);
        verify(restTemplate, times(1)).postForObject(any(String.class), any(HttpEntity.class), eq(Map.class));
    }

    @Test
    void invalidateForcesAFreshExchange() {
        AtomicInteger exchanges = new AtomicInteger();
        when(restTemplate.postForObject(any(String.class), any(HttpEntity.class), eq(Map.class)))
                .thenAnswer(invocation -> {
                    exchanges.incrementAndGet();
                    return Map.of("accessToken", "token-" + exchanges.get());
                });

        assertThat(client.getToken()).isEqualTo("token-1");
        client.invalidate();
        assertThat(client.getToken()).isEqualTo("token-2");
    }

    @Test
    void sendsTheClientCredentialsAsJson() {
        when(restTemplate.postForObject(any(String.class), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(Map.of("accessToken", "t"));

        client.getToken();

        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<HttpEntity<Map<String, String>>> captor =
                org.mockito.ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForObject(any(String.class), captor.capture(), eq(Map.class));
        assertThat(captor.getValue().getBody())
                .containsEntry("clientId", "chat-service")
                .containsEntry("clientSecret", "a-very-long-test-secret-value-0123456789");
        assertThat(captor.getValue().getHeaders().getContentType())
                .isEqualTo(org.springframework.http.MediaType.APPLICATION_JSON);
    }

    @Test
    void usesPostNotGet() {
        when(restTemplate.postForObject(any(String.class), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(Map.of("accessToken", "t"));

        client.getToken();

        // The secret must never travel in a URL; only a POST body.
        verify(restTemplate, times(0)).exchange(any(String.class), eq(HttpMethod.GET),
                any(HttpEntity.class), eq(Map.class));
    }
}
