package com.example.jwt.example.service;

import com.example.jwt.example.dto.request.OrganizationRequest;
import com.example.jwt.example.dto.response.OrganizationResponse;
import com.example.jwt.example.exception.BadRequestException;
import com.example.jwt.example.exception.ResourceNotFoundException;
import com.example.jwt.example.model.Organization;
import com.example.jwt.example.repository.OrganizationRepository;
import com.example.jwt.example.util.PaginationUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OrganizationService {

    private final OrganizationRepository organizationRepository;

    /**
     * Tạo organization mới (có check name duplicate)
     */
    public Organization createOrganization(OrganizationRequest request) {
        if (organizationRepository.existsByName(request.getName())) {
            throw new BadRequestException("Organization name already exists: " + request.getName());
        }

        return createOrganizationWithoutNameCheck(request);
    }

    /**
     * Tạo organization mới (không check name duplicate - dùng trong findOrCreateOrganization)
     */
    private Organization createOrganizationWithoutNameCheck(OrganizationRequest request) {
        Organization organization = Organization.builder()
                .name(request.getName())
                .description(request.getDescription())
                .organizationType(request.getOrganizationType())
                .website(request.getWebsite())
                .email(request.getEmail())
                .phone(request.getPhone())
                .address(request.getAddress())
                .country(request.getCountry())
                .city(request.getCity())
                .logoUrl(request.getLogoUrl())
                .isVerified(false)
                .isActive(true)
                .build();

        Organization saved = organizationRepository.save(organization);
        log.info("Created organization: {}", saved.getName());
        return saved;
    }

    /**
     * Tìm hoặc tạo organization mới dựa trên logic so sánh
     * So sánh: name, type, country, address, phone, email, website, city
     * Nếu tất cả giống → dùng organization đã tồn tại
     * Nếu có khác → tạo organization mới
     */
    public Organization findOrCreateOrganization(OrganizationRequest request) {
        // Tìm organization có cùng name
        List<Organization> organizationsWithSameName = organizationRepository.findAll()
                .stream()
                .filter(org -> org.getName() != null && org.getName().equalsIgnoreCase(request.getName()))
                .collect(Collectors.toList());

        if (!organizationsWithSameName.isEmpty()) {
            // So sánh với từng organization có cùng name
            for (Organization existingOrg : organizationsWithSameName) {
                if (isOrganizationMatch(existingOrg, request)) {
                    // Tất cả các trường đều giống → dùng organization đã tồn tại
                    log.info("Found existing organization with matching details: {}", existingOrg.getName());
                    return existingOrg;
                }
            }
            // Có cùng name nhưng các trường khác khác → tạo organization mới
            log.info("Organization name exists but details differ, creating new organization: {}", request.getName());
        }

        // Không tìm thấy organization nào → tạo mới (không check name duplicate vì đã check ở trên)
        return createOrganizationWithoutNameCheck(request);
    }

    /**
     * So sánh organization với request để xem có khớp không
     * So sánh: type, country, address, phone, email, website, city
     */
    private boolean isOrganizationMatch(Organization org, OrganizationRequest request) {
        return compareStrings(org.getOrganizationType(), request.getOrganizationType()) &&
               compareStrings(org.getCountry(), request.getCountry()) &&
               compareStrings(org.getAddress(), request.getAddress()) &&
               compareStrings(org.getPhone(), request.getPhone()) &&
               compareStrings(org.getEmail(), request.getEmail()) &&
               compareStrings(org.getWebsite(), request.getWebsite()) &&
               compareStrings(org.getCity(), request.getCity());
    }

    /**
     * So sánh 2 string (null-safe, case-insensitive, trim)
     */
    private boolean compareStrings(String str1, String str2) {
        String s1 = (str1 == null) ? "" : str1.trim().toLowerCase();
        String s2 = (str2 == null) ? "" : str2.trim().toLowerCase();
        return s1.equals(s2);
    }

    /**
     * Lấy danh sách organizations với filter và phân trang
     */
    @Transactional(readOnly = true)
    public Page<Organization> getAllOrganizations(String keyword, Boolean isActive, Boolean isVerified, int page, int size) {
        Pageable pageable = PaginationUtils.pageRequest(page, size, Sort.by("id").descending());
        return organizationRepository.searchOrganizations(keyword, isActive, isVerified, pageable);
    }

    /**
     * Lấy organization theo ID
     */
    @Transactional(readOnly = true)
    public Organization getOrganizationById(Long id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", id));
    }

    /**
     * Cập nhật organization
     */
    public Organization updateOrganization(Long id, OrganizationRequest request) {
        Organization organization = getOrganizationById(id);

        // Check if name is being changed and if new name already exists
        if (!organization.getName().equals(request.getName()) && 
            organizationRepository.existsByName(request.getName())) {
            throw new BadRequestException("Organization name already exists: " + request.getName());
        }

        organization.setName(request.getName());
        organization.setDescription(request.getDescription());
        organization.setOrganizationType(request.getOrganizationType());
        organization.setWebsite(request.getWebsite());
        organization.setEmail(request.getEmail());
        organization.setPhone(request.getPhone());
        organization.setAddress(request.getAddress());
        organization.setCountry(request.getCountry());
        organization.setCity(request.getCity());
        organization.setLogoUrl(request.getLogoUrl());

        Organization updated = organizationRepository.save(organization);
        log.info("Updated organization: {}", updated.getName());
        return updated;
    }

    /**
     * Xóa organization (soft delete)
     */
    public void deleteOrganization(Long id) {
        Organization organization = getOrganizationById(id);
        organization.setIsActive(false);
        organizationRepository.save(organization);
        log.info("Deactivated organization: {}", organization.getName());
    }

    /**
     * Verify/Unverify organization
     */
    public Organization toggleVerification(Long id) {
        Organization organization = getOrganizationById(id);
        organization.setIsVerified(!organization.getIsVerified());
        Organization updated = organizationRepository.save(organization);
        log.info("{} organization: {}", updated.getIsVerified() ? "Verified" : "Unverified", updated.getName());
        return updated;
    }

    /**
     * Convert Organization entity sang OrganizationResponse DTO
     */
    public OrganizationResponse toOrganizationResponse(Organization organization) {
        return OrganizationResponse.builder()
                .id(organization.getId())
                .name(organization.getName())
                .description(organization.getDescription())
                .organizationType(organization.getOrganizationType())
                .website(organization.getWebsite())
                .email(organization.getEmail())
                .phone(organization.getPhone())
                .address(organization.getAddress())
                .country(organization.getCountry())
                .city(organization.getCity())
                .logoUrl(organization.getLogoUrl())
                .isVerified(organization.getIsVerified())
                .isActive(organization.getIsActive())
                .createdAt(organization.getCreatedAt())
                .updatedAt(organization.getUpdatedAt())
                .build();
    }

    /**
     * Convert list Organization entities sang list OrganizationResponse DTOs
     */
    public List<OrganizationResponse> toOrganizationResponseList(List<Organization> organizations) {
        return organizations.stream()
                .map(this::toOrganizationResponse)
                .collect(Collectors.toList());
    }
}
