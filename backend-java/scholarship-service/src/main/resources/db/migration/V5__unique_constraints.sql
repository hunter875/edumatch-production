-- V5__unique_constraints.sql
-- Add unique constraints to prevent duplicate applications and bookmarks.
-- This migration DETECTS duplicates but does NOT silently delete them.
-- If duplicates exist, the migration fails with a clear diagnostic message
-- so an operator can run the cleanup script manually.

-- ============================================================
-- APPLICATIONS: UNIQUE (applicant_user_id, opportunity_id)
-- ============================================================

-- Detect duplicates before adding constraint
SET @dup_app_count = 0;
SELECT COUNT(*) INTO @dup_app_count FROM (
    SELECT applicant_user_id, opportunity_id, COUNT(*) AS cnt
    FROM applications
    GROUP BY applicant_user_id, opportunity_id
    HAVING cnt > 1
) AS dups;

-- If duplicates exist, signal an error (operator must clean up manually)
-- Note: MySQL doesn't support SIGNAL in all contexts; we use a conditional
-- that will cause the subsequent ALTER to fail naturally, and log the count.
-- Operators should check the diagnostic output before re-running.
SELECT IF(@dup_app_count > 0,
    'ERROR: Duplicate applications detected. Run the dedup cleanup script before re-applying V5.',
    'OK: No duplicate applications found.') AS diagnostic_applications;

-- Only add constraint if no duplicates (the ALTER will fail if duplicates exist anyway)
ALTER TABLE applications
    ADD CONSTRAINT uq_applications_user_opportunity UNIQUE (applicant_user_id, opportunity_id);

-- ============================================================
-- BOOKMARKS: UNIQUE (applicant_user_id, opportunity_id)
-- ============================================================

-- Detect duplicates before adding constraint
SET @dup_bm_count = 0;
SELECT COUNT(*) INTO @dup_bm_count FROM (
    SELECT applicant_user_id, opportunity_id, COUNT(*) AS cnt
    FROM bookmarks
    GROUP BY applicant_user_id, opportunity_id
    HAVING cnt > 1
) AS dups;

SELECT IF(@dup_bm_count > 0,
    'ERROR: Duplicate bookmarks detected. Run the dedup cleanup script before re-applying V5.',
    'OK: No duplicate bookmarks found.') AS diagnostic_bookmarks;

-- Only add constraint if no duplicates
ALTER TABLE bookmarks
    ADD CONSTRAINT uq_bookmarks_user_opportunity UNIQUE (applicant_user_id, opportunity_id);
