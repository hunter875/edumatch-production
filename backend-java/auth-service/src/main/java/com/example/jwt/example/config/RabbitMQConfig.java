package com.example.jwt.example.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ Configuration cho Auth Service
 * Publish events: user.profile.updated khi user đăng ký
 */
@Configuration
@RequiredArgsConstructor
public class RabbitMQConfig {
    
    public static final String EXCHANGE_NAME = "events_exchange";
    
    private final RabbitTemplate rabbitTemplate;
    
    /**
     * Set JSON converter sau khi RabbitTemplate được Spring Boot tạo
     */
    @PostConstruct
    public void init() {
        rabbitTemplate.setMessageConverter(new Jackson2JsonMessageConverter());
    }
    
    /**
     * TopicExchange cho events (user.*, scholarship.*)
     */
    @Bean
    public TopicExchange eventsExchange() {
        return new TopicExchange(EXCHANGE_NAME, true, false);
    }
}
