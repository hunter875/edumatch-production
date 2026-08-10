package com.edumatch.scholarship.service;

import com.edumatch.scholarship.model.OutboxEvent;
import com.edumatch.scholarship.repository.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@ConditionalOnBean(RabbitTemplate.class)
@RequiredArgsConstructor
@Slf4j
public class OutboxPublisher {

    private static final int MAX_ATTEMPTS = 10;
    private static final int MAX_ERROR_LENGTH = 1000;

    private final OutboxEventRepository outboxEventRepository;
    private final RabbitTemplate rabbitTemplate;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelayString = "${app.outbox.publish-delay-ms:5000}")
    @Transactional
    public void publishPendingEvents() {
        // Pessimistic lock: claim rows with FOR UPDATE SKIP LOCKED
        // so two replicas never publish the same event.
        List<OutboxEvent> events = outboxEventRepository
                .findTop100PendingForUpdate(LocalDateTime.now());

        for (OutboxEvent event : events) {
            publishOne(event);
        }
    }

    private void publishOne(OutboxEvent event) {
        try {
            Object payload = objectMapper.readValue(event.getPayload(), Object.class);
            rabbitTemplate.convertAndSend(event.getExchangeName(), event.getRoutingKey(), payload);

            event.setStatus(OutboxEvent.STATUS_PUBLISHED);
            event.setPublishedAt(LocalDateTime.now());
            event.setLastError(null);
            outboxEventRepository.save(event);

            log.info("Published outbox event id={} routingKey={}", event.getId(), event.getRoutingKey());
        } catch (JsonProcessingException ex) {
            markFailed(event, ex, false);
        } catch (Exception ex) {
            markFailed(event, ex, true);
        }
    }

    private void markFailed(OutboxEvent event, Exception ex, boolean retryable) {
        int attempts = event.getAttempts() + 1;
        event.setAttempts(attempts);
        event.setLastError(truncate(ex.getMessage()));

        if (!retryable || attempts >= MAX_ATTEMPTS) {
            event.setStatus(OutboxEvent.STATUS_FAILED);
            event.setNextAttemptAt(null);
            log.error("Outbox event id={} routingKey={} failed permanently after {} attempts: {}",
                    event.getId(),
                    event.getRoutingKey(),
                    attempts,
                    ex.getMessage(),
                    ex
            );
        } else {
            long delaySeconds = Math.min(300, (long) Math.pow(2, attempts) * 5L);
            event.setNextAttemptAt(LocalDateTime.now().plusSeconds(delaySeconds));
            log.warn("Outbox event id={} routingKey={} publish failed, retry in {}s: {}",
                    event.getId(),
                    event.getRoutingKey(),
                    delaySeconds,
                    ex.getMessage()
            );
        }

        outboxEventRepository.save(event);
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= MAX_ERROR_LENGTH ? value : value.substring(0, MAX_ERROR_LENGTH);
    }
}
