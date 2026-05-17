-- EduMatch load-test seed: scholarship_db
-- Creates about 100 rows to expose slow list/search/application paths without
-- making local QA painfully heavy.

SET NAMES utf8mb4;

INSERT INTO tags (name) VALUES
  ('Load Test'), ('AI'), ('Cybersecurity'), ('Data Science'), ('Cloud'), ('Research')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO skills (name) VALUES
  ('Python'), ('Java'), ('SQL'), ('Cloud'), ('Machine Learning'), ('Research Writing'), ('Cybersecurity'), ('React')
ON DUPLICATE KEY UPDATE name = VALUES(name);

DROP PROCEDURE IF EXISTS seed_scholarship_load_test;

DELIMITER //
CREATE PROCEDURE seed_scholarship_load_test()
BEGIN
  DECLARE i INT DEFAULT 1;
  DECLARE opp_id BIGINT;
  DECLARE app_id_one BIGINT;
  DECLARE app_id_two BIGINT;
  DECLARE app_id_three BIGINT;

  WHILE i <= 100 DO
    SET opp_id = 20000 + i;

    INSERT INTO opportunities (
      id, title, full_description, creator_user_id, organization_id,
      application_deadline, start_date, end_date, scholarship_amount, min_gpa,
      contact_email, website, location, university, department, duration_months,
      study_mode, level, is_public, moderation_status, views_cnt, created_at, updated_at
    ) VALUES (
      opp_id,
      CONCAT('Load Test Scholarship #', i),
      CONCAT('Generated opportunity for performance testing. Track query count, pagination cost, and DTO mapping speed. Batch ', MOD(i, 10), '.'),
      ELT(1 + MOD(i, 5), 2001, 2002, 2003, 2004, 2005),
      ELT(1 + MOD(i, 5), 101, 102, 103, 104, 105),
      DATE_ADD(CURDATE(), INTERVAL (30 + MOD(i, 180)) DAY),
      DATE_ADD(CURDATE(), INTERVAL (60 + MOD(i, 180)) DAY),
      DATE_ADD(CURDATE(), INTERVAL (420 + MOD(i, 180)) DAY),
      10000 + (MOD(i, 120) * 250),
      ROUND(2.50 + (MOD(i, 16) / 10), 2),
      'loadtest@edumatch.dev',
      'https://example.com/load-test',
      ELT(1 + MOD(i, 4), 'Remote', 'Cambridge, MA', 'Stanford, CA', 'Mountain View, CA'),
      ELT(1 + MOD(i, 5), 'MIT', 'Stanford University', 'Google Education', 'EduMatch Teacher Academy', 'Global Teaching Fellows'),
      ELT(1 + MOD(i, 5), 'Computer Science', 'Data Science', 'Security Lab', 'Cloud Platform', 'Education AI'),
      6 + MOD(i, 18),
      ELT(1 + MOD(i, 4), 'FULL_TIME', 'PART_TIME', 'ONLINE', 'HYBRID'),
      ELT(1 + MOD(i, 4), 'UNDERGRADUATE', 'MASTER', 'PHD', 'RESEARCH'),
      true,
      'APPROVED',
      MOD(i * 13, 5000),
      NOW(),
      NOW()
    )
    ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      full_description = VALUES(full_description),
      creator_user_id = VALUES(creator_user_id),
      organization_id = VALUES(organization_id),
      application_deadline = VALUES(application_deadline),
      start_date = VALUES(start_date),
      end_date = VALUES(end_date),
      scholarship_amount = VALUES(scholarship_amount),
      min_gpa = VALUES(min_gpa),
      contact_email = VALUES(contact_email),
      website = VALUES(website),
      location = VALUES(location),
      university = VALUES(university),
      department = VALUES(department),
      duration_months = VALUES(duration_months),
      study_mode = VALUES(study_mode),
      level = VALUES(level),
      is_public = VALUES(is_public),
      moderation_status = VALUES(moderation_status),
      views_cnt = VALUES(views_cnt),
      updated_at = NOW();

    DELETE FROM opportunity_to_tags WHERE opportunity_id = opp_id;
    DELETE FROM opportunity_required_skills WHERE opportunity_id = opp_id;

    INSERT INTO opportunity_to_tags (opportunity_id, tag_id)
    SELECT opp_id, id
    FROM tags
    WHERE name IN ('Load Test', ELT(1 + MOD(i, 5), 'AI', 'Cybersecurity', 'Data Science', 'Cloud', 'Research'));

    INSERT INTO opportunity_required_skills (opportunity_id, skill_id)
    SELECT opp_id, id
    FROM skills
    WHERE name IN ('Python', ELT(1 + MOD(i, 7), 'Java', 'SQL', 'Cloud', 'Machine Learning', 'Research Writing', 'Cybersecurity', 'React'));

    SET app_id_one = 30000 + i;
    SET app_id_two = 30500 + i;
    SET app_id_three = 31000 + i;

    INSERT INTO applications (
      id, applicant_user_id, opportunity_id, status, submitted_at, notes,
      applicant_user_name, applicant_email, phone, gpa, cover_letter, motivation,
      additional_info, portfolio_url, linkedin_url, github_url
    ) VALUES
      (
        app_id_one, 1001, opp_id,
        ELT(1 + MOD(i, 4), 'PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'),
        DATE_SUB(NOW(), INTERVAL MOD(i, 45) DAY),
        NULL,
        'Linh Nguyen',
        'student1@edumatch.dev',
        '+84-900-000-001',
        3.82,
        'Generated load-test application for Linh.',
        'Testing scholarship recommendation and application list behavior.',
        'Load test row.',
        'https://portfolio.example.com/linh',
        'https://linkedin.com/in/linh-demo',
        'https://github.com/linh-demo'
      ),
      (
        app_id_two, 1002, opp_id,
        ELT(1 + MOD(i + 1, 4), 'PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'),
        DATE_SUB(NOW(), INTERVAL MOD(i + 7, 45) DAY),
        NULL,
        'Minh Tran',
        'student2@edumatch.dev',
        '+84-900-000-002',
        3.55,
        'Generated load-test application for Minh.',
        'Testing provider application dashboards with more rows.',
        'Load test row.',
        'https://portfolio.example.com/minh',
        'https://linkedin.com/in/minh-demo',
        'https://github.com/minh-demo'
      ),
      (
        app_id_three, 1003, opp_id,
        ELT(1 + MOD(i + 2, 4), 'PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED'),
        DATE_SUB(NOW(), INTERVAL MOD(i + 13, 45) DAY),
        NULL,
        'An Pham',
        'student3@edumatch.dev',
        '+84-900-000-003',
        3.28,
        'Generated load-test application for An.',
        'Testing applicant history and recommendation behavior with a third user.',
        'Load test row.',
        'https://portfolio.example.com/an',
        'https://linkedin.com/in/an-demo',
        'https://github.com/an-demo'
      )
    ON DUPLICATE KEY UPDATE
      status = VALUES(status),
      submitted_at = VALUES(submitted_at),
      applicant_user_name = VALUES(applicant_user_name),
      applicant_email = VALUES(applicant_email),
      phone = VALUES(phone),
      gpa = VALUES(gpa),
      cover_letter = VALUES(cover_letter),
      motivation = VALUES(motivation),
      additional_info = VALUES(additional_info),
      portfolio_url = VALUES(portfolio_url),
      linkedin_url = VALUES(linkedin_url),
      github_url = VALUES(github_url);

    IF i <= 80 THEN
      INSERT INTO bookmarks (id, applicant_user_id, opportunity_id) VALUES
        (40000 + i, 1001, opp_id),
        (40100 + i, 1002, opp_id),
        (40200 + i, 1003, opp_id)
      ON DUPLICATE KEY UPDATE
        applicant_user_id = VALUES(applicant_user_id),
        opportunity_id = VALUES(opportunity_id);
    END IF;

    SET i = i + 1;
  END WHILE;
END//
DELIMITER ;

CALL seed_scholarship_load_test();
DROP PROCEDURE IF EXISTS seed_scholarship_load_test;
