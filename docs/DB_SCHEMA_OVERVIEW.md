# EduMatch DB Schema Overview

Generated from the live Docker databases.

## Databases

| Service | Engine | Database | Container | Port |
| --- | --- | --- | --- | --- |
| Auth service | MySQL 8 | `auth_db` | `auth-db-test` | `3307 -> 3306` |
| Scholarship service | MySQL 8 | `scholarship_db` | `scholarship-db-test` | `3308 -> 3306` |
| Chat service | MySQL 8 | `chat_db` | `chat-db-test` | `3309 -> 3306` |
| Matching service | PostgreSQL 14 | `matching_db` | `matching-db-test` | `5432 -> 5432` |

Row counts are current dev/test data counts from the running containers.

## Auth DB

### `users` - 11 rows

Main user profile and authentication table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `username` | `varchar(255)` | unique, required |
| `email` | `varchar(255)` | unique, required |
| `password` | `varchar(255)` | required |
| `first_name` | `varchar(255)` | nullable |
| `last_name` | `varchar(255)` | nullable |
| `enabled` | `bit(1)` | nullable |
| `status` | `varchar(20)` | nullable |
| `subscription_type` | `varchar(20)` | nullable |
| `organization_id` | `bigint` | nullable |
| `gpa` | `double` | nullable |
| `major` | `varchar(100)` | nullable |
| `university` | `varchar(200)` | nullable |
| `year_of_study` | `int` | nullable |
| `skills` | `text` | nullable |
| `research_interests` | `text` | nullable |
| `bio` | `text` | nullable |
| `avatar_url` | `varchar(500)` | nullable |
| `phone` | `varchar(20)` | nullable |
| `sex` | `varchar(10)` | nullable |
| `date_of_birth` | `date` | nullable |
| `verification_code` | `varchar(255)` | nullable |
| `verification_expiry` | `datetime(6)` | nullable |
| `created_at` | `datetime(6)` | nullable |
| `updated_at` | `datetime(6)` | nullable |

### `roles` - 2 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `name` | `varchar(255)` | unique, required |
| `description` | `varchar(255)` | nullable |

### `user_roles` - 13 rows

Join table between users and roles.

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `bigint` | PK part |
| `role_id` | `bigint` | PK part |

### `organizations` - 5 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `name` | `varchar(255)` | required |
| `organization_type` | `varchar(100)` | nullable |
| `description` | `text` | nullable |
| `email` | `varchar(255)` | nullable |
| `phone` | `varchar(50)` | nullable |
| `website` | `varchar(500)` | nullable |
| `logo_url` | `varchar(500)` | nullable |
| `address` | `varchar(500)` | nullable |
| `city` | `varchar(100)` | nullable |
| `country` | `varchar(100)` | nullable |
| `is_active` | `bit(1)` | nullable |
| `is_verified` | `bit(1)` | nullable |
| `created_at` | `datetime(6)` | nullable |
| `updated_at` | `datetime(6)` | nullable |

### `organization_requests` - 0 rows

Provider or organization upgrade requests.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `user_id` | `bigint` | required |
| `organization_name` | `varchar(255)` | required |
| `organization_type` | `varchar(100)` | nullable |
| `description` | `text` | nullable |
| `email` | `varchar(255)` | nullable |
| `phone` | `varchar(50)` | nullable |
| `website` | `varchar(500)` | nullable |
| `address` | `varchar(500)` | nullable |
| `city` | `varchar(100)` | nullable |
| `country` | `varchar(100)` | nullable |
| `status` | `varchar(20)` | required |
| `rejection_reason` | `text` | nullable |
| `reviewed_by` | `bigint` | nullable |
| `reviewed_at` | `datetime(6)` | nullable |
| `created_at` | `datetime(6)` | nullable |
| `updated_at` | `datetime(6)` | nullable |

### `refresh_token` - 6 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `token` | `varchar(255)` | unique, required |
| `expiry_date` | `datetime(6)` | required |
| `user_id` | `bigint` | unique, nullable |

### `audit_logs` - 25 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `user_id` | `bigint` | nullable |
| `username` | `varchar(255)` | nullable |
| `action` | `varchar(255)` | nullable |
| `target` | `varchar(255)` | nullable |
| `details` | `varchar(255)` | nullable |
| `timestamp` | `datetime(6)` | nullable |

## Scholarship DB

### `opportunities` - 106 rows

Core scholarship/opportunity table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `title` | `varchar(255)` | required |
| `full_description` | `text` | nullable |
| `organization_id` | `bigint` | required |
| `creator_user_id` | `bigint` | required |
| `application_deadline` | `date` | nullable |
| `start_date` | `date` | nullable |
| `end_date` | `date` | nullable |
| `scholarship_amount` | `decimal(10,2)` | nullable |
| `min_gpa` | `decimal(3,2)` | nullable |
| `study_mode` | `varchar(50)` | nullable |
| `level` | `varchar(50)` | nullable |
| `is_public` | `bit(1)` | nullable |
| `moderation_status` | `varchar(50)` | nullable |
| `location` | `varchar(255)` | nullable |
| `university` | `varchar(255)` | nullable |
| `department` | `varchar(255)` | nullable |
| `duration_months` | `int` | nullable |
| `contact_email` | `varchar(255)` | nullable |
| `website` | `varchar(500)` | nullable |
| `views_cnt` | `int` | nullable |
| `created_at` | `datetime(6)` | nullable |
| `updated_at` | `datetime(6)` | nullable |

### `applications` - 303 rows

Student applications to opportunities.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `opportunity_id` | `bigint` | required |
| `applicant_user_id` | `bigint` | required |
| `status` | `varchar(50)` | required |
| `submitted_at` | `datetime(6)` | nullable |
| `applicant_user_name` | `varchar(255)` | nullable |
| `applicant_email` | `varchar(255)` | nullable |
| `phone` | `varchar(50)` | nullable |
| `gpa` | `decimal(3,2)` | nullable |
| `cover_letter` | `text` | nullable |
| `motivation` | `text` | nullable |
| `additional_info` | `text` | nullable |
| `portfolio_url` | `varchar(500)` | nullable |
| `linkedin_url` | `varchar(500)` | nullable |
| `github_url` | `varchar(500)` | nullable |
| `notes` | `text` | nullable |

### `application_documents` - 3 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `application_id` | `bigint` | required |
| `document_name` | `varchar(255)` | nullable |
| `document_url` | `text` | nullable |

### `bookmarks` - 246 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `applicant_user_id` | `bigint` | required |
| `opportunity_id` | `bigint` | required |

### `skills` - 14 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `name` | `varchar(100)` | unique, required |

### `tags` - 11 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `name` | `varchar(100)` | unique, required |

### `opportunity_required_skills` - 225 rows

Join table between opportunities and skills.

| Column | Type | Notes |
| --- | --- | --- |
| `opportunity_id` | `bigint` | PK part |
| `skill_id` | `bigint` | PK part |

### `opportunity_to_tags` - 220 rows

Join table between opportunities and tags.

| Column | Type | Notes |
| --- | --- | --- |
| `opportunity_id` | `bigint` | PK part |
| `tag_id` | `bigint` | PK part |

## Chat DB

### `conversations` - 4 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `participant_1_id` | `bigint` | required |
| `participant_2_id` | `bigint` | required |
| `last_message_at` | `datetime(6)` | nullable |

### `messages` - 8 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `conversation_id` | `bigint` | required |
| `sender_id` | `bigint` | required |
| `content` | `text` | nullable |
| `sent_at` | `datetime(6)` | nullable |

### `notifications` - 5 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `user_id` | `bigint` | indexed, required |
| `title` | `varchar(255)` | required |
| `body` | `text` | nullable |
| `type` | `varchar(255)` | nullable |
| `reference_id` | `varchar(255)` | nullable |
| `is_read` | `bit(1)` | nullable |
| `created_at` | `datetime(6)` | nullable |

### `fcm_tokens` - 5 rows

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `bigint` | PK |
| `user_id` | `bigint` | unique, required |
| `device_token` | `varchar(255)` | required |

## Matching DB

### `applicant_features` - 4 rows

Preprocessed applicant profile features for matching.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `applicant_id` | `varchar` | unique, required |
| `gpa` | `double precision` | nullable |
| `major` | `varchar` | nullable |
| `university` | `varchar` | nullable |
| `year_of_study` | `integer` | nullable |
| `skills` | `text[]` | nullable |
| `research_interests` | `text[]` | nullable |
| `skills_vector` | `json` | nullable |
| `research_vector` | `json` | nullable |
| `combined_text` | `text` | nullable |
| `created_at` | `timestamp` | nullable |
| `updated_at` | `timestamp` | nullable |
| `last_processed_at` | `timestamp` | nullable |

### `opportunity_features` - 106 rows

Preprocessed scholarship/opportunity features for matching.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `opportunity_id` | `varchar` | unique, required |
| `opportunity_type` | `varchar` | required |
| `title` | `varchar` | nullable |
| `description` | `text` | nullable |
| `min_gpa` | `double precision` | nullable |
| `application_deadline` | `date` | nullable |
| `scholarship_amount` | `double precision` | nullable |
| `level` | `varchar` | nullable |
| `study_mode` | `varchar` | nullable |
| `location` | `varchar` | nullable |
| `is_public` | `boolean` | nullable |
| `moderation_status` | `varchar` | nullable |
| `required_skills` | `text[]` | nullable |
| `preferred_majors` | `text[]` | nullable |
| `research_areas` | `text[]` | nullable |
| `skills_vector` | `json` | nullable |
| `research_vector` | `json` | nullable |
| `combined_text` | `text` | nullable |
| `created_at` | `timestamp` | nullable |
| `updated_at` | `timestamp` | nullable |
| `last_processed_at` | `timestamp` | nullable |

### `matching_scores` - 330 rows

Cached applicant-opportunity score pairs.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `applicant_id` | `varchar` | indexed, required |
| `opportunity_id` | `varchar` | indexed, required |
| `overall_score` | `double precision` | required |
| `gpa_score` | `double precision` | nullable |
| `skills_score` | `double precision` | nullable |
| `research_score` | `double precision` | nullable |
| `score_breakdown` | `json` | nullable |
| `calculated_at` | `timestamp` | nullable |
| `expires_at` | `timestamp` | nullable |

### `recommendation_cache` - 224 rows

Precomputed top-N recommendation read model.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `target_type` | `varchar` | required, `applicant` or `opportunity` |
| `target_id` | `varchar` | required |
| `candidate_type` | `varchar` | required |
| `candidate_id` | `varchar` | required |
| `matching_score` | `double precision` | required |
| `calculated_at` | `timestamp` | nullable |
| `expires_at` | `timestamp` | nullable |

## Cross-Service ID Notes

| Source | Consumer | Join Key |
| --- | --- | --- |
| `auth_db.users.id` | `scholarship_db.applications.applicant_user_id` | User/application ownership |
| `auth_db.users.id` | `scholarship_db.bookmarks.applicant_user_id` | Bookmark ownership |
| `auth_db.organizations.id` | `scholarship_db.opportunities.organization_id` | Provider organization |
| `scholarship_db.opportunities.id` | `matching_db.opportunity_features.opportunity_id` | Opportunity matching features |
| `auth_db.users.id` | `matching_db.applicant_features.applicant_id` | Applicant matching features |
| `matching_db.matching_scores` | `matching_db.recommendation_cache` | Cached ranking/read model |
