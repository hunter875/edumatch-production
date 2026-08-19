package com.example.jwt.example.service;

import com.example.jwt.example.dto.request.LoginRequest;
import com.example.jwt.example.dto.request.SignUpRequest;
import com.example.jwt.example.exception.BadRequestException;
import com.example.jwt.example.exception.ResourceNotFoundException;
import com.example.jwt.example.model.RefreshToken;
import com.example.jwt.example.model.Role;
import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.RoleRepository;
import com.example.jwt.example.repository.UserRepository;
import com.example.jwt.example.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final AuditLogService auditLogService;
    private final RabbitTemplate rabbitTemplate;
    private final UserCacheEvictionService userCacheEvictionService;

    /**
     * Result of an authentication operation: access token (JSON body)
     * and refresh token (set as HttpOnly cookie by the controller).
     */
    public record AuthResult(String accessToken, String refreshToken) {}

    /**
     * Authenticate user with username or email + password.
     */
    public AuthResult authenticateUser(LoginRequest loginRequest) {
        String usernameOrEmail = loginRequest.getUsername();
        log.info("Authenticating user: {}", usernameOrEmail);

        User user = userRepository.findByUsername(usernameOrEmail)
                .orElseGet(() -> userRepository.findByEmail(usernameOrEmail)
                        .orElseThrow(() ->
                                new BadRequestException("Invalid username/email or password")
                        )
                );

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        user.getUsername(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = tokenProvider.generateToken(authentication);
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        auditLogService.logAction(
                user.getId(),
                user.getUsername(),
                "LOGIN",
                "User",
                "Login successful"
        );

        log.info("User {} authenticated successfully", user.getUsername());
        return new AuthResult(jwt, refreshToken.getToken());
    }

    public User registerUser(SignUpRequest signUpRequest) {
        log.info("Registering new user: {}", signUpRequest.getUsername());

        validateUsernameNotExists(signUpRequest.getUsername());
        validateEmailNotExists(signUpRequest.getEmail());

        User user = buildUserFromSignUpRequest(signUpRequest);

        Role userRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", "ROLE_USER"));

        user.setRoles(Collections.singleton(userRole));

        User savedUser = userRepository.save(user);
        userCacheEvictionService.evictUser(savedUser);

        auditLogService.logAction(
                savedUser.getId(),
                savedUser.getUsername(),
                "REGISTER",
                "User",
                "New account registered"
        );

        publishUserProfileUpdatedEvent(savedUser);

        log.info("User {} registered successfully with ID: {}", savedUser.getUsername(), savedUser.getId());
        return savedUser;
    }

    /**
     * Refresh access token using a raw refresh token string.
     * Rotates the refresh token atomically.
     */
    public AuthResult refreshAccessToken(String rawRefreshToken) {
        log.info("Refreshing access token");

        return refreshTokenService.findByToken(rawRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(refreshToken -> {
                    User user = refreshToken.getUser();
                    String newToken = tokenProvider.generateTokenFromUser(user);

                    RefreshToken newRefreshToken = refreshTokenService.rotateRefreshToken(refreshToken, rawRefreshToken);

                    log.info("Access token refreshed and refresh token rotated for user: {}", user.getUsername());
                    return new AuthResult(newToken, newRefreshToken.getToken());
                })
                .orElseThrow(() -> {
                    if (refreshTokenService.revokeActiveTokenIfReuseDetected(rawRefreshToken)) {
                        return new BadRequestException("Refresh token reuse detected. Please sign in again.");
                    }
                    log.error("Refresh token validation failed");
                    return new ResourceNotFoundException("RefreshToken", "token", "[REDACTED]");
                });
    }

    private void validateUsernameNotExists(String username) {
        if (userRepository.existsByUsername(username)) {
            log.error("Username already exists: {}", username);
            throw new BadRequestException("Username is already taken!");
        }
    }

    private void validateEmailNotExists(String email) {
        if (userRepository.existsByEmail(email)) {
            log.error("Email already exists: {}", email);
            throw new BadRequestException("Email is already in use!");
        }
    }

    private User buildUserFromSignUpRequest(SignUpRequest request) {
        return User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .sex(request.getSex())
                .organizationId(null) // Public signup must NOT accept organizationId
                .enabled(true)
                .build();
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));
    }

    private void publishUserProfileUpdatedEvent(User user) {
        try {
            java.util.List<String> skillsList = user.getSkills() != null && !user.getSkills().isEmpty()
                    ? java.util.Arrays.asList(user.getSkills().split(","))
                    : java.util.List.of();

            java.util.List<String> researchInterestsList = user.getResearchInterests() != null && !user.getResearchInterests().isEmpty()
                    ? java.util.Arrays.asList(user.getResearchInterests().split(","))
                    : java.util.List.of();

            Map<String, Object> eventPayload = Map.of(
                    "userId", user.getId().toString(),
                    "email", user.getEmail(),
                    "gpa", user.getGpa() != null ? user.getGpa() : 0.0,
                    "major", user.getMajor() != null ? user.getMajor() : "",
                    "university", user.getUniversity() != null ? user.getUniversity() : "",
                    "yearOfStudy", user.getYearOfStudy() != null ? user.getYearOfStudy() : 1,
                    "skills", skillsList,
                    "researchInterests", researchInterestsList
            );

            rabbitTemplate.convertAndSend(
                    "events_exchange",
                    "user.profile.updated",
                    eventPayload
            );

            log.info("Published user.profile.updated event for user ID: {} to RabbitMQ", user.getId());
        } catch (Exception e) {
            log.error("Failed to publish user.profile.updated event for user ID: {}", user.getId(), e);
        }
    }
}
