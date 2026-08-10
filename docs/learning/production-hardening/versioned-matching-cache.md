# Versioned Matching Cache

## Current Problem

Matching scores are cached, but correctness depends on invalidation. If a user
profile or scholarship changes and invalidation fails, stale score rows can be
served.

Current cache identity is mostly:

```txt
applicant_id + opportunity_id
```

The safer identity is:

```txt
applicant_id + opportunity_id + profile_version + opportunity_version + algorithm_version
```

## Why This Matters

Matching score is not just an optimization. It affects what users see and trust.

Stale cache examples:

- applicant GPA changes from 3.1 to 3.8
- scholarship `min_gpa` changes from 3.0 to 3.5
- opportunity becomes expired
- opportunity moderation status changes to rejected
- scoring algorithm weights change

If the system reads a stale cache row, it can recommend the wrong scholarship.

## Mental Model

There are two ways to keep cache correct:

1. Invalidate rows exactly when source data changes.
2. Store versions and refuse cache rows built from old versions.

Production systems often use both.

```txt
read score
  -> load current applicant/opportunity versions
  -> read cache row for pair
  -> cache valid only if versions and algorithm match
  -> otherwise recompute and upsert
```

## Data Fields

`matching_scores` should include:

```txt
applicant_id
opportunity_id
overall_score
score_breakdown
profile_version
opportunity_version
algorithm_version
calculated_at
expires_at
```

`algorithm_version` can also live inside `score_breakdown`, but a real column is
easier to index and inspect.

## Unique Constraint

At minimum:

```sql
CREATE UNIQUE INDEX uq_matching_scores_pair
ON matching_scores(applicant_id, opportunity_id);
```

If keeping multiple historical versions:

```sql
CREATE UNIQUE INDEX uq_matching_scores_versioned
ON matching_scores(
  applicant_id,
  opportunity_id,
  profile_version,
  opportunity_version,
  algorithm_version
);
```

For EduMatch MVP, use one row per pair and update it with latest versions.

## PostgreSQL Upsert

Use true upsert instead of check-then-insert:

```sql
INSERT INTO matching_scores (
  applicant_id,
  opportunity_id,
  overall_score,
  score_breakdown,
  profile_version,
  opportunity_version,
  algorithm_version,
  calculated_at,
  expires_at
)
VALUES (...)
ON CONFLICT (applicant_id, opportunity_id)
DO UPDATE SET
  overall_score = EXCLUDED.overall_score,
  score_breakdown = EXCLUDED.score_breakdown,
  profile_version = EXCLUDED.profile_version,
  opportunity_version = EXCLUDED.opportunity_version,
  algorithm_version = EXCLUDED.algorithm_version,
  calculated_at = EXCLUDED.calculated_at,
  expires_at = EXCLUDED.expires_at;
```

Why:

- avoids duplicate rows under concurrent requests
- reduces race conditions
- makes cache behavior deterministic

## Read Validation

A cache row is valid only if:

```txt
expires_at is null or expires_at > now
profile_version == current applicant profile_version
opportunity_version == current opportunity opportunity_version
algorithm_version == current scorer version
score_breakdown exists
```

If one condition fails, recompute.

## Event Invalidation Still Matters

Version validation protects reads. Invalidation protects storage size and
recommendation cache freshness.

Events that should invalidate or refresh:

- `user.profile.updated`
- `scholarship.created`
- `scholarship.updated`
- `scholarship.deleted`
- `application.submitted`
- `bookmark.changed` if behavior signals are used

## Recommendation Cache

Recommendation cache should also have a cache version:

```txt
target_type
target_id
candidate_type
candidate_id
matching_score
rank
cache_version
generated_at
expires_at
```

When replacing top-N recommendations for a target:

1. delete old rows for target
2. insert new rows with same `cache_version`
3. commit once

For larger systems, write new version first and atomically switch active version.

## Verification

Test cases:

- cached score hit returns same score
- profile version change forces recompute
- opportunity version change forces recompute
- algorithm version change forces recompute
- concurrent requests do not create duplicate rows
- expired cache row is ignored

SQL check:

```sql
SELECT applicant_id, opportunity_id, COUNT(*)
FROM matching_scores
GROUP BY applicant_id, opportunity_id
HAVING COUNT(*) > 1;
```

Should return zero rows.

## AI Handoff Prompt

```txt
You are hardening EduMatch matching cache.
Read docs/learning/production-hardening/versioned-matching-cache.md and matching-service/app/service.py.
Implement:
1. unique constraint for applicant_id + opportunity_id
2. algorithm_version column if missing
3. PostgreSQL upsert for score cache
4. cache read validation using profile_version, opportunity_version, algorithm_version, and expires_at
5. tests for stale versions and concurrent duplicate prevention
Keep API response shape unchanged.
```
