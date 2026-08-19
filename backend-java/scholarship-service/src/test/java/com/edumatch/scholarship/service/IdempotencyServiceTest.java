package com.edumatch.scholarship.service;

import com.edumatch.scholarship.exception.ConflictException;
import com.edumatch.scholarship.model.IdempotencyRecord;
import com.edumatch.scholarship.repository.IdempotencyRecordRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IdempotencyServiceTest {

    @Mock
    private IdempotencyRecordRepository idempotencyRecordRepository;

    private IdempotencyService idempotencyService;

    @BeforeEach
    void setUp() {
        idempotencyService = new IdempotencyService(idempotencyRecordRepository, new ObjectMapper());
    }

    @Test
    void blankKeyBypassesPersistenceAndRunsCommand() {
        AtomicInteger executions = new AtomicInteger();

        ApplyResult result = idempotencyService.execute(
                " ",
                "student@example.com",
                "POST /api/v1/applications",
                Map.of("opportunityId", 7),
                ApplyResult.class,
                () -> {
                    executions.incrementAndGet();
                    return new ApplyResult(42L, "SUBMITTED");
                }
        );

        assertThat(result).isEqualTo(new ApplyResult(42L, "SUBMITTED"));
        assertThat(executions).hasValue(1);
        verifyNoInteractions(idempotencyRecordRepository);
    }

    @Test
    void sameKeyAndSameRequestReplaysStoredResponseWithoutRunningCommandAgain() {
        when(idempotencyRecordRepository.findByUserIdentifierAndEndpointAndIdempotencyKey(
                eq("student@example.com"),
                eq("POST /api/v1/applications"),
                eq("apply-7")
        )).thenReturn(Optional.empty());

        ApplyResult first = idempotencyService.execute(
                " apply-7 ",
                "student@example.com",
                "POST /api/v1/applications",
                Map.of("opportunityId", 7),
                ApplyResult.class,
                () -> new ApplyResult(42L, "SUBMITTED")
        );

        ArgumentCaptor<IdempotencyRecord> recordCaptor = ArgumentCaptor.forClass(IdempotencyRecord.class);
        verify(idempotencyRecordRepository).save(recordCaptor.capture());

        IdempotencyRecord storedRecord = recordCaptor.getValue();
        reset(idempotencyRecordRepository);
        when(idempotencyRecordRepository.findByUserIdentifierAndEndpointAndIdempotencyKey(
                eq("student@example.com"),
                eq("POST /api/v1/applications"),
                eq("apply-7")
        )).thenReturn(Optional.of(storedRecord));

        AtomicInteger secondExecutions = new AtomicInteger();
        ApplyResult replayed = idempotencyService.execute(
                "apply-7",
                "student@example.com",
                "POST /api/v1/applications",
                Map.of("opportunityId", 7),
                ApplyResult.class,
                () -> {
                    secondExecutions.incrementAndGet();
                    return new ApplyResult(99L, "DUPLICATE");
                }
        );

        assertThat(replayed).isEqualTo(first);
        assertThat(secondExecutions).hasValue(0);
    }

    @Test
    void sameKeyWithDifferentRequestIsRejectedWithoutRunningCommandAgain() {
        when(idempotencyRecordRepository.findByUserIdentifierAndEndpointAndIdempotencyKey(
                eq("student@example.com"),
                eq("POST /api/v1/applications"),
                eq("apply-7")
        )).thenReturn(Optional.empty());

        idempotencyService.execute(
                "apply-7",
                "student@example.com",
                "POST /api/v1/applications",
                Map.of("opportunityId", 7),
                ApplyResult.class,
                () -> new ApplyResult(42L, "SUBMITTED")
        );

        ArgumentCaptor<IdempotencyRecord> recordCaptor = ArgumentCaptor.forClass(IdempotencyRecord.class);
        verify(idempotencyRecordRepository).save(recordCaptor.capture());

        reset(idempotencyRecordRepository);
        when(idempotencyRecordRepository.findByUserIdentifierAndEndpointAndIdempotencyKey(
                eq("student@example.com"),
                eq("POST /api/v1/applications"),
                eq("apply-7")
        )).thenReturn(Optional.of(recordCaptor.getValue()));

        AtomicInteger secondExecutions = new AtomicInteger();
        assertThatThrownBy(() -> idempotencyService.execute(
                "apply-7",
                "student@example.com",
                "POST /api/v1/applications",
                Map.of("opportunityId", 8),
                ApplyResult.class,
                () -> {
                    secondExecutions.incrementAndGet();
                    return new ApplyResult(99L, "SHOULD_NOT_RUN");
                }
        )).isInstanceOf(ConflictException.class)
                .hasMessageContaining("different request body");

        assertThat(secondExecutions).hasValue(0);
    }

    private record ApplyResult(Long id, String status) {
    }
}
