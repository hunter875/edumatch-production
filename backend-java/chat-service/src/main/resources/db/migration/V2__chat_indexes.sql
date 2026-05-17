-- Chat service indexes for conversation list, message history, and notification feed.
-- Safe to run more than once: each statement checks information_schema first.

SET @schema_name = DATABASE();

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'conversations'
      AND index_name = 'idx_conversations_p1_last'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE conversations ADD INDEX idx_conversations_p1_last (participant_1_id, last_message_at DESC)',
    'SELECT ''idx_conversations_p1_last already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'conversations'
      AND index_name = 'idx_conversations_p2_last'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE conversations ADD INDEX idx_conversations_p2_last (participant_2_id, last_message_at DESC)',
    'SELECT ''idx_conversations_p2_last already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'messages'
      AND index_name = 'idx_messages_conversation_sent'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE messages ADD INDEX idx_messages_conversation_sent (conversation_id, sent_at DESC)',
    'SELECT ''idx_messages_conversation_sent already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'notifications'
      AND index_name = 'idx_notification_user_id'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE notifications ADD INDEX idx_notification_user_id (user_id)',
    'SELECT ''idx_notification_user_id already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'notifications'
      AND index_name = 'idx_notifications_user_created'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE notifications ADD INDEX idx_notifications_user_created (user_id, created_at DESC)',
    'SELECT ''idx_notifications_user_created already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
