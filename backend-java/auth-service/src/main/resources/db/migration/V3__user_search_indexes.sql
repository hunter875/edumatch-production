-- Admin user search/filter indexes.
-- username/email already have unique indexes from V1.

SET @schema_name = DATABASE();

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'users'
      AND index_name = 'idx_users_first_name'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE users ADD INDEX idx_users_first_name (first_name)',
    'SELECT ''idx_users_first_name already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'users'
      AND index_name = 'idx_users_last_name'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE users ADD INDEX idx_users_last_name (last_name)',
    'SELECT ''idx_users_last_name already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'users'
      AND index_name = 'idx_users_enabled'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE users ADD INDEX idx_users_enabled (enabled)',
    'SELECT ''idx_users_enabled already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'users'
      AND index_name = 'idx_users_created_at'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE users ADD INDEX idx_users_created_at (created_at)',
    'SELECT ''idx_users_created_at already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'user_roles'
      AND index_name = 'idx_user_roles_role_user'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE user_roles ADD INDEX idx_user_roles_role_user (role_id, user_id)',
    'SELECT ''idx_user_roles_role_user already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
