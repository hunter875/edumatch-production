package com.example.jwt.example.service;

import com.example.jwt.example.dto.request.CreateEmployerRequestRequest;
import com.example.jwt.example.dto.request.RejectEmployerRequestRequest;
import com.example.jwt.example.dto.response.OrganizationRequestResponse;
import com.example.jwt.example.exception.BadRequestException;
import com.example.jwt.example.exception.ResourceNotFoundException;
import com.example.jwt.example.model.Organization;
import com.example.jwt.example.model.OrganizationRequest;
import com.example.jwt.example.model.Role;
import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.OrganizationRepository;
import com.example.jwt.example.repository.OrganizationRequestRepository;
import com.example.jwt.example.repository.RoleRepository;
import com.example.jwt.example.repository.UserRepository;
import com.example.jwt.example.util.PaginationUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OrganizationRequestService {

    private final OrganizationRequestRepository organizationRequestRepository;
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final RoleRepository roleRepository;
    private final OrganizationService organizationService;
    private final UserCacheEvictionService userCacheEvictionService;

    /**
     * User tạo request trở thành employer
     */
    public OrganizationRequest createRequest(Long userId, CreateEmployerRequestRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

        // Check if user already has a pending request
        if (organizationRequestRepository.existsByUserIdAndStatus(userId, "PENDING")) {
            throw new BadRequestException("You already have a pending employer request");
        }

        // Check if user is already an employer
        if (user.getRoles().stream().anyMatch(role -> role.getName().equals("ROLE_EMPLOYER"))) {
            throw new BadRequestException("User is already an employer");
        }

        OrganizationRequest orgRequest = OrganizationRequest.builder()
                .userId(userId)
                .organizationName(request.getOrganizationName())
                .description(request.getDescription())
                .organizationType(request.getOrganizationType())
                .website(request.getWebsite())
                .email(request.getEmail())
                .phone(request.getPhone())
                .address(request.getAddress())
                .country(request.getCountry())
                .city(request.getCity())
                .status("PENDING")
                .build();

        OrganizationRequest saved = organizationRequestRepository.save(orgRequest);
        log.info("Created organization request for user: {}", userId);
        return saved;
    }

    /**
     * Lấy danh sách requests với filter
     */
    @Transactional(readOnly = true)
    public Page<OrganizationRequest> getAllRequests(String status, int page, int size) {
        Pageable pageable = PaginationUtils.pageRequest(page, size, Sort.by("createdAt").descending());
        if (status != null && !status.isEmpty()) {
            return organizationRequestRepository.findAllByStatus(status, pageable);
        }
        return organizationRequestRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Optional<OrganizationRequest> getLatestRequestByUserId(Long userId) {
        return organizationRequestRepository.findTopByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Lấy request theo ID
     */
    @Transactional(readOnly = true)
    public OrganizationRequest getRequestById(Long id) {
        return organizationRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("OrganizationRequest", "id", id));
    }

    /**
     * Admin approve request
     */
    public OrganizationRequest approveRequest(Long requestId, Long adminId) {
        OrganizationRequest request = getRequestById(requestId);

        if (!"PENDING".equals(request.getStatus())) {
            throw new BadRequestException("Request is not in PENDING status");
        }

        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", request.getUserId()));

        // Check if user is already an employer
        if (user.getRoles().stream().anyMatch(role -> role.getName().equals("ROLE_EMPLOYER"))) {
            throw new BadRequestException("User is already an employer");
        }

        // Find or Create Organization (so sánh với các organization đã tồn tại)
        com.example.jwt.example.dto.request.OrganizationRequest orgRequest = 
            new com.example.jwt.example.dto.request.OrganizationRequest();
        orgRequest.setName(request.getOrganizationName());
        orgRequest.setDescription(null); // Không dùng description trong form đăng ký
        orgRequest.setOrganizationType(request.getOrganizationType());
        orgRequest.setWebsite(request.getWebsite());
        orgRequest.setEmail(request.getEmail());
        orgRequest.setPhone(request.getPhone());
        orgRequest.setAddress(request.getAddress());
        orgRequest.setCountry(request.getCountry());
        orgRequest.setCity(request.getCity());

        // Sử dụng findOrCreateOrganization để tự động tìm organization đã tồn tại hoặc tạo mới
        Organization organization = organizationService.findOrCreateOrganization(orgRequest);

        // Update user role: Remove USER role and add EMPLOYER role
        Role employerRole = roleRepository.findByName("ROLE_EMPLOYER")
                .orElseThrow(() -> new ResourceNotFoundException("Role", "name", "ROLE_EMPLOYER"));

        Set<Role> roles = new HashSet<>(user.getRoles());
        // Remove USER role
        roles.removeIf(role -> role.getName().equals("ROLE_USER"));
        // Add EMPLOYER role
        roles.add(employerRole);
        user.setRoles(roles);

        // Link user to organization
        user.setOrganizationId(organization.getId());
        User savedUser = userRepository.save(user);
        userCacheEvictionService.evictUser(savedUser);

        // Update request status
        request.setStatus("APPROVED");
        request.setReviewedBy(adminId);
        request.setReviewedAt(LocalDateTime.now());
        OrganizationRequest updated = organizationRequestRepository.save(request);

        log.info("Approved organization request {} for user {}", requestId, request.getUserId());
        return updated;
    }

    /**
     * Admin reject request
     */
    public OrganizationRequest rejectRequest(Long requestId, Long adminId, RejectEmployerRequestRequest rejectRequest) {
        OrganizationRequest request = getRequestById(requestId);

        if (!"PENDING".equals(request.getStatus())) {
            throw new BadRequestException("Request is not in PENDING status");
        }

        request.setStatus("REJECTED");
        request.setRejectionReason(rejectRequest.getReason());
        request.setReviewedBy(adminId);
        request.setReviewedAt(LocalDateTime.now());

        OrganizationRequest updated = organizationRequestRepository.save(request);
        log.info("Rejected organization request {} for user {}", requestId, request.getUserId());
        return updated;
    }

    /**
     * Convert OrganizationRequest entity to DTO
     */
    public OrganizationRequestResponse toResponse(OrganizationRequest request) {
        Set<Long> userIds = new HashSet<>();
        if (request.getUserId() != null) {
            userIds.add(request.getUserId());
        }
        if (request.getReviewedBy() != null) {
            userIds.add(request.getReviewedBy());
        }

        Map<Long, User> usersById = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        return toResponse(request, usersById);
    }

    private OrganizationRequestResponse toResponse(OrganizationRequest request, Map<Long, User> usersById) {
        User user = usersById.get(request.getUserId());
        User reviewer = request.getReviewedBy() != null
                ? usersById.get(request.getReviewedBy())
                : null;

        return OrganizationRequestResponse.builder()
                .id(request.getId())
                .userId(request.getUserId())
                .userEmail(user != null ? user.getEmail() : null)
                .userName(user != null ? (user.getFirstName() + " " + user.getLastName()).trim() : null)
                .organizationName(request.getOrganizationName())
                .description(request.getDescription())
                .organizationType(request.getOrganizationType())
                .website(request.getWebsite())
                .email(request.getEmail())
                .phone(request.getPhone())
                .address(request.getAddress())
                .country(request.getCountry())
                .city(request.getCity())
                .status(request.getStatus())
                .rejectionReason(request.getRejectionReason())
                .reviewedBy(request.getReviewedBy())
                .reviewedByName(reviewer != null ? (reviewer.getFirstName() + " " + reviewer.getLastName()).trim() : null)
                .reviewedAt(request.getReviewedAt())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }

    /**
     * Convert list to DTOs
     */
    public List<OrganizationRequestResponse> toResponseList(List<OrganizationRequest> requests) {
        Set<Long> userIds = new HashSet<>();
        for (OrganizationRequest request : requests) {
            if (request.getUserId() != null) {
                userIds.add(request.getUserId());
            }
            if (request.getReviewedBy() != null) {
                userIds.add(request.getReviewedBy());
            }
        }

        Map<Long, User> usersById = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        return requests.stream()
                .map(request -> toResponse(request, usersById))
                .collect(Collectors.toList());
    }
}
