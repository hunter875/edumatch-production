package com.example.jwt.example.controller;

import com.example.jwt.example.dto.response.ApiResponse;
import com.example.jwt.example.dto.UserProfile;
import com.example.jwt.example.dto.UserSummary;
import com.example.jwt.example.dto.request.UpdateProfileRequest;
import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.UserRepository;
import com.example.jwt.example.service.CachedUserLookupService;
import com.example.jwt.example.service.FileStorageService;
import com.example.jwt.example.service.UserCacheEvictionService;
import com.example.jwt.example.service.UserProfileEventPayloadFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.jwt.example.dto.UserDetailDto;
import jakarta.validation.Valid;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final RabbitTemplate rabbitTemplate;
    private final CachedUserLookupService cachedUserLookupService;
    private final UserCacheEvictionService userCacheEvictionService;

    @GetMapping("/user/me")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYER')")
    public ResponseEntity<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));

        // Return full user details for frontend
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("firstName", user.getFirstName());
        response.put("lastName", user.getLastName());
        response.put("sex", user.getSex());
        response.put("phone", user.getPhone());
        response.put("dateOfBirth", user.getDateOfBirth());
        response.put("bio", user.getBio());
        response.put("avatarUrl", user.getAvatarUrl());
        response.put("organizationId", user.getOrganizationId());
        response.put("enabled", user.isEnabled());
        response.put("status", user.getStatus());
        response.put("subscriptionType", user.getSubscriptionType());
        response.put("createdAt", user.getCreatedAt());
        response.put("updatedAt", user.getUpdatedAt());
        
        // Matching system fields
        response.put("gpa", user.getGpa());
        response.put("major", user.getMajor());
        response.put("university", user.getUniversity());
        response.put("yearOfStudy", user.getYearOfStudy());
        response.put("level", user.getLevel());
        response.put("studyMode", user.getStudyMode());
        response.put("location", user.getLocation());
        response.put("nationality", user.getNationality());
        response.put("preferredLocations", user.getPreferredLocations());
        response.put("preferredFundingTypes", user.getPreferredFundingTypes());
        response.put("skills", user.getSkills());
        response.put("researchInterests", user.getResearchInterests());
        
        // Extract role names
        java.util.List<String> roles = user.getRoles().stream()
                .map(role -> role.getName())
                .collect(java.util.stream.Collectors.toList());
        response.put("roles", roles);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/user/me")
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYER')")
    public ResponseEntity<?> updateCurrentUser(@Valid @RequestBody UpdateProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));

        // Update allowed fields
        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName());
        }
        if (request.getSex() != null) {
            user.setSex(request.getSex());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getBio() != null) {
            user.setBio(request.getBio());
        }
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl());
        }
        
        // Update matching system fields
        if (request.getGpa() != null) {
            user.setGpa(request.getGpa());
        }
        if (request.getMajor() != null) {
            user.setMajor(request.getMajor());
        }
        if (request.getUniversity() != null) {
            user.setUniversity(request.getUniversity());
        }
        if (request.getYearOfStudy() != null) {
            user.setYearOfStudy(request.getYearOfStudy());
        }
        if (request.getLevel() != null) {
            user.setLevel(request.getLevel());
        }
        if (request.getStudyMode() != null) {
            user.setStudyMode(request.getStudyMode());
        }
        if (request.getLocation() != null) {
            user.setLocation(request.getLocation());
        }
        if (request.getNationality() != null) {
            user.setNationality(request.getNationality());
        }
        if (request.getPreferredLocations() != null) {
            user.setPreferredLocations(request.getPreferredLocations());
        }
        if (request.getPreferredFundingTypes() != null) {
            user.setPreferredFundingTypes(request.getPreferredFundingTypes());
        }
        if (request.getSkills() != null) {
            user.setSkills(request.getSkills());
        }
        if (request.getResearchInterests() != null) {
            user.setResearchInterests(request.getResearchInterests());
        }

        User updatedUser = userRepository.save(user);
        userCacheEvictionService.evictUser(updatedUser);
        
        // Publish user.profile.updated event to RabbitMQ for Matching Service
        publishUserProfileUpdatedEvent(updatedUser);

        // Return updated user details
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        response.put("id", updatedUser.getId());
        response.put("username", updatedUser.getUsername());
        response.put("email", updatedUser.getEmail());
        response.put("firstName", updatedUser.getFirstName());
        response.put("lastName", updatedUser.getLastName());
        response.put("sex", updatedUser.getSex());
        response.put("phone", updatedUser.getPhone());
        response.put("dateOfBirth", updatedUser.getDateOfBirth());
        response.put("bio", updatedUser.getBio());
        response.put("avatarUrl", updatedUser.getAvatarUrl());
        response.put("organizationId", updatedUser.getOrganizationId());
        response.put("enabled", updatedUser.isEnabled());
        response.put("status", updatedUser.getStatus());
        response.put("subscriptionType", updatedUser.getSubscriptionType());
        response.put("createdAt", updatedUser.getCreatedAt());
        response.put("updatedAt", updatedUser.getUpdatedAt());
        
        // Matching system fields
        response.put("gpa", updatedUser.getGpa());
        response.put("major", updatedUser.getMajor());
        response.put("university", updatedUser.getUniversity());
        response.put("yearOfStudy", updatedUser.getYearOfStudy());
        response.put("level", updatedUser.getLevel());
        response.put("studyMode", updatedUser.getStudyMode());
        response.put("location", updatedUser.getLocation());
        response.put("nationality", updatedUser.getNationality());
        response.put("preferredLocations", updatedUser.getPreferredLocations());
        response.put("preferredFundingTypes", updatedUser.getPreferredFundingTypes());
        response.put("skills", updatedUser.getSkills());
        response.put("researchInterests", updatedUser.getResearchInterests());
        
        // Extract role names
        java.util.List<String> roles = updatedUser.getRoles().stream()
                .map(role -> role.getName())
                .collect(java.util.stream.Collectors.toList());
        response.put("roles", roles);

        return ResponseEntity.ok(response);
    }
    /**
     * INTERNAL API — chỉ dành cho service-to-service communication.
     * Các service khác (Scholarship-Service, Chat-Service) phải dùng
     * token có ROLE_ADMIN hoặc ROLE_SERVICE để gọi.
     * Người dùng thông thường (ROLE_USER, ROLE_EMPLOYER) KHÔNG được phép gọi.
     */
    @GetMapping("/internal/user/{username}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SERVICE')")
    public ResponseEntity<UserDetailDto> getUserDetailsForInternal(@PathVariable String username) {
        return ResponseEntity.ok(cachedUserLookupService.getUserDetailsByUsername(username));
    }

    /**
     * INTERNAL API — lấy thông tin user theo ID.
     * Chỉ dành cho Chat-Service với token nội bộ.
     */
    @GetMapping("/internal/user/id/{userId}")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SERVICE')")
    public ResponseEntity<UserDetailDto> getUserDetailsById(@PathVariable Long userId) {
        return ResponseEntity.ok(cachedUserLookupService.getUserDetailsById(userId));
    }

    /**
     * INTERNAL API — batch lấy thông tin user theo danh sách ID.
     * Chỉ dành cho Chat-Service với token nội bộ.
     */
    @GetMapping("/internal/users")
    @PreAuthorize("hasAnyAuthority('ROLE_ADMIN', 'ROLE_SERVICE')")
    public ResponseEntity<List<UserDetailDto>> getUserDetailsByIds(@RequestParam List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.ok(List.of());
        }

        List<UserDetailDto> users = userRepository.findAllById(ids).stream()
                .map(user -> UserDetailDto.builder()
                        .id(user.getId())
                        .username(user.getUsername())
                        .organizationId(user.getOrganizationId())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }

    /**
     * Upload avatar image
     * POST /api/users/avatar
     */
    @PostMapping(value = "/users/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('USER', 'EMPLOYER')")
    public ResponseEntity<?> uploadAvatar(@RequestParam("avatar") MultipartFile file) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            User user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found with username: " + username));

            // Delete old avatar if exists
            if (user.getAvatarUrl() != null && !user.getAvatarUrl().isEmpty()) {
                fileStorageService.deleteAvatar(user.getAvatarUrl());
            }

            // Upload new avatar
            String avatarUrl = fileStorageService.uploadAvatar(file, user.getId());

            // Update user avatar URL
            user.setAvatarUrl(avatarUrl);
            User savedUser = userRepository.save(user);
            userCacheEvictionService.evictUser(savedUser);

            Map<String, Object> response = new HashMap<>();
            response.put("avatarUrl", avatarUrl);
            response.put("message", "Avatar uploaded successfully");

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(500)
                    .body(new ApiResponse(false, "Failed to upload avatar: " + e.getMessage()));
        }
    }
    
    /**
     * Publish user.profile.updated event to RabbitMQ
     * Matching Service will consume this event to update applicant features
     */
    private void publishUserProfileUpdatedEvent(User user) {
        try {
            Map<String, Object> eventPayload = UserProfileEventPayloadFactory.fromUser(user);

            rabbitTemplate.convertAndSend(
                    "events_exchange",
                    "user.profile.updated",
                    eventPayload
            );

            log.info("📨 Published user.profile.updated event for user ID: {} to RabbitMQ", user.getId());
        } catch (Exception e) {
            log.error("❌ Failed to publish user.profile.updated event for user ID: {}", user.getId(), e);
            // Don't throw exception - event publishing failure shouldn't block profile update
        }
    }
}
