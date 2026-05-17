package com.edumatch.scholarship.repository;

import com.edumatch.scholarship.model.Application;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    // Lấy các đơn đã nộp của một sinh viên
    List<Application> findByApplicantUserId(Long applicantUserId);

    List<Application> findByApplicantUserIdAndOpportunityIdIn(Long applicantUserId, List<Long> opportunityIds);

    Optional<Application> findFirstByApplicantUserIdAndOpportunityId(Long applicantUserId, Long opportunityId);

    long countByStatus(String status);

    long countByStatusIn(List<String> statuses);

    // Lấy tất cả đơn nộp cho một cơ hội
    List<Application> findByOpportunityId(Long opportunityId);

    @Query("""
        SELECT a.opportunityId, COUNT(a.id)
        FROM Application a
        GROUP BY a.opportunityId
        ORDER BY COUNT(a.id) DESC
    """)
    List<Object[]> countApplicationsByOpportunity(Pageable pageable);

    @Query("""
        SELECT a.opportunityId, COUNT(a.id)
        FROM Application a
        WHERE a.opportunityId IN :opportunityIds
        GROUP BY a.opportunityId
    """)
    List<Object[]> countApplicationsByOpportunityIds(@Param("opportunityIds") List<Long> opportunityIds);

    @Query("""
        SELECT a.opportunityId, a.status, COUNT(a.id)
        FROM Application a
        WHERE a.opportunityId IN :opportunityIds
        GROUP BY a.opportunityId, a.status
    """)
    List<Object[]> countApplicationStatusesByOpportunityIds(@Param("opportunityIds") List<Long> opportunityIds);

    @Query("""
        SELECT a.status, COUNT(a.id)
        FROM Application a
        WHERE a.opportunityId IN (
            SELECT o.id FROM Opportunity o WHERE o.creatorUserId = :creatorUserId
        )
        GROUP BY a.status
    """)
    List<Object[]> countApplicationStatusesByCreatorUserId(@Param("creatorUserId") Long creatorUserId);

    @Query("""
        SELECT a FROM Application a
        WHERE a.opportunityId IN (
            SELECT o.id FROM Opportunity o WHERE o.creatorUserId = :creatorUserId
        )
        ORDER BY a.submittedAt DESC
    """)
    List<Application> findRecentApplicationsByCreatorUserId(@Param("creatorUserId") Long creatorUserId, Pageable pageable);

    @Query("""
        SELECT a FROM Application a
        WHERE a.opportunityId IN (
            SELECT o.id FROM Opportunity o WHERE o.creatorUserId = :creatorUserId
        )
        ORDER BY a.submittedAt DESC
    """)
    List<Application> findApplicationsByCreatorUserId(@Param("creatorUserId") Long creatorUserId);

    @Query("""
        SELECT COUNT(a.id)
        FROM Application a
        WHERE a.submittedAt >= :start
          AND a.opportunityId IN (
              SELECT o.id FROM Opportunity o WHERE o.creatorUserId = :creatorUserId
          )
    """)
    long countApplicationsByCreatorUserIdSince(
            @Param("creatorUserId") Long creatorUserId,
            @Param("start") LocalDateTime start
    );

    @Query("""
        SELECT YEAR(a.submittedAt), MONTH(a.submittedAt), a.status, COUNT(a.id)
        FROM Application a
        WHERE a.submittedAt >= :start
          AND a.opportunityId IN (
              SELECT o.id FROM Opportunity o WHERE o.creatorUserId = :creatorUserId
          )
        GROUP BY YEAR(a.submittedAt), MONTH(a.submittedAt), a.status
    """)
    List<Object[]> countMonthlyApplicationStatusesByCreatorUserId(
            @Param("creatorUserId") Long creatorUserId,
            @Param("start") LocalDateTime start
    );

    // Search applications với filter và pagination (cho admin)
    @Query("""
        SELECT a FROM Application a
        WHERE (:status IS NULL OR a.status = :status)
          AND (:opportunityId IS NULL OR a.opportunityId = :opportunityId)
          AND (:keyword IS NULL OR
              a.applicantUserName LIKE CONCAT(:keyword, '%') OR
              a.applicantEmail LIKE CONCAT(:keyword, '%') OR
              CAST(a.id AS string) LIKE CONCAT(:keyword, '%'))
    """)
    Page<Application> searchApplications(
            @Param("status") String status,
            @Param("opportunityId") Long opportunityId,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
