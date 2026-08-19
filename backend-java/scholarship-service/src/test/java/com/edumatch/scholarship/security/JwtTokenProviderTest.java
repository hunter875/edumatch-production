package com.edumatch.scholarship.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    private static final String SECRET = "0123456789012345678901234567890101234567890123456789012345678901";
    private static final String ISSUER = "edumatch-auth";
    private static final String AUDIENCE = "edumatch-api";

    @Test
    void requireRsaWithoutConfiguredPublicKeyFailsClosed() {
        JwtTokenProvider provider = new JwtTokenProvider();

        ReflectionTestUtils.setField(provider, "requireRsa", true);
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPath", null);
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPem", "");

        assertThatThrownBy(provider::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RSA JWT public key is required");
    }

    @Test
    void productionWithoutConfiguredPublicKeyFailsClosedByDefault() {
        JwtTokenProvider provider = new JwtTokenProvider();

        ReflectionTestUtils.setField(provider, "requireRsa", false);
        ReflectionTestUtils.setField(provider, "deployEnvironment", "production");
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPath", null);
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPem", "");

        assertThatThrownBy(provider::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RSA JWT public key is required");
    }

    @Test
    void validatesWellFormedAccessToken() {
        JwtTokenProvider provider = hs256Provider();

        assertThat(provider.validateToken(token(ISSUER, AUDIENCE, "access",
                new Date(System.currentTimeMillis() + 60_000), SignatureAlgorithm.HS256))).isTrue();
    }

    @Test
    void rejectsExpiredToken() {
        JwtTokenProvider provider = hs256Provider();

        assertThat(provider.validateToken(token(ISSUER, AUDIENCE, "access",
                new Date(System.currentTimeMillis() - 120_000), SignatureAlgorithm.HS256))).isFalse();
    }

    @Test
    void rejectsWrongIssuer() {
        JwtTokenProvider provider = hs256Provider();

        assertThat(provider.validateToken(token("evil-issuer", AUDIENCE, "access",
                new Date(System.currentTimeMillis() + 60_000), SignatureAlgorithm.HS256))).isFalse();
    }

    @Test
    void rejectsWrongAudience() {
        JwtTokenProvider provider = hs256Provider();

        assertThat(provider.validateToken(token(ISSUER, "other-api", "access",
                new Date(System.currentTimeMillis() + 60_000), SignatureAlgorithm.HS256))).isFalse();
    }

    @Test
    void rejectsWrongTokenType() {
        JwtTokenProvider provider = hs256Provider();

        assertThat(provider.validateToken(token(ISSUER, AUDIENCE, "refresh",
                new Date(System.currentTimeMillis() + 60_000), SignatureAlgorithm.HS256))).isFalse();
    }

    @Test
    void rejectsUnexpectedAlgorithm() {
        JwtTokenProvider provider = hs256Provider();

        assertThat(provider.validateToken(token(ISSUER, AUDIENCE, "access",
                new Date(System.currentTimeMillis() + 60_000), SignatureAlgorithm.HS384))).isFalse();
    }

    private static JwtTokenProvider hs256Provider() {
        JwtTokenProvider provider = new JwtTokenProvider();
        ReflectionTestUtils.setField(provider, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(provider, "expectedIssuer", ISSUER);
        ReflectionTestUtils.setField(provider, "expectedAudience", AUDIENCE);
        ReflectionTestUtils.setField(provider, "requireRsa", false);
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPath", null);
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPem", "");
        provider.init();
        return provider;
    }

    private static String token(
            String issuer,
            String audience,
            String type,
            Date expiration,
            SignatureAlgorithm algorithm
    ) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .issuer(issuer)
                .subject("student@example.com")
                .claim("aud", audience)
                .claim("typ", type)
                .claim("userId", "99")
                .claim("roles", "ROLE_USER")
                .expiration(expiration)
                .signWith(key, algorithm)
                .compact();
    }
}
