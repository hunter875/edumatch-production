package com.example.jwt.example.controller;

import com.example.jwt.example.service.ServiceTokenService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Client-credentials exchange for machine-to-machine callers.
 *
 * <p>This is the only way to obtain a {@code ROLE_SERVICE} token. It is reachable
 * without a user session by design — that is what "client credentials" means — so
 * the secret comparison is the entire security boundary. The service is off by
 * default ({@code app.service-auth.enabled=false}) and refuses to issue anything
 * unless a sufficiently long secret is configured.
 */
@RestController
@RequestMapping("/api/service")
@RequiredArgsConstructor
@Slf4j
public class ServiceAuthController {

    private final ServiceTokenService serviceTokenService;

    @Data
    public static class ServiceTokenRequest {
        @NotBlank
        private String clientId;
        @NotBlank
        private String clientSecret;
    }

    @PostMapping("/token")
    public ResponseEntity<?> issueToken(@Valid @RequestBody ServiceTokenRequest request) {
        String token = serviceTokenService.issueToken(request.getClientId(), request.getClientSecret());
        if (token == null) {
            // One generic response for unknown client, wrong secret and disabled
            // exchange, so the endpoint does not confirm which client ids exist.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .cacheControl(CacheControl.noStore())
                    .body(Map.of("success", false, "message", "Invalid client credentials"));
        }
        return ResponseEntity.ok()
                // A token response must never be cached by an intermediary.
                .cacheControl(CacheControl.noStore())
                .body(Map.of(
                        "success", true,
                        "accessToken", token,
                        "tokenType", "Bearer"));
    }
}
