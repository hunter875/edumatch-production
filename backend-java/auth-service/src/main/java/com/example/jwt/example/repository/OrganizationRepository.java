package com.example.jwt.example.repository;

import com.example.jwt.example.model.Organization;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OrganizationRepository extends JpaRepository<Organization, Long> {

    Optional<Organization> findByName(String name);

    Boolean existsByName(String name);

    @Query("""
        SELECT o FROM Organization o
        WHERE (:keyword IS NULL OR
              LOWER(o.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
              LOWER(o.email) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
              LOWER(o.organizationType) LIKE LOWER(CONCAT('%', :keyword, '%')))
          AND (:isActive IS NULL OR o.isActive = :isActive)
          AND (:isVerified IS NULL OR o.isVerified = :isVerified)
    """)
    Page<Organization> searchOrganizations(
            @Param("keyword") String keyword,
            @Param("isActive") Boolean isActive,
            @Param("isVerified") Boolean isVerified,
            Pageable pageable
    );
}

