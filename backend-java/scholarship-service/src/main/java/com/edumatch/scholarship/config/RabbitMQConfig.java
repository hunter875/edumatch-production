package com.edumatch.scholarship.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class RabbitMQConfig {

    // Tên Exchange chung, như trong tài liệu yêu cầu
    public static final String EXCHANGE_NAME = "events_exchange";

    @Bean
    public TopicExchange exchange() {
        return new TopicExchange(EXCHANGE_NAME);
    }

    // Bean này giúp RabbitTemplate gửi/nhận object Java dưới dạng JSON
    @Bean
    public MessageConverter jsonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    /**
     * RabbitTemplate with publisher confirms enabled.
     *
     * <p>OutboxPublisher awaits {@code correlationData.getFuture().get(timeout)}
     * before marking an event PUBLISHED. That future is only completed when the
     * connection factory has publisher confirms switched on. Without the
     * callbacks below it is never completed, the wait times out, and a
     * successfully published message is recorded as FAILED — which is exactly
     * what happened: several outbox event_ids were found in the consumer's
     * processed_events ledger while their outbox rows still said FAILED with a
     * null last_error (TimeoutException.getMessage() is null).
     *
     * <p>Correlated confirms are configured through
     * {@code spring.rabbitmq.publisher-confirm-type=correlated} in
     * application.properties; the callbacks here record the outcome so the
     * publisher can distinguish an ack from a nack and from a returned message.
     */
    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        final RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(jsonMessageConverter());

        // Mandatory routing: an unroutable message must come back to us instead
        // of being silently dropped by the broker.
        rabbitTemplate.setMandatory(true);

        rabbitTemplate.setConfirmCallback((CorrelationData correlationData, boolean ack, String cause) -> {
            String id = correlationData == null ? null : correlationData.getId();
            if (ack) {
                log.debug("Broker acked outbox event correlationId={}", id);
            } else {
                // A nack carries a reason; surface it so last_error is not null.
                log.error("Broker NACKed outbox event correlationId={} cause={}", id, cause);
            }
        });

        rabbitTemplate.setReturnsCallback(returned -> log.error(
                "Outbox message returned as unroutable: exchange={} routingKey={} replyCode={} replyText={}",
                returned.getExchange(),
                returned.getRoutingKey(),
                returned.getReplyCode(),
                returned.getReplyText()));

        return rabbitTemplate;
    }
}
