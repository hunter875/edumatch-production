package com.edumatch.chat.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "conversations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * ID của người tham gia 1.
     * Long để khớp với Auth-Service.
     */
    @Column(name = "participant_1_id", nullable = false)
    private Long participant1Id;

    /**
     * ID của người tham gia 2.
     */
    @Column(name = "participant_2_id", nullable = false)
    private Long participant2Id;

    @Column(name = "last_message_at")
    private LocalDateTime lastMessageAt;
}