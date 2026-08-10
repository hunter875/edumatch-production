package com.edumatch.scholarship.controller;

import com.edumatch.scholarship.dto.OpportunityDetailDto;
import com.edumatch.scholarship.dto.OpportunityDto;
import com.edumatch.scholarship.service.ScholarshipService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;
import org.springframework.web.bind.annotation.RequestParam;
import java.time.LocalDate; // Cần thêm import này
import java.util.Optional; // Cần thêm import này


@RestController
@RequestMapping("/api/scholarships") // Đường dẫn gốc
@RequiredArgsConstructor
public class ScholarshipPublicController {

    private final ScholarshipService scholarshipService;

    /**
     * API để Public/Applicant tìm kiếm, lọc cơ hội
     * Endpoint: GET /api/scholarships
     */
    @GetMapping
    public ResponseEntity<Page<OpportunityDto>> searchOpportunities(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) BigDecimal gpa,

            // --- THAM SỐ LỌC MỚI ĐÃ ĐƯỢC THỐNG NHẤT ---
            @RequestParam(required = false) String studyMode,
            @RequestParam(required = false) String level,
            // isPublic is always forced to TRUE by the specification — client cannot control this
            @RequestParam(required = false) LocalDate currentDate,
            // --- ------------------------------------ ---

            Pageable pageable
    ) {
        // Lấy ngày hiện tại nếu không được cung cấp (cho check deadline trong Specification)
        LocalDate date = Optional.ofNullable(currentDate).orElse(LocalDate.now());

        // Public search always forces isPublic=true (enforced in Specification)
        Page<OpportunityDto> results = scholarshipService.searchOpportunities(
                q, gpa, studyMode, level, true, date, pageable
        );
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(30, java.util.concurrent.TimeUnit.SECONDS).cachePublic())
                .body(results);
    }

    /**
     * API để Public/Applicant xem chi tiết 1 cơ hội
     * Endpoint: GET /api/scholarships/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<OpportunityDetailDto> getOpportunityById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        OpportunityDetailDto dto = scholarshipService.getOpportunityDetails(id, userDetails);
        if (userDetails == null) {
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.maxAge(30, java.util.concurrent.TimeUnit.SECONDS).cachePublic())
                    .body(dto);
        }
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(dto);
    }

    /**
     * API để tăng view count khi user xem scholarship
     * Endpoint: POST /api/scholarships/{id}/view
     */
    @org.springframework.web.bind.annotation.PostMapping("/{id}/view")
    public ResponseEntity<Void> incrementViewCount(@PathVariable Long id) {
        scholarshipService.incrementViewCount(id);
        return ResponseEntity.ok().build();
    }
}
