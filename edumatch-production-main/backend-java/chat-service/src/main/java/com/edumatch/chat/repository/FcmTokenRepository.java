package com.edumatch.chat.repository;

import com.edumatch.chat.model.FcmToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FcmTokenRepository extends JpaRepository<FcmToken, Long> {

    /**
     * Tìm FcmToken theo User ID (Vì cột userId trong FcmToken là UNIQUE)
     */
    Optional<FcmToken> findByUserId(Long userId);
}