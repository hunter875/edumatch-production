package com.edumatch.chat.repository;

import com.edumatch.chat.model.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /**
     * Tìm tất cả các cuộc hội thoại mà một user ID cụ thể tham gia.
     * (Bao gồm cả trường hợp user là participant1 HOẶC participant2)
     */
    @Query("SELECT c FROM Conversation c WHERE c.participant1Id = :userId OR c.participant2Id = :userId")
    List<Conversation> findByParticipantId(@Param("userId") Long userId);

    /**
     * Tìm một cuộc hội thoại chính xác giữa 2 user ID.
     * (Kiểm tra cả 2 chiều: A-B và B-A)
     * Nếu có nhiều conversation (do lỗi tạo trùng), lấy conversation mới nhất (id lớn nhất)
     */
    @Query(value = "SELECT * FROM conversations c WHERE " +
            "(c.participant_1_id = :user1Id AND c.participant_2_id = :user2Id) OR " +
            "(c.participant_1_id = :user2Id AND c.participant_2_id = :user1Id) " +
            "ORDER BY c.id DESC " +
            "LIMIT 1", 
            nativeQuery = true)
    Optional<Conversation> findByParticipants(
            @Param("user1Id") Long user1Id,
            @Param("user2Id") Long user2Id
    );
}