SET @schema_name = DATABASE();

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'organizations'
      AND index_name = 'idx_organizations_name'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE organizations ADD INDEX idx_organizations_name (name)',
    'SELECT ''idx_organizations_name already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'organizations'
      AND index_name = 'idx_organizations_type'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE organizations ADD INDEX idx_organizations_type (organization_type)',
    'SELECT ''idx_organizations_type already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'organizations'
      AND index_name = 'idx_organizations_active'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE organizations ADD INDEX idx_organizations_active (is_active)',
    'SELECT ''idx_organizations_active already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'users'
      AND index_name = 'idx_users_gpa'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE users ADD INDEX idx_users_gpa (gpa)',
    'SELECT ''idx_users_gpa already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'users'
      AND index_name = 'idx_users_major'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE users ADD INDEX idx_users_major (major)',
    'SELECT ''idx_users_major already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'users'
      AND index_name = 'idx_users_university'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE users ADD INDEX idx_users_university (university)',
    'SELECT ''idx_users_university already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'organization_requests'
      AND index_name = 'idx_organization_requests_user_id'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE organization_requests ADD INDEX idx_organization_requests_user_id (user_id)',
    'SELECT ''idx_organization_requests_user_id already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'organization_requests'
      AND index_name = 'idx_organization_requests_status'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE organization_requests ADD INDEX idx_organization_requests_status (status)',
    'SELECT ''idx_organization_requests_status already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'organization_requests'
      AND index_name = 'idx_organization_requests_created_at'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE organization_requests ADD INDEX idx_organization_requests_created_at (created_at DESC)',
    'SELECT ''idx_organization_requests_created_at already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
