package com.example.jwt.example.controller;

import com.example.jwt.example.dto.TokenRefreshRequest;
import com.example.jwt.example.dto.response.ApiResponse;
import com.example.jwt.example.dto.response.JwtAuthenticationResponse;
import com.example.jwt.example.dto.request.LoginRequest;
import com.example.jwt.example.dto.request.SignUpRequest;
import com.example.jwt.example.exception.BadRequestException;
import com.example.jwt.example.exception.ResourceNotFoundException;
import com.example.jwt.example.model.User;
import com.example.jwt.example.service.AuthService;
import com.example.jwt.example.service.RefreshTokenService;
import com.example.jwt.example.security.JwtTokenProvider;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${app.auth.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${app.auth.cookie.domain:}")
    private String cookieDomain;

    @Value("${DEPLOY_ENVIRONMENT:local}")
    private String deployEnvironment;

    private static final String REFRESH_COOKIE_NAME = "refresh_token";
    private static final String SESSION_MARKER_COOKIE = "auth_session";
    private static final int REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

    // ---- Cookie helpers ----

    @PostConstruct
    void validateCookieSecurity() {
        String environment = deployEnvironment == null ? "local" : deployEnvironment.trim().toLowerCase(Locale.ROOT);
        if (("staging".equals(environment) || "production".equals(environment) || "prod".equals(environment))
                && !cookieSecure) {
            throw new IllegalStateException("app.auth.cookie.secure must be true in staging/production");
        }
    }

    private void setRefreshCookie(HttpServletResponse response, String refreshToken) {
        Cookie cookie = new Cookie(REFRESH_COOKIE_NAME, refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath("/api/auth");
        cookie.setMaxAge(REFRESH_COOKIE_MAX_AGE);
        cookie.setAttribute("SameSite", "Lax");
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookie.setDomain(cookieDomain);
        }
        response.addCookie(cookie);
    }

    private void setSessionMarker(HttpServletResponse response) {
        Cookie marker = new Cookie(SESSION_MARKER_COOKIE, "1");
        marker.setHttpOnly(true);
        marker.setSecure(cookieSecure);
        marker.setPath("/");
        marker.setMaxAge(REFRESH_COOKIE_MAX_AGE);
        marker.setAttribute("SameSite", "Lax");
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            marker.setDomain(cookieDomain);
        }
        response.addCookie(marker);
    }

    private void clearAuthCookies(HttpServletResponse response) {
        expireCookie(response, REFRESH_COOKIE_NAME, "/api/auth");
        expireCookie(response, SESSION_MARKER_COOKIE, "/");
    }

    private void expireCookie(HttpServletResponse response, String name, String path) {
        Cookie cookie = new Cookie(name, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath(path);
        cookie.setMaxAge(0);
        cookie.setAttribute("SameSite", "Lax");
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookie.setDomain(cookieDomain);
        }
        response.addCookie(cookie);
    }

    private String getRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> REFRESH_COOKIE_NAME.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }

    // ---- Endpoints ----

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(new ApiResponse(true, "auth-service is healthy"));
    }

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest,
                                               HttpServletResponse response) {
        try {
            AuthService.AuthResult result = authService.authenticateUser(loginRequest);
            setRefreshCookie(response, result.refreshToken());
            setSessionMarker(response);
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore())
                    .body(new JwtAuthenticationResponse(result.accessToken()));
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return ResponseEntity.status(401)
                    .cacheControl(CacheControl.noStore())
                    .body(new ApiResponse(false, "Invalid username or password"));
        } catch (org.springframework.security.authentication.DisabledException e) {
            return ResponseEntity.status(401)
                    .cacheControl(CacheControl.noStore())
                    .body(new ApiResponse(false, "User account is disabled"));
        } catch (org.springframework.security.authentication.LockedException e) {
            return ResponseEntity.status(401)
                    .cacheControl(CacheControl.noStore())
                    .body(new ApiResponse(false, "User account is locked"));
        } catch (Exception e) {
            log.error("Unexpected auth error", e);
            return ResponseEntity.status(500)
                    .cacheControl(CacheControl.noStore())
                    .body(new ApiResponse(false, "An unexpected error occurred"));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignUpRequest signUpRequest,
                                           HttpServletResponse response) {
        try {
            User user = authService.registerUser(signUpRequest);

            LoginRequest loginRequest = new LoginRequest();
            loginRequest.setUsername(user.getUsername());
            loginRequest.setPassword(signUpRequest.getPassword());

            AuthService.AuthResult result = authService.authenticateUser(loginRequest);
            setRefreshCookie(response, result.refreshToken());
            setSessionMarker(response);

            URI location = ServletUriComponentsBuilder
                    .fromCurrentContextPath().path("/api/users/{username}")
                    .buildAndExpand(user.getUsername()).toUri();

            return ResponseEntity.created(location)
                    .cacheControl(CacheControl.noStore())
                    .body(new JwtAuthenticationResponse(result.accessToken()));
        } catch (BadRequestException e) {
            return ResponseEntity.badRequest()
                    .cacheControl(CacheControl.noStore())
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected registration error", e);
            return ResponseEntity.status(500)
                    .cacheControl(CacheControl.noStore())
                    .body(new ApiResponse(false, "An unexpected error occurred"));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request,
                                           HttpServletResponse response) {
        String refreshToken = getRefreshTokenFromCookie(request);
        if (refreshToken == null || refreshToken.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .cacheControl(CacheControl.noStore())
                    .body(new ApiResponse(false, "Refresh token is missing"));
        }

        try {
            AuthService.AuthResult result = authService.refreshAccessToken(refreshToken);
            setRefreshCookie(response, result.refreshToken());
            setSessionMarker(response);
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.noStore())
                    .body(new JwtAuthenticationResponse(result.accessToken()));
        } catch (ResourceNotFoundException | BadRequestException e) {
            clearAuthCookies(response);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .cacheControl(CacheControl.noStore())
                    .body(new ApiResponse(false, "Refresh token is invalid or expired"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request,
                                        HttpServletResponse response) {
        String refreshToken = getRefreshTokenFromCookie(request);
        if (refreshToken != null && !refreshToken.isBlank()) {
            try {
                refreshTokenService.revokeByToken(refreshToken);
            } catch (Exception e) {
                log.debug("Logout: refresh token already revoked or invalid");
            }
        }
        clearAuthCookies(response);
        return ResponseEntity.noContent()
                .cacheControl(CacheControl.noStore())
                .build();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest,
                                    HttpServletResponse response) {
        return authenticateUser(loginRequest, response);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody SignUpRequest signUpRequest,
                                       HttpServletResponse response) {
        return registerUser(signUpRequest, response);
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyToken() {
        return ResponseEntity.ok(new ApiResponse(true, "Token is valid"));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            org.springframework.security.core.Authentication authentication =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(401)
                    .body(new ApiResponse(false, "Not authenticated"));
            }

            String username = authentication.getName();
            User user = authService.getUserByUsername(username);

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("id", user.getId());
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            response.put("firstName", user.getFirstName());
            response.put("lastName", user.getLastName());
            response.put("roles", user.getRoles().stream()
                    .map(role -> role.getName())
                    .collect(java.util.stream.Collectors.toList()));
            response.put("enabled", user.isEnabled());
            response.put("status", user.getStatus());
            response.put("subscriptionType", user.getSubscriptionType());
            response.put("organizationId", user.getOrganizationId());
            response.put("gpa", user.getGpa());
            response.put("phone", user.getPhone());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error fetching current user", e);
            return ResponseEntity.status(500)
                .body(new ApiResponse(false, "An unexpected error occurred"));
        }
    }
}
