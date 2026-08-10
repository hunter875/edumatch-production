-- EduMatch dev seed: scholarship_db
-- Depends on logical auth user ids from auth-dev.sql.

SET NAMES utf8mb4;

INSERT INTO tags (name) VALUES
  ('AI'), ('Machine Learning'), ('Cybersecurity'), ('Data Science'),
  ('Research'), ('Graduate'), ('Undergraduate'), ('Cloud'), ('NLP'), ('Healthcare')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO skills (name) VALUES
  ('Python'), ('Machine Learning'), ('Deep Learning'), ('NLP'), ('SQL'),
  ('Java'), ('Spring Boot'), ('Cybersecurity'), ('Networking'), ('Cloud'),
  ('Research Writing'), ('Statistics'), ('React'), ('Data Visualization')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO opportunities (
  id, title, full_description, creator_user_id, organization_id,
  application_deadline, start_date, end_date, scholarship_amount, min_gpa,
  contact_email, website, location, university, department, duration_months,
  study_mode, level, is_public, moderation_status, views_cnt, created_at, updated_at
) VALUES
  (1001, 'MIT AI Research Fellowship 2026', 'Full research fellowship for students working on applied AI, NLP, and education technology. Includes lab mentorship and project funding.', 2001, 101, DATE_ADD(CURDATE(), INTERVAL 90 DAY), DATE_ADD(CURDATE(), INTERVAL 120 DAY), DATE_ADD(CURDATE(), INTERVAL 485 DAY), 50000.00, 3.60, 'mit@scholarships.edu', 'https://www.mit.edu', 'Cambridge, MA', 'MIT', 'Computer Science and AI Lab', 12, 'FULL_TIME', 'MASTER', true, 'APPROVED', 128, NOW(), NOW()),
  (1002, 'Stanford Cybersecurity Graduate Scholarship', 'Scholarship for graduate students researching secure systems, privacy, network defense, and applied cryptography.', 2002, 102, DATE_ADD(CURDATE(), INTERVAL 60 DAY), DATE_ADD(CURDATE(), INTERVAL 100 DAY), DATE_ADD(CURDATE(), INTERVAL 465 DAY), 45000.00, 3.40, 'stanford@scholarships.edu', 'https://www.stanford.edu', 'Stanford, CA', 'Stanford University', 'Computer Science', 12, 'HYBRID', 'MASTER', true, 'APPROVED', 93, NOW(), NOW()),
  (1003, 'Google Education Cloud Scholarship', 'Industry scholarship for students building scalable cloud and data products for education access.', 2003, 103, DATE_ADD(CURDATE(), INTERVAL 45 DAY), DATE_ADD(CURDATE(), INTERVAL 90 DAY), DATE_ADD(CURDATE(), INTERVAL 455 DAY), 30000.00, 3.20, 'google@scholarships.com', 'https://edu.google.com/scholarships', 'Mountain View, CA', 'Google Education', 'Developer Relations', 10, 'ONLINE', 'UNDERGRADUATE', true, 'APPROVED', 211, NOW(), NOW()),
  (1004, 'Healthcare Data Science Grant', 'Grant for applied research using statistics, machine learning, and visualization to improve healthcare operations.', 2001, 101, DATE_ADD(CURDATE(), INTERVAL 75 DAY), DATE_ADD(CURDATE(), INTERVAL 110 DAY), DATE_ADD(CURDATE(), INTERVAL 475 DAY), 35000.00, 3.30, 'mit@scholarships.edu', 'https://www.mit.edu', 'Remote', 'MIT', 'Health AI Group', 9, 'REMOTE', 'RESEARCH', true, 'APPROVED', 77, NOW(), NOW()),
  (1005, 'NLP for Education Scholarship', 'Scholarship for students exploring natural language processing and tutoring systems for personalized learning.', 2003, 103, DATE_ADD(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 80 DAY), DATE_ADD(CURDATE(), INTERVAL 445 DAY), 25000.00, 3.10, 'google@scholarships.com', 'https://edu.google.com', 'Remote', 'Google Education', 'AI Education', 8, 'ONLINE', 'UNDERGRADUATE', true, 'APPROVED', 64, NOW(), NOW()),
  (1006, 'Distributed Systems Research Assistantship', 'Assistantship for students with backend, Java, and distributed systems experience.', 2002, 102, DATE_ADD(CURDATE(), INTERVAL 105 DAY), DATE_ADD(CURDATE(), INTERVAL 140 DAY), DATE_ADD(CURDATE(), INTERVAL 505 DAY), 42000.00, 3.50, 'stanford@scholarships.edu', 'https://www.stanford.edu', 'Stanford, CA', 'Stanford University', 'Systems Lab', 12, 'FULL_TIME', 'PHD', true, 'APPROVED', 58, NOW(), NOW())
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

DELETE FROM opportunity_to_tags WHERE opportunity_id BETWEEN 1001 AND 1006;
DELETE FROM opportunity_required_skills WHERE opportunity_id BETWEEN 1001 AND 1006;

INSERT INTO opportunity_to_tags (opportunity_id, tag_id)
SELECT 1001, id FROM tags WHERE name IN ('AI', 'Machine Learning', 'Research', 'Graduate', 'NLP')
UNION ALL SELECT 1002, id FROM tags WHERE name IN ('Cybersecurity', 'Research', 'Graduate')
UNION ALL SELECT 1003, id FROM tags WHERE name IN ('Cloud', 'Data Science', 'Undergraduate')
UNION ALL SELECT 1004, id FROM tags WHERE name IN ('Healthcare', 'Data Science', 'Research')
UNION ALL SELECT 1005, id FROM tags WHERE name IN ('NLP', 'AI', 'Undergraduate')
UNION ALL SELECT 1006, id FROM tags WHERE name IN ('Research', 'Graduate', 'Cloud');

INSERT INTO opportunity_required_skills (opportunity_id, skill_id)
SELECT 1001, id FROM skills WHERE name IN ('Python', 'Machine Learning', 'Deep Learning', 'NLP', 'Research Writing')
UNION ALL SELECT 1002, id FROM skills WHERE name IN ('Java', 'Cybersecurity', 'Networking', 'Research Writing')
UNION ALL SELECT 1003, id FROM skills WHERE name IN ('Cloud', 'Python', 'SQL', 'Data Visualization')
UNION ALL SELECT 1004, id FROM skills WHERE name IN ('Python', 'Statistics', 'Machine Learning', 'Data Visualization')
UNION ALL SELECT 1005, id FROM skills WHERE name IN ('Python', 'NLP', 'React', 'Machine Learning')
UNION ALL SELECT 1006, id FROM skills WHERE name IN ('Java', 'Spring Boot', 'Cloud', 'Networking');

INSERT INTO applications (
  id, applicant_user_id, opportunity_id, status, submitted_at, notes,
  applicant_user_name, applicant_email, phone, gpa, cover_letter, motivation,
  additional_info, portfolio_url, linkedin_url, github_url
) VALUES
  (5001, 1001, 1001, 'PENDING', NOW(), NULL, 'Linh Nguyen', 'student1@edumatch.dev', '+84-900-000-001', 3.82, 'I am excited to contribute to applied AI research.', 'I want to build AI tools that make education more accessible.', 'Available for full-time research.', 'https://portfolio.example.com/linh', 'https://linkedin.com/in/linh-demo', 'https://github.com/linh-demo'),
  (5002, 1002, 1002, 'UNDER_REVIEW', NOW(), NULL, 'Minh Tran', 'student2@edumatch.dev', '+84-900-000-002', 3.55, 'My background is in security and backend systems.', 'I want to research practical secure systems.', 'Can relocate for hybrid program.', 'https://portfolio.example.com/minh', 'https://linkedin.com/in/minh-demo', 'https://github.com/minh-demo'),
  (5003, 1003, 1003, 'ACCEPTED', NOW(), 'Strong profile for the cloud education track.', 'An Pham', 'student3@edumatch.dev', '+84-900-000-003', 3.28, 'I have built classroom analytics dashboards using Python and SQL.', 'I want to work on cloud tools that help teachers personalize support.', 'Available for remote interviews.', 'https://portfolio.example.com/an', 'https://linkedin.com/in/an-demo', 'https://github.com/an-demo')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  notes = VALUES(notes),
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

INSERT INTO application_documents (id, application_id, document_name, document_url) VALUES
  (7001, 5001, 'Linh_Nguyen_CV.pdf', 'https://example.com/files/linh-cv.pdf'),
  (7002, 5002, 'Minh_Tran_CV.pdf', 'https://example.com/files/minh-cv.pdf'),
  (7003, 5003, 'An_Pham_CV.pdf', 'https://example.com/files/an-cv.pdf')
ON DUPLICATE KEY UPDATE
  document_name = VALUES(document_name),
  document_url = VALUES(document_url);

INSERT INTO bookmarks (id, applicant_user_id, opportunity_id) VALUES
  (8001, 1001, 1002),
  (8002, 1001, 1005),
  (8003, 1002, 1001),
  (8004, 1002, 1006),
  (8005, 1003, 1004),
  (8006, 1003, 1005)
ON DUPLICATE KEY UPDATE
  applicant_user_id = VALUES(applicant_user_id),
  opportunity_id = VALUES(opportunity_id);
