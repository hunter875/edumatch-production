-- EduMatch dev seed: chat_db
-- Depends on logical auth user ids from auth-dev.sql.

SET NAMES utf8mb4;

INSERT INTO conversations (
  id, participant_1_id, participant_2_id, last_message_at
) VALUES
  (9001, 1001, 2001, NOW()),
  (9002, 1002, 2002, NOW()),
  (9003, 1001, 2003, NOW()),
  (9004, 1003, 2004, NOW())
ON DUPLICATE KEY UPDATE
  participant_1_id = VALUES(participant_1_id),
  participant_2_id = VALUES(participant_2_id),
  last_message_at = VALUES(last_message_at);

INSERT INTO messages (
  id, conversation_id, sender_id, content, sent_at
) VALUES
  (9101, 9001, 1001, 'Hello, I want to ask about the MIT AI Research Fellowship requirements.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (9102, 9001, 2001, 'Hi Linh, your AI and NLP background looks relevant. Please submit your CV and portfolio.', DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (9103, 9001, 1001, 'Thanks, I submitted the application and attached my CV.', DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (9104, 9002, 1002, 'Hello, is the Stanford cybersecurity scholarship open to final-year students?', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (9105, 9002, 2002, 'Yes, final-year students can apply if they meet the GPA and research requirements.', DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (9106, 9003, 2003, 'Your profile matches the NLP for Education Scholarship. You may want to bookmark it.', DATE_SUB(NOW(), INTERVAL 12 HOUR)),
  (9107, 9004, 1003, 'Hi, I want to confirm whether the teacher academy scholarships accept remote students.', DATE_SUB(NOW(), INTERVAL 5 HOUR)),
  (9108, 9004, 2004, 'Yes, remote students can apply. Please include one analytics project in your portfolio.', DATE_SUB(NOW(), INTERVAL 4 HOUR))
ON DUPLICATE KEY UPDATE
  conversation_id = VALUES(conversation_id),
  sender_id = VALUES(sender_id),
  content = VALUES(content),
  sent_at = VALUES(sent_at);

INSERT INTO notifications (
  id, user_id, title, body, type, reference_id, is_read, created_at
) VALUES
  (9201, 1001, 'Application submitted', 'Your application for MIT AI Research Fellowship 2026 was submitted successfully.', 'APPLICATION_SUBMITTED', '5001', false, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (9202, 1002, 'Application under review', 'Stanford Graduate School is reviewing your cybersecurity scholarship application.', 'APPLICATION_UNDER_REVIEW', '5002', false, DATE_SUB(NOW(), INTERVAL 8 HOUR)),
  (9203, 1001, 'New recommendation', 'NLP for Education Scholarship is a strong match for your profile.', 'MATCH_RECOMMENDATION', '1005', true, DATE_SUB(NOW(), INTERVAL 6 HOUR)),
  (9204, 2001, 'New application received', 'Linh Nguyen applied to MIT AI Research Fellowship 2026.', 'APPLICATION_RECEIVED', '5001', false, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (9205, 2004, 'New student message', 'An Pham asked about remote eligibility.', 'MESSAGE_RECEIVED', '9004', false, DATE_SUB(NOW(), INTERVAL 4 HOUR))
ON DUPLICATE KEY UPDATE
  user_id = VALUES(user_id),
  title = VALUES(title),
  body = VALUES(body),
  type = VALUES(type),
  reference_id = VALUES(reference_id),
  is_read = VALUES(is_read),
  created_at = VALUES(created_at);

INSERT INTO fcm_tokens (
  id, user_id, device_token
) VALUES
  (9301, 1001, 'dev-fcm-token-student1'),
  (9302, 1002, 'dev-fcm-token-student2'),
  (9303, 2001, 'dev-fcm-token-provider1'),
  (9304, 1003, 'dev-fcm-token-student3'),
  (9305, 2004, 'dev-fcm-token-teacher1')
ON DUPLICATE KEY UPDATE
  user_id = VALUES(user_id),
  device_token = VALUES(device_token);
