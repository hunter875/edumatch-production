package com.edumatch.chat.security;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenProviderTest {

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
    void stagingWithoutConfiguredPublicKeyFailsClosedByDefault() {
        JwtTokenProvider provider = new JwtTokenProvider();

        ReflectionTestUtils.setField(provider, "requireRsa", false);
        ReflectionTestUtils.setField(provider, "deployEnvironment", "staging");
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPath", null);
        ReflectionTestUtils.setField(provider, "rsaPublicKeyPem", "");

        assertThatThrownBy(provider::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("RSA JWT public key is required");
    }
}
