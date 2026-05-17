package com.edumatch.scholarship.service;

import com.edumatch.scholarship.dto.CreateOpportunityRequest;
import com.edumatch.scholarship.dto.OpportunityDetailDto;
import com.edumatch.scholarship.dto.OpportunityDto;
import com.edumatch.scholarship.dto.client.UserDetailDto;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ScholarshipService {

    private final ScholarshipUserLookupService userLookupService;
    private final OpportunityCommandService commandService;
    private final OpportunityQueryService queryService;
    private final ScholarshipAnalyticsService analyticsService;

    public UserDetailDto getUserDetailsFromAuthService(String username, String token) {
        return userLookupService.getUserDetails(username, token);
    }

    public OpportunityDto createOpportunity(CreateOpportunityRequest request, UserDetails userDetails) {
        return commandService.createOpportunity(request, userDetails);
    }

    public List<OpportunityDto> getMyOpportunities(UserDetails userDetails) {
        return queryService.getMyOpportunities(userDetails);
    }

    public OpportunityDto updateOpportunity(Long id, CreateOpportunityRequest request, UserDetails userDetails) {
        return commandService.updateOpportunity(id, request, userDetails);
    }

    public void deleteOpportunity(Long id, UserDetails userDetails) {
        commandService.deleteOpportunity(id, userDetails);
    }

    public Page<OpportunityDto> searchOpportunities(
            String keyword,
            BigDecimal gpa,
            String studyMode,
            String level,
            Boolean isPublic,
            LocalDate currentDate,
            Pageable pageable
    ) {
        return queryService.searchOpportunities(keyword, gpa, studyMode, level, isPublic, currentDate, pageable);
    }

    public OpportunityDetailDto getOpportunityDetails(Long opportunityId, UserDetails userDetails) {
        return queryService.getOpportunityDetails(opportunityId, userDetails);
    }

    public Page<OpportunityDto> getAllOpportunitiesForAdmin(String status, String keyword, Pageable pageable) {
        return queryService.getAllOpportunitiesForAdmin(status, keyword, pageable);
    }

    public OpportunityDto moderateOpportunity(Long opportunityId, String newStatus) {
        return commandService.moderateOpportunity(opportunityId, newStatus);
    }

    public OpportunityDetailDto getOpportunityDetailsForAdmin(Long opportunityId) {
        return queryService.getOpportunityDetailsForAdmin(opportunityId);
    }

    public void deleteOpportunityByAdmin(Long id) {
        commandService.deleteOpportunityByAdmin(id);
    }

    public Map<String, Object> getProviderAnalytics(UserDetails userDetails) {
        return analyticsService.getProviderAnalytics(userDetails);
    }

    public Map<String, Object> getStats() {
        return analyticsService.getStats();
    }

    public Map<String, Object> getAnalytics() {
        return analyticsService.getAnalytics();
    }

    public void incrementViewCount(Long opportunityId) {
        commandService.incrementViewCount(opportunityId);
    }
}
