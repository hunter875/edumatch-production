package com.example.jwt.example.repository;

import com.example.jwt.example.model.RevokedRefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RevokedRefreshTokenRepository extends JpaRepository<RevokedRefreshToken, Long> {
    Optional<RevokedRefreshToken> findByTokenHash(String tokenHash);
}
