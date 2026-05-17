package com.edumatch.chat.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "fcm_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FcmToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * ID của người dùng sở hữu token.
     * UNIQUE = true vì một user chỉ có 1 token (mới nhất).
     */
    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "device_token", nullable = false)
    private String deviceToken;
}