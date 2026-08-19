package com.example.jwt.example.service;

import com.example.jwt.example.model.RefreshToken;
import com.example.jwt.example.model.RevokedRefreshToken;
import com.example.jwt.example.model.User;
import com.example.jwt.example.repository.RefreshTokenRepository;
import com.example.jwt.example.repository.RevokedRefreshTokenRepository;
import com.example.jwt.example.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final RevokedRefreshTokenRepository revokedRefreshTokenRepository;
    private final UserRepository userRepository;

    @Value("${app.jwtRefreshExpirationMs}")
    private Long refreshTokenDurationMs;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int RAW_TOKEN_BYTES = 32; // 256 bits

    /**
     * Create or update refresh token for a user.
     * The raw token is returned ONCE; only its SHA-256 hash is persisted.
     */
    @Transactional
    public RefreshToken createRefreshToken(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String rawToken = generateRawToken();
        String tokenHash = sha256(rawToken);

        RefreshToken refreshToken = refreshTokenRepository.findByUser(user)
                .orElse(RefreshToken.builder().user(user).build());

        refreshToken.setToken(tokenHash);
        refreshToken.setExpiryDate(Instant.now().plusMillis(refreshTokenDurationMs));

        RefreshToken saved = refreshTokenRepository.save(refreshToken);
        // Store the raw token in a transient field so the caller can retrieve it
        // (the entity's token field holds the hash)
        saved.setToken(rawToken); // caller reads this, then it's discarded

        return saved;
    }

    /**
     * Find a refresh token by its RAW value.
     * Computes the hash and looks it up.
     */
    public Optional<RefreshToken> findByToken(String rawToken) {
        String hash = sha256(rawToken);
        return refreshTokenRepository.findByToken(hash);
    }

    public boolean revokeActiveTokenIfReuseDetected(String rawToken) {
        String hash = sha256(rawToken);
        return revokedRefreshTokenRepository.findByTokenHash(hash)
                .map(revoked -> {
                    refreshTokenRepository.deleteByUser(revoked.getUser());
                    log.warn("Detected refresh-token reuse for user id={}; active token revoked", revoked.getUser().getId());
                    return true;
                })
                .orElse(false);
    }

    /**
     * Verify the token has not expired.
     */
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(Instant.now())) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token was expired. Please sign in again!");
        }
        return token;
    }

    /**
     * Revoke (delete) a refresh token by its RAW value.
     */
    @Transactional
    public int revokeByToken(String rawToken) {
        String hash = sha256(rawToken);
        return refreshTokenRepository.deleteByToken(hash);
    }

    @Transactional
    public RefreshToken rotateRefreshToken(RefreshToken currentToken, String rawCurrentToken) {
        String oldHash = sha256(rawCurrentToken);
        String rawNewToken = generateRawToken();
        String newHash = sha256(rawNewToken);

        revokedRefreshTokenRepository.save(RevokedRefreshToken.builder()
                .tokenHash(oldHash)
                .user(currentToken.getUser())
                .replacedByHash(newHash)
                .revokedAt(Instant.now())
                .expiresAt(currentToken.getExpiryDate())
                .build());

        currentToken.setToken(newHash);
        currentToken.setExpiryDate(Instant.now().plusMillis(refreshTokenDurationMs));
        RefreshToken saved = refreshTokenRepository.save(currentToken);
        saved.setToken(rawNewToken);
        return saved;
    }

    /**
     * Delete a user's refresh token by user ID.
     */
    @Transactional
    public int deleteByUserId(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return refreshTokenRepository.deleteByUser(user);
    }

    // ---- internal helpers ----

    private String generateRawToken() {
        byte[] bytes = new byte[RAW_TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
