package com.example.jwt.example.service;

import com.example.jwt.example.model.RefreshToken;
import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.RefreshTokenRepository;
import com.example.jwt.example.repository.RevokedRefreshTokenRepository;
import com.example.jwt.example.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@ActiveProfiles("test")
class RefreshTokenServicePersistenceTest {

    @Autowired
    private TestEntityManager entityManager;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private RevokedRefreshTokenRepository revokedRefreshTokenRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PlatformTransactionManager transactionManager;

    private RefreshTokenService refreshTokenService;

    @BeforeEach
    void setUp() {
        refreshTokenService = new RefreshTokenService(
                refreshTokenRepository,
                revokedRefreshTokenRepository,
                userRepository
        );
        ReflectionTestUtils.setField(refreshTokenService, "refreshTokenDurationMs", 604_800_000L);
    }

    @Test
    void createRefreshTokenPersistsOnlyHash() {
        User user = persistUser("student");

        RefreshTokenService.IssuedRefreshToken issued = refreshTokenService.createRefreshToken(user.getId());
        entityManager.flush();
        entityManager.clear();

        RefreshToken stored = refreshTokenRepository.findByUser(userRepository.findById(user.getId()).orElseThrow())
                .orElseThrow();

        assertThat(stored.getTokenHash()).isNotBlank();
        assertThat(stored.getTokenHash()).isNotEqualTo(issued.rawToken());
        assertThat(refreshTokenService.findByToken(issued.rawToken())).isPresent();
    }

    @Test
    void rotateRefreshTokenPersistsOnlyNewHashAndRevokesOldHash() {
        User user = persistUser("student");
        RefreshTokenService.IssuedRefreshToken issued = refreshTokenService.createRefreshToken(user.getId());
        RefreshToken current = refreshTokenService.findByToken(issued.rawToken()).orElseThrow();
        String oldHash = current.getTokenHash();

        RefreshTokenService.IssuedRefreshToken rotated =
                refreshTokenService.rotateRefreshToken(current, issued.rawToken());
        entityManager.flush();
        entityManager.clear();

        RefreshToken stored = refreshTokenRepository.findByUser(userRepository.findById(user.getId()).orElseThrow())
                .orElseThrow();

        assertThat(stored.getTokenHash()).isNotEqualTo(rotated.rawToken());
        assertThat(stored.getTokenHash()).isNotEqualTo(oldHash);
        assertThat(revokedRefreshTokenRepository.findByTokenHash(oldHash)).isPresent();
        assertThat(refreshTokenService.findByToken(issued.rawToken())).isEmpty();
        assertThat(refreshTokenService.findByToken(rotated.rawToken())).isPresent();
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void concurrentRefreshWithSameRawTokenAllowsOneRotationThenTreatsReuseAsRevoked() throws Exception {
        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
        transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);

        Long userId = transactionTemplate.execute(status -> persistUser("race").getId());
        RefreshTokenService.IssuedRefreshToken issued =
                transactionTemplate.execute(status -> refreshTokenService.createRefreshToken(userId));

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        ExecutorService executor = Executors.newFixedThreadPool(2);
        List<Callable<String>> attempts = List.of(
                () -> refreshLikeAuthService(transactionTemplate, issued.rawToken(), ready, start),
                () -> refreshLikeAuthService(transactionTemplate, issued.rawToken(), ready, start)
        );

        try {
            List<Future<String>> futures = new ArrayList<>();
            for (Callable<String> attempt : attempts) {
                futures.add(executor.submit(attempt));
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();

            List<String> outcomes = new ArrayList<>();
            for (Future<String> future : futures) {
                outcomes.add(future.get(10, TimeUnit.SECONDS));
            }

            assertThat(outcomes).contains("rotated", "reuse-detected");
        } finally {
            executor.shutdownNow();
        }
    }

    private String refreshLikeAuthService(TransactionTemplate transactionTemplate,
                                          String rawToken,
                                          CountDownLatch ready,
                                          CountDownLatch start) throws Exception {
        ready.countDown();
        start.await();

        return transactionTemplate.execute(status -> refreshTokenService.findByToken(rawToken)
                .map(refreshTokenService::verifyExpiration)
                .map(token -> {
                    refreshTokenService.rotateRefreshToken(token, rawToken);
                    return "rotated";
                })
                .orElseGet(() ->
                        refreshTokenService.revokeActiveTokenIfReuseDetected(rawToken)
                                ? "reuse-detected"
                                : "missing"
                ));
    }

    private User persistUser(String username) {
        User user = User.builder()
                .username(username)
                .email(username + "@example.com")
                .password("{noop}password")
                .enabled(true)
                .status("ACTIVE")
                .build();
        return entityManager.persistAndFlush(user);
    }
}
