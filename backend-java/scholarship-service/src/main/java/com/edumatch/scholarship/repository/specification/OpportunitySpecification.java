package com.edumatch.scholarship.repository.specification;

import com.edumatch.scholarship.model.Opportunity;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class OpportunitySpecification {

    public static Specification<Opportunity> filterBy(
            String keyword,
            BigDecimal gpa,
            String studyMode,
            String level,
            Boolean isPublic,
            LocalDate currentDate
    ) {
        final LocalDate dateToFilter = currentDate == null ? LocalDate.now() : currentDate;

        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            predicates.add(criteriaBuilder.equal(root.get("moderationStatus"), "APPROVED"));

            if (isPublic == null || isPublic) {
                predicates.add(criteriaBuilder.equal(root.get("isPublic"), true));
            }

            predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("applicationDeadline"), dateToFilter));

            // Prefix fallback only. Public content search is handled by MySQL FULLTEXT.
            if (keyword != null && !keyword.isEmpty()) {
                predicates.add(criteriaBuilder.like(root.get("title"), keyword + "%"));
            }

            if (gpa != null) {
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.lessThanOrEqualTo(root.get("minGpa"), gpa),
                        criteriaBuilder.isNull(root.get("minGpa"))
                ));
            }

            if (studyMode != null && !studyMode.isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("studyMode"), studyMode));
            }

            if (level != null && !level.isEmpty()) {
                predicates.add(criteriaBuilder.equal(root.get("level"), level));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
