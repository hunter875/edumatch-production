package com.example.jwt.example.controller;

import com.example.jwt.example.dto.response.JwtAuthenticationResponse;
import com.example.jwt.example.exception.BadRequestException;
import com.example.jwt.example.service.AuthService;
import com.example.jwt.example.service.RefreshTokenService;
import com.example.jwt.example.security.JwtTokenProvider;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerSessionIntegrityTest {

    @Mock
    private AuthService authService;

    @Mock
    private RefreshTokenService refreshTokenService;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    private AuthController controller;

    @BeforeEach
    void setUp() {
        controller = new AuthController(authService, refreshTokenService, jwtTokenProvider);
        ReflectionTestUtils.setField(controller, "cookieSecure", true);
        ReflectionTestUtils.setField(controller, "cookieDomain", "example.com");
        ReflectionTestUtils.setField(controller, "deployEnvironment", "local");
    }

    @Test
    void signinSuccessReturnsNoStoreAndSetsRefreshCookie() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        when(authService.authenticateUser(any()))
                .thenReturn(new AuthService.AuthResult("access-token", "raw-refresh"));

        ResponseEntity<?> entity = controller.authenticateUser(new com.example.jwt.example.dto.request.LoginRequest(), response);

        assertThat(entity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(entity.getHeaders().getCacheControl()).contains("no-store");
        assertThat(entity.getBody()).isInstanceOf(JwtAuthenticationResponse.class);
        assertThat(findCookie(response, "refresh_token").getPath()).isEqualTo("/api/auth");
        assertThat(findCookie(response, "refresh_token").getValue()).isEqualTo("raw-refresh");
    }

    @Test
    void logoutClearsRefreshCookieWithSamePathDomainSecureAndSameSite() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("refresh_token", "raw-refresh"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        ResponseEntity<Void> entity = controller.logout(request, response);

        assertThat(entity.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(entity.getHeaders().getCacheControl()).contains("no-store");
        verify(refreshTokenService).revokeByToken("raw-refresh");

        Cookie refreshCookie = findCookie(response, "refresh_token");
        assertThat(refreshCookie.getPath()).isEqualTo("/api/auth");
        assertThat(refreshCookie.getDomain()).isEqualTo("example.com");
        assertThat(refreshCookie.getSecure()).isTrue();
        assertThat(refreshCookie.isHttpOnly()).isTrue();
        assertThat(refreshCookie.getMaxAge()).isZero();
        assertThat(refreshCookie.getAttribute("SameSite")).isEqualTo("Lax");

        Cookie sessionMarker = findCookie(response, "auth_session");
        assertThat(sessionMarker.getPath()).isEqualTo("/");
        assertThat(sessionMarker.getMaxAge()).isZero();
    }

    @Test
    void refreshSuccessReturnsNoStoreAndRotatesCookie() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("refresh_token", "raw-refresh"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(authService.refreshAccessToken("raw-refresh"))
                .thenReturn(new AuthService.AuthResult("access-token", "new-refresh"));

        ResponseEntity<?> entity = controller.refreshToken(request, response);

        assertThat(entity.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(entity.getHeaders().getCacheControl()).contains("no-store");
        assertThat(entity.getBody()).isInstanceOf(JwtAuthenticationResponse.class);
        assertThat(findCookie(response, "refresh_token").getValue()).isEqualTo("new-refresh");
    }

    @Test
    void refreshReuseResponseIsUnauthorizedNoStoreAndClearsCookies() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setCookies(new Cookie("refresh_token", "raw-refresh"));
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(authService.refreshAccessToken("raw-refresh"))
                .thenThrow(new BadRequestException("Refresh token reuse detected. Please sign in again."));

        ResponseEntity<?> entity = controller.refreshToken(request, response);

        assertThat(entity.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(entity.getHeaders().getCacheControl()).contains("no-store");
        assertThat(findCookie(response, "refresh_token").getPath()).isEqualTo("/api/auth");
        assertThat(findCookie(response, "refresh_token").getMaxAge()).isZero();
    }

    @Test
    void stagingOrProductionFailsStartupWhenSecureCookiesAreDisabled() {
        ReflectionTestUtils.setField(controller, "cookieSecure", false);
        ReflectionTestUtils.setField(controller, "deployEnvironment", "production");

        assertThatThrownBy(() -> controller.validateCookieSecurity())
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.auth.cookie.secure");
    }

    private Cookie findCookie(MockHttpServletResponse response, String name) {
        return Arrays.stream(response.getCookies())
                .filter(cookie -> name.equals(cookie.getName()))
                .findFirst()
                .orElseThrow();
    }
}
