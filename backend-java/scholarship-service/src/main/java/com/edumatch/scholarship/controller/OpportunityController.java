package com.edumatch.scholarship.controller;

import com.edumatch.scholarship.dto.CreateOpportunityRequest;
import com.edumatch.scholarship.dto.OpportunityDto;
import com.edumatch.scholarship.service.ScholarshipService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import com.edumatch.scholarship.dto.ModerateRequestDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/opportunities") // Đường dẫn gốc cho các API Opportunity
@RequiredArgsConstructor
public class OpportunityController {

    private final ScholarshipService scholarshipService;

    /**
     * API để Provider (Employer) tạo một cơ hội/học bổng mới.
     * Endpoint: POST /api/opportunities
     */
    @PostMapping
    // Yêu cầu user phải có vai trò 'ROLE_EMPLOYER' (giống Auth-Service)
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<OpportunityDto> createOpportunity(
            // @Valid: Kích hoạt validation cho DTO (check @NotBlank, @Future...)
            @Valid @RequestBody CreateOpportunityRequest request,

            // @AuthenticationPrincipal: Lấy thông tin user (đã được giải mã từ JWT)
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        // 1. Gọi service layer để xử lý logic
        OpportunityDto createdOpportunity = scholarshipService.createOpportunity(request, userDetails);
        // 2. Trả về DTO với status 201 CREATED
        return new ResponseEntity<>(createdOpportunity, HttpStatus.CREATED);
    }
    //API để Provider lấy danh sách các cơ hội HỌ ĐÃ TẠO.
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<OpportunityDto>> getMyOpportunities(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<OpportunityDto> myOpps = scholarshipService.getMyOpportunities(userDetails);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(myOpps);
    }

    @GetMapping("/provider/analytics")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<Map<String, Object>> getProviderAnalytics(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(scholarshipService.getProviderAnalytics(userDetails));
    }

    //API để Provider cập nhật
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<OpportunityDto> updateOpportunity(
            @PathVariable Long id,
            @Valid @RequestBody CreateOpportunityRequest request, // Dùng lại DTO tạo
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        OpportunityDto updatedOpp = scholarshipService.updateOpportunity(id, request, userDetails);
        return ResponseEntity.ok(updatedOpp);
    }

    //API để Provider xóa
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_EMPLOYER')")
    public ResponseEntity<Void> deleteOpportunity(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        scholarshipService.deleteOpportunity(id, userDetails);
        return ResponseEntity.noContent().build(); // Trả về 204 No Content
    }

    /**
     * API (nội bộ) để Admin lấy TẤT CẢ cơ hội với filter
     * Endpoint: GET /api/opportunities/all
     */
    @GetMapping("/all")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')") // Chỉ ADMIN
    public ResponseEntity<Page<OpportunityDto>> getAllOpportunities(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword,
            Pageable pageable) {
        Page<OpportunityDto> page = scholarshipService.getAllOpportunitiesForAdmin(status, keyword, pageable);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(page);
    }

    /**
     * API (nội bộ) để Admin DUYỆT hoặc TỪ CHỐI
     * Endpoint: PUT /api/opportunities/{id}/moderate
     */
    @PutMapping("/{id}/moderate")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')") // Chỉ ADMIN
    public ResponseEntity<OpportunityDto> moderateOpportunity(
            @PathVariable Long id,
            @Valid @RequestBody ModerateRequestDto request) {

        OpportunityDto dto = scholarshipService.moderateOpportunity(id, request.getStatus());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(dto);
    }

    /**
     * API để Admin lấy chi tiết một cơ hội (cho phép xem cả PENDING)
     * Endpoint: GET /api/opportunities/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')") // Chỉ ADMIN
    public ResponseEntity<com.edumatch.scholarship.dto.OpportunityDetailDto> getOpportunityByIdForAdmin(
            @PathVariable Long id) {
        com.edumatch.scholarship.dto.OpportunityDetailDto dto = scholarshipService.getOpportunityDetailsForAdmin(id);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(dto);
    }

    /**
     * API để Admin xóa một cơ hội
     * Endpoint: DELETE /api/opportunities/{id}/admin
     */
    @DeleteMapping("/{id}/admin")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')") // Chỉ ADMIN
    public ResponseEntity<Void> deleteOpportunityByAdmin(@PathVariable Long id) {
        scholarshipService.deleteOpportunityByAdmin(id);
        return ResponseEntity.noContent().build(); // Trả về 204 No Content
    }

    /**
     * API để Admin lấy thống kê scholarships và applications
     * Endpoint: GET /api/opportunities/stats
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')") // Chỉ ADMIN
    public ResponseEntity<Map<String, Object>> getStats() {
        Map<String, Object> stats = scholarshipService.getStats();
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(stats);
    }

    /**
     * Endpoint: GET /api/opportunities/analytics
     */
    @GetMapping("/analytics")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Map<String, Object>> getAnalytics() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(scholarshipService.getAnalytics());
    }
}
