package com.edumatch.scholarship.service;

import com.edumatch.scholarship.dto.ApplicationDto;
import com.edumatch.scholarship.dto.CreateApplicationRequest;
import com.edumatch.scholarship.dto.client.UserDetailDto;
import com.edumatch.scholarship.exception.ConflictException;
import com.edumatch.scholarship.model.Application;
import com.edumatch.scholarship.model.ApplicationDocument;
import com.edumatch.scholarship.model.ApplicationStatus;
import com.edumatch.scholarship.model.ModerationStatus;
import com.edumatch.scholarship.repository.ApplicationDocumentRepository;
import com.edumatch.scholarship.repository.ApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.edumatch.scholarship.exception.ResourceNotFoundException;
import com.edumatch.scholarship.model.Opportunity;
import com.edumatch.scholarship.repository.OpportunityRepository;
import org.springframework.security.access.AccessDeniedException;
import java.util.stream.Collectors;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.HashMap;
import java.math.BigDecimal;
import java.time.LocalDate;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApplicationService {

    private String normalizeSearchKeyword(String keyword) {
        if (keyword == null) {
            return null;
        }

        String trimmed = keyword.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Map<Long, List<ApplicationDocument>> getDocumentsByApplicationId(List<Application> applications) {
        if (applications == null || applications.isEmpty()) {
            return new HashMap<>();
        }

        List<Long> applicationIds = applications.stream()
                .map(Application::getId)
                .collect(Collectors.toList());

        return applicationDocumentRepository.findByApplicationIdIn(applicationIds).stream()
                .collect(Collectors.groupingBy(ApplicationDocument::getApplicationId));
    }

    private final ApplicationRepository applicationRepository;
    private final ApplicationDocumentRepository applicationDocumentRepository;

    // Chúng ta cần ScholarshipService để dùng lại hàm getUserDetails
    private final ScholarshipService scholarshipService;
    private final OpportunityRepository opportunityRepository; //để check quyền sở hữu
    private final ScholarshipCacheEvictionService cacheEvictionService;
    private final ApplicationEventService applicationEventService;

    /**
     * Applicant (Student) submits an application.
     *
     * Business rules enforced in a single transaction:
     * 1. Actor identity is resolved from the authenticated token (never from request body).
     * 2. Opportunity must exist, be public, approved, and not past deadline.
     * 3. Actor cannot apply to their own opportunity.
     * 4. Duplicate applications are prevented by unique constraint + pre-check.
     * 5. Identity fields (name, email, GPA) come from Auth-Service profile, not request.
     * 6. Free-text fields from the request are validated for length and format.
     */
    @Transactional
    public ApplicationDto createApplication(CreateApplicationRequest request, UserDetails userDetails) {

        // --- 1. Resolve current actor identity from Auth-Service ---
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String token = (String) authentication.getCredentials();
        UserDetailDto actor = scholarshipService.getUserDetailsFromAuthService(userDetails.getUsername(), token);

        if (actor.getId() == null) {
            throw new IllegalStateException("Cannot resolve authenticated user identity.");
        }

        // --- 2. Load & validate the opportunity ---
        Opportunity opportunity = opportunityRepository.findById(request.getOpportunityId())
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found"));

        validateOpportunityEligibility(opportunity, actor);

        // --- 3. Validate request fields ---
        validateCreateApplicationRequest(request);

        applicationRepository
                .findFirstByApplicantUserIdAndOpportunityId(actor.getId(), request.getOpportunityId())
                .ifPresent(existing -> {
                    throw new ConflictException("Applicant already applied to this scholarship.");
                });

        // --- 4. Build application with identity from auth profile ---
        Application app = new Application();
        app.setApplicantUserId(actor.getId());
        app.setOpportunityId(request.getOpportunityId());
        app.setStatus(ApplicationStatus.PENDING);

        // Identity fields — ALWAYS from authenticated profile, ignore request values
        app.setApplicantUserName(actor.getUsername());
        app.setApplicantEmail(actor.getEmail());
        app.setPhone(actor.getPhone());       // profile snapshot (unverified contact field)
        app.setGpa(actor.getGpa() != null ? BigDecimal.valueOf(actor.getGpa()) : null);

        // Free-text fields from request (post-validation)
        app.setCoverLetter(request.getCoverLetter());
        app.setMotivation(request.getMotivation());
        app.setAdditionalInfo(request.getAdditionalInfo());
        app.setPortfolioUrl(request.getPortfolioUrl());
        app.setLinkedinUrl(request.getLinkedinUrl());
        app.setGithubUrl(request.getGithubUrl());

        // --- 5. Persist (unique constraint catches concurrent duplicates) ---
        Application savedApp;
        try {
            savedApp = applicationRepository.save(app);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Applicant already applied to this scholarship.");
        }
        log.info("Created application id={} for user={} on opportunity={}", savedApp.getId(), actor.getId(), request.getOpportunityId());

        // --- 6. Save attached documents ---
        List<ApplicationDocument> savedDocs = new ArrayList<>();
        if (request.getDocuments() != null && !request.getDocuments().isEmpty()) {
            for (var docDto : request.getDocuments()) {
                ApplicationDocument doc = new ApplicationDocument();
                doc.setApplicationId(savedApp.getId());
                doc.setDocumentName(docDto.getDocumentName());
                doc.setDocumentUrl(docDto.getDocumentUrl());
                savedDocs.add(applicationDocumentRepository.save(doc));
            }
            log.info("Saved {} documents for application id={}", savedDocs.size(), savedApp.getId());
        }

        cacheEvictionService.evictAnalyticsCaches(opportunity.getCreatorUserId());
        return ApplicationDto.fromEntity(savedApp, savedDocs);
    }

    /**
     * Validate that the opportunity is eligible for new applications.
     */
    private void validateOpportunityEligibility(Opportunity opportunity, UserDetailDto actor) {
        // Must be public
        if (!Boolean.TRUE.equals(opportunity.getIsPublic())) {
            throw new ConflictException("This scholarship is not currently accepting applications.");
        }
        // Must be approved by moderation
        if (opportunity.getModerationStatus() != ModerationStatus.APPROVED) {
            throw new ConflictException("This scholarship is not currently accepting applications.");
        }
        // Must have a deadline
        if (opportunity.getApplicationDeadline() == null) {
            throw new ConflictException("This scholarship has no application deadline set.");
        }
        // Deadline must not have passed
        if (opportunity.getApplicationDeadline().isBefore(LocalDate.now())) {
            throw new ConflictException("The application deadline for this scholarship has passed.");
        }
        // Actor must not be the creator
        if (opportunity.getCreatorUserId().equals(actor.getId())) {
            throw new AccessDeniedException("Provider cannot apply to their own opportunity.");
        }
    }

    /**
     * Validate free-text fields from the create-application request.
     * Identity fields (name, email, GPA) are not validated here because
     * they are ignored in favour of the authenticated profile.
     */
    private void validateCreateApplicationRequest(CreateApplicationRequest request) {
        // GPA range check (only if the request includes one; the profile GPA overrides)
        if (request.getGpa() != null) {
            double gpa = request.getGpa().doubleValue();
            if (gpa < 0.0 || gpa > 4.0) {
                throw new IllegalArgumentException("GPA must be between 0.0 and 4.0");
            }
        }
        // URL schemes
        if (request.getPortfolioUrl() != null && !request.getPortfolioUrl().isBlank()) {
            String u = request.getPortfolioUrl().trim().toLowerCase();
            if (!u.startsWith("http://") && !u.startsWith("https://")) {
                throw new IllegalArgumentException("portfolioUrl must use http or https scheme");
            }
        }
        if (request.getLinkedinUrl() != null && !request.getLinkedinUrl().isBlank()) {
            String u = request.getLinkedinUrl().trim().toLowerCase();
            if (!u.startsWith("http://") && !u.startsWith("https://")) {
                throw new IllegalArgumentException("linkedinUrl must use http or https scheme");
            }
        }
        if (request.getGithubUrl() != null && !request.getGithubUrl().isBlank()) {
            String u = request.getGithubUrl().trim().toLowerCase();
            if (!u.startsWith("http://") && !u.startsWith("https://")) {
                throw new IllegalArgumentException("githubUrl must use http or https scheme");
            }
        }
        // Text length limits (prevent oversized payloads)
        final int MAX_TEXT = 10_000;
        if (request.getCoverLetter() != null && request.getCoverLetter().length() > MAX_TEXT) {
            throw new IllegalArgumentException("coverLetter exceeds maximum length of " + MAX_TEXT);
        }
        if (request.getMotivation() != null && request.getMotivation().length() > MAX_TEXT) {
            throw new IllegalArgumentException("motivation exceeds maximum length of " + MAX_TEXT);
        }
        if (request.getAdditionalInfo() != null && request.getAdditionalInfo().length() > MAX_TEXT) {
            throw new IllegalArgumentException("additionalInfo exceeds maximum length of " + MAX_TEXT);
        }
        // Document validation
        if (request.getDocuments() != null) {
            for (var doc : request.getDocuments()) {
                if (doc.getDocumentName() == null || doc.getDocumentName().isBlank()) {
                    throw new IllegalArgumentException("Document name is required");
                }
                if (doc.getDocumentUrl() == null || doc.getDocumentUrl().isBlank()) {
                    throw new IllegalArgumentException("Document URL is required");
                }
                String du = doc.getDocumentUrl().trim().toLowerCase();
                if (!du.startsWith("http://") && !du.startsWith("https://")) {
                    throw new IllegalArgumentException("Document URL must use http or https scheme");
                }
            }
        }
    }
    /**
     * Kiểm tra xem Provider (user) có sở hữu Opportunity (opp) không
     */
    private void checkProviderOwnership(Long opportunityId, UserDetails userDetails) {
        // 1. Lấy thông tin Provider
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String token = (String) authentication.getCredentials();
        UserDetailDto user = scholarshipService.getUserDetailsFromAuthService(userDetails.getUsername(), token); // Dùng hàm public là đúng

        // 2. Lấy thông tin Opportunity
        Opportunity opp = opportunityRepository.findById(opportunityId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cơ hội với ID: " + opportunityId));

        // 3. So sánh ID người tạo và ID người đang gọi API
        if (!opp.getCreatorUserId().equals(user.getId())) {
            log.warn("User {} không có quyền truy cập cơ hội {} của user {}", user.getId(), opp.getId(), opp.getCreatorUserId());
            throw new AccessDeniedException("Bạn không có quyền xem đơn ứng tuyển của cơ hội này.");
        }
    }

    /**
     * Lấy danh sách ứng viên đã nộp vào một cơ hội
     */
    public List<ApplicationDto> getApplicationsForOpportunity(Long opportunityId, UserDetails userDetails) {
        // 1. Kiểm tra quyền sở hữu
        checkProviderOwnership(opportunityId, userDetails);

        // 2. Lấy các đơn ứng tuyển
        List<Application> applications = applicationRepository.findByOpportunityId(opportunityId);
        Map<Long, List<ApplicationDocument>> docsByApplicationId = getDocumentsByApplicationId(applications);

        // 3. Chuyển đổi sang DTO (bao gồm cả tài liệu của từng đơn)
        return applications.stream()
                .map(app -> {
                    // Lấy tài liệu của đơn này [cite: 344]
                    List<ApplicationDocument> docs = docsByApplicationId.getOrDefault(app.getId(), List.of());
                    return ApplicationDto.fromEntity(app, docs);
                })
                .collect(Collectors.toList());
    }

    public List<ApplicationDto> getApplicationsForCurrentProvider(UserDetails userDetails) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String token = (String) authentication.getCredentials();
        UserDetailDto user = scholarshipService.getUserDetailsFromAuthService(userDetails.getUsername(), token);

        List<Application> applications = applicationRepository.findApplicationsByCreatorUserId(user.getId());
        Map<Long, List<ApplicationDocument>> docsByApplicationId = getDocumentsByApplicationId(applications);
        Map<Long, String> opportunityTitles = opportunityRepository.findByCreatorUserId(user.getId()).stream()
                .collect(Collectors.toMap(Opportunity::getId, Opportunity::getTitle));

        return applications.stream()
                .map(app -> {
                    List<ApplicationDocument> docs = docsByApplicationId.getOrDefault(app.getId(), List.of());
                    ApplicationDto dto = ApplicationDto.fromEntity(app, docs);
                    dto.setOpportunityTitle(opportunityTitles.get(app.getOpportunityId()));
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Provider updates application status with transition validation.
     */
    @Transactional
    public ApplicationDto updateApplicationStatus(Long applicationId, ApplicationStatus newStatus, UserDetails userDetails) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with ID: " + applicationId));

        // Provider must own the opportunity this application belongs to
        checkProviderOwnership(app.getOpportunityId(), userDetails);

        // Validate transition
        ApplicationStatus currentStatus = app.getStatus();
        if (!currentStatus.canTransitionTo(newStatus)) {
            throw new IllegalArgumentException(
                    String.format("Cannot transition application from %s to %s", currentStatus, newStatus));
        }

        app.setStatus(newStatus);
        Application savedApp = applicationRepository.save(app);

        // --- Notification logic ---
        Opportunity opportunity = opportunityRepository.findById(savedApp.getOpportunityId()).orElse(null);
        String opportunityTitle = opportunity != null ? opportunity.getTitle() : "scholarship";

        applicationEventService.applicationStatusChanged(savedApp, newStatus.name(), opportunityTitle);
        log.info("Provider changed application {} status: {} -> {}", applicationId, currentStatus, newStatus);

        String notificationTitle = buildNotificationTitle(newStatus, opportunityTitle);
        String notificationBody = buildNotificationBody(newStatus, opportunityTitle);

        Map<String, Object> notificationEvent = new HashMap<>();
        notificationEvent.put("recipientId", savedApp.getApplicantUserId());
        notificationEvent.put("title", notificationTitle);
        notificationEvent.put("body", notificationBody);
        notificationEvent.put("type", "APPLICATION_STATUS");
        notificationEvent.put("applicationId", savedApp.getId());
        notificationEvent.put("status", newStatus.name());
        notificationEvent.put("opportunityTitle", opportunityTitle);
        if (savedApp.getOpportunityId() != null) {
            notificationEvent.put("referenceId", savedApp.getOpportunityId().toString());
            notificationEvent.put("opportunityId", savedApp.getOpportunityId());
        }

        log.debug("Application status notification queued through outbox.");

        List<ApplicationDocument> docs = applicationDocumentRepository.findByApplicationId(savedApp.getId());
        cacheEvictionService.evictAnalyticsCaches(opportunity == null ? null : opportunity.getCreatorUserId());
        return ApplicationDto.fromEntity(savedApp, docs);
    }

    /**
     * Admin updates application status with extended (but still validated) transitions.
     * Admin can override provider transitions but still cannot set arbitrary strings.
     */
    @Transactional
    public ApplicationDto updateApplicationStatusByAdmin(Long applicationId, ApplicationStatus newStatus) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with ID: " + applicationId));

        // Admin can force any valid enum value (including overriding terminal states)
        app.setStatus(newStatus);
        Application savedApp = applicationRepository.save(app);

        Opportunity opportunity = opportunityRepository.findById(savedApp.getOpportunityId()).orElse(null);
        String opportunityTitle = opportunity != null ? opportunity.getTitle() : "scholarship";

        applicationEventService.applicationStatusChanged(savedApp, newStatus.name(), opportunityTitle);
        log.info("Admin changed application {} status to {}", savedApp.getId(), newStatus);

        String notificationTitle = buildNotificationTitle(newStatus, opportunityTitle);
        String notificationBody = buildNotificationBody(newStatus, opportunityTitle);

        Map<String, Object> notificationEvent = new HashMap<>();
        notificationEvent.put("recipientId", savedApp.getApplicantUserId());
        notificationEvent.put("title", notificationTitle);
        notificationEvent.put("body", notificationBody);
        notificationEvent.put("type", "APPLICATION_STATUS");
        notificationEvent.put("applicationId", savedApp.getId());
        notificationEvent.put("status", newStatus.name());
        notificationEvent.put("opportunityTitle", opportunityTitle);
        if (savedApp.getOpportunityId() != null) {
            notificationEvent.put("referenceId", savedApp.getOpportunityId().toString());
            notificationEvent.put("opportunityId", savedApp.getOpportunityId());
        }

        List<ApplicationDocument> docs = applicationDocumentRepository.findByApplicationId(savedApp.getId());
        ApplicationDto dto = ApplicationDto.fromEntity(savedApp, docs);
        if (savedApp.getOpportunityId() != null) {
            opportunityRepository.findById(savedApp.getOpportunityId())
                    .ifPresent(opp -> dto.setOpportunityTitle(opp.getTitle()));
        }
        cacheEvictionService.evictAnalyticsCaches(opportunity == null ? null : opportunity.getCreatorUserId());
        return dto;
    }

    private String buildNotificationTitle(ApplicationStatus status, String opportunityTitle) {
        switch (status) {
            case ACCEPTED: return "Application accepted!";
            case REJECTED: return "Application not selected";
            case UNDER_REVIEW: return "Application under review";
            case WAITLISTED: return "Application waitlisted";
            default: return "Application status update";
        }
    }

    private String buildNotificationBody(ApplicationStatus status, String opportunityTitle) {
        switch (status) {
            case ACCEPTED: return String.format("Your application for \"%s\" has been accepted!", opportunityTitle);
            case REJECTED: return String.format("Your application for \"%s\" was not selected this time.", opportunityTitle);
            case UNDER_REVIEW: return String.format("Your application for \"%s\" is being reviewed.", opportunityTitle);
            case WAITLISTED: return String.format("Your application for \"%s\" has been waitlisted.", opportunityTitle);
            default: return String.format("Application status for \"%s\": %s", opportunityTitle, status);
        }
    }
    /**
     * Lấy danh sách các đơn ứng tuyển của user đang đăng nhập
     */
    public List<ApplicationDto> getMyApplications(UserDetails userDetails) {
        // 1. Lấy thông tin user (dùng lại hàm helper)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String token = (String) authentication.getCredentials();
        UserDetailDto user = scholarshipService.getUserDetailsFromAuthService(userDetails.getUsername(), token);
        Long applicantId = user.getId();

        // 2. Lấy đơn (dùng hàm repo đã có)
        List<Application> applications = applicationRepository.findByApplicantUserId(applicantId);
        Map<Long, List<ApplicationDocument>> docsByApplicationId = getDocumentsByApplicationId(applications);

        // 3. Chuyển đổi sang DTO (gồm cả tài liệu)
        return applications.stream()
                .map(app -> {
                    List<ApplicationDocument> docs = docsByApplicationId.getOrDefault(app.getId(), List.of());
                    return ApplicationDto.fromEntity(app, docs);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<Long, Boolean> getMyApplicationStatuses(List<Long> opportunityIds, UserDetails userDetails) {
        Map<Long, Boolean> statuses = new LinkedHashMap<>();
        if (opportunityIds == null || opportunityIds.isEmpty()) {
            return statuses;
        }

        List<Long> normalizedIds = opportunityIds.stream()
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());
        normalizedIds.forEach(id -> statuses.put(id, false));

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String token = (String) authentication.getCredentials();
        UserDetailDto user = scholarshipService.getUserDetailsFromAuthService(userDetails.getUsername(), token);

        applicationRepository
                .findByApplicantUserIdAndOpportunityIdIn(user.getId(), normalizedIds)
                .forEach(application -> statuses.put(application.getOpportunityId(), true));

        return statuses;
    }

    /**
     * Lấy TẤT CẢ applications với filter và pagination (cho Admin)
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<ApplicationDto> getAllApplicationsForAdmin(
            String status,
            Long opportunityId,
            String keyword,
            org.springframework.data.domain.Pageable pageable) {
        
        // Lấy applications với filter
        org.springframework.data.domain.Page<Application> page = applicationRepository.searchApplications(
                status, opportunityId, normalizeSearchKeyword(keyword), pageable);
        List<Application> applications = page.getContent();
        Map<Long, List<ApplicationDocument>> docsByApplicationId = getDocumentsByApplicationId(applications);
        List<Long> opportunityIds = applications.stream()
                .map(Application::getOpportunityId)
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());
        Map<Long, String> opportunityTitlesById = opportunityRepository.findAllById(opportunityIds).stream()
                .collect(Collectors.toMap(Opportunity::getId, Opportunity::getTitle));

        // Chuyển đổi sang DTO và thêm opportunity title
        return page.map(app -> {
            List<ApplicationDocument> docs = docsByApplicationId.getOrDefault(app.getId(), List.of());
            ApplicationDto dto = ApplicationDto.fromEntity(app, docs);
            
            // Lấy opportunity title nếu có
            if (app.getOpportunityId() != null) {
                dto.setOpportunityTitle(opportunityTitlesById.get(app.getOpportunityId()));
            }
            
            return dto;
        });
    }

    /**
     * Admin lấy chi tiết một application
     */
    @Transactional(readOnly = true)
    public ApplicationDto getApplicationByIdForAdmin(Long applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn ứng tuyển với ID: " + applicationId));
        
        List<ApplicationDocument> docs = applicationDocumentRepository.findByApplicationId(app.getId());
        ApplicationDto dto = ApplicationDto.fromEntity(app, docs);
        
        // Lấy opportunity title nếu có
        if (app.getOpportunityId() != null) {
            opportunityRepository.findById(app.getOpportunityId())
                .ifPresent(opp -> dto.setOpportunityTitle(opp.getTitle()));
        }
        
        return dto;
    }

}
