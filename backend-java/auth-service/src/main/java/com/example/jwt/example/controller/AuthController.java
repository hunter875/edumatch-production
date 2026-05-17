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
import com.example.jwt.example.security.JwtTokenProvider;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(new ApiResponse(true, "auth-service is healthy"));
    }

    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            JwtAuthenticationResponse response = authService.authenticateUser(loginRequest);
            return ResponseEntity.ok(response);
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return ResponseEntity.status(401)
                    .body(new ApiResponse(false, "Invalid username or password"));
        } catch (org.springframework.security.authentication.DisabledException e) {
            return ResponseEntity.status(401)
                    .body(new ApiResponse(false, "User account is disabled"));
        } catch (org.springframework.security.authentication.LockedException e) {
            return ResponseEntity.status(401)
                    .body(new ApiResponse(false, "User account is locked"));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new ApiResponse(false, "Authentication failed: " + e.getMessage()));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignUpRequest signUpRequest) {
        try {
            User user = authService.registerUser(signUpRequest);
            
            // Tự động đăng nhập sau khi đăng ký
            LoginRequest loginRequest = new LoginRequest();
            loginRequest.setUsername(user.getUsername());
            loginRequest.setPassword(signUpRequest.getPassword());
            
            JwtAuthenticationResponse response = authService.authenticateUser(loginRequest);
            
            URI location = ServletUriComponentsBuilder
                    .fromCurrentContextPath().path("/api/users/{username}")
                    .buildAndExpand(user.getUsername()).toUri();
            
            return ResponseEntity.created(location).body(response);
        } catch (BadRequestException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<JwtAuthenticationResponse> refreshToken(@RequestBody TokenRefreshRequest request) {
        try {
            JwtAuthenticationResponse response = authService.refreshAccessToken(request);
            return ResponseEntity.ok(response);
        } catch (ResourceNotFoundException e) {
            throw new RuntimeException("Refresh token is invalid!");
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest loginRequest) {
        return authenticateUser(loginRequest);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody SignUpRequest signUpRequest) {
        return registerUser(signUpRequest);
    }

    @GetMapping("/verify")
    public ResponseEntity<?> verifyToken() {
        // If the request reaches here, token is valid (passed through JWT filter)
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
            
            com.example.jwt.example.dto.UserSummary userSummary = com.example.jwt.example.dto.UserSummary.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getFirstName() + " " + user.getLastName())
                .build();
            
            return ResponseEntity.ok(userSummary);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body(new ApiResponse(false, "Error fetching user: " + e.getMessage()));
        }
    }
}
