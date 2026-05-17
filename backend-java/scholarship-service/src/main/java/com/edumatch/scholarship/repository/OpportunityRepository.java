package com.edumatch.scholarship.repository;

import com.edumatch.scholarship.model.Opportunity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository

public interface OpportunityRepository extends JpaRepository<Opportunity, Long>, JpaSpecificationExecutor<Opportunity> {

     List<Opportunity> findByCreatorUserId(Long creatorUserId);
     List<Opportunity> findByOrganizationId(Long organizationId);
     Page<Opportunity> findByModerationStatus(String status, Pageable pageable);
     long countByModerationStatus(String status);
     long countByApplicationDeadlineBefore(LocalDate date);
     long countByCreatorUserId(Long creatorUserId);
     long countByCreatorUserIdAndModerationStatus(Long creatorUserId, String status);
     List<Opportunity> findTop5ByCreatorUserIdAndApplicationDeadlineGreaterThanEqualOrderByApplicationDeadlineAsc(Long creatorUserId, LocalDate date);

     @Query("""
          SELECT DISTINCT o
          FROM Opportunity o
          LEFT JOIN FETCH o.tags
          WHERE o.id IN :ids
     """)
     List<Opportunity> findAllWithTagsByIdIn(@Param("ids") List<Long> ids);

     @Query("""
          SELECT DISTINCT o
          FROM Opportunity o
          LEFT JOIN FETCH o.requiredSkills
          WHERE o.id IN :ids
     """)
     List<Opportunity> findAllWithRequiredSkillsByIdIn(@Param("ids") List<Long> ids);

     @Query("""
          SELECT DISTINCT o
          FROM Opportunity o
          LEFT JOIN FETCH o.tags
          LEFT JOIN FETCH o.requiredSkills
          WHERE o.id = :id
     """)
     Optional<Opportunity> findByIdWithTagsAndSkills(@Param("id") Long id);

     @Modifying
     @Query("""
          UPDATE Opportunity o
          SET o.viewsCnt = COALESCE(o.viewsCnt, 0) + 1
          WHERE o.id = :id
     """)
     int incrementViewsCnt(@Param("id") Long id);

     @Query("""
          SELECT SUM(o.scholarshipAmount)
          FROM Opportunity o
          WHERE o.creatorUserId = :creatorUserId
     """)
     BigDecimal sumScholarshipAmountByCreatorUserId(@Param("creatorUserId") Long creatorUserId);

     @Query(
          value = """
               SELECT o.*
               FROM opportunities o
               WHERE o.moderation_status = 'APPROVED'
                 AND (:isPublic IS NULL OR o.is_public = :isPublic)
                 AND o.application_deadline >= :currentDate
                 AND (:gpa IS NULL OR o.min_gpa IS NULL OR o.min_gpa <= :gpa)
                 AND (:studyMode IS NULL OR o.study_mode = :studyMode)
                 AND (:level IS NULL OR o.level = :level)
                 AND MATCH(o.title, o.full_description) AGAINST (:keyword IN NATURAL LANGUAGE MODE)
               ORDER BY
                 MATCH(o.title, o.full_description) AGAINST (:keyword IN NATURAL LANGUAGE MODE) DESC,
                 o.created_at DESC
          """,
          countQuery = """
               SELECT COUNT(*)
               FROM opportunities o
               WHERE o.moderation_status = 'APPROVED'
                 AND (:isPublic IS NULL OR o.is_public = :isPublic)
                 AND o.application_deadline >= :currentDate
                 AND (:gpa IS NULL OR o.min_gpa IS NULL OR o.min_gpa <= :gpa)
                 AND (:studyMode IS NULL OR o.study_mode = :studyMode)
                 AND (:level IS NULL OR o.level = :level)
                 AND MATCH(o.title, o.full_description) AGAINST (:keyword IN NATURAL LANGUAGE MODE)
          """,
          nativeQuery = true
     )
     Page<Opportunity> searchPublicFullText(
             @Param("keyword") String keyword,
             @Param("gpa") BigDecimal gpa,
             @Param("studyMode") String studyMode,
             @Param("level") String level,
             @Param("isPublic") Boolean isPublic,
             @Param("currentDate") LocalDate currentDate,
             Pageable pageable
     );
}
