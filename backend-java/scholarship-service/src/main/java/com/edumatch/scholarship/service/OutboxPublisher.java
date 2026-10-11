package com.edumatch.scholarship.service;

import com.edumatch.scholarship.model.OutboxEvent;
import com.edumatch.scholarship.repository.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

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

    @Value("${app.outbox.publisher-confirm-timeout-ms:5000}")
    private long publisherConfirmTimeoutMs;

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
            Object payload = payloadWithEventId(event);
            CorrelationData correlationData = new CorrelationData(event.getEventId());
            rabbitTemplate.convertAndSend(event.getExchangeName(), event.getRoutingKey(), payload, correlationData);
            CorrelationData.Confirm confirm = correlationData.getFuture()
                    .get(publisherConfirmTimeoutMs, TimeUnit.MILLISECONDS);
            if (!confirm.isAck()) {
                throw new AmqpException("Broker did not confirm outbox event: " + confirm.getReason());
            }

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
        // Record the exception CLASS alongside the message. TimeoutException
        // carries a null message, so relying on getMessage() alone produced
        // rows with last_error = NULL that said nothing about the cause.
        String detail = describe(ex);
        event.setLastError(truncate(detail));

        if (!retryable || attempts >= MAX_ATTEMPTS) {
            event.setStatus(OutboxEvent.STATUS_FAILED);
            event.setNextAttemptAt(null);
            log.error("Outbox event id={} routingKey={} failed permanently after {} attempts: {}",
                    event.getId(),
                    event.getRoutingKey(),
                    attempts,
                    detail,
                    ex
            );
        } else {
            long delaySeconds = Math.min(300, (long) Math.pow(2, attempts) * 5L);
            event.setNextAttemptAt(LocalDateTime.now().plusSeconds(delaySeconds));
            log.warn("Outbox event id={} routingKey={} publish failed, retry in {}s: {}",
                    event.getId(),
                    event.getRoutingKey(),
                    delaySeconds,
                    detail
            );
        }

        outboxEventRepository.save(event);
    }

    /**
     * Build a diagnostic string that is never null and always names the failure
     * type, so a timeout is distinguishable from a nack, a returned message, a
     * serialisation error or a connection failure.
     *
     * <p>The confirm wait surfaces a timeout wrapped in
     * {@link ExecutionException}, so the chain is unwrapped before classifying:
     * testing {@code ex instanceof TimeoutException} on the outer exception
     * alone would miss the case this method exists to explain.
     */
    private String describe(Exception ex) {
        Throwable root = ex;
        while ((root instanceof java.util.concurrent.ExecutionException
                || root instanceof java.util.concurrent.CompletionException)
                && root.getCause() != null) {
            root = root.getCause();
        }

        StringBuilder sb = new StringBuilder(ex.getClass().getSimpleName());
        String message = ex.getMessage();
        if (message != null && !message.isBlank()) {
            sb.append(": ").append(message);
        }
        // TimeoutException has no message; say what it timed out on.
        if (root instanceof TimeoutException) {
            sb.append(" (no broker confirm within ")
              .append(publisherConfirmTimeoutMs)
              .append("ms; the broker may have accepted the message without confirming)");
        }
        if (root != ex) {
            sb.append(" | rootCause=").append(root.getClass().getSimpleName());
            if (root.getMessage() != null && !root.getMessage().isBlank()) {
                sb.append(": ").append(root.getMessage());
            }
        }
        Throwable cause = ex.getCause();
        if (cause != null && cause != ex && cause != root) {
            sb.append(" | cause=").append(cause.getClass().getSimpleName());
            if (cause.getMessage() != null && !cause.getMessage().isBlank()) {
                sb.append(": ").append(cause.getMessage());
            }
        }
        return sb.toString();
    }

    private Object payloadWithEventId(OutboxEvent event) throws JsonProcessingException {
        Map<String, Object> payload = objectMapper.readValue(event.getPayload(), new TypeReference<>() {
        });
        payload.putIfAbsent("event_id", event.getEventId());
        return payload;
    }

    private String truncate(String value) {
        if (value == null) {
            return null;
        }
        return value.length() <= MAX_ERROR_LENGTH ? value : value.substring(0, MAX_ERROR_LENGTH);
    }
}
