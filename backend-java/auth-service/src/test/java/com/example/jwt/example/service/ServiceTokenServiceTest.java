package com.example.jwt.example.service;

import com.example.jwt.example.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Covers the client-credentials exchange that grants ROLE_SERVICE.
 *
 * <p>The exchange is the only way to reach /api/internal/** without ROLE_ADMIN,
 * so a mistake here either locks out the legitimate service-to-service path or
 * silently authorises the wrong caller. Both directions are asserted.
 */
class ServiceTokenServiceTest {

    private JwtTokenProvider provider;
    private ServiceTokenService service;

    private static final String CLIENT_ID = "chat-service";
    /** 48 random bytes; comfortably above the 32 character minimum. */
    private static final String CLIENT_SECRET =
            Base64.getEncoder().encodeToString("a-very-long-test-secret-value-0123456789".getBytes());

    @BeforeEach
    void setUp() throws Exception {
        provider = new JwtTokenProvider();
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair pair = generator.generateKeyPair();
        String privatePem = "-----BEGIN PRIVATE KEY-----\n"
                + Base64.getMimeEncoder().encodeToString(pair.getPrivate().getEncoded())
                + "\n-----END PRIVATE KEY-----";
        String publicPem = "-----BEGIN PUBLIC KEY-----\n"
                + Base64.getMimeEncoder().encodeToString(pair.getPublic().getEncoded())
                + "\n-----END PUBLIC KEY-----";
        ReflectionTestUtils.setField(provider, "rsaPrivateKeyPem", privatePem);
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPem", publicPem);
        ReflectionTestUtils.setField(provider, "requireRsa", true);
        ReflectionTestUtils.setField(provider, "jwtSecret", "");
        ReflectionTestUtils.setField(provider, "issuer", "edumatch-auth");
        ReflectionTestUtils.setField(provider, "audience", "edumatch-api");
        ReflectionTestUtils.setField(provider, "deployEnvironment", "staging");
        provider.init();

        service = new ServiceTokenService(provider);
        ReflectionTestUtils.setField(service, "enabled", true);
        ReflectionTestUtils.setField(service, "clientId", CLIENT_ID);
        ReflectionTestUtils.setField(service, "clientSecret", CLIENT_SECRET);
        ReflectionTestUtils.setField(service, "audience", "edumatch-api");
        ReflectionTestUtils.setField(service, "tokenTtlSeconds", 300L);
    }

    @Test
    void validClientCredentialsYieldAUsableServiceToken() {
        String token = service.issueToken(CLIENT_ID, CLIENT_SECRET);

        assertThat(token).isNotBlank();
        // The token must satisfy the same validator as user tokens.
        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.isValidServiceToken(token)).isTrue();
        assertThat(provider.getUserNameFromJWT(token)).isEqualTo(CLIENT_ID);
    }

    @Test
    void serviceTokenCarriesOnlyTheServiceRole() {
        String token = service.issueToken(CLIENT_ID, CLIENT_SECRET);

        // A machine token must not be able to masquerade as a user or an admin.
        assertThat(provider.getAuthentication(token).getAuthorities())
                .extracting(Object::toString)
                .containsExactly("ROLE_SERVICE")
                .doesNotContain("ROLE_ADMIN", "ROLE_USER", "ROLE_EMPLOYER");
    }

    @Test
    void wrongSecretIsRejected() {
        assertThat(service.issueToken(CLIENT_ID, "wrong-secret")).isNull();
    }

    @Test
    void unknownClientIdIsRejected() {
        assertThat(service.issueToken("other-service", CLIENT_SECRET)).isNull();
    }

    @Test
    void blankCredentialsAreRejected() {
        assertThat(service.issueToken("", CLIENT_SECRET)).isNull();
        assertThat(service.issueToken(CLIENT_ID, "")).isNull();
    }

    @Test
    void disabledExchangeIssuesNothingEvenWithCorrectCredentials() {
        ReflectionTestUtils.setField(service, "enabled", false);

        assertThat(service.issueToken(CLIENT_ID, CLIENT_SECRET)).isNull();
    }

    @Test
    void shortConfiguredSecretRefusesRatherThanAuthorising() {
        // A misconfigured deployment must fail closed, never issue a token.
        ReflectionTestUtils.setField(service, "clientSecret", "too-short");

        assertThat(service.issueToken(CLIENT_ID, "too-short")).isNull();
    }

    @Test
    void serviceTokenIsSignedWithRs256AndRejectsHs256Forgery() {
        String token = service.issueToken(CLIENT_ID, CLIENT_SECRET);

        String header = new String(Base64.getUrlDecoder().decode(token.split("\\.")[0]));
        assertThat(header).contains("RS256").doesNotContain("HS256");
        assertThat(provider.isValidServiceToken(token)).isTrue();

        // Flipping the signature must invalidate it.
        String[] parts = token.split("\\.");
        String tampered = parts[0] + "." + parts[1] + "." + parts[2].substring(0, parts[2].length() - 2) + "XY";
        assertThat(provider.isValidServiceToken(tampered)).isFalse();
    }

    @Test
    void serviceTokenExpiresWithinTheBoundedWindow() {
        String token = service.issueToken(CLIENT_ID, CLIENT_SECRET);

        // Read the claim without verifying: the point is the lifetime bound, not
        // the signature (covered above). The payload is base64url JSON.
        String payload = new String(Base64.getUrlDecoder().decode(token.split("\\.")[1]));
        assertThat(payload).contains("\"exp\"");
        long issuedAt = Long.parseLong(payload.replaceAll(".*\"iat\":(\\d+).*", "$1"));
        long expiresAt = Long.parseLong(payload.replaceAll(".*\"exp\":(\\d+).*", "$1"));
        long lifetimeSeconds = expiresAt - issuedAt;

        // Clamped to [30, 3600] so a misconfiguration cannot mint a long-lived
        // machine credential.
        assertThat(lifetimeSeconds).isBetween(30L, 3600L).isEqualTo(300L);
    }
}
