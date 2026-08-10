package com.edumatch.scholarship.repository;

import com.edumatch.scholarship.model.OutboxEvent;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    List<OutboxEvent> findTop100ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            String status,
            LocalDateTime now
    );

    /**
     * Claim pending outbox rows with pessimistic write lock.
     * SKIP LOCKED ensures two replicas never claim the same row.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM OutboxEvent e WHERE e.status = 'PENDING' AND e.nextAttemptAt <= :now ORDER BY e.createdAt ASC LIMIT 100")
    List<OutboxEvent> findTop100PendingForUpdate(LocalDateTime now);
}
