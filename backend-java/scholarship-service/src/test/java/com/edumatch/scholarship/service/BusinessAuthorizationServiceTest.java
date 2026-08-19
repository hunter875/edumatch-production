package com.edumatch.scholarship.service;

import com.edumatch.scholarship.dto.CreateApplicationRequest;
import com.edumatch.scholarship.dto.CreateOpportunityRequest;
import com.edumatch.scholarship.dto.client.UserDetailDto;
import com.edumatch.scholarship.exception.ConflictException;
import com.edumatch.scholarship.model.Application;
import com.edumatch.scholarship.model.ApplicationStatus;
import com.edumatch.scholarship.model.ModerationStatus;
import com.edumatch.scholarship.model.Opportunity;
import com.edumatch.scholarship.repository.ApplicationDocumentRepository;
import com.edumatch.scholarship.repository.ApplicationRepository;
import com.edumatch.scholarship.repository.BookmarkRepository;
import com.edumatch.scholarship.repository.OpportunityRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BusinessAuthorizationServiceTest {

    @Mock
    private OpportunityRepository opportunityRepository;
    @Mock
    private ApplicationRepository applicationRepository;
    @Mock
    private ApplicationDocumentRepository applicationDocumentRepository;
    @Mock
    private BookmarkRepository bookmarkRepository;
    @Mock
    private OpportunityCollectionService collectionService;
    @Mock
    private ScholarshipUserLookupService userLookupService;
    @Mock
    private ScholarshipCacheEvictionService cacheEvictionService;
    @Mock
    private ScholarshipEventService scholarshipEventService;
    @Mock
    private ScholarshipService scholarshipService;
    @Mock
    private ApplicationEventService applicationEventService;

    private OpportunityCommandService opportunityCommandService;
    private ApplicationService applicationService;
    private User principal;

    @BeforeEach
    void setUp() {
        opportunityCommandService = new OpportunityCommandService(
                opportunityRepository,
                applicationRepository,
                applicationDocumentRepository,
                bookmarkRepository,
                collectionService,
                userLookupService,
                cacheEvictionService,
                scholarshipEventService
        );
        applicationService = new ApplicationService(
                applicationRepository,
                applicationDocumentRepository,
                scholarshipService,
                opportunityRepository,
                cacheEvictionService,
                applicationEventService
        );
        principal = new User("provider@example.com", "", List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, "jwt-token", List.of())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void providerCannotUpdateScholarshipOwnedByAnotherProvider() {
        when(userLookupService.getProviderDetails("provider@example.com", "jwt-token"))
                .thenReturn(user(22L, 5L));
        when(opportunityRepository.findById(7L)).thenReturn(Optional.of(opportunity(7L, 11L)));

        assertThatThrownBy(() -> opportunityCommandService.updateOpportunity(7L, opportunityRequest(), principal))
                .isInstanceOf(AccessDeniedException.class);

        verify(opportunityRepository, never()).save(any());
        verifyNoInteractions(scholarshipEventService, cacheEvictionService);
    }

    @Test
    void providerCannotDeleteScholarshipOwnedByAnotherProvider() {
        when(userLookupService.getProviderDetails("provider@example.com", "jwt-token"))
                .thenReturn(user(22L, 5L));
        when(opportunityRepository.findById(7L)).thenReturn(Optional.of(opportunity(7L, 11L)));

        assertThatThrownBy(() -> opportunityCommandService.deleteOpportunity(7L, principal))
                .isInstanceOf(AccessDeniedException.class);

        verify(opportunityRepository, never()).delete(any(Opportunity.class));
        verifyNoInteractions(scholarshipEventService, cacheEvictionService);
    }

    @Test
    void updateScholarshipEvictsPublicAndAnalyticsCachesForOwner() {
        Opportunity opportunity = opportunity(7L, 22L);
        when(userLookupService.getProviderDetails("provider@example.com", "jwt-token"))
                .thenReturn(user(22L, 5L));
        when(opportunityRepository.findById(7L)).thenReturn(Optional.of(opportunity));
        when(opportunityRepository.save(opportunity)).thenReturn(opportunity);
        when(collectionService.resolveTags(any())).thenReturn(Set.of());
        when(collectionService.resolveSkills(any())).thenReturn(Set.of());

        opportunityCommandService.updateOpportunity(7L, opportunityRequest(), principal);

        verify(scholarshipEventService).scholarshipUpdated(opportunity);
        verify(cacheEvictionService).evictOpportunityCaches(7L, 22L);
    }

    @Test
    void deleteScholarshipEvictsCachesForOwner() {
        Opportunity opportunity = opportunity(7L, 22L);
        when(userLookupService.getProviderDetails("provider@example.com", "jwt-token"))
                .thenReturn(user(22L, 5L));
        when(opportunityRepository.findById(7L)).thenReturn(Optional.of(opportunity));
        when(applicationRepository.findByOpportunityId(7L)).thenReturn(List.of());

        opportunityCommandService.deleteOpportunity(7L, principal);

        verify(bookmarkRepository).deleteAllByOpportunityId(7L);
        verify(opportunityRepository).delete(opportunity);
        verify(scholarshipEventService).scholarshipDeleted(7L);
        verify(cacheEvictionService).evictOpportunityCaches(7L, 22L);
    }

    @Test
    void duplicateApplicationIsRejectedBeforeSave() {
        User student = new User("student@example.com", "", List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(student, "student-jwt", List.of())
        );
        CreateApplicationRequest request = applicationRequest(7L);
        when(scholarshipService.getUserDetailsFromAuthService("student@example.com", "student-jwt"))
                .thenReturn(user(99L, null));
        when(opportunityRepository.findById(7L)).thenReturn(Optional.of(approvedPublicOpportunity(7L, 22L)));
        when(applicationRepository.findFirstByApplicantUserIdAndOpportunityId(99L, 7L))
                .thenReturn(Optional.of(new Application()));

        assertThatThrownBy(() -> applicationService.createApplication(request, student))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("already applied");

        verify(applicationRepository, never()).save(any());
        verifyNoInteractions(cacheEvictionService, applicationEventService);
    }

    @Test
    void providerCannotUpdateApplicationStatusForAnotherProvidersScholarship() {
        Application application = new Application();
        application.setId(44L);
        application.setOpportunityId(7L);
        application.setStatus(ApplicationStatus.PENDING);

        when(applicationRepository.findById(44L)).thenReturn(Optional.of(application));
        when(scholarshipService.getUserDetailsFromAuthService("provider@example.com", "jwt-token"))
                .thenReturn(user(22L, 5L));
        when(opportunityRepository.findById(7L)).thenReturn(Optional.of(opportunity(7L, 11L)));

        assertThatThrownBy(() -> applicationService.updateApplicationStatus(44L, ApplicationStatus.ACCEPTED, principal))
                .isInstanceOf(AccessDeniedException.class);

        verify(applicationRepository, never()).save(any());
        verifyNoInteractions(applicationEventService, cacheEvictionService);
    }

    @Test
    void createApplicationEvictsProviderAnalyticsCache() {
        User student = new User("student@example.com", "", List.of());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(student, "student-jwt", List.of())
        );
        CreateApplicationRequest request = applicationRequest(7L);
        Opportunity opportunity = approvedPublicOpportunity(7L, 22L);
        when(scholarshipService.getUserDetailsFromAuthService("student@example.com", "student-jwt"))
                .thenReturn(user(99L, null));
        when(opportunityRepository.findById(7L)).thenReturn(Optional.of(opportunity));
        when(applicationRepository.findFirstByApplicantUserIdAndOpportunityId(99L, 7L))
                .thenReturn(Optional.empty());
        when(applicationRepository.save(any(Application.class))).thenAnswer(invocation -> {
            Application app = invocation.getArgument(0);
            app.setId(101L);
            return app;
        });

        applicationService.createApplication(request, student);

        verify(cacheEvictionService).evictAnalyticsCaches(22L);
    }

    private static UserDetailDto user(Long id, Long organizationId) {
        UserDetailDto user = new UserDetailDto();
        user.setId(id);
        user.setOrganizationId(organizationId);
        user.setUsername("user-" + id);
        user.setEmail("user-" + id + "@example.com");
        return user;
    }

    private static Opportunity opportunity(Long id, Long creatorUserId) {
        Opportunity opportunity = Opportunity.builder()
                .id(id)
                .creatorUserId(creatorUserId)
                .organizationId(5L)
                .title("AI Scholarship")
                .fullDescription("Funding")
                .tags(new HashSet<>())
                .requiredSkills(new HashSet<>())
                .build();
        opportunity.setApplicationDeadline(LocalDate.now().plusDays(30));
        opportunity.setStartDate(LocalDate.now().plusDays(45));
        opportunity.setEndDate(LocalDate.now().plusDays(90));
        return opportunity;
    }

    private static Opportunity approvedPublicOpportunity(Long id, Long creatorUserId) {
        Opportunity opportunity = opportunity(id, creatorUserId);
        opportunity.setIsPublic(true);
        opportunity.setModerationStatus(ModerationStatus.APPROVED);
        return opportunity;
    }

    private static CreateOpportunityRequest opportunityRequest() {
        CreateOpportunityRequest request = new CreateOpportunityRequest();
        request.setTitle("Updated scholarship");
        request.setFullDescription("Updated description");
        request.setApplicationDeadline(LocalDate.now().plusDays(30));
        request.setStartDate(LocalDate.now().plusDays(45));
        request.setEndDate(LocalDate.now().plusDays(90));
        request.setScholarshipAmount(BigDecimal.valueOf(1000));
        request.setMinGpa(BigDecimal.valueOf(3.0));
        request.setStudyMode("FULL_TIME");
        request.setLevel("UNDERGRAD");
        request.setIsPublic(true);
        request.setContactEmail("provider@example.com");
        request.setWebsite("https://example.com");
        return request;
    }

    private static CreateApplicationRequest applicationRequest(Long opportunityId) {
        CreateApplicationRequest request = new CreateApplicationRequest();
        request.setOpportunityId(opportunityId);
        request.setCoverLetter("Please consider me");
        return request;
    }
}
