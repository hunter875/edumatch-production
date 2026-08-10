-- EduMatch dev seed: matching_db
-- PostgreSQL seed for matching-service features.

ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS application_deadline DATE;
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS scholarship_amount FLOAT;
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS level VARCHAR(100);
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS study_mode VARCHAR(100);
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS is_public BOOLEAN;
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50);
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS opportunity_version VARCHAR(100);
ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS level VARCHAR(100);
ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS study_mode VARCHAR(100);
ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS profile_version VARCHAR(100);
ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS score_breakdown JSON;
ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS profile_version VARCHAR(100);
ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS opportunity_version VARCHAR(100);
ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS cache_version VARCHAR(255);

INSERT INTO applicant_features (
  id, applicant_id, gpa, major, university, year_of_study,
  level, study_mode, location, profile_version,
  skills, research_interests, skills_vector, research_vector, combined_text,
  created_at, updated_at, last_processed_at
) VALUES
  ('00000000-0000-0000-0000-000000001001', '1001', 3.82, 'Computer Science', 'Vietnam National University', 3,
   'UNDERGRADUATE', 'ONLINE', 'Remote', 'seed-v1',
   ARRAY['Python','Machine Learning','React','SQL'],
   ARRAY['Artificial Intelligence','Natural Language Processing','Education Technology'],
   '[4,3,2,1]'::json, '[3,2,2]'::json,
   'Python Machine Learning React SQL Artificial Intelligence Natural Language Processing Education Technology',
   NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000001002', '1002', 3.55, 'Cybersecurity', 'Hanoi University of Science and Technology', 4,
   'GRADUATE', 'HYBRID', 'Stanford, CA', 'seed-v1',
   ARRAY['Java','Spring Boot','Security','Networking'],
   ARRAY['Cybersecurity','Distributed Systems','Privacy'],
   '[3,3,2,2]'::json, '[3,2,1]'::json,
   'Java Spring Boot Security Networking Cybersecurity Distributed Systems Privacy',
   NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000001003', '1003', 3.28, 'Data Science', 'University of Science Ho Chi Minh City', 2,
   'UNDERGRADUATE', 'HYBRID', 'Ho Chi Minh City', 'seed-v1',
   ARRAY['Python','SQL','Statistics','Data Visualization'],
   ARRAY['Healthcare Analytics','Cloud Computing','Human-centered AI'],
   '[4,3,3,2]'::json, '[3,3,2]'::json,
   'Python SQL Statistics Data Visualization Healthcare Analytics Cloud Computing Human-centered AI',
   NOW(), NOW(), NOW())
ON CONFLICT (applicant_id) DO UPDATE SET
  gpa = EXCLUDED.gpa,
  major = EXCLUDED.major,
  university = EXCLUDED.university,
  year_of_study = EXCLUDED.year_of_study,
  level = EXCLUDED.level,
  study_mode = EXCLUDED.study_mode,
  location = EXCLUDED.location,
  profile_version = EXCLUDED.profile_version,
  skills = EXCLUDED.skills,
  research_interests = EXCLUDED.research_interests,
  skills_vector = EXCLUDED.skills_vector,
  research_vector = EXCLUDED.research_vector,
  combined_text = EXCLUDED.combined_text,
  updated_at = NOW(),
  last_processed_at = NOW();

INSERT INTO opportunity_features (
  id, opportunity_id, opportunity_type, title, description, min_gpa,
  application_deadline, scholarship_amount, level, study_mode, location, is_public, moderation_status,
  required_skills, preferred_majors, research_areas, skills_vector,
  research_vector, combined_text, created_at, updated_at, last_processed_at, opportunity_version
) VALUES
  ('00000000-0000-0000-0000-000000011001', '1001', 'scholarship', 'MIT AI Research Fellowship 2026', 'Applied AI, NLP, and education technology fellowship.', 3.60,
   CURRENT_DATE + 300, 18000, 'UNDERGRADUATE', 'HYBRID', 'Cambridge, MA', TRUE, 'APPROVED',
   ARRAY['Python','Machine Learning','Deep Learning','NLP','Research Writing'],
   ARRAY['Computer Science','Data Science'], ARRAY['Artificial Intelligence','Natural Language Processing'],
   '[5,4,3,3,2]'::json, '[4,3]'::json,
   'Python Machine Learning Deep Learning NLP Research Writing Artificial Intelligence Natural Language Processing',
   NOW(), NOW(), NOW(), 'seed-v1'),
  ('00000000-0000-0000-0000-000000011002', '1002', 'scholarship', 'Stanford Cybersecurity Graduate Scholarship', 'Secure systems, privacy, network defense, and cryptography.', 3.40,
   CURRENT_DATE + 260, 16000, 'GRADUATE', 'ONSITE', 'Stanford, CA', TRUE, 'APPROVED',
   ARRAY['Java','Cybersecurity','Networking','Research Writing'],
   ARRAY['Cybersecurity','Computer Science'], ARRAY['Cybersecurity','Privacy','Distributed Systems'],
   '[4,4,3,2]'::json, '[4,3,2]'::json,
   'Java Cybersecurity Networking Research Writing Privacy Distributed Systems',
   NOW(), NOW(), NOW(), 'seed-v1'),
  ('00000000-0000-0000-0000-000000011003', '1003', 'scholarship', 'Google Education Cloud Scholarship', 'Cloud and data products for education access.', 3.20,
   CURRENT_DATE + 220, 14000, 'UNDERGRADUATE', 'REMOTE', 'Remote', TRUE, 'APPROVED',
   ARRAY['Cloud','Python','SQL','Data Visualization'],
   ARRAY['Computer Science','Information Systems'], ARRAY['Cloud Computing','Education Technology'],
   '[4,3,3,2]'::json, '[3,2]'::json,
   'Cloud Python SQL Data Visualization Cloud Computing Education Technology',
   NOW(), NOW(), NOW(), 'seed-v1'),
  ('00000000-0000-0000-0000-000000011004', '1004', 'scholarship', 'Healthcare Data Science Grant', 'Statistics and machine learning for healthcare operations.', 3.30,
   CURRENT_DATE + 180, 12000, 'UNDERGRADUATE', 'HYBRID', 'Ho Chi Minh City', TRUE, 'APPROVED',
   ARRAY['Python','Statistics','Machine Learning','Data Visualization'],
   ARRAY['Data Science','Public Health'], ARRAY['Healthcare','Machine Learning'],
   '[4,3,3,2]'::json, '[3,3]'::json,
   'Python Statistics Machine Learning Data Visualization Healthcare',
   NOW(), NOW(), NOW(), 'seed-v1'),
  ('00000000-0000-0000-0000-000000011005', '1005', 'scholarship', 'NLP for Education Scholarship', 'NLP and tutoring systems for personalized learning.', 3.10,
   CURRENT_DATE + 150, 10000, 'UNDERGRADUATE', 'REMOTE', 'Remote', TRUE, 'APPROVED',
   ARRAY['Python','NLP','React','Machine Learning'],
   ARRAY['Computer Science'], ARRAY['Natural Language Processing','Education Technology'],
   '[4,3,2,3]'::json, '[4,3]'::json,
   'Python NLP React Machine Learning Natural Language Processing Education Technology',
   NOW(), NOW(), NOW(), 'seed-v1'),
  ('00000000-0000-0000-0000-000000011006', '1006', 'scholarship', 'Distributed Systems Research Assistantship', 'Backend Java and distributed systems assistantship.', 3.50,
   CURRENT_DATE + 120, 11000, 'GRADUATE', 'ONSITE', 'Hanoi', TRUE, 'APPROVED',
   ARRAY['Java','Spring Boot','Cloud','Networking'],
   ARRAY['Computer Science'], ARRAY['Distributed Systems','Cloud Computing'],
   '[4,3,3,2]'::json, '[4,3]'::json,
   'Java Spring Boot Cloud Networking Distributed Systems',
   NOW(), NOW(), NOW(), 'seed-v1')
ON CONFLICT (opportunity_id) DO UPDATE SET
  opportunity_type = EXCLUDED.opportunity_type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  min_gpa = EXCLUDED.min_gpa,
  application_deadline = EXCLUDED.application_deadline,
  scholarship_amount = EXCLUDED.scholarship_amount,
  level = EXCLUDED.level,
  study_mode = EXCLUDED.study_mode,
  location = EXCLUDED.location,
  is_public = EXCLUDED.is_public,
  moderation_status = EXCLUDED.moderation_status,
  required_skills = EXCLUDED.required_skills,
  preferred_majors = EXCLUDED.preferred_majors,
  research_areas = EXCLUDED.research_areas,
  skills_vector = EXCLUDED.skills_vector,
  research_vector = EXCLUDED.research_vector,
  combined_text = EXCLUDED.combined_text,
  opportunity_version = EXCLUDED.opportunity_version,
  updated_at = NOW(),
  last_processed_at = NOW();

DELETE FROM matching_scores
WHERE applicant_id IN ('1001', '1002', '1003')
  AND opportunity_id IN ('1001', '1002', '1003', '1004', '1005', '1006');

INSERT INTO matching_scores (
  id, applicant_id, opportunity_id, overall_score, gpa_score, skills_score,
  research_score, calculated_at, expires_at
) VALUES
  ('10000000-0000-0000-0000-000000001001', '1001', '1001', 88.0, 92.0, 86.0, 86.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000001002', '1001', '1002', 39.0, 90.0, 18.0, 25.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000001003', '1001', '1003', 70.0, 95.0, 56.0, 72.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000001004', '1001', '1004', 76.0, 94.0, 70.0, 60.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000001005', '1001', '1005', 84.0, 96.0, 82.0, 75.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000001006', '1001', '1006', 31.0, 91.0, 15.0, 20.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000002001', '1002', '1001', 0.0, 0.0, 0.0, 0.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000002002', '1002', '1002', 82.0, 84.0, 82.0, 80.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000002003', '1002', '1003', 45.0, 72.0, 36.0, 31.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000002004', '1002', '1004', 38.0, 68.0, 22.0, 40.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000002005', '1002', '1005', 29.0, 76.0, 12.0, 20.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000002006', '1002', '1006', 86.0, 82.0, 90.0, 84.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000003001', '1003', '1001', 54.0, 70.0, 52.0, 40.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000003002', '1003', '1002', 0.0, 0.0, 0.0, 0.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000003003', '1003', '1003', 79.0, 82.0, 78.0, 76.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000003004', '1003', '1004', 0.0, 0.0, 0.0, 0.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000003005', '1003', '1005', 67.0, 86.0, 58.0, 62.0, NOW(), NULL),
  ('10000000-0000-0000-0000-000000003006', '1003', '1006', 0.0, 0.0, 0.0, 0.0, NOW(), NULL);

CREATE INDEX IF NOT EXISTS ix_matching_score_applicant_opportunity
  ON matching_scores (applicant_id, opportunity_id);
CREATE INDEX IF NOT EXISTS ix_matching_score_applicant_score
  ON matching_scores (applicant_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS ix_matching_score_expires
  ON matching_scores (expires_at);
CREATE INDEX IF NOT EXISTS ix_recommendation_target_score
  ON recommendation_cache (target_type, target_id, matching_score DESC);
CREATE INDEX IF NOT EXISTS ix_recommendation_expires
  ON recommendation_cache (expires_at);

DO $$
DECLARE
  i INT;
  applicant RECORD;
  opp_id TEXT;
  min_gpa FLOAT;
  dynamic_skill TEXT;
  dynamic_major TEXT;
  dynamic_research TEXT;
  skill_score FLOAT;
  major_score FLOAT;
  gpa_score FLOAT;
  research_score FLOAT;
  overall_score FLOAT;
BEGIN
  FOR i IN 1..100 LOOP
    opp_id := (20000 + i)::TEXT;
    min_gpa := ROUND((2.50 + (MOD(i, 16)::FLOAT / 10.0))::NUMERIC, 2)::FLOAT;
    dynamic_skill := (ARRAY['Java', 'SQL', 'Cloud', 'Machine Learning', 'Research Writing', 'Cybersecurity', 'React'])[1 + MOD(i, 7)];
    dynamic_major := (ARRAY['Computer Science', 'Data Science', 'Cybersecurity', 'Information Systems', 'Education Technology'])[1 + MOD(i, 5)];
    dynamic_research := (ARRAY['Artificial Intelligence', 'Healthcare Analytics', 'Cloud Computing', 'Privacy', 'Education Technology'])[1 + MOD(i, 5)];

    INSERT INTO opportunity_features (
      id, opportunity_id, opportunity_type, title, description, min_gpa,
      application_deadline, scholarship_amount, level, study_mode, location, is_public, moderation_status,
      required_skills, preferred_majors, research_areas, skills_vector,
      research_vector, combined_text, created_at, updated_at, last_processed_at
    ) VALUES (
      ('00000000-0000-0000-0000-' || LPAD((20000 + i)::TEXT, 12, '0'))::UUID,
      opp_id,
      'scholarship',
      'Load Test Scholarship #' || i,
      'Generated matching feature for load-test scholarship #' || i,
      min_gpa,
      CURRENT_DATE + (90 + MOD(i, 240)),
      5000 + (i * 75),
      (ARRAY['UNDERGRADUATE', 'GRADUATE', 'ANY'])[1 + MOD(i, 3)],
      (ARRAY['REMOTE', 'HYBRID', 'ONSITE'])[1 + MOD(i, 3)],
      (ARRAY['Remote', 'Hanoi', 'Ho Chi Minh City', 'Da Nang'])[1 + MOD(i, 4)],
      TRUE,
      'APPROVED',
      ARRAY['Python', dynamic_skill],
      ARRAY[dynamic_major],
      ARRAY[dynamic_research],
      to_json(ARRAY[3 + MOD(i, 4), 2 + MOD(i, 3)]),
      to_json(ARRAY[2 + MOD(i, 4)]),
      'Python ' || dynamic_skill || ' ' || dynamic_major || ' ' || dynamic_research,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (opportunity_id) DO UPDATE SET
      opportunity_type = EXCLUDED.opportunity_type,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      min_gpa = EXCLUDED.min_gpa,
      application_deadline = EXCLUDED.application_deadline,
      scholarship_amount = EXCLUDED.scholarship_amount,
      level = EXCLUDED.level,
      study_mode = EXCLUDED.study_mode,
      location = EXCLUDED.location,
      is_public = EXCLUDED.is_public,
      moderation_status = EXCLUDED.moderation_status,
      required_skills = EXCLUDED.required_skills,
      preferred_majors = EXCLUDED.preferred_majors,
      research_areas = EXCLUDED.research_areas,
      skills_vector = EXCLUDED.skills_vector,
      research_vector = EXCLUDED.research_vector,
      combined_text = EXCLUDED.combined_text,
      updated_at = NOW(),
      last_processed_at = NOW();
  END LOOP;

  DELETE FROM matching_scores
  WHERE applicant_id IN ('1001', '1002', '1003')
    AND opportunity_id ~ '^[0-9]+$'
    AND opportunity_id::INT BETWEEN 20001 AND 20100;

  FOR i IN 1..100 LOOP
    opp_id := (20000 + i)::TEXT;
    min_gpa := ROUND((2.50 + (MOD(i, 16)::FLOAT / 10.0))::NUMERIC, 2)::FLOAT;
    dynamic_skill := (ARRAY['Java', 'SQL', 'Cloud', 'Machine Learning', 'Research Writing', 'Cybersecurity', 'React'])[1 + MOD(i, 7)];
    dynamic_major := (ARRAY['Computer Science', 'Data Science', 'Cybersecurity', 'Information Systems', 'Education Technology'])[1 + MOD(i, 5)];
    dynamic_research := (ARRAY['Artificial Intelligence', 'Healthcare Analytics', 'Cloud Computing', 'Privacy', 'Education Technology'])[1 + MOD(i, 5)];

    FOR applicant IN
      SELECT *
      FROM (
        VALUES
          ('1001', 3.82::FLOAT, ARRAY['Python','Machine Learning','React','SQL'], 'Computer Science', ARRAY['Artificial Intelligence','Natural Language Processing','Education Technology'], 1),
          ('1002', 3.55::FLOAT, ARRAY['Java','Spring Boot','Security','Networking'], 'Cybersecurity', ARRAY['Cybersecurity','Distributed Systems','Privacy'], 2),
          ('1003', 3.28::FLOAT, ARRAY['Python','SQL','Statistics','Data Visualization'], 'Data Science', ARRAY['Healthcare Analytics','Cloud Computing','Human-centered AI'], 3)
      ) AS a(applicant_id, gpa, skills, major, research_interests, ordinal)
    LOOP
      IF applicant.gpa < min_gpa THEN
        gpa_score := 0.0;
        skill_score := 0.0;
        major_score := 0.0;
        research_score := 0.0;
        overall_score := 0.0;
      ELSE
        gpa_score := LEAST(100.0, 75.0 + ((applicant.gpa - min_gpa) * 20.0));
        skill_score := CASE
          WHEN 'Python' = ANY(applicant.skills) AND dynamic_skill = ANY(applicant.skills) THEN 100.0
          WHEN 'Python' = ANY(applicant.skills) OR dynamic_skill = ANY(applicant.skills) THEN 65.0
          ELSE 20.0
        END;
        major_score := CASE
          WHEN LOWER(applicant.major) = LOWER(dynamic_major) THEN 100.0
          WHEN LOWER(applicant.major) LIKE '%' || SPLIT_PART(LOWER(dynamic_major), ' ', 1) || '%' THEN 70.0
          ELSE 35.0
        END;
        research_score := CASE
          WHEN dynamic_research = ANY(applicant.research_interests) THEN 100.0
          ELSE 50.0
        END;
        overall_score := ROUND((
          skill_score * 0.35
          + major_score * 0.25
          + gpa_score * 0.15
          + 75.0 * 0.10
          + 75.0 * 0.10
          + 65.0 * 0.05
        )::NUMERIC, 2)::FLOAT;
      END IF;

      INSERT INTO matching_scores (
        id, applicant_id, opportunity_id, overall_score, gpa_score, skills_score,
        research_score, calculated_at, expires_at
      ) VALUES (
        ('20000000-0000-0000-0000-' || LPAD((applicant.ordinal * 100000 + i)::TEXT, 12, '0'))::UUID,
        applicant.applicant_id,
        opp_id,
        overall_score,
        gpa_score,
        skill_score,
        research_score,
        NOW(),
        NULL
      );
    END LOOP;
  END LOOP;

  DELETE FROM recommendation_cache
  WHERE target_type = 'applicant'
    AND target_id IN ('1001', '1002', '1003')
    AND candidate_type = 'opportunity';

  INSERT INTO recommendation_cache (
    id, target_type, target_id, candidate_type, candidate_id, matching_score,
    calculated_at, expires_at
  )
  SELECT
    (
      SUBSTR(MD5('applicant:' || ms.applicant_id || ':opportunity:' || ms.opportunity_id), 1, 8) || '-' ||
      SUBSTR(MD5('applicant:' || ms.applicant_id || ':opportunity:' || ms.opportunity_id), 9, 4) || '-' ||
      SUBSTR(MD5('applicant:' || ms.applicant_id || ':opportunity:' || ms.opportunity_id), 13, 4) || '-' ||
      SUBSTR(MD5('applicant:' || ms.applicant_id || ':opportunity:' || ms.opportunity_id), 17, 4) || '-' ||
      SUBSTR(MD5('applicant:' || ms.applicant_id || ':opportunity:' || ms.opportunity_id), 21, 12)
    )::UUID,
    'applicant',
    ms.applicant_id,
    'opportunity',
    ms.opportunity_id,
    ms.overall_score,
    NOW(),
    NULL
  FROM matching_scores ms
  JOIN applicant_features af ON af.applicant_id = ms.applicant_id
  JOIN opportunity_features ofe ON ofe.opportunity_id = ms.opportunity_id
  WHERE ms.applicant_id IN ('1001', '1002', '1003')
    AND ms.overall_score > 0
    AND COALESCE(ofe.is_public, TRUE) = TRUE
    AND COALESCE(LOWER(ofe.moderation_status), 'approved') IN ('approved', 'active', 'published')
    AND (ofe.application_deadline IS NULL OR ofe.application_deadline >= CURRENT_DATE)
    AND (af.gpa IS NULL OR ofe.min_gpa IS NULL OR af.gpa >= ofe.min_gpa)
    AND (
      af.level IS NULL OR ofe.level IS NULL
      OR LOWER(ofe.level) IN ('any', 'all', 'flexible')
      OR LOWER(af.level) = LOWER(ofe.level)
    )
  ORDER BY ms.applicant_id, ms.overall_score DESC
  ON CONFLICT (id) DO UPDATE SET
    matching_score = EXCLUDED.matching_score,
    calculated_at = NOW(),
    expires_at = NULL;
END $$;
