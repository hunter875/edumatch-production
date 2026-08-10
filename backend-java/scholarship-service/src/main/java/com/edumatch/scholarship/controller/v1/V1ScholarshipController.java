package com.edumatch.scholarship.controller.v1;

import com.edumatch.scholarship.dto.CreateOpportunityRequest;
import com.edumatch.scholarship.dto.ModerateRequestDto;
import com.edumatch.scholarship.dto.OpportunityDetailDto;
import com.edumatch.scholarship.dto.OpportunityDto;
import com.edumatch.scholarship.dto.api.ApiResponse;
import com.edumatch.scholarship.dto.api.PageResponse;
import com.edumatch.scholarship.service.ScholarshipPublicReadCacheService;
import com.edumatch.scholarship.service.ScholarshipService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class V1ScholarshipController {

    private final ScholarshipService scholarshipService;
    private final ScholarshipPublicReadCacheService publicReadCacheService;

    @GetMapping("/scholarships")
    public ResponseEntity<PageResponse<OpportunityDto>> searchScholarships(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) BigDecimal gpa,
            @RequestParam(required = false) String studyMode,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) LocalDate currentDate,
            Pageable pageable
    ) {
        LocalDate date = Optional.ofNullable(currentDate).orElse(LocalDate.now());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(30, java.util.concurrent.TimeUnit.SECONDS).cachePublic())
                .body(publicReadCacheService.searchPublicScholarships(q, gpa, studyMode, level, date, pageable));
    }

    @GetMapping("/scholarships/{id}")
    public ResponseEntity<ApiResponse<OpportunityDetailDto>> getScholarshipById(@PathVariable Long id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(30, java.util.concurrent.TimeUnit.SECONDS).cachePublic())
                .body(publicReadCacheService.getPublicScholarshipDetail(id));
    }

    @PostMapping("/scholarships")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<ApiResponse<OpportunityDto>> createScholarship(
            @Valid @RequestBody CreateOpportunityRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        OpportunityDto created = scholarshipService.createOpportunity(request, userDetails);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(created));
    }

    @PatchMapping("/scholarships/{id}")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<ApiResponse<OpportunityDto>> updateScholarship(
            @PathVariable Long id,
            @Valid @RequestBody CreateOpportunityRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok(ApiResponse.of(scholarshipService.updateOpportunity(id, request, userDetails)));
    }

    @DeleteMapping("/scholarships/{id}")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<Void> deleteScholarship(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        scholarshipService.deleteOpportunity(id, userDetails);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/provider/scholarships")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<PageResponse<OpportunityDto>> getProviderScholarships(
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(PageResponse.fromList(
                scholarshipService.getMyOpportunities(userDetails),
                pageable
        ));
    }

    @GetMapping("/provider/analytics")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getProviderAnalytics(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(scholarshipService.getProviderAnalytics(userDetails)));
    }

    @GetMapping("/admin/scholarships")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<PageResponse<OpportunityDto>> getAdminScholarships(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            Pageable pageable
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(PageResponse.fromPage(
                scholarshipService.getAllOpportunitiesForAdmin(status, keyword, pageable)
        ));
    }

    @GetMapping("/admin/scholarships/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<OpportunityDetailDto>> getAdminScholarshipById(@PathVariable Long id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(ApiResponse.of(scholarshipService.getOpportunityDetailsForAdmin(id)));
    }

    @PatchMapping("/admin/scholarships/{id}/moderation")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<OpportunityDto>> moderateScholarship(
            @PathVariable Long id,
            @Valid @RequestBody ModerateRequestDto request
    ) {
        return ResponseEntity.ok(ApiResponse.of(scholarshipService.moderateOpportunity(id, request.getStatus())));
    }

    @DeleteMapping("/admin/scholarships/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> deleteScholarshipByAdmin(@PathVariable Long id) {
        scholarshipService.deleteOpportunityByAdmin(id);
        return ResponseEntity.noContent().build();
    }
}
