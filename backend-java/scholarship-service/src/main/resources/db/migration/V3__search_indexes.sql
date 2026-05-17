-- Search architecture indexes.
-- Level 3: public scholarship content search.
-- Level 1/2: admin/provider filter + prefix lookup.

SET @schema_name = DATABASE();

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'opportunities'
      AND index_name = 'ft_opportunities_title_description'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE opportunities ADD FULLTEXT INDEX ft_opportunities_title_description (title, full_description)',
    'SELECT ''ft_opportunities_title_description already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'opportunities'
      AND index_name = 'idx_opportunities_title'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE opportunities ADD INDEX idx_opportunities_title (title)',
    'SELECT ''idx_opportunities_title already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'opportunities'
      AND index_name = 'idx_opportunities_moderation_title_created'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE opportunities ADD INDEX idx_opportunities_moderation_title_created (moderation_status, title, created_at)',
    'SELECT ''idx_opportunities_moderation_title_created already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'applications'
      AND index_name = 'idx_applications_applicant_email'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE applications ADD INDEX idx_applications_applicant_email (applicant_email)',
    'SELECT ''idx_applications_applicant_email already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'applications'
      AND index_name = 'idx_applications_applicant_user_name'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE applications ADD INDEX idx_applications_applicant_user_name (applicant_user_name)',
    'SELECT ''idx_applications_applicant_user_name already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'applications'
      AND index_name = 'idx_applications_status_submitted'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE applications ADD INDEX idx_applications_status_submitted (status, submitted_at)',
    'SELECT ''idx_applications_status_submitted already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(1)
    FROM information_schema.statistics
    WHERE table_schema = @schema_name
      AND table_name = 'applications'
      AND index_name = 'idx_applications_opportunity_status_submitted'
);
SET @sql = IF(
    @idx_exists = 0,
    'ALTER TABLE applications ADD INDEX idx_applications_opportunity_status_submitted (opportunity_id, status, submitted_at)',
    'SELECT ''idx_applications_opportunity_status_submitted already exists'' AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
