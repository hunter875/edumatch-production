package com.edumatch.scholarship.service;

import com.edumatch.scholarship.dto.OpportunityDetailDto;
import com.edumatch.scholarship.dto.OpportunityDto;
import com.edumatch.scholarship.dto.client.UserDetailDto;
import com.edumatch.scholarship.exception.ResourceNotFoundException;
import com.edumatch.scholarship.model.ModerationStatus;
import com.edumatch.scholarship.model.Opportunity;
import com.edumatch.scholarship.repository.ApplicationRepository;
import com.edumatch.scholarship.repository.OpportunityRepository;
import com.edumatch.scholarship.repository.specification.OpportunitySpecification;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpportunityQueryService {

    private final OpportunityRepository opportunityRepository;
    private final ApplicationRepository applicationRepository;
    private final OpportunityCollectionService collectionService;
    private final ScholarshipUserLookupService userLookupService;
    private final ScholarshipMatchingClient matchingClient;

    @Transactional(readOnly = true)
    public List<OpportunityDto> getMyOpportunities(UserDetails userDetails) {
        UserDetailDto user = currentProvider(userDetails);

        List<Opportunity> opps = opportunityRepository.findByCreatorUserId(user.getId());
        collectionService.loadCollections(opps);
        Map<Long, Long> applicationCounts = countApplicationsByOpportunityIds(
                opps.stream().map(Opportunity::getId).collect(Collectors.toList())
        );

        return opps.stream()
                .map(OpportunityDto::fromEntity)
                .peek(dto -> dto.setApplicationCount(applicationCounts.getOrDefault(dto.getId(), 0L)))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<OpportunityDto> searchOpportunities(
            String keyword,
            BigDecimal gpa,
            String studyMode,
            String level,
            Boolean isPublic,
            LocalDate currentDate,
            Pageable pageable
    ) {
        String normalizedKeyword = collectionService.normalizeSearchKeyword(keyword);
        if (normalizedKeyword != null) {
            Page<Opportunity> page = opportunityRepository.searchPublicFullText(
                    normalizedKeyword,
                    gpa,
                    collectionService.normalizeSearchKeyword(studyMode),
                    collectionService.normalizeSearchKeyword(level),
                    isPublic,
                    currentDate == null ? LocalDate.now() : currentDate,
                    pageable
            );
            collectionService.loadCollections(page.getContent());
            return page.map(OpportunityDto::fromEntity);
        }

        Specification<Opportunity> spec = OpportunitySpecification.filterBy(
                null, gpa, studyMode, level, isPublic, currentDate
        );
        Page<Opportunity> page = opportunityRepository.findAll(spec, pageable);
        collectionService.loadCollections(page.getContent());
        return page.map(OpportunityDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public OpportunityDetailDto getOpportunityDetails(Long opportunityId, UserDetails userDetails) {
        Opportunity opp = collectionService.getWithCollections(opportunityId);

        // Public access (null user): must be public AND approved — return 404 otherwise
        if (userDetails == null) {
            if (!Boolean.TRUE.equals(opp.getIsPublic()) || opp.getModerationStatus() != ModerationStatus.APPROVED) {
                throw new ResourceNotFoundException("Scholarship not found");
            }
        } else {
            boolean isAdmin = userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (!isAdmin && opp.getModerationStatus() != ModerationStatus.APPROVED) {
                throw new ResourceNotFoundException("Scholarship not found");
            }
        }

        OpportunityDetailDto detailDto = new OpportunityDetailDto(OpportunityDto.fromEntity(opp));

        // Only calculate personal matching score for USER role
        boolean isUser = userDetails != null
                && userDetails.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_USER"));

        if (isUser) {
            try {
                Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
                String token = (String) authentication.getCredentials();
                UserDetailDto user = userLookupService.getUserDetails(userDetails.getUsername(), token);

                ScholarshipMatchingClient.ScoreResult result =
                        matchingClient.getMatchingScore(user.getId(), opportunityId, token);

                detailDto.setMatchScore(result.overallScore());
                detailDto.setMatchScoreStatus(result.status().name());
            } catch (Exception e) {
                log.warn("Cannot load match score for user {}: {}", userDetails.getUsername(), e.getMessage());
                detailDto.setMatchScore(null);
                detailDto.setMatchScoreStatus(ScholarshipMatchingClient.ScoreStatus.UNAVAILABLE.name());
            }
        } else {
            // EMPLOYER/ADMIN: no personal matching score
            detailDto.setMatchScore(null);
            detailDto.setMatchScoreStatus(ScholarshipMatchingClient.ScoreStatus.NOT_APPLICABLE.name());
        }

        return detailDto;
    }

    @Transactional(readOnly = true)
    public Page<OpportunityDto> getAllOpportunitiesForAdmin(String status, String keyword, Pageable pageable) {
        String normalizedKeyword = collectionService.normalizeSearchKeyword(keyword);
        Specification<Opportunity> spec = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null && !status.isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("moderationStatus"), status));
            }
            if (normalizedKeyword != null) {
                predicates.add(criteriaBuilder.like(root.get("title"), normalizedKeyword + "%"));
            }
            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };

        Page<Opportunity> page = opportunityRepository.findAll(spec, pageable);
        collectionService.loadCollections(page.getContent());
        return page.map(OpportunityDto::fromEntity);
    }

    @Transactional(readOnly = true)
    public OpportunityDetailDto getOpportunityDetailsForAdmin(Long opportunityId) {
        Opportunity opp = collectionService.getWithCollections(opportunityId);
        OpportunityDetailDto detailDto = new OpportunityDetailDto(OpportunityDto.fromEntity(opp));
        detailDto.setMatchScore(null);
        return detailDto;
    }

    private UserDetailDto currentProvider(UserDetails userDetails) {
        String token = (String) SecurityContextHolder.getContext().getAuthentication().getCredentials();
        return userLookupService.getProviderDetails(userDetails.getUsername(), token);
    }

    private Map<Long, Long> countApplicationsByOpportunityIds(List<Long> opportunityIds) {
        if (opportunityIds == null || opportunityIds.isEmpty()) {
            return Map.of();
        }

        return applicationRepository.countApplicationsByOpportunityIds(opportunityIds).stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        row -> ((Number) row[1]).longValue()
                ));
    }
}
