package com.example.jwt.example.controller;

import com.example.jwt.example.dto.TokenRefreshRequest;
import com.example.jwt.example.dto.response.ApiResponse;
import com.example.jwt.example.dto.response.JwtAuthenticationResponse;
import com.example.jwt.example.dto.request.LoginRequest;
import com.example.jwt.example.dto.request.SignUpRequest;
import com.example.jwt.example.exception.BadRequestException;
import com.example.jwt.example.exception.ResourceNotFoundException;
import com.example.jwt.example.model.User;
<<<<<<< HEAD
import com.example.jwt.example.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
=======
import com.example.jwt.example.repository.RoleRepository;
import com.example.jwt.example.repository.UserRepository;
import com.example.jwt.example.security.JwtTokenProvider;
import com.example.jwt.example.service.AuditLogService;
import com.example.jwt.example.service.EmailService;
import com.example.jwt.example.service.RefreshTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;
>>>>>>> ee416574a044f2ec7812f09c176e227abc567fcb

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

<<<<<<< HEAD
    private final AuthService authService;
=======
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final AuditLogService auditLogService;
    private final EmailService emailService;
>>>>>>> ee416574a044f2ec7812f09c176e227abc567fcb

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
<<<<<<< HEAD
        try {
            User user = authService.registerUser(signUpRequest);
            
            URI location = ServletUriComponentsBuilder
                    .fromCurrentContextPath().path("/api/users/{username}")
                    .buildAndExpand(user.getUsername()).toUri();
            
            return ResponseEntity.created(location)
                    .body(new ApiResponse(true, "User registered successfully"));
        } catch (BadRequestException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
=======
        // Kiểm tra username và email
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, "Tên đăng nhập đã tồn tại!"));
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, "Email đã được sử dụng!"));
        }

        // Tạo tài khoản người dùng
        User user = User.builder()
                .username(signUpRequest.getUsername())
                .email(signUpRequest.getEmail())
                .password(passwordEncoder.encode(signUpRequest.getPassword()))
                .firstName(signUpRequest.getFirstName())
                .lastName(signUpRequest.getLastName())
                .enabled(false) //
                .build();

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new RuntimeException("Error: Role not found."));
        user.setRoles(Collections.singleton(userRole));

        // Sinh mã xác minh (UUID hoặc OTP)
        String verificationCode = UUID.randomUUID().toString();
        user.setVerificationCode(verificationCode);
        user.setVerificationExpiry(Instant.now().plusSeconds(600)); // Hết hạn sau 10 phút

        User result = userRepository.save(user);

        // Gửi email xác minh
        emailService.sendVerificationEmail(user.getEmail(), verificationCode);

        URI location = ServletUriComponentsBuilder
                .fromCurrentContextPath().path("/api/users/{username}")
                .buildAndExpand(result.getUsername()).toUri();
        auditLogService.logAction(
                user.getId(),
                user.getUsername(),
                "LOGOUT",
                "User",
                "Người dùng đăng ký vào hệ thống"
        );
        return ResponseEntity.created(location)
                .body(new ApiResponse(true, "Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản."));
>>>>>>> ee416574a044f2ec7812f09c176e227abc567fcb
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
    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser(Authentication authentication) {
        String username = authentication.getName();

        // Lấy entity User thật trong DB
        com.example.jwt.example.model.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Xóa refresh token
        refreshTokenService.deleteByUserId(user.getId());

        // Ghi log hành động
        auditLogService.logAction(
                user.getId(),
                user.getUsername(),
                "LOGOUT",
                "User",
                "Người dùng đăng xuất khỏi hệ thống"
        );

        return ResponseEntity.ok(new ApiResponse(true, "Đăng xuất thành công"));
    }
    @GetMapping("/verify")
    public ResponseEntity<?> verifyAccount(@RequestParam("code") String code) {
        Optional<User> userOpt = userRepository.findByVerificationCode(code);

        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, "Mã xác minh không hợp lệ."));
        }

        User user = userOpt.get();

        if (user.getVerificationExpiry().isBefore(Instant.now())) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, "Mã xác minh đã hết hạn. Vui lòng yêu cầu gửi lại."));
        }

        user.setEnabled(true);
        user.setVerificationCode(null);
        user.setVerificationExpiry(null);
        userRepository.save(user);

        return ResponseEntity.ok(new ApiResponse(true, "Tài khoản của bạn đã được xác minh! Bây giờ bạn có thể đăng nhập."));
    }
}
