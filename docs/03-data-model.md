# Data Model

## Purpose

This document describes the data ownership, table responsibilities, constraints, indexes, and performance strategy for EduMatch.

The goal is not only to store data. The model must support:

- correct business rules
- fast list/search/admin queries
- duplicate prevention
- matching/recommendation cache
- analytics/read models later
- seed data for performance testing

## Database Ownership

EduMatch currently uses multiple databases:

| DB | Service | Purpose |
|---|---|---|
| `auth_db` MySQL | Auth Service | users, roles, employer requests, organizations |
| `scholarship_db` MySQL | Scholarship Service | opportunities, applications, bookmarks |
| `chat_db` MySQL | Chat Service | conversations, messages, notifications |
| `matching_db` PostgreSQL | Matching Service | matching score cache, recommendation cache, snapshots |

Rule:

- A service owns its database.
- Other services should not directly query another service's DB.
- Cross-service read should be via API, event, or duplicated read model/snapshot.

## Auth DB

### Core Entities

Expected entities:

```txt
users
roles
user_roles
employer_requests
organizations
audit_logs
```

Important user fields for matching:

```txt
id
email
first_name
last_name
roles
gpa
skills
interests
education_level
major
location
profile_updated_at
```

### Auth DB Rules

- Email/username must be unique.
- Roles must be normalized.
- Profile fields used by matching should emit `user.profile.updated`.
- JWT should include stable user id.

### Suggested Constraints

```sql
CREATE UNIQUE INDEX uq_users_email ON users(email);
CREATE INDEX idx_users_enabled ON users(enabled);
CREATE INDEX idx_users_created_at ON users(created_at);
```

If roles are in join table:

```sql
CREATE UNIQUE INDEX uq_user_roles_user_role ON user_roles(user_id, role_id);
```

## Scholarship DB

### Opportunities

Entity purpose:

- Represents scholarship/research opportunity.
- Created by employer.
- Moderated by admin.
- Publicly searchable when approved/public and not expired.

Important fields:

```txt
id
creator_user_id
title
full_description
scholarship_amount
currency
min_gpa
study_mode
level
is_public
moderation_status
application_deadline
start_date
end_date
location
contact_email
website
created_at
updated_at
views_cnt
```

### Applications

Entity purpose:

- User submits application to opportunity.
- Employer/admin changes status.

Important fields:

```txt
id
applicant_user_id
opportunity_id
status
submitted_at
applicant_user_name
applicant_email
phone
gpa
cover_letter
motivation
additional_info
portfolio_url
linkedin_url
github_url
created_at
updated_at
```

Business rules:

- One applicant should not have multiple active applications for the same opportunity.
- Status transitions should be controlled.
- Submitting to expired/non-public/rejected opportunity should fail.

### Bookmarks

Entity purpose:

- User saves opportunity.

Important fields:

```txt
id
applicant_user_id
opportunity_id
created_at
```

Business rules:

- One bookmark per applicant/opportunity.
- Toggle should be idempotent.

## Scholarship DB Constraints

### Required Unique Constraints

Prevent duplicate application:

```sql
CREATE UNIQUE INDEX uq_applications_applicant_opportunity
ON applications(applicant_user_id, opportunity_id);
```

Prevent duplicate bookmark:

```sql
CREATE UNIQUE INDEX uq_bookmarks_applicant_opportunity
ON bookmarks(applicant_user_id, opportunity_id);
```

### Recommended Foreign Keys

If opportunity and application live in same DB:

```sql
ALTER TABLE applications
ADD CONSTRAINT fk_applications_opportunity
FOREIGN KEY (opportunity_id) REFERENCES opportunities(id);

ALTER TABLE bookmarks
ADD CONSTRAINT fk_bookmarks_opportunity
FOREIGN KEY (opportunity_id) REFERENCES opportunities(id);
```

Note:

- `applicant_user_id` references auth DB logically, not physically.
- Do not create cross-database FK across service DBs.

### Status Constraints

If MySQL version and migration strategy allow:

```sql
ALTER TABLE applications
ADD CONSTRAINT chk_application_status
CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'));
```

Opportunity moderation:

```sql
ALTER TABLE opportunities
ADD CONSTRAINT chk_moderation_status
CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED'));
```

## Scholarship DB Indexes

### Public Scholarship Search

Common query:

```sql
SELECT *
FROM opportunities
WHERE is_public = true
  AND moderation_status = 'APPROVED'
  AND application_deadline >= CURRENT_DATE
ORDER BY application_deadline ASC
LIMIT 12 OFFSET 0;
```

Index:

```sql
CREATE INDEX idx_opportunities_public_status_deadline
ON opportunities(is_public, moderation_status, application_deadline);
```

If level is common:

```sql
CREATE INDEX idx_opportunities_public_status_level_deadline
ON opportunities(is_public, moderation_status, level, application_deadline);
```

If study mode is common:

```sql
CREATE INDEX idx_opportunities_public_status_studymode_deadline
ON opportunities(is_public, moderation_status, study_mode, application_deadline);
```

Do not add every possible index blindly. Add based on EXPLAIN and query frequency.

### Employer Opportunity List

```sql
CREATE INDEX idx_opportunities_creator_status
ON opportunities(creator_user_id, moderation_status);
```

Optional with created time:

```sql
CREATE INDEX idx_opportunities_creator_created
ON opportunities(creator_user_id, created_at);
```

### Admin Moderation List

```sql
CREATE INDEX idx_opportunities_status_created
ON opportunities(moderation_status, created_at);
```

### Application Queries

User's applications:

```sql
CREATE INDEX idx_applications_applicant_status
ON applications(applicant_user_id, status);
```

Employer sees applications for opportunity:

```sql
CREATE INDEX idx_applications_opportunity_status
ON applications(opportunity_id, status);
```

Batch status endpoint:

```sql
CREATE INDEX idx_applications_applicant_opportunity
ON applications(applicant_user_id, opportunity_id);
```

Admin application list:

```sql
CREATE INDEX idx_applications_status_submitted
ON applications(status, submitted_at);
```

### Bookmark Queries

Batch bookmark status:

```sql
CREATE INDEX idx_bookmarks_applicant_opportunity
ON bookmarks(applicant_user_id, opportunity_id);
```

User bookmarks:

```sql
CREATE INDEX idx_bookmarks_applicant_created
ON bookmarks(applicant_user_id, created_at);
```

## Matching DB

### Matching Score Cache

Purpose:

- Stores score for applicant/opportunity pair.
- Avoids recalculating repeated card scores.

Expected fields:

```txt
id
applicant_id
opportunity_id
overall_score
gpa_score
skills_score
research_score
location_score
calculated_at
expires_at
profile_version
opportunity_version
```

Recommended indexes:

```sql
CREATE UNIQUE INDEX uq_matching_scores_pair
ON matching_scores(applicant_id, opportunity_id);

CREATE INDEX idx_matching_scores_applicant_score
ON matching_scores(applicant_id, overall_score DESC);

CREATE INDEX idx_matching_scores_expires
ON matching_scores(expires_at);
```

### Recommendation Cache

Purpose:

- Stores precomputed top-N recommendations.
- Supports fast API reads.

Expected fields:

```txt
id
target_type              -- applicant or opportunity
target_id
candidate_type           -- opportunity or applicant
candidate_id
matching_score
rank
generated_at
expires_at
profile_version
opportunity_version
```

Recommended indexes:

```sql
CREATE INDEX idx_recommendation_target_score
ON recommendation_cache(target_type, target_id, matching_score DESC);

CREATE INDEX idx_recommendation_candidate
ON recommendation_cache(candidate_type, candidate_id);

CREATE INDEX idx_recommendation_expires
ON recommendation_cache(expires_at);
```

If using rank:

```sql
CREATE INDEX idx_recommendation_target_rank
ON recommendation_cache(target_type, target_id, rank);
```

## Snapshot Read Models

Matching should not repeatedly call auth/scholarship for all data during scoring.

Recommended read models:

```txt
applicant_profile_snapshot
opportunity_snapshot
```

Tradeoff:

- Pros: scoring is fast, stable, debuggable.
- Cons: duplicated data can be stale.

Solution:

- Events update snapshots.
- Each snapshot has version/updated_at.
- Cache key includes version.

## Analytics Read Model

Admin analytics should not scan live tables on every request once data grows.

Target table:

```txt
admin_daily_stats
date
total_users
active_users
total_scholarships
active_scholarships
total_applications
pending_applications
accepted_applications
rejected_applications
created_at
updated_at
```

Worker/cron updates daily/hourly.

Tradeoff:

- Read is very fast.
- Data can be slightly stale.
- For admin dashboard, slight staleness is acceptable.

## Hot Queries To Test

### Public Scholarships

```sql
EXPLAIN ANALYZE
SELECT *
FROM opportunities
WHERE is_public = true
  AND moderation_status = 'APPROVED'
  AND application_deadline >= CURRENT_DATE
ORDER BY application_deadline ASC
LIMIT 12 OFFSET 0;
```

### Batch Application Status

```sql
EXPLAIN ANALYZE
SELECT opportunity_id
FROM applications
WHERE applicant_user_id = 2
  AND opportunity_id IN (1,2,3,4,5,6,7,8,9,10,11,12);
```

### Batch Bookmark Status

```sql
EXPLAIN ANALYZE
SELECT opportunity_id
FROM bookmarks
WHERE applicant_user_id = 2
  AND opportunity_id IN (1,2,3,4,5,6,7,8,9,10,11,12);
```

### Admin Application List

```sql
EXPLAIN ANALYZE
SELECT *
FROM applications
WHERE status = 'PENDING'
ORDER BY submitted_at DESC
LIMIT 20 OFFSET 0;
```

### Matching Top Recommendations

```sql
EXPLAIN ANALYZE
SELECT candidate_id, matching_score
FROM recommendation_cache
WHERE target_type = 'applicant'
  AND target_id = '2'
ORDER BY matching_score DESC
LIMIT 10;
```

## EXPLAIN Checklist

When reading EXPLAIN:

- [ ] Is the intended index used?
- [ ] Is rows examined close to limit, or scanning thousands?
- [ ] Is there `Using filesort`?
- [ ] Is there `Using temporary`?
- [ ] Does OFFSET grow cost linearly?
- [ ] Does query still work under 10k/50k seed?
- [ ] Is the query selecting unnecessary columns?

## Seed Data Strategy

Scale levels:

```txt
small:  10k opportunities, 20k applications, 10k bookmarks
medium: 50k-100k rows for API/DB only
stress: 1M rows for staging/cloud
dirty: expired, missing fields, duplicates-like, weird statuses
```

For weak local machines:

- Use small for full stack.
- Use medium with frontend/chat/matching disabled if needed.
- Do not run 1M locally unless machine can handle it.

Seed should create:

- normal approved public opportunities
- pending/rejected opportunities
- expired opportunities
- applications with mixed statuses
- bookmarks
- users with incomplete profile
- users with rich skills
- opportunities with missing optional fields

## Data Model Done Criteria

- [ ] Duplicate application prevented by DB.
- [ ] Duplicate bookmark prevented by DB.
- [ ] Public scholarship search uses index.
- [ ] Batch status queries use index.
- [ ] Admin list queries use index.
- [ ] Matching recommendation reads cache with index.
- [ ] Seed data can create small/medium/dirty datasets.
- [ ] EXPLAIN before/after is documented.

