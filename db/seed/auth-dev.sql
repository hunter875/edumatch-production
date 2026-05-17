-- EduMatch dev seed: auth_db
-- Demo login password for seeded users: admin123

SET NAMES utf8mb4;

INSERT INTO roles (name, description) VALUES
  ('ROLE_USER', 'Regular user role'),
  ('ROLE_EMPLOYER', 'Employer role'),
  ('ROLE_ADMIN', 'Administrator role')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO organizations (
  id, name, description, organization_type, website, email, phone, address,
  country, city, logo_url, is_verified, is_active, created_at, updated_at
) VALUES
  (101, 'MIT Research Lab', 'Research group funding AI and data science scholarships.', 'University', 'https://www.mit.edu', 'mit@scholarships.edu', '+1-617-555-0101', '77 Massachusetts Ave', 'United States', 'Cambridge', NULL, true, true, NOW(), NOW()),
  (102, 'Stanford Graduate School', 'Graduate scholarship provider for engineering and cyber security.', 'University', 'https://www.stanford.edu', 'stanford@scholarships.edu', '+1-650-555-0102', '450 Jane Stanford Way', 'United States', 'Stanford', NULL, true, true, NOW(), NOW()),
  (103, 'Google Education', 'Industry-backed education grants and research awards.', 'Company', 'https://edu.google.com', 'google@scholarships.com', '+1-650-555-0103', '1600 Amphitheatre Pkwy', 'United States', 'Mountain View', NULL, true, true, NOW(), NOW()),
  (104, 'EduMatch Teacher Academy', 'Teacher-led scholarship provider for practical software and classroom innovation grants.', 'Education Provider', 'https://teacher-academy.edumatch.dev', 'teacher1@edumatch.dev', '+84-900-000-104', '1 Learning Way', 'Vietnam', 'Ho Chi Minh City', NULL, true, true, NOW(), NOW()),
  (105, 'Global Teaching Fellows', 'International teaching fellows program funding research, mentoring, and remote learning projects.', 'Education Provider', 'https://teaching-fellows.edumatch.dev', 'teacher2@edumatch.dev', '+84-900-000-105', '22 Mentor Street', 'Vietnam', 'Da Nang', NULL, true, true, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  organization_type = VALUES(organization_type),
  website = VALUES(website),
  email = VALUES(email),
  phone = VALUES(phone),
  address = VALUES(address),
  country = VALUES(country),
  city = VALUES(city),
  is_verified = VALUES(is_verified),
  is_active = VALUES(is_active),
  updated_at = NOW();

-- BCrypt hash is for plain password: admin123
SET @demo_password_hash = '$2a$10$Q.XVbv0KHT2L5azgzjrM0eynN/E0IjU0vWKDURfiwB.qOfakmcCcO';

INSERT INTO users (
  id, username, password, email, first_name, last_name, sex, phone,
  date_of_birth, bio, avatar_url, organization_id, gpa, major, university,
  year_of_study, skills, research_interests, enabled, verification_code,
  verification_expiry, status, subscription_type, created_at, updated_at
) VALUES
  (1001, 'student1', @demo_password_hash, 'student1@edumatch.dev', 'Linh', 'Nguyen', 'FEMALE', '+84-900-000-001', '2003-03-15', 'Computer Science student interested in applied AI.', NULL, NULL, 3.82, 'Computer Science', 'Vietnam National University', 3, 'Python,Machine Learning,React,SQL', 'Artificial Intelligence,Natural Language Processing,Education Technology', true, NULL, NULL, 'ACTIVE', 'FREE', NOW(), NOW()),
  (1002, 'student2', @demo_password_hash, 'student2@edumatch.dev', 'Minh', 'Tran', 'MALE', '+84-900-000-002', '2002-08-22', 'Cybersecurity student with backend experience.', NULL, NULL, 3.55, 'Cybersecurity', 'Hanoi University of Science and Technology', 4, 'Java,Spring Boot,Security,Networking', 'Cybersecurity,Distributed Systems,Privacy', true, NULL, NULL, 'ACTIVE', 'FREE', NOW(), NOW()),
  (1003, 'student3', @demo_password_hash, 'student3@edumatch.dev', 'An', 'Pham', 'OTHER', '+84-900-000-003', '2004-11-09', 'Data science student testing recommendations, bookmarks, and application history.', NULL, NULL, 3.28, 'Data Science', 'University of Science Ho Chi Minh City', 2, 'Python,SQL,Statistics,Data Visualization', 'Healthcare Analytics,Cloud Computing,Human-centered AI', true, NULL, NULL, 'ACTIVE', 'FREE', NOW(), NOW()),
  (2001, 'mit_provider', @demo_password_hash, 'mit.provider@edumatch.dev', 'Maya', 'Carter', 'FEMALE', '+1-617-555-2001', NULL, 'Scholarship coordinator at MIT Research Lab.', NULL, 101, NULL, NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, 'ACTIVE', 'ENTERPRISE', NOW(), NOW()),
  (2002, 'stanford_provider', @demo_password_hash, 'stanford.provider@edumatch.dev', 'David', 'Kim', 'MALE', '+1-650-555-2002', NULL, 'Graduate admissions and fellowship manager.', NULL, 102, NULL, NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, 'ACTIVE', 'ENTERPRISE', NOW(), NOW()),
  (2003, 'google_provider', @demo_password_hash, 'google.provider@edumatch.dev', 'Sofia', 'Patel', 'FEMALE', '+1-650-555-2003', NULL, 'Education grants program manager.', NULL, 103, NULL, NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, 'ACTIVE', 'ENTERPRISE', NOW(), NOW()),
  (2004, 'teacher1', @demo_password_hash, 'teacher1@edumatch.dev', 'Bao', 'Le', 'MALE', '+84-900-000-104', NULL, 'Teacher/provider account for scholarship creation and applicant review testing.', NULL, 104, NULL, NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, 'ACTIVE', 'ENTERPRISE', NOW(), NOW()),
  (2005, 'teacher2', @demo_password_hash, 'teacher2@edumatch.dev', 'Ha', 'Do', 'FEMALE', '+84-900-000-105', NULL, 'Teacher/provider account for moderation and analytics testing.', NULL, 105, NULL, NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, 'ACTIVE', 'ENTERPRISE', NOW(), NOW()),
  (9001, 'admin_test', @demo_password_hash, 'admin.test@edumatch.dev', 'Admin', 'Tester', 'OTHER', '+84-900-000-900', NULL, 'Seeded admin account for local QA.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, NULL, NULL, 'ACTIVE', 'ENTERPRISE', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  password = VALUES(password),
  email = VALUES(email),
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  sex = VALUES(sex),
  phone = VALUES(phone),
  date_of_birth = VALUES(date_of_birth),
  bio = VALUES(bio),
  organization_id = VALUES(organization_id),
  gpa = VALUES(gpa),
  major = VALUES(major),
  university = VALUES(university),
  year_of_study = VALUES(year_of_study),
  skills = VALUES(skills),
  research_interests = VALUES(research_interests),
  enabled = VALUES(enabled),
  status = VALUES(status),
  subscription_type = VALUES(subscription_type),
  updated_at = NOW();

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ROLE_USER'
WHERE u.username IN ('student1', 'student2', 'student3');

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ROLE_EMPLOYER'
WHERE u.username IN ('mit_provider', 'stanford_provider', 'google_provider', 'teacher1', 'teacher2');

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'ROLE_ADMIN'
WHERE u.username IN ('admin', 'admin_test');
