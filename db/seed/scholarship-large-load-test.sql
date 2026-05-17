-- Large scholarship-service load test dataset.
-- Inserts 10,000 opportunities, 30,000 applications, and ~20,000 bookmarks.
-- Idempotent for the 50000-59999 opportunity id range.

SET SESSION cte_max_recursion_depth = 20000;

SET @base_opp_id = 50000;
SET @opp_count = 10000;
SET @last_opp_id = @base_opp_id + @opp_count - 1;
-- Also clean up the old off-by-one edge id if this script was run before this fix.
SET @cleanup_last_opp_id = @base_opp_id + @opp_count;
SET @base_app_id = 500000;
SET @base_bookmark_id = 700000;

DELETE FROM opportunity_required_skills
WHERE opportunity_id BETWEEN @base_opp_id AND @cleanup_last_opp_id;

DELETE FROM opportunity_to_tags
WHERE opportunity_id BETWEEN @base_opp_id AND @cleanup_last_opp_id;

DELETE FROM applications
WHERE opportunity_id BETWEEN @base_opp_id AND @cleanup_last_opp_id;

DELETE FROM bookmarks
WHERE opportunity_id BETWEEN @base_opp_id AND @cleanup_last_opp_id;

DELETE FROM opportunities
WHERE id BETWEEN @base_opp_id AND @cleanup_last_opp_id;

CREATE TEMPORARY TABLE seed_numbers (
    n INT PRIMARY KEY
) ENGINE = MEMORY;

INSERT INTO seed_numbers (n)
WITH RECURSIVE seq(n) AS (
    SELECT 1
    UNION ALL
    SELECT n + 1
    FROM seq
    WHERE n < @opp_count
)
SELECT n FROM seq;

INSERT INTO opportunities (
    id,
    application_deadline,
    contact_email,
    created_at,
    creator_user_id,
    department,
    duration_months,
    end_date,
    full_description,
    is_public,
    level,
    location,
    min_gpa,
    moderation_status,
    organization_id,
    scholarship_amount,
    start_date,
    study_mode,
    title,
    university,
    updated_at,
    views_cnt,
    website
)
SELECT
    @base_opp_id + n - 1,
    CASE
        WHEN n % 4 = 0 THEN DATE_SUB(CURDATE(), INTERVAL (n % 120) DAY)
        ELSE DATE_ADD(CURDATE(), INTERVAL (n % 365) DAY)
    END,
    CONCAT('provider', 1 + (n % 5), '@edumatch.dev'),
    DATE_SUB(NOW(6), INTERVAL n MINUTE),
    2001 + (n % 5),
    CASE n % 5
        WHEN 0 THEN 'Computer Science'
        WHEN 1 THEN 'Data Science'
        WHEN 2 THEN 'Business'
        WHEN 3 THEN 'Medicine'
        ELSE 'Engineering'
    END,
    6 + (n % 24),
    DATE_ADD(CURDATE(), INTERVAL (180 + (n % 365)) DAY),
    CONCAT('Synthetic scholarship for DB load testing. Candidate profile segment ', n % 20, '.'),
    IF(n % 7 = 0, b'0', b'1'),
    CASE n % 3
        WHEN 0 THEN 'UNDERGRADUATE'
        WHEN 1 THEN 'GRADUATE'
        ELSE 'POSTGRADUATE'
    END,
    CASE n % 4
        WHEN 0 THEN 'United States'
        WHEN 1 THEN 'Vietnam'
        WHEN 2 THEN 'Singapore'
        ELSE 'Remote'
    END,
    CAST(2.50 + ((n % 16) * 0.10) AS DECIMAL(3, 2)),
    CASE
        WHEN n % 5 = 0 THEN 'PENDING'
        WHEN n % 11 = 0 THEN 'REJECTED'
        ELSE 'APPROVED'
    END,
    3001 + (n % 5),
    CAST(1000 + ((n % 80) * 250) AS DECIMAL(10, 2)),
    DATE_ADD(CURDATE(), INTERVAL (30 + (n % 120)) DAY),
    CASE n % 3
        WHEN 0 THEN 'ONLINE'
        WHEN 1 THEN 'OFFLINE'
        ELSE 'HYBRID'
    END,
    CONCAT('Load 10k Scholarship #', n),
    CASE n % 5
        WHEN 0 THEN 'MIT'
        WHEN 1 THEN 'Stanford'
        WHEN 2 THEN 'Google'
        WHEN 3 THEN 'NUS'
        ELSE 'Fulbright'
    END,
    NOW(6),
    n % 500,
    CONCAT('https://example.edu/scholarships/load-', n)
FROM seed_numbers;

INSERT IGNORE INTO opportunity_to_tags (opportunity_id, tag_id)
SELECT @base_opp_id + n - 1, 11
FROM seed_numbers;

INSERT IGNORE INTO opportunity_required_skills (opportunity_id, skill_id)
SELECT @base_opp_id + n - 1, 1
FROM seed_numbers;

INSERT IGNORE INTO opportunity_required_skills (opportunity_id, skill_id)
SELECT @base_opp_id + n - 1, 2
FROM seed_numbers
WHERE n % 2 = 0;

CREATE TEMPORARY TABLE seed_applicants (
    slot INT PRIMARY KEY,
    applicant_user_id BIGINT NOT NULL,
    applicant_user_name VARCHAR(255) NOT NULL,
    applicant_email VARCHAR(255) NOT NULL
) ENGINE = MEMORY;

INSERT INTO seed_applicants (slot, applicant_user_id, applicant_user_name, applicant_email)
VALUES
    (1, 1001, 'Student One', 'student1@edumatch.dev'),
    (2, 1002, 'Student Two', 'student2@edumatch.dev'),
    (3, 1003, 'Student Three', 'student3@edumatch.dev');

INSERT INTO applications (
    id,
    additional_info,
    applicant_email,
    applicant_user_id,
    applicant_user_name,
    cover_letter,
    github_url,
    gpa,
    linkedin_url,
    motivation,
    notes,
    opportunity_id,
    phone,
    portfolio_url,
    status,
    submitted_at
)
SELECT
    @base_app_id + ((n - 1) * 3) + a.slot,
    'Synthetic application for load testing.',
    a.applicant_email,
    a.applicant_user_id,
    a.applicant_user_name,
    'I am interested in this scholarship.',
    CONCAT('https://github.com/student', a.slot),
    CAST(2.70 + (((n + a.slot) % 14) * 0.10) AS DECIMAL(3, 2)),
    CONCAT('https://linkedin.com/in/student', a.slot),
    'Load test motivation.',
    NULL,
    @base_opp_id + n - 1,
    CONCAT('090000', LPAD(a.slot, 4, '0')),
    CONCAT('https://portfolio.example.com/student', a.slot),
    CASE (n + a.slot) % 5
        WHEN 0 THEN 'ACCEPTED'
        WHEN 1 THEN 'REJECTED'
        WHEN 2 THEN 'UNDER_REVIEW'
        WHEN 3 THEN 'VIEWED'
        ELSE 'SUBMITTED'
    END,
    DATE_SUB(NOW(6), INTERVAL ((n + a.slot) % 180) DAY)
FROM seed_numbers
JOIN seed_applicants a;

INSERT INTO bookmarks (id, applicant_user_id, opportunity_id)
SELECT
    @base_bookmark_id + ((n - 1) * 2) + b.slot,
    CASE b.slot WHEN 1 THEN 1001 ELSE 1002 END,
    @base_opp_id + n - 1
FROM seed_numbers
JOIN (
    SELECT 1 AS slot
    UNION ALL
    SELECT 2 AS slot
) b;

SELECT 'large_load_opportunities' AS table_name, COUNT(*) AS rows_count
FROM opportunities
WHERE id >= @base_opp_id
  AND id <= @last_opp_id
UNION ALL
SELECT 'large_load_applications', COUNT(*)
FROM applications
WHERE opportunity_id >= @base_opp_id
  AND opportunity_id <= @last_opp_id
UNION ALL
SELECT 'large_load_bookmarks', COUNT(*)
FROM bookmarks
WHERE opportunity_id >= @base_opp_id
  AND opportunity_id <= @last_opp_id;
