package com.example.jwt.example.service;

import com.example.jwt.example.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Issues short-lived service tokens for machine-to-machine calls.
 *
 * <p>Endpoints under {@code /api/internal/**} are guarded with
 * {@code hasAnyAuthority('ROLE_ADMIN','ROLE_SERVICE')}. Ordinary users hold neither
 * role, so forwarding a user token there can only ever produce 403. A calling
 * service therefore needs its own identity.
 *
 * <p>The design deliberately avoids a shared static bearer string: the caller
 * exchanges a client id/secret pair for a short-lived RS256 token that carries
 * {@code ROLE_SERVICE} and an audience restricted to internal calls. That keeps
 * the existing JWT verification path as the single mechanism, so signature,
 * expiry, issuer and audience are all enforced by the same code that already
 * validates user tokens.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceTokenService {

    private final JwtTokenProvider jwtTokenProvider;

    /** Enables the client-credentials exchange. Off unless explicitly turned on. */
    @Value("${app.service-auth.enabled:false}")
    private boolean enabled;

    @Value("${app.service-auth.client-id:}")
    private String clientId;

    @Value("${app.service-auth.client-secret:}")
    private String clientSecret;

    /** Audience placed on issued service tokens; must match the resource check. */
    @Value("${app.service-auth.audience:edumatch-internal}")
    private String audience;

    @Value("${app.service-auth.token-ttl-seconds:300}")
    private long tokenTtlSeconds;

    private static final int MIN_SECRET_LENGTH = 32;

    /**
     * Exchange a client credential for a service token.
     *
     * @return the token, or {@code null} when the caller is not authorised.
     *         Callers must treat {@code null} as a 401 and never fall back to an
     *         unauthenticated request.
     */
    public String issueToken(String presentedClientId, String presentedSecret) {
        if (!enabled) {
            log.debug("Service token exchange is disabled; rejecting request.");
            return null;
        }
        if (clientSecret == null || clientSecret.length() < MIN_SECRET_LENGTH) {
            // Misconfiguration must not silently authorise anyone.
            log.error("Service auth enabled but client secret is missing or shorter than {} characters; refusing.",
                    MIN_SECRET_LENGTH);
            return null;
        }
        if (!constantTimeEquals(clientId, presentedClientId)) {
            log.warn("Service token exchange rejected: unknown client id.");
            return null;
        }
        if (!constantTimeEquals(clientSecret, presentedSecret)) {
            log.warn("Service token exchange rejected: bad secret for client '{}'.", presentedClientId);
            return null;
        }
        String token = jwtTokenProvider.createServiceToken(clientId, audience, tokenTtlSeconds);
        log.info("Issued service token for client '{}', audience '{}', ttl {}s", clientId, audience, tokenTtlSeconds);
        return token;
    }

    /** Length-independent comparison that does not leak position of the first mismatch. */
    private boolean constantTimeEquals(String expected, String presented) {
        if (expected == null || presented == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                presented.getBytes(StandardCharsets.UTF_8));
    }
}
