package com.edumatch.scholarship.service;

import com.edumatch.scholarship.dto.ApplicationDto;
import com.edumatch.scholarship.dto.CreateApplicationRequest;
import com.edumatch.scholarship.dto.client.UserDetailDto;
import com.edumatch.scholarship.exception.ConflictException;
import com.edumatch.scholarship.model.Application;
import com.edumatch.scholarship.model.ApplicationDocument;
import com.edumatch.scholarship.repository.ApplicationDocumentRepository;
import com.edumatch.scholarship.repository.ApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
     * Chức năng: Applicant (Sinh viên) nộp đơn ứng tuyển
     */
    @Transactional
    public ApplicationDto createApplication(CreateApplicationRequest request, UserDetails userDetails) {

        // 1. Lấy thông tin sinh viên (người đang nộp đơn)
        // dùng lại hàm helper của ScholarshipService
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String token = (String) authentication.getCredentials();
        UserDetailDto user = scholarshipService.getUserDetailsFromAuthService(userDetails.getUsername(), token);

        // 1.5. Check: Provider không thể apply vào opportunity của chính mình
        Opportunity opportunity = opportunityRepository.findById(request.getOpportunityId())
                .orElseThrow(() -> new RuntimeException("Opportunity not found"));
        
        if (opportunity.getCreatorUserId().equals(user.getId())) {
            throw new org.springframework.security.access.AccessDeniedException(
                "Provider cannot apply to their own opportunity");
        }

        // 2. Tạo đối tượng Application (Đơn ứng tuyển)
        applicationRepository.findFirstByApplicantUserIdAndOpportunityId(user.getId(), request.getOpportunityId())
                .ifPresent(existing -> {
                    throw new ConflictException("Applicant already applied to this scholarship.");
                });

        Application app = new Application();
        app.setApplicantUserId(user.getId());
        app.setOpportunityId(request.getOpportunityId());
        app.setStatus("PENDING");
        // app.setNotes(null); // Ghi chú (nếu có)

        // 2.5. Lưu các trường bổ sung từ request (nếu có)
        app.setApplicantUserName(request.getApplicantUserName() != null ? request.getApplicantUserName() : user.getUsername());
        app.setApplicantEmail(request.getApplicantEmail());
        app.setPhone(request.getPhone());
        app.setGpa(request.getGpa());
        app.setCoverLetter(request.getCoverLetter());
        app.setMotivation(request.getMotivation());
        app.setAdditionalInfo(request.getAdditionalInfo());
        app.setPortfolioUrl(request.getPortfolioUrl());
        app.setLinkedinUrl(request.getLinkedinUrl());
        app.setGithubUrl(request.getGithubUrl());

        // 3. Lưu Application vào DB để lấy ID
        Application savedApp = applicationRepository.save(app);
        log.info("Đã tạo đơn ứng tuyển mới với ID: {}", savedApp.getId());

        List<ApplicationDocument> savedDocs = new ArrayList<>();

        // 4. Lưu các tài liệu đính kèm (nếu có)
        if (request.getDocuments() != null && !request.getDocuments().isEmpty()) {
            for (var docDto : request.getDocuments()) {
                ApplicationDocument doc = new ApplicationDocument();
                doc.setApplicationId(savedApp.getId()); // Gán ID của đơn vừa tạo
                doc.setDocumentName(docDto.getDocumentName());
                doc.setDocumentUrl(docDto.getDocumentUrl());

                // Lưu tài liệu vào DB
                savedDocs.add(applicationDocumentRepository.save(doc));
            }
            log.info("Đã lưu {} tài liệu cho đơn ID: {}", savedDocs.size(), savedApp.getId());
        }

        cacheEvictionService.evictAnalyticsCaches(opportunity.getCreatorUserId());
        // 5. Trả về DTO hoàn chỉnh (bao gồm đơn và tài liệu)
        return ApplicationDto.fromEntity(savedApp, savedDocs);
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
     * Cập nhật trạng thái (Duyệt/Từ chối) một đơn ứng tuyển
     */
    @Transactional
    public ApplicationDto updateApplicationStatus(Long applicationId, String newStatus, UserDetails userDetails) {
        // 1. Tìm đơn ứng tuyển
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn ứng tuyển với ID: " + applicationId));

        // 2. Kiểm tra quyền sở hữu (thông qua cơ hội) [cite: 788]
        checkProviderOwnership(app.getOpportunityId(), userDetails);

        // 3. Cập nhật trạng thái
        app.setStatus(newStatus); // Ví dụ: "APPROVED", "REJECTED"
        Application savedApp = applicationRepository.save(app);
        
        // 3.1 Lấy thông tin Opportunity (scholarship) để đưa vào notification
        Opportunity opportunity = opportunityRepository.findById(savedApp.getOpportunityId())
                .orElse(null);
        String opportunityTitle = opportunity != null ? opportunity.getTitle() : "học bổng";

        // 4. GỬI SỰ KIỆN EMAIL
        // (Gửi 1 Map đơn giản chứa ID người nhận, tiêu đề, nội dung)
        // (Notification-service sẽ xử lý việc tìm email từ applicantUserId)
        Map<String, Object> emailEvent = Map.of(
                "applicantUserId", savedApp.getApplicantUserId(),
                "subject", "Cập nhật trạng thái đơn ứng tuyển",
                "body", "Trạng thái đơn ứng tuyển của bạn đã được cập nhật thành: " + newStatus
        );

        applicationEventService.applicationStatusChanged(savedApp, newStatus, opportunityTitle);
        log.info("Đã gửi sự kiện 'notification.send.email' cho user ID: {}", savedApp.getApplicantUserId());

        // 5. GỬI REAL-TIME NOTIFICATION EVENT
        log.info("📨 [Application Status] Employer changed application {} status to: {}", applicationId, newStatus);
        log.info("📨 [Application Status] Opportunity: {}", opportunityTitle);
        
        String notificationTitle = "";
        String notificationBody = "";
        
        switch (newStatus) {
            case "ACCEPTED":
                notificationTitle = "✅ Đơn ứng tuyển được chấp nhận!";
                notificationBody = String.format("Chúc mừng! Đơn ứng tuyển của bạn cho học bổng \"%s\" đã được chấp nhận bởi nhà tuyển dụng.", opportunityTitle);
                break;
            case "REJECTED":
                notificationTitle = "❌ Đơn ứng tuyển bị từ chối";
                notificationBody = String.format("Rất tiếc, đơn ứng tuyển của bạn cho học bổng \"%s\" không được chấp nhận lần này.", opportunityTitle);
                break;
            case "UNDER_REVIEW":
                notificationTitle = "🔍 Đơn đang được xem xét";
                notificationBody = String.format("Đơn ứng tuyển của bạn cho học bổng \"%s\" đang được nhà tuyển dụng xem xét.", opportunityTitle);
                break;
            case "WAITLISTED":
                notificationTitle = "⏳ Đơn trong danh sách chờ";
                notificationBody = String.format("Đơn ứng tuyển của bạn cho học bổng \"%s\" đã được đưa vào danh sách chờ.", opportunityTitle);
                break;
            default:
                notificationTitle = "📋 Cập nhật đơn ứng tuyển";
                notificationBody = String.format("Trạng thái đơn ứng tuyển cho học bổng \"%s\": %s", opportunityTitle, newStatus);
        }
        
        Map<String, Object> notificationEvent = new HashMap<>();
        notificationEvent.put("recipientId", savedApp.getApplicantUserId());
        notificationEvent.put("title", notificationTitle);
        notificationEvent.put("body", notificationBody);
        notificationEvent.put("type", "APPLICATION_STATUS");
        notificationEvent.put("applicationId", savedApp.getId());
        notificationEvent.put("status", newStatus);
        notificationEvent.put("opportunityTitle", opportunityTitle); // Add scholarship name
        
        // Add opportunity info if available
        if (savedApp.getOpportunityId() != null) {
            notificationEvent.put("referenceId", savedApp.getOpportunityId().toString());
            notificationEvent.put("opportunityId", savedApp.getOpportunityId()); // Add for reference
        }
        
        log.debug("Application status notification payload queued through outbox.");
        log.info("✅ [Application Status] Sent notification event to RabbitMQ for applicant userId: {}", savedApp.getApplicantUserId());
        log.info("📤 [Application Status] Scholarship: '{}', Status: {}", opportunityTitle, newStatus);
        log.info("📤 [Application Status] Event published to routing key: notification.application.status");

        // 6. Trả về DTO
        List<ApplicationDocument> docs = applicationDocumentRepository.findByApplicationId(savedApp.getId());
        cacheEvictionService.evictAnalyticsCaches(opportunity == null ? null : opportunity.getCreatorUserId());
        return ApplicationDto.fromEntity(savedApp, docs);
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

    /**
     * Admin cập nhật trạng thái application (không cần check ownership)
     */
    @Transactional
    public ApplicationDto updateApplicationStatusByAdmin(Long applicationId, String newStatus) {
        // 1. Tìm đơn ứng tuyển
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn ứng tuyển với ID: " + applicationId));

        // 2. Cập nhật trạng thái (Admin không cần check ownership)
        app.setStatus(newStatus);
        Application savedApp = applicationRepository.save(app);
        
        // 2.1 Lấy thông tin Opportunity (scholarship) để đưa vào notification
        Opportunity opportunity = opportunityRepository.findById(savedApp.getOpportunityId())
                .orElse(null);
        String opportunityTitle = opportunity != null ? opportunity.getTitle() : "học bổng";

        // 3. GỬI SỰ KIỆN EMAIL
        Map<String, Object> emailEvent = Map.of(
                "applicantUserId", savedApp.getApplicantUserId(),
                "subject", "Cập nhật trạng thái đơn ứng tuyển",
                "body", "Trạng thái đơn ứng tuyển của bạn đã được cập nhật thành: " + newStatus
        );

        applicationEventService.applicationStatusChanged(savedApp, newStatus, opportunityTitle);
        log.info("Admin đã cập nhật trạng thái đơn ứng tuyển ID: {} thành: {}", savedApp.getId(), newStatus);

        // 4. GỬI REAL-TIME NOTIFICATION EVENT
        String notificationTitle = "";
        String notificationBody = "";
        
        switch (newStatus) {
            case "ACCEPTED":
                notificationTitle = "✅ Đơn ứng tuyển được chấp nhận!";
                notificationBody = String.format("Chúc mừng! Đơn ứng tuyển của bạn cho học bổng \"%s\" đã được chấp nhận.", opportunityTitle);
                break;
            case "REJECTED":
                notificationTitle = "❌ Đơn ứng tuyển bị từ chối";
                notificationBody = String.format("Rất tiếc, đơn ứng tuyển của bạn cho học bổng \"%s\" không được chấp nhận lần này.", opportunityTitle);
                break;
            case "UNDER_REVIEW":
                notificationTitle = "🔍 Đơn đang được xem xét";
                notificationBody = String.format("Đơn ứng tuyển của bạn cho học bổng \"%s\" đang được xem xét.", opportunityTitle);
                break;
            default:
                notificationTitle = "📋 Cập nhật đơn ứng tuyển";
                notificationBody = String.format("Trạng thái đơn ứng tuyển cho học bổng \"%s\": %s", opportunityTitle, newStatus);
        }
        
        Map<String, Object> notificationEvent = new HashMap<>();
        notificationEvent.put("recipientId", savedApp.getApplicantUserId());
        notificationEvent.put("title", notificationTitle);
        notificationEvent.put("body", notificationBody);
        notificationEvent.put("type", "APPLICATION_STATUS");
        notificationEvent.put("applicationId", savedApp.getId());
        notificationEvent.put("status", newStatus);
        notificationEvent.put("opportunityTitle", opportunityTitle); // Add scholarship name
        
        // Add opportunity info if available
        if (savedApp.getOpportunityId() != null) {
            notificationEvent.put("referenceId", savedApp.getOpportunityId().toString());
            notificationEvent.put("opportunityId", savedApp.getOpportunityId());
        }
        
        log.debug("Application status notification payload queued through outbox.");
        log.info("📨 [Admin] Sent notification event for application {} to userId: {}", savedApp.getId(), savedApp.getApplicantUserId());
        log.info("📤 [Admin] Scholarship: '{}', Status: {}", opportunityTitle, newStatus);

        // 5. Trả về DTO
        List<ApplicationDocument> docs = applicationDocumentRepository.findByApplicationId(savedApp.getId());
        ApplicationDto dto = ApplicationDto.fromEntity(savedApp, docs);
        
        // Lấy opportunity title nếu có
        if (savedApp.getOpportunityId() != null) {
            opportunityRepository.findById(savedApp.getOpportunityId())
                .ifPresent(opp -> dto.setOpportunityTitle(opp.getTitle()));
        }
        
        cacheEvictionService.evictAnalyticsCaches(opportunity == null ? null : opportunity.getCreatorUserId());
        return dto;
    }
}
