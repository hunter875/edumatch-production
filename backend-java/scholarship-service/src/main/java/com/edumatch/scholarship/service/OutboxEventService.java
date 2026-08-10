package com.edumatch.scholarship.service;

import com.edumatch.scholarship.model.OutboxEvent;
import com.edumatch.scholarship.repository.OutboxEventRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OutboxEventService {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper;

    public void enqueue(
            String exchangeName,
            String routingKey,
            String aggregateType,
            String aggregateId,
            Object payload
    ) {
        OutboxEvent event = new OutboxEvent();
        event.setExchangeName(exchangeName);
        event.setRoutingKey(routingKey);
        event.setAggregateType(aggregateType);
        event.setAggregateId(aggregateId);
        event.setPayload(toJson(payload));
        outboxEventRepository.save(event);
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Failed to serialize outbox event payload.", ex);
        }
    }
}
