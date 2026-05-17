-- Optional MVP search indexes for scholarship keyword search.
-- Apply this only when the application search query is changed from LIKE '%keyword%'
-- to MATCH(title, full_description) AGAINST (...).

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
