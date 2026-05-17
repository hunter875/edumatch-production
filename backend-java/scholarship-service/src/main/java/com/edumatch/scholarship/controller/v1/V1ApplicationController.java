package com.edumatch.scholarship.controller.v1;

import com.edumatch.scholarship.dto.ApplicationDto;
import com.edumatch.scholarship.dto.CreateApplicationRequest;
import com.edumatch.scholarship.dto.UpdateApplicationStatusRequest;
import com.edumatch.scholarship.dto.api.ApiResponse;
import com.edumatch.scholarship.dto.api.PageResponse;
import com.edumatch.scholarship.service.ApplicationService;
import com.edumatch.scholarship.service.IdempotencyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class V1ApplicationController {

    private final ApplicationService applicationService;
    private final IdempotencyService idempotencyService;

    @PostMapping("/applications")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<ApiResponse<ApplicationDto>> createApplication(
            @Valid @RequestBody CreateApplicationRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        ApplicationDto created = idempotencyService.execute(
                idempotencyKey,
                userDetails.getUsername(),
                "POST /api/v1/applications",
                request,
                ApplicationDto.class,
                () -> applicationService.createApplication(request, userDetails)
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of(created));
    }

    @GetMapping("/me/applications")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<PageResponse<ApplicationDto>> getMyApplications(
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(PageResponse.fromList(
                applicationService.getMyApplications(userDetails),
                pageable
        ));
    }

    @GetMapping("/me/application-statuses")
    @PreAuthorize("hasAuthority('ROLE_USER')")
    public ResponseEntity<ApiResponse<Map<Long, Boolean>>> getMyApplicationStatuses(
            @RequestParam List<Long> opportunityIds,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(
                applicationService.getMyApplicationStatuses(opportunityIds, userDetails)
        ));
    }

    @GetMapping("/provider/applications")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<PageResponse<ApplicationDto>> getProviderApplications(
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(PageResponse.fromList(
                applicationService.getApplicationsForCurrentProvider(userDetails),
                pageable
        ));
    }

    @GetMapping("/provider/scholarships/{scholarshipId}/applications")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<PageResponse<ApplicationDto>> getProviderScholarshipApplications(
            @PathVariable Long scholarshipId,
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(PageResponse.fromList(
                applicationService.getApplicationsForOpportunity(scholarshipId, userDetails),
                pageable
        ));
    }

    @PatchMapping("/provider/applications/{applicationId}/status")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<ApiResponse<ApplicationDto>> updateProviderApplicationStatus(
            @PathVariable Long applicationId,
            @Valid @RequestBody UpdateApplicationStatusRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(
                applicationService.updateApplicationStatus(applicationId, request.getStatus(), userDetails)
        ));
    }

    @GetMapping("/admin/applications")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<PageResponse<ApplicationDto>> getAdminApplications(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long opportunityId,
            @RequestParam(required = false) String keyword,
            Pageable pageable
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(PageResponse.fromPage(
                applicationService.getAllApplicationsForAdmin(status, opportunityId, keyword, pageable)
        ));
    }

    @GetMapping("/admin/applications/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<ApplicationDto>> getAdminApplicationById(@PathVariable Long id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(applicationService.getApplicationByIdForAdmin(id)));
    }

    @PatchMapping("/admin/applications/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<ApplicationDto>> updateAdminApplicationStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateApplicationStatusRequest request
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(
                applicationService.updateApplicationStatusByAdmin(id, request.getStatus())
        ));
    }
}
