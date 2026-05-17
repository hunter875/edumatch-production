package com.example.jwt.example.repository;

import com.example.jwt.example.model.OrganizationRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrganizationRequestRepository extends JpaRepository<OrganizationRequest, Long> {

    Optional<OrganizationRequest> findByUserId(Long userId);

    Optional<OrganizationRequest> findTopByUserIdOrderByCreatedAtDesc(Long userId);

    List<OrganizationRequest> findByUserIdAndStatus(Long userId, String status);

    Page<OrganizationRequest> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);

    @Query("""
        SELECT or FROM OrganizationRequest or
        WHERE (:status IS NULL OR or.status = :status)
        ORDER BY or.createdAt DESC
    """)
    Page<OrganizationRequest> findAllByStatus(@Param("status") String status, Pageable pageable);

    boolean existsByUserIdAndStatus(Long userId, String status);
}
