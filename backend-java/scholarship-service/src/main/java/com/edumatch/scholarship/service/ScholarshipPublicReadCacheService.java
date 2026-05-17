package com.edumatch.scholarship.service;

import com.edumatch.scholarship.config.CacheConfig;
import com.edumatch.scholarship.dto.OpportunityDetailDto;
import com.edumatch.scholarship.dto.OpportunityDto;
import com.edumatch.scholarship.dto.api.ApiResponse;
import com.edumatch.scholarship.dto.api.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.util.DigestUtils;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ScholarshipPublicReadCacheService {

    private final ScholarshipService scholarshipService;

    @Cacheable(
            cacheNames = CacheConfig.PUBLIC_LIST_CACHE,
            key = "#root.target.publicListKey(#q, #gpa, #studyMode, #level, #currentDate, #pageable)",
            unless = "#result == null"
    )
    public PageResponse<OpportunityDto> searchPublicScholarships(
            String q,
            BigDecimal gpa,
            String studyMode,
            String level,
            LocalDate currentDate,
            Pageable pageable
    ) {
        return PageResponse.fromPage(
                scholarshipService.searchOpportunities(q, gpa, studyMode, level, true, currentDate, pageable)
        );
    }

    @Cacheable(
            cacheNames = CacheConfig.PUBLIC_DETAIL_CACHE,
            key = "#id",
            unless = "#result == null || #result.data == null || #result.data.opportunity == null || !T(java.lang.Boolean).TRUE.equals(#result.data.opportunity.getIsPublic()) || !'APPROVED'.equals(#result.data.opportunity.getModerationStatus())"
    )
    public ApiResponse<OpportunityDetailDto> getPublicScholarshipDetail(Long id) {
        return ApiResponse.of(scholarshipService.getOpportunityDetails(id, null));
    }

    public String publicListKey(
            String q,
            BigDecimal gpa,
            String studyMode,
            String level,
            LocalDate currentDate,
            Pageable pageable
    ) {
        String rawKey = String.join("|",
                normalize(q),
                normalize(gpa),
                normalize(studyMode),
                normalize(level),
                normalize(currentDate),
                String.valueOf(pageable == null ? 0 : pageable.getPageNumber()),
                String.valueOf(pageable == null ? 12 : pageable.getPageSize()),
                normalize(pageable == null ? null : pageable.getSort().toString())
        );
        return DigestUtils.md5DigestAsHex(rawKey.getBytes(StandardCharsets.UTF_8));
    }

    private String normalize(Object value) {
        return value == null ? "" : value.toString().trim().toLowerCase();
    }
}
