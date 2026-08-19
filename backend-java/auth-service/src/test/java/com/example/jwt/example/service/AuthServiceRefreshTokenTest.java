package com.example.jwt.example.service;

import com.example.jwt.example.exception.BadRequestException;
import com.example.jwt.example.model.RefreshToken;
import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.RoleRepository;
import com.example.jwt.example.repository.UserRepository;
import com.example.jwt.example.security.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceRefreshTokenTest {

    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenProvider tokenProvider;
    @Mock
    private RefreshTokenService refreshTokenService;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private RabbitTemplate rabbitTemplate;
    @Mock
    private UserCacheEvictionService userCacheEvictionService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                authenticationManager,
                userRepository,
                roleRepository,
                passwordEncoder,
                tokenProvider,
                refreshTokenService,
                auditLogService,
                rabbitTemplate,
                userCacheEvictionService
        );
    }

    @Test
    void refreshAccessTokenRotatesRefreshToken() {
        User user = User.builder()
                .id(7L)
                .username("student")
                .email("student@example.com")
                .build();
        RefreshToken current = RefreshToken.builder()
                .id(11L)
                .user(user)
                .token("hashed-old")
                .expiryDate(Instant.now().plusSeconds(3600))
                .build();
        RefreshToken rotated = RefreshToken.builder()
                .id(11L)
                .user(user)
                .token("raw-new")
                .expiryDate(Instant.now().plusSeconds(7200))
                .build();

        when(refreshTokenService.findByToken("raw-old")).thenReturn(Optional.of(current));
        when(refreshTokenService.verifyExpiration(current)).thenReturn(current);
        when(tokenProvider.generateTokenFromUser(user)).thenReturn("new-access");
        when(refreshTokenService.rotateRefreshToken(current, "raw-old")).thenReturn(rotated);

        AuthService.AuthResult result = authService.refreshAccessToken("raw-old");

        assertThat(result.accessToken()).isEqualTo("new-access");
        assertThat(result.refreshToken()).isEqualTo("raw-new");
        verify(refreshTokenService).rotateRefreshToken(current, "raw-old");
    }

    @Test
    void reusedRefreshTokenIsDetectedAndRejected() {
        when(refreshTokenService.findByToken("raw-old")).thenReturn(Optional.empty());
        when(refreshTokenService.revokeActiveTokenIfReuseDetected("raw-old")).thenReturn(true);

        assertThatThrownBy(() -> authService.refreshAccessToken("raw-old"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("reuse detected");
    }
}
