package com.edumatch.scholarship.service;

import com.edumatch.scholarship.dto.CreateOpportunityRequest;
import com.edumatch.scholarship.dto.OpportunityDto;
import com.edumatch.scholarship.dto.client.UserDetailDto;
import com.edumatch.scholarship.exception.ResourceNotFoundException;
import com.edumatch.scholarship.model.Application;
import com.edumatch.scholarship.model.Opportunity;
import com.edumatch.scholarship.repository.ApplicationDocumentRepository;
import com.edumatch.scholarship.repository.ApplicationRepository;
import com.edumatch.scholarship.repository.BookmarkRepository;
import com.edumatch.scholarship.repository.OpportunityRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class OpportunityCommandService {

    private final OpportunityRepository opportunityRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationDocumentRepository applicationDocumentRepository;
    private final BookmarkRepository bookmarkRepository;
    private final OpportunityCollectionService collectionService;
    private final ScholarshipUserLookupService userLookupService;
    private final ScholarshipCacheEvictionService cacheEvictionService;
    private final ScholarshipEventService scholarshipEventService;

    @Transactional
    public OpportunityDto createOpportunity(CreateOpportunityRequest request, UserDetails userDetails) {
        UserDetailDto user = getCurrentProvider(userDetails);

        Opportunity opportunity = Opportunity.builder()
                .title(request.getTitle())
                .fullDescription(request.getFullDescription())
                .creatorUserId(user.getId())
                .organizationId(user.getOrganizationId())
                .applicationDeadline(request.getApplicationDeadline())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .scholarshipAmount(request.getScholarshipAmount())
                .minGpa(request.getMinGpa())
                .studyMode(request.getStudyMode())
                .level(request.getLevel())
                .isPublic(request.getIsPublic())
                .contactEmail(request.getContactEmail())
                .website(request.getWebsite())
                .moderationStatus("PENDING")
                .tags(collectionService.resolveTags(request.getTags()))
                .requiredSkills(collectionService.resolveSkills(request.getRequiredSkills()))
                .viewsCnt(0)
                .build();

        Opportunity savedOpp = opportunityRepository.save(opportunity);
        scholarshipEventService.scholarshipCreated(savedOpp);
        cacheEvictionService.evictOpportunityCaches(savedOpp.getId(), savedOpp.getCreatorUserId());

        log.info("Created opportunity id={} and queued outbox event {}", savedOpp.getId(), ScholarshipEventService.SCHOLARSHIP_CREATED);
        return OpportunityDto.fromEntity(savedOpp);
    }

    @Transactional
    public OpportunityDto updateOpportunity(Long id, CreateOpportunityRequest request, UserDetails userDetails) {
        UserDetailDto user = getCurrentProvider(userDetails);
        Opportunity opp = opportunityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found with id: " + id));

        if (!opp.getCreatorUserId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to update this opportunity.");
        }

        applyRequest(opp, request);
        Opportunity updatedOpp = opportunityRepository.save(opp);

        scholarshipEventService.scholarshipUpdated(updatedOpp);
        cacheEvictionService.evictOpportunityCaches(updatedOpp.getId(), updatedOpp.getCreatorUserId());

        log.info("Updated opportunity id={} and queued outbox event {}", updatedOpp.getId(), ScholarshipEventService.SCHOLARSHIP_UPDATED);
        return OpportunityDto.fromEntity(updatedOpp);
    }

    @Transactional
    public void deleteOpportunity(Long id, UserDetails userDetails) {
        UserDetailDto user = getCurrentProvider(userDetails);
        Opportunity opp = opportunityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found with id: " + id));

        if (!opp.getCreatorUserId().equals(user.getId())) {
            throw new AccessDeniedException("You do not have permission to delete this opportunity.");
        }

        deleteOpportunityGraph(opp);
        scholarshipEventService.scholarshipDeleted(id);
        cacheEvictionService.evictOpportunityCaches(id, opp.getCreatorUserId());

        log.info("Deleted opportunity id={} and queued outbox event {}", id, ScholarshipEventService.SCHOLARSHIP_DELETED);
    }

    @Transactional
    public OpportunityDto moderateOpportunity(Long opportunityId, String newStatus) {
        Opportunity opp = opportunityRepository.findById(opportunityId)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found with id: " + opportunityId));

        opp.setModerationStatus(newStatus);
        Opportunity savedOpp = opportunityRepository.save(opp);

        if ("APPROVED".equals(newStatus)) {
            scholarshipEventService.scholarshipUpdated(savedOpp);
            scholarshipEventService.scholarshipApproved(savedOpp);
            log.info("Queued approval outbox events for opportunity id={}", savedOpp.getId());
        } else if ("REJECTED".equals(newStatus)) {
            scholarshipEventService.scholarshipUpdated(savedOpp);
            scholarshipEventService.scholarshipRejected(savedOpp);
            log.info("Queued rejection outbox events for opportunity id={}", savedOpp.getId());
        }

        cacheEvictionService.evictOpportunityCaches(savedOpp.getId(), savedOpp.getCreatorUserId());
        return OpportunityDto.fromEntity(savedOpp);
    }

    @Transactional
    public void deleteOpportunityByAdmin(Long id) {
        Opportunity opp = opportunityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Opportunity not found with id: " + id));

        deleteOpportunityGraph(opp);
        scholarshipEventService.scholarshipDeleted(id);
        cacheEvictionService.evictOpportunityCaches(id, opp.getCreatorUserId());

        log.info("Admin deleted opportunity id={} and queued outbox event {}", id, ScholarshipEventService.SCHOLARSHIP_DELETED);
    }

    @Transactional
    public void incrementViewCount(Long opportunityId) {
        int updatedRows = opportunityRepository.incrementViewsCnt(opportunityId);
        if (updatedRows == 0) {
            throw new ResourceNotFoundException("Opportunity not found with id: " + opportunityId);
        }
        log.debug("Incremented view count for opportunity {}", opportunityId);
    }

    private UserDetailDto getCurrentProvider(UserDetails userDetails) {
        String token = (String) SecurityContextHolder.getContext().getAuthentication().getCredentials();
        return userLookupService.getProviderDetails(userDetails.getUsername(), token);
    }

    private void applyRequest(Opportunity opp, CreateOpportunityRequest request) {
        opp.setTitle(request.getTitle());
        opp.setFullDescription(request.getFullDescription());
        opp.setApplicationDeadline(request.getApplicationDeadline());
        opp.setStartDate(request.getStartDate());
        opp.setEndDate(request.getEndDate());
        opp.setScholarshipAmount(request.getScholarshipAmount());
        opp.setStudyMode(request.getStudyMode());
        opp.setLevel(request.getLevel());
        opp.setIsPublic(request.getIsPublic());
        opp.setContactEmail(request.getContactEmail());
        opp.setWebsite(request.getWebsite());
        opp.setMinGpa(request.getMinGpa());
        opp.setTags(collectionService.resolveTags(request.getTags()));
        opp.setRequiredSkills(collectionService.resolveSkills(request.getRequiredSkills()));
    }

    private void deleteOpportunityGraph(Opportunity opp) {
        Long id = opp.getId();
        bookmarkRepository.deleteAllByOpportunityId(id);
        List<Application> applications = applicationRepository.findByOpportunityId(id);
        if (applications != null && !applications.isEmpty()) {
            List<Long> appIds = applications.stream()
                    .map(Application::getId)
                    .collect(Collectors.toList());
            applicationDocumentRepository.deleteAllByApplicationIdIn(appIds);
            applicationRepository.deleteAll(applications);
        }
        opp.getTags().clear();
        opp.getRequiredSkills().clear();
        opportunityRepository.delete(opp);
    }
}
