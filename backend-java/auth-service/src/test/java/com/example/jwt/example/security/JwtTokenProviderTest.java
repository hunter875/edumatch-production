package com.example.jwt.example.security;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

    @Test
    void requireRsaWithoutConfiguredKeyPairFailsClosed() {
        JwtTokenProvider provider = new JwtTokenProvider();

        ReflectionTestUtils.setField(provider, "requireRsa", true);
        ReflectionTestUtils.setField(provider, "rsaPrivateKeyPath", null);
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPath", null);

        assertThatThrownBy(provider::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RSA JWT keys are required");
    }

    @Test
    void stagingWithoutConfiguredKeyPairFailsClosedByDefault() {
        JwtTokenProvider provider = new JwtTokenProvider();

        ReflectionTestUtils.setField(provider, "requireRsa", false);
        ReflectionTestUtils.setField(provider, "deployEnvironment", "staging");
        ReflectionTestUtils.setField(provider, "rsaPrivateKeyPath", null);
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPath", null);
        ReflectionTestUtils.setField(provider, "rsaPrivateKeyPem", "");
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPem", "");

        assertThatThrownBy(provider::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RSA JWT keys are required");
    }
}
