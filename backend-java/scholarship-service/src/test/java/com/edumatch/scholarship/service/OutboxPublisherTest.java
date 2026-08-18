package com.edumatch.scholarship.service;

import com.edumatch.scholarship.model.OutboxEvent;
import com.edumatch.scholarship.repository.OutboxEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OutboxPublisherTest {

    @Mock
    private OutboxEventRepository outboxEventRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    private OutboxPublisher outboxPublisher;

    @BeforeEach
    void setUp() {
        outboxPublisher = new OutboxPublisher(outboxEventRepository, rabbitTemplate, new ObjectMapper());
    }

    @Test
    void publishesValidPayloadAndMarksEventPublished() {
        OutboxEvent event = outboxEvent("{\"applicationId\":42}");
        when(outboxEventRepository.findTop100PendingForUpdate(any(LocalDateTime.class)))
                .thenReturn(List.of(event));

        outboxPublisher.publishPendingEvents();

        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(rabbitTemplate).convertAndSend(
                eq("events_exchange"),
                eq("application.submitted"),
                payloadCaptor.capture()
        );
        verify(outboxEventRepository).save(event);

        assertThat(payloadCaptor.getValue()).isInstanceOfSatisfying(
                java.util.Map.class,
                payload -> assertThat(payload).containsEntry("applicationId", 42)
        );
        assertThat(event.getStatus()).isEqualTo(OutboxEvent.STATUS_PUBLISHED);
        assertThat(event.getPublishedAt()).isNotNull();
        assertThat(event.getLastError()).isNull();
    }

    @Test
    void brokerFailureSchedulesRetryAndKeepsEventPending() {
        OutboxEvent event = outboxEvent("{\"applicationId\":42}");
        when(outboxEventRepository.findTop100PendingForUpdate(any(LocalDateTime.class)))
                .thenReturn(List.of(event));
        doThrow(new AmqpException("broker unavailable"))
                .when(rabbitTemplate)
                .convertAndSend(anyString(), anyString(), any(Object.class));

        outboxPublisher.publishPendingEvents();

        verify(outboxEventRepository).save(event);
        assertThat(event.getStatus()).isEqualTo(OutboxEvent.STATUS_PENDING);
        assertThat(event.getAttempts()).isEqualTo(1);
        assertThat(event.getNextAttemptAt()).isAfter(LocalDateTime.now().minusSeconds(1));
        assertThat(event.getLastError()).isEqualTo("broker unavailable");
    }

    @Test
    void invalidJsonFailsPermanentlyWithoutPublishing() {
        OutboxEvent event = outboxEvent("{");
        when(outboxEventRepository.findTop100PendingForUpdate(any(LocalDateTime.class)))
                .thenReturn(List.of(event));

        outboxPublisher.publishPendingEvents();

        verify(rabbitTemplate, never()).convertAndSend(anyString(), anyString(), any(Object.class));
        verify(outboxEventRepository).save(event);
        assertThat(event.getStatus()).isEqualTo(OutboxEvent.STATUS_FAILED);
        assertThat(event.getAttempts()).isEqualTo(1);
        assertThat(event.getNextAttemptAt()).isNull();
        assertThat(event.getLastError()).isNotBlank();
    }

    @Test
    void tenthBrokerFailureFailsPermanently() {
        OutboxEvent event = outboxEvent("{\"applicationId\":42}");
        event.setAttempts(9);
        when(outboxEventRepository.findTop100PendingForUpdate(any(LocalDateTime.class)))
                .thenReturn(List.of(event));
        doThrow(new AmqpException("broker unavailable"))
                .when(rabbitTemplate)
                .convertAndSend(anyString(), anyString(), any(Object.class));

        outboxPublisher.publishPendingEvents();

        verify(outboxEventRepository).save(event);
        assertThat(event.getStatus()).isEqualTo(OutboxEvent.STATUS_FAILED);
        assertThat(event.getAttempts()).isEqualTo(10);
        assertThat(event.getNextAttemptAt()).isNull();
    }

    private static OutboxEvent outboxEvent(String payload) {
        OutboxEvent event = new OutboxEvent();
        event.setId(11L);
        event.setExchangeName("events_exchange");
        event.setRoutingKey("application.submitted");
        event.setPayload(payload);
        event.setStatus(OutboxEvent.STATUS_PENDING);
        event.setNextAttemptAt(LocalDateTime.now().minusSeconds(1));
        return event;
    }
}
