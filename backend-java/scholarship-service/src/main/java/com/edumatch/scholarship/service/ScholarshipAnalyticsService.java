package com.edumatch.scholarship.service;

import com.edumatch.scholarship.dto.client.UserDetailDto;
import com.edumatch.scholarship.model.Opportunity;
import com.edumatch.scholarship.repository.ApplicationRepository;
import com.edumatch.scholarship.repository.OpportunityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ScholarshipAnalyticsService {

    private final OpportunityRepository opportunityRepository;
    private final ApplicationRepository applicationRepository;
    private final ScholarshipUserLookupService userLookupService;

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "scholarshipProviderAnalytics", key = "#userDetails.username", unless = "#result == null")
    public Map<String, Object> getProviderAnalytics(UserDetails userDetails) {
        String token = (String) SecurityContextHolder.getContext().getAuthentication().getCredentials();
        UserDetailDto user = userLookupService.getProviderDetails(userDetails.getUsername(), token);
        Long creatorUserId = user.getId();

        List<Opportunity> opportunities = opportunityRepository.findByCreatorUserId(creatorUserId);
        List<Long> opportunityIds = opportunities.stream()
                .map(Opportunity::getId)
                .collect(Collectors.toList());
        Map<Long, Long> applicationCounts = getApplicationCountsByOpportunityIds(opportunityIds);
        Map<Long, Map<String, Long>> statusCountsByOpportunity = getApplicationStatusCountsByOpportunityIds(opportunityIds);
        Map<String, Long> statusCounts = getApplicationStatusCountsByCreator(creatorUserId);

        long totalScholarships = opportunities.size();
        long activeScholarships = opportunityRepository.countByCreatorUserIdAndModerationStatus(creatorUserId, "APPROVED");
        long pendingScholarships = opportunityRepository.countByCreatorUserIdAndModerationStatus(creatorUserId, "PENDING");
        long totalApplications = applicationCounts.values().stream().mapToLong(Long::longValue).sum();
        long acceptedApplications = sumStatuses(statusCounts, "ACCEPTED", "APPROVED");
        long rejectedApplications = sumStatuses(statusCounts, "REJECTED");
        long pendingApplications = sumStatuses(statusCounts, "PENDING", "SUBMITTED", "UNDER_REVIEW", "VIEWED");
        BigDecimal totalFunding = opportunityRepository.sumScholarshipAmountByCreatorUserId(creatorUserId);
        long applicationsThisWeek = applicationRepository.countApplicationsByCreatorUserIdSince(
                creatorUserId,
                LocalDateTime.now().minusDays(7)
        );

        Map<Long, Opportunity> opportunitiesById = opportunities.stream()
                .collect(Collectors.toMap(Opportunity::getId, opportunity -> opportunity));

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalScholarships", totalScholarships);
        stats.put("activeScholarships", activeScholarships);
        stats.put("pendingScholarships", pendingScholarships);
        stats.put("totalApplications", totalApplications);
        stats.put("acceptedApplications", acceptedApplications);
        stats.put("rejectedApplications", rejectedApplications);
        stats.put("pendingApplications", pendingApplications);
        stats.put("applicationsThisWeek", applicationsThisWeek);
        stats.put("totalFunding", totalFunding == null ? BigDecimal.ZERO : totalFunding);
        stats.put("averageApplicationsPerScholarship",
                totalScholarships == 0 ? 0.0 : (double) totalApplications / totalScholarships);
        stats.put("acceptanceRate",
                totalApplications == 0 ? 0.0 : ((double) acceptedApplications / totalApplications) * 100.0);

        List<Map<String, Object>> recentApplications = applicationRepository
                .findRecentApplicationsByCreatorUserId(creatorUserId, PageRequest.of(0, 5))
                .stream()
                .map(application -> {
                    Opportunity opportunity = opportunitiesById.get(application.getOpportunityId());
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", application.getId());
                    item.put("studentName", application.getApplicantUserName());
                    item.put("studentEmail", application.getApplicantEmail());
                    item.put("scholarshipId", application.getOpportunityId());
                    item.put("scholarshipTitle", opportunity == null ? "Unknown Scholarship" : opportunity.getTitle());
                    item.put("appliedDate", application.getSubmittedAt());
                    item.put("status", application.getStatus());
                    item.put("gpa", application.getGpa());
                    return item;
                })
                .collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        List<Map<String, Object>> upcomingDeadlines = opportunityRepository
                .findTop5ByCreatorUserIdAndApplicationDeadlineGreaterThanEqualOrderByApplicationDeadlineAsc(creatorUserId, today)
                .stream()
                .map(opportunity -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", opportunity.getId());
                    item.put("title", opportunity.getTitle());
                    item.put("deadline", opportunity.getApplicationDeadline());
                    item.put("applicationsCount", applicationCounts.getOrDefault(opportunity.getId(), 0L));
                    item.put("daysLeft", ChronoUnit.DAYS.between(today, opportunity.getApplicationDeadline()));
                    return item;
                })
                .collect(Collectors.toList());

        List<Map<String, Object>> scholarshipPerformance = opportunities.stream()
                .sorted(Comparator.comparing(
                        opportunity -> applicationCounts.getOrDefault(opportunity.getId(), 0L),
                        Comparator.reverseOrder()
                ))
                .map(opportunity -> {
                    long applications = applicationCounts.getOrDefault(opportunity.getId(), 0L);
                    Map<String, Long> opportunityStatusCounts = statusCountsByOpportunity.getOrDefault(opportunity.getId(), Map.of());
                    long accepted = sumStatuses(opportunityStatusCounts, "ACCEPTED", "APPROVED");
                    long rejected = sumStatuses(opportunityStatusCounts, "REJECTED");
                    long pending = sumStatuses(opportunityStatusCounts, "PENDING", "SUBMITTED", "UNDER_REVIEW", "VIEWED");

                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", opportunity.getId());
                    item.put("title", opportunity.getTitle());
                    item.put("applications", applications);
                    item.put("accepted", accepted);
                    item.put("rejected", rejected);
                    item.put("pending", pending);
                    item.put("views", opportunity.getViewsCnt() == null ? 0 : opportunity.getViewsCnt());
                    item.put("acceptanceRate", applications == 0 ? 0.0 : ((double) accepted / applications) * 100.0);
                    return item;
                })
                .collect(Collectors.toList());

        YearMonth firstMonth = YearMonth.now().minusMonths(5);
        Map<String, Map<String, Long>> monthlyStatusCounts = new HashMap<>();
        for (Object[] row : applicationRepository.countMonthlyApplicationStatusesByCreatorUserId(
                creatorUserId,
                firstMonth.atDay(1).atStartOfDay()
        )) {
            int year = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            String status = String.valueOf(row[2]);
            long count = ((Number) row[3]).longValue();
            String key = YearMonth.of(year, month).toString();
            monthlyStatusCounts.computeIfAbsent(key, ignored -> new HashMap<>()).put(status, count);
        }

        List<Map<String, Object>> monthlyStats = new ArrayList<>();
        for (int i = 0; i < 6; i++) {
            YearMonth month = firstMonth.plusMonths(i);
            Map<String, Long> counts = monthlyStatusCounts.getOrDefault(month.toString(), Map.of());
            long accepted = sumStatuses(counts, "ACCEPTED", "APPROVED");
            long rejected = sumStatuses(counts, "REJECTED");
            long pending = sumStatuses(counts, "PENDING", "SUBMITTED", "UNDER_REVIEW", "VIEWED");
            long total = counts.values().stream().mapToLong(Long::longValue).sum();

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("month", month.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH));
            item.put("applications", total);
            item.put("accepted", accepted);
            item.put("rejected", rejected);
            item.put("pending", pending);
            monthlyStats.add(item);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("stats", stats);
        response.put("recentApplications", recentApplications);
        response.put("upcomingDeadlines", upcomingDeadlines);
        response.put("scholarshipPerformance", scholarshipPerformance);
        response.put("monthlyStats", monthlyStats);
        response.put("topUniversities", List.of());
        response.put("topMajors", List.of());
        return response;
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "scholarshipAdminStats", key = "'all'", unless = "#result == null")
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        long totalScholarships = opportunityRepository.count();
        long activeScholarships = opportunityRepository.countByModerationStatus("APPROVED");
        long pendingScholarships = opportunityRepository.countByModerationStatus("PENDING");
        long totalApplications = applicationRepository.count();
        long pendingApplications = applicationRepository.countByStatusIn(List.of("PENDING", "SUBMITTED", "UNDER_REVIEW"));
        long acceptedApplications = applicationRepository.countByStatus("ACCEPTED");
        long rejectedApplications = applicationRepository.countByStatus("REJECTED");

        stats.put("totalScholarships", totalScholarships);
        stats.put("activeScholarships", activeScholarships);
        stats.put("pendingScholarships", pendingScholarships);
        stats.put("totalApplications", totalApplications);
        stats.put("pendingApplications", pendingApplications);
        stats.put("acceptedApplications", acceptedApplications);
        stats.put("rejectedApplications", rejectedApplications);
        return stats;
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "scholarshipAdminAnalytics", key = "'all'", unless = "#result == null")
    public Map<String, Object> getAnalytics() {
        Map<String, Object> analytics = new HashMap<>();
        Map<String, Object> stats = getStats();
        analytics.put("stats", stats);

        long totalScholarships = ((Number) stats.get("totalScholarships")).longValue();
        long totalApplications = ((Number) stats.get("totalApplications")).longValue();
        long acceptedApplications = ((Number) stats.get("acceptedApplications")).longValue();
        long rejectedApplications = ((Number) stats.get("rejectedApplications")).longValue();
        long pendingApplications = ((Number) stats.get("pendingApplications")).longValue();
        long expiredScholarships = opportunityRepository.countByApplicationDeadlineBefore(LocalDate.now());

        Map<String, Object> scholarshipBreakdown = new LinkedHashMap<>();
        scholarshipBreakdown.put("active", stats.get("activeScholarships"));
        scholarshipBreakdown.put("pending", stats.get("pendingScholarships"));
        scholarshipBreakdown.put("expired", expiredScholarships);
        analytics.put("scholarshipBreakdown", scholarshipBreakdown);

        Map<String, Object> applicationStats = new LinkedHashMap<>();
        applicationStats.put("pending", pendingApplications);
        applicationStats.put("accepted", acceptedApplications);
        applicationStats.put("rejected", rejectedApplications);
        applicationStats.put("averageApplicationsPerScholarship",
                totalScholarships == 0 ? 0.0 : (double) totalApplications / totalScholarships);
        applicationStats.put("acceptanceRate",
                totalApplications == 0 ? 0.0 : ((double) acceptedApplications / totalApplications) * 100.0);
        analytics.put("applicationStats", applicationStats);

        List<Object[]> topRows = applicationRepository.countApplicationsByOpportunity(PageRequest.of(0, 5));
        List<Long> opportunityIds = topRows.stream()
                .map(row -> ((Number) row[0]).longValue())
                .collect(Collectors.toList());
        Map<Long, Opportunity> opportunitiesById = opportunityRepository.findAllById(opportunityIds).stream()
                .collect(Collectors.toMap(Opportunity::getId, opportunity -> opportunity));

        List<Map<String, Object>> topScholarships = new ArrayList<>();
        for (Object[] row : topRows) {
            Long opportunityId = ((Number) row[0]).longValue();
            long applicationCount = ((Number) row[1]).longValue();
            Opportunity opportunity = opportunitiesById.get(opportunityId);
            if (opportunity == null) {
                continue;
            }

            int views = opportunity.getViewsCnt() == null ? 0 : opportunity.getViewsCnt();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", opportunity.getId());
            item.put("title", opportunity.getTitle());
            item.put("applications", applicationCount);
            item.put("views", views);
            item.put("conversionRate", views == 0 ? 0.0 : ((double) applicationCount / views) * 100.0);
            topScholarships.add(item);
        }
        analytics.put("topScholarships", topScholarships);

        return analytics;
    }

    private Map<Long, Long> getApplicationCountsByOpportunityIds(List<Long> opportunityIds) {
        if (opportunityIds == null || opportunityIds.isEmpty()) {
            return Map.of();
        }

        return applicationRepository.countApplicationsByOpportunityIds(opportunityIds).stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        row -> ((Number) row[1]).longValue()
                ));
    }

    private Map<Long, Map<String, Long>> getApplicationStatusCountsByOpportunityIds(List<Long> opportunityIds) {
        if (opportunityIds == null || opportunityIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, Map<String, Long>> result = new HashMap<>();
        for (Object[] row : applicationRepository.countApplicationStatusesByOpportunityIds(opportunityIds)) {
            Long opportunityId = ((Number) row[0]).longValue();
            String status = String.valueOf(row[1]);
            Long count = ((Number) row[2]).longValue();
            result.computeIfAbsent(opportunityId, key -> new HashMap<>()).put(status, count);
        }
        return result;
    }

    private Map<String, Long> getApplicationStatusCountsByCreator(Long creatorUserId) {
        Map<String, Long> result = new HashMap<>();
        for (Object[] row : applicationRepository.countApplicationStatusesByCreatorUserId(creatorUserId)) {
            result.put(String.valueOf(row[0]), ((Number) row[1]).longValue());
        }
        return result;
    }

    private long sumStatuses(Map<String, Long> statusCounts, String... statuses) {
        long total = 0;
        for (String status : statuses) {
            total += statusCounts.getOrDefault(status, 0L);
        }
        return total;
    }
}
