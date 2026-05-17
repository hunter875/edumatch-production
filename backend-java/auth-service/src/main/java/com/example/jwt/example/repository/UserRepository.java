package com.example.jwt.example.repository;

import com.example.jwt.example.model.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByUsernameOrEmail(String username, String email);

    Boolean existsByUsername(String username);

    Boolean existsByEmail(String email);

    long countByEnabled(Boolean enabled);

    long countBySubscriptionType(String subscriptionType);

    long countByCreatedAtLessThanEqual(LocalDateTime end);

    @Query("""
        SELECT COUNT(DISTINCT u.id)
        FROM User u JOIN u.roles r
        WHERE r.name = :role
    """)
    long countByRoleName(@Param("role") String role);

    @Query("""
        SELECT COUNT(DISTINCT u.id)
        FROM User u JOIN u.roles r
        WHERE r.name = :role
          AND u.createdAt <= :end
    """)
    long countByRoleNameAndCreatedAtLessThanEqual(
            @Param("role") String role,
            @Param("end") LocalDateTime end
    );

    Optional<User> findByVerificationCode(String verificationCode);

    @EntityGraph(attributePaths = "roles")
    @Query(
        value = """
        SELECT DISTINCT u FROM User u JOIN u.roles r
        WHERE (:role IS NULL OR r.name = :role)
          AND (:enabled IS NULL OR u.enabled = :enabled)
          AND (
              :keyword IS NULL OR
              u.username LIKE CONCAT(:keyword, '%') OR
              u.email LIKE CONCAT(:keyword, '%') OR
              u.firstName LIKE CONCAT(:keyword, '%') OR
              u.lastName LIKE CONCAT(:keyword, '%')
          )
        """,
        countQuery = """
        SELECT COUNT(DISTINCT u.id)
        FROM User u JOIN u.roles r
        WHERE (:role IS NULL OR r.name = :role)
          AND (:enabled IS NULL OR u.enabled = :enabled)
          AND (
              :keyword IS NULL OR
              u.username LIKE CONCAT(:keyword, '%') OR
              u.email LIKE CONCAT(:keyword, '%') OR
              u.firstName LIKE CONCAT(:keyword, '%') OR
              u.lastName LIKE CONCAT(:keyword, '%')
          )
        """
    )
    Page<User> searchUsers(
            @Param("role") String role,
            @Param("enabled") Boolean enabled,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
