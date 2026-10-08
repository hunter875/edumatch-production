package com.edumatch.scholarship.service;

import com.edumatch.scholarship.model.Opportunity;
import com.edumatch.scholarship.repository.ApplicationRepository;
import com.edumatch.scholarship.repository.OpportunityRepository;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The admin scholarship queue must treat "ALL" as "no filter".
 *
 * A client that sends status=ALL is asking for every record, the way a cleared
 * status selector is normally expressed. Comparing it literally against
 * moderationStatus matched nothing, so the admin table rendered empty even
 * though the unfiltered list held every row. The unfiltered form (absent or
 * blank) and the explicit form must therefore build the same query.
 */
@ExtendWith(MockitoExtension.class)
class OpportunityQueryServiceAdminFilterTest {

    @Mock private OpportunityRepository opportunityRepository;
    @Mock private ApplicationRepository applicationRepository;
    @Mock private OpportunityCollectionService collectionService;
    @Mock private ScholarshipUserLookupService userLookupService;
    @Mock private ScholarshipMatchingClient matchingClient;

    @Mock private Root<Opportunity> root;
    @Mock private CriteriaQuery<?> query;
    @Mock private CriteriaBuilder criteriaBuilder;
    @Mock private Path<Object> statusPath;
    @Mock private Predicate statusPredicate;
    @Mock private Predicate combinedPredicate;

    private OpportunityQueryService service;

    @BeforeEach
    void setUp() {
        service = new OpportunityQueryService(
                opportunityRepository, applicationRepository, collectionService,
                userLookupService, matchingClient);
        lenient().when(collectionService.normalizeSearchKeyword(any())).thenReturn(null);
        lenient().when(root.get("moderationStatus")).thenReturn(statusPath);
        lenient().when(criteriaBuilder.equal(statusPath, "APPROVED")).thenReturn(statusPredicate);
        lenient().when(criteriaBuilder.and(any(Predicate[].class))).thenReturn(combinedPredicate);
    }

    private Specification<Opportunity> specFor(String status) {
        Pageable pageable = PageRequest.of(0, 20);
        when(opportunityRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of()));
        service.getAllOpportunitiesForAdmin(status, null, pageable);
        org.mockito.ArgumentCaptor<Specification<Opportunity>> captor =
                org.mockito.ArgumentCaptor.forClass(Specification.class);
        verify(opportunityRepository).findAll(captor.capture(), eq(pageable));
        return captor.getValue();
    }

    @Test
    void allStatusAddsNoStatusPredicate() {
        Specification<Opportunity> spec = specFor("ALL");

        spec.toPredicate(root, query, criteriaBuilder);

        verify(criteriaBuilder, never()).equal(any(), any());
    }

    @Test
    void realStatusStillFilters() {
        Specification<Opportunity> spec = specFor("APPROVED");

        spec.toPredicate(root, query, criteriaBuilder);

        verify(criteriaBuilder).equal(statusPath, "APPROVED");
    }

    @Test
    void blankAndNullAddNoStatusPredicate() {
        for (String candidate : new String[]{null, "", "   "}) {
            org.mockito.Mockito.clearInvocations(criteriaBuilder, opportunityRepository);
            Specification<Opportunity> spec = specFor(candidate);
            spec.toPredicate(root, query, criteriaBuilder);
            verify(criteriaBuilder, never()).equal(any(), any());
        }
    }

    @Test
    void allIsMatchedCaseInsensitivelyAndTrimmed() {
        Specification<Opportunity> spec = specFor("  all  ");

        spec.toPredicate(root, query, criteriaBuilder);

        verify(criteriaBuilder, never()).equal(any(), any());
    }

    @Test
    void unknownStatusIsStillPassedThroughAsAFilter() {
        // Only the documented no-filter sentinel is special-cased. Anything else
        // must reach the query so a genuinely empty result stays visible.
        when(criteriaBuilder.equal(statusPath, "NOPE")).thenReturn(statusPredicate);
        Specification<Opportunity> spec = specFor("NOPE");

        spec.toPredicate(root, query, criteriaBuilder);

        verify(criteriaBuilder).equal(statusPath, "NOPE");
    }
}
