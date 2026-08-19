package com.edumatch.scholarship.repository;

import com.edumatch.scholarship.model.Application;
import com.edumatch.scholarship.model.ApplicationStatus;
import com.edumatch.scholarship.model.OutboxEvent;
import com.edumatch.scholarship.service.OutboxEventService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowable;

@DataJpaTest
@Testcontainers(disabledWithoutDocker = true)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ScholarshipDatabaseHardeningTest {

    @Container
    static final MySQLContainer<?> MYSQL = new MySQLContainer<>("mysql:8.4")
            .withDatabaseName("scholarship_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", MYSQL::getJdbcUrl);
        registry.add("spring.datasource.username", MYSQL::getUsername);
        registry.add("spring.datasource.password", MYSQL::getPassword);
        registry.add("spring.datasource.driver-class-name", MYSQL::getDriverClassName);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
    }

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @BeforeEach
    void cleanDatabase() {
        applicationRepository.deleteAll();
        outboxEventRepository.deleteAll();
    }

    @Test
    void duplicateApplicationIsRejectedByDatabaseConstraint() {
        applicationRepository.saveAndFlush(application(99L, 7L));

        assertThatThrownBy(() -> applicationRepository.saveAndFlush(application(99L, 7L)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void concurrentOutboxClaimSkipsLockedRows() throws Exception {
        outboxEventRepository.saveAndFlush(outboxEvent("evt-concurrent"));
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);
        CountDownLatch firstClaimed = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);

        var executor = Executors.newFixedThreadPool(2);
        try {
            var first = executor.submit(() -> transactions.execute(status -> {
                List<OutboxEvent> claimed = outboxEventRepository.findTop100PendingForUpdate(LocalDateTime.now());
                firstClaimed.countDown();
                await(releaseFirst);
                return claimed.size();
            }));

            assertThat(firstClaimed.await(10, TimeUnit.SECONDS)).isTrue();
            var second = executor.submit(() -> transactions.execute(status ->
                    outboxEventRepository.findTop100PendingForUpdate(LocalDateTime.now()).size()
            ));

            assertThat(second.get(10, TimeUnit.SECONDS)).isZero();
            releaseFirst.countDown();
            assertThat(first.get(10, TimeUnit.SECONDS)).isEqualTo(1);
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void transactionRollbackDoesNotLeaveOutboxEvent() {
        TransactionTemplate transactions = new TransactionTemplate(transactionManager);
        OutboxEventService service = new OutboxEventService(outboxEventRepository, new ObjectMapper());

        Throwable thrown = catchThrowable(() -> transactions.execute(status -> {
            service.enqueue(
                    "events_exchange",
                    "scholarship.updated",
                    "Opportunity",
                    "7",
                    java.util.Map.of("id", 7)
            );
            throw new IllegalStateException("business transaction failed");
        }));

        assertThat(thrown).isInstanceOf(IllegalStateException.class);
        assertThat(outboxEventRepository.findAll()).isEmpty();
    }

    private static Application application(Long applicantId, Long opportunityId) {
        Application application = new Application();
        application.setApplicantUserId(applicantId);
        application.setOpportunityId(opportunityId);
        application.setStatus(ApplicationStatus.PENDING);
        return application;
    }

    private static OutboxEvent outboxEvent(String eventId) {
        OutboxEvent event = new OutboxEvent();
        event.setEventId(eventId);
        event.setExchangeName("events_exchange");
        event.setRoutingKey("scholarship.updated");
        event.setAggregateType("scholarship");
        event.setAggregateId("7");
        event.setPayload("{\"id\":7}");
        event.setStatus(OutboxEvent.STATUS_PENDING);
        event.setNextAttemptAt(LocalDateTime.now().minusSeconds(1));
        return event;
    }

    private static void await(CountDownLatch latch) {
        try {
            if (!latch.await(10, TimeUnit.SECONDS)) {
                throw new IllegalStateException("Timed out waiting for latch");
            }
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(ex);
        }
    }
}
