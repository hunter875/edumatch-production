package com.example.jwt.example.controller;

import com.example.jwt.example.dto.request.OrganizationRequest;
import com.example.jwt.example.dto.response.ApiResponse;
import com.example.jwt.example.dto.response.OrganizationResponse;
import com.example.jwt.example.exception.ResourceNotFoundException;
import com.example.jwt.example.model.Organization;
import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.UserRepository;
import com.example.jwt.example.service.FileStorageService;
import com.example.jwt.example.service.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
@Slf4j
public class OrganizationController {

    private final OrganizationService organizationService;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;

    /**
     * Tạo organization mới (chỉ admin)
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrganizationResponse> createOrganization(@Valid @RequestBody OrganizationRequest request) {
        Organization organization = organizationService.createOrganization(request);
        return ResponseEntity.ok(organizationService.toOrganizationResponse(organization));
    }

    /**
     * Lấy danh sách organizations với filter và pagination
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllOrganizations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Boolean isVerified
    ) {
        Page<Organization> pageOrganizations = organizationService.getAllOrganizations(
                keyword, isActive, isVerified, page, size);
        
        Map<String, Object> response = new HashMap<>();
        response.put("organizations", organizationService.toOrganizationResponseList(pageOrganizations.getContent()));
        response.put("currentPage", pageOrganizations.getNumber());
        response.put("totalItems", pageOrganizations.getTotalElements());
        response.put("totalPages", pageOrganizations.getTotalPages());
        response.put("pageSize", pageOrganizations.getSize());
        
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy organization theo ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<OrganizationResponse> getOrganizationById(@PathVariable Long id) {
        try {
            Organization organization = organizationService.getOrganizationById(id);
            return ResponseEntity.ok(organizationService.toOrganizationResponse(organization));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Cập nhật organization (chỉ admin)
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrganizationResponse> updateOrganization(
            @PathVariable Long id,
            @Valid @RequestBody OrganizationRequest request
    ) {
        try {
            Organization organization = organizationService.updateOrganization(id, request);
            return ResponseEntity.ok(organizationService.toOrganizationResponse(organization));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Xóa organization (soft delete, chỉ admin)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteOrganization(@PathVariable Long id) {
        try {
            organizationService.deleteOrganization(id);
            return ResponseEntity.ok(new ApiResponse(true, "Organization deleted successfully"));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        }
    }

    /**
     * Verify/Unverify organization (chỉ admin)
     */
    @PatchMapping("/{id}/toggle-verification")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<OrganizationResponse> toggleVerification(@PathVariable Long id) {
        try {
            Organization organization = organizationService.toggleVerification(id);
            return ResponseEntity.ok(organizationService.toOrganizationResponse(organization));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Lấy organization của current user (employer)
     */
    @GetMapping("/me")
    @PreAuthorize("hasRole('EMPLOYER')")
    public ResponseEntity<?> getMyOrganization() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();
            log.info("Getting organization for user: {}", username);

            User user = userRepository.findByUsername(username)
                    .orElse(null);

            if (user == null) {
                log.warn("User not found: {}", username);
                return ResponseEntity.status(404)
                        .body(new ApiResponse(false, "User not found with username: " + username));
            }

            log.info("User found: {}, organizationId: {}", username, user.getOrganizationId());
            
            if (user.getOrganizationId() == null) {
                log.warn("User {} does not have an organization", username);
                return ResponseEntity.status(404)
                        .body(new ApiResponse(false, "User does not have an organization"));
            }

            Organization organization = organizationService.getOrganizationById(user.getOrganizationId());
            log.info("Organization found: {}", organization.getName());
            return ResponseEntity.ok(organizationService.toOrganizationResponse(organization));
        } catch (ResourceNotFoundException e) {
            log.error("Organization not found", e);
            return ResponseEntity.status(404)
                    .body(new ApiResponse(false, "Organization not found"));
        } catch (Exception e) {
            log.error("Error getting organization", e);
            return ResponseEntity.status(500)
                    .body(new ApiResponse(false, "Internal server error: " + e.getMessage()));
        }
    }

    /**
     * Cập nhật organization của current user (employer)
     */
    @PutMapping("/me")
    @PreAuthorize("hasRole('EMPLOYER')")
    public ResponseEntity<?> updateMyOrganization(@Valid @RequestBody OrganizationRequest request) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            User user = userRepository.findByUsername(username)
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.status(404)
                        .body(new ApiResponse(false, "User not found with username: " + username));
            }

            if (user.getOrganizationId() == null) {
                return ResponseEntity.status(404)
                        .body(new ApiResponse(false, "User does not have an organization"));
            }

            Organization organization = organizationService.updateOrganization(user.getOrganizationId(), request);
            return ResponseEntity.ok(organizationService.toOrganizationResponse(organization));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(404)
                    .body(new ApiResponse(false, "Organization not found"));
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(new ApiResponse(false, "Internal server error: " + e.getMessage()));
        }
    }

    /**
     * Upload logo cho organization của current user (employer)
     */
    @PostMapping(value = "/me/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('EMPLOYER')")
    public ResponseEntity<?> uploadLogo(@RequestParam("logo") MultipartFile file) {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            String username = authentication.getName();

            User user = userRepository.findByUsername(username)
                    .orElse(null);

            if (user == null) {
                return ResponseEntity.status(404)
                        .body(new ApiResponse(false, "User not found with username: " + username));
            }

            if (user.getOrganizationId() == null) {
                return ResponseEntity.status(404)
                        .body(new ApiResponse(false, "User does not have an organization"));
            }

            Organization organization = organizationService.getOrganizationById(user.getOrganizationId());

            // Delete old logo if exists
            if (organization.getLogoUrl() != null && !organization.getLogoUrl().isEmpty()) {
                fileStorageService.deleteAvatar(organization.getLogoUrl());
            }

            // Upload new logo
            String logoUrl = fileStorageService.uploadAvatar(file, organization.getId());

            // Update organization logo URL
            OrganizationRequest updateRequest = new OrganizationRequest();
            updateRequest.setName(organization.getName());
            updateRequest.setDescription(organization.getDescription());
            updateRequest.setOrganizationType(organization.getOrganizationType());
            updateRequest.setWebsite(organization.getWebsite());
            updateRequest.setEmail(organization.getEmail());
            updateRequest.setPhone(organization.getPhone());
            updateRequest.setAddress(organization.getAddress());
            updateRequest.setCountry(organization.getCountry());
            updateRequest.setCity(organization.getCity());
            updateRequest.setLogoUrl(logoUrl);
            
            organizationService.updateOrganization(organization.getId(), updateRequest);

            Map<String, Object> response = new HashMap<>();
            response.put("logoUrl", logoUrl);
            response.put("message", "Logo uploaded successfully");

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse(false, e.getMessage()));
        } catch (IOException e) {
            return ResponseEntity.status(500)
                    .body(new ApiResponse(false, "Failed to upload logo: " + e.getMessage()));
        }
    }
}

