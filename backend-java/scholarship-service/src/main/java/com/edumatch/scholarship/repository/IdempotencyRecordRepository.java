package com.edumatch.scholarship.repository;

import com.edumatch.scholarship.model.IdempotencyRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IdempotencyRecordRepository extends JpaRepository<IdempotencyRecord, Long> {
    Optional<IdempotencyRecord> findByUserIdentifierAndEndpointAndIdempotencyKey(
            String userIdentifier,
            String endpoint,
            String idempotencyKey
    );
}
