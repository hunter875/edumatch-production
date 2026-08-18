package com.edumatch.scholarship.repository;

import com.edumatch.scholarship.model.OutboxEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    List<OutboxEvent> findTop100ByStatusAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(
            String status,
            LocalDateTime now
    );

    @Query(
            value = """
                    SELECT *
                    FROM outbox_events
                    WHERE status = 'PENDING'
                      AND next_attempt_at <= :now
                    ORDER BY created_at ASC
                    LIMIT 100
                    FOR UPDATE SKIP LOCKED
                    """,
            nativeQuery = true
    )
    List<OutboxEvent> findTop100PendingForUpdate(@Param("now") LocalDateTime now);
}
