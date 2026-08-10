package com.edumatch.scholarship.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "idempotency_records",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_idempotency_scope_key",
                columnNames = {"user_identifier", "endpoint", "idempotency_key"}
        )
)
@Getter
@Setter
@NoArgsConstructor
public class IdempotencyRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "idempotency_key", nullable = false, length = 255)
    private String idempotencyKey;

    @Column(name = "user_identifier", nullable = false, length = 255)
    private String userIdentifier;

    @Column(nullable = false, length = 255)
    private String endpoint;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Lob
    @Column(name = "response_body", nullable = false, columnDefinition = "LONGTEXT")
    private String responseBody;

    @Column(name = "status_code", nullable = false)
    private int statusCode;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
