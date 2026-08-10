-- Scholarship service indexes for browse, provider analytics, applications, and bookmarks.
-- Safe to run more than once: each statement checks information_schema first.

SET @schema_name = DATABASE();

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'opportunities'
      AND index_name = 'idx_opportunities_public_status_deadline_created'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE opportunities ADD INDEX idx_opportunities_public_status_deadline_created (is_public, moderation_status, application_deadline, created_at)',
    'SELECT ''idx_opportunities_public_status_deadline_created already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'opportunities'
      AND index_name = 'idx_opportunities_creator'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE opportunities ADD INDEX idx_opportunities_creator (creator_user_id)',
    'SELECT ''idx_opportunities_creator already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'opportunities'
      AND index_name = 'idx_opportunities_public_status_created'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE opportunities ADD INDEX idx_opportunities_public_status_created (is_public, moderation_status, created_at)',
    'SELECT ''idx_opportunities_public_status_created already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'opportunities'
      AND index_name = 'idx_opportunities_creator_deadline'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE opportunities ADD INDEX idx_opportunities_creator_deadline (creator_user_id, application_deadline)',
    'SELECT ''idx_opportunities_creator_deadline already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'opportunities'
      AND index_name = 'idx_opportunities_moderation_status'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE opportunities ADD INDEX idx_opportunities_moderation_status (moderation_status)',
    'SELECT ''idx_opportunities_moderation_status already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'opportunities'
      AND index_name = 'idx_opportunities_application_deadline'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE opportunities ADD INDEX idx_opportunities_application_deadline (application_deadline)',
    'SELECT ''idx_opportunities_application_deadline already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'applications'
      AND index_name = 'idx_applications_applicant_opportunity'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE applications ADD INDEX idx_applications_applicant_opportunity (applicant_user_id, opportunity_id)',
    'SELECT ''idx_applications_applicant_opportunity already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'applications'
      AND index_name = 'idx_applications_opportunity_status'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE applications ADD INDEX idx_applications_opportunity_status (opportunity_id, status)',
    'SELECT ''idx_applications_opportunity_status already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'applications'
      AND index_name = 'idx_applications_opportunity_submitted'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE applications ADD INDEX idx_applications_opportunity_submitted (opportunity_id, submitted_at)',
    'SELECT ''idx_applications_opportunity_submitted already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'applications'
      AND index_name = 'idx_applications_status'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE applications ADD INDEX idx_applications_status (status)',
    'SELECT ''idx_applications_status already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'bookmarks'
      AND index_name = 'idx_bookmarks_applicant_opportunity'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE bookmarks ADD INDEX idx_bookmarks_applicant_opportunity (applicant_user_id, opportunity_id)',
    'SELECT ''idx_bookmarks_applicant_opportunity already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'bookmarks'
      AND index_name = 'idx_bookmarks_opportunity'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE bookmarks ADD INDEX idx_bookmarks_opportunity (opportunity_id)',
    'SELECT ''idx_bookmarks_opportunity already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
