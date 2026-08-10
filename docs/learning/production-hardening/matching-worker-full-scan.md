# Matching Worker Full Scan

## Current Problem

Matching worker precompute currently loads all eligible rows in some paths:

```python
opportunities = query.all()
applicants = query.all()
```

This is acceptable for tiny data. It becomes dangerous at 100k opportunities or
100k applicants.

## Why Full Scan Is Dangerous

Full scan in a worker can cause:

- high DB CPU
- high memory usage in worker
- long task duration
- queue lag
- cache writes in huge bursts
- delayed notifications
- slow deploy/rollback because workers are busy

Even if users do not see the worker directly, they feel the effects through
stale recommendations and DB pressure.

## Mental Model

Recommendation generation has two phases:

```txt
candidate retrieval -> scoring/reranking
```

The worker should not score every possible candidate. It should retrieve a
reasonable candidate set first.

## Candidate Retrieval Options

### Rule-Based Candidate Retrieval

Use indexed filters:

```txt
public = true
moderation_status in approved/published
deadline >= today
min_gpa <= applicant_gpa
level compatible
study_mode compatible
location compatible if strict
```

Then score only that candidate set.

### Top-N Limit Per Stage

Example:

```txt
retrieve at most 2,000 candidates
score candidates
store top 100
return top 10/20 in API
```

Do not store 100k recommendations per user.

### Chunking

Instead of:

```python
rows = query.all()
```

Use:

```python
for row in query.yield_per(1000):
    score row
```

Or explicit pagination by primary key:

```txt
WHERE id > last_seen_id
ORDER BY id
LIMIT 1000
```

Primary-key pagination is safer than deep offset.

### Embedding Candidate Retrieval Later

After rule baseline:

```txt
hard filters -> vector search top 500 -> rule score -> hybrid rerank
```

Do not start with vector search before hard constraints and eval metrics exist.

## Worker Task Design

For applicant update:

```txt
load applicant snapshot
retrieve eligible opportunities with indexed filters
process in chunks
score each candidate
bulk upsert score cache
keep top N in memory or use DB temp ranking
replace recommendation_cache top N
publish optional high-match notification
```

For opportunity update:

```txt
load opportunity snapshot
if not public/approved/not expired -> clear recommendation rows
retrieve eligible applicants with indexed filters
process in chunks
score each candidate
bulk upsert scores
replace recommendation_cache top N applicants
```

## Queue Strategy

Use separate queues for:

- feature update processing
- recommendation precompute
- notification publishing

Reason:

Heavy precompute should not block small feature updates or notifications.

## Idempotency

RabbitMQ can redeliver. Workers must tolerate duplicate events.

Use:

- upsert feature snapshots
- unique cache rows
- event ID dedupe if available
- safe delete/replace recommendation cache

## Indexes To Support Retrieval

For `opportunity_features`:

```sql
CREATE INDEX ix_opportunity_features_eligibility
ON opportunity_features (
  is_public,
  moderation_status,
  application_deadline,
  min_gpa
);
```

For applicant features:

```sql
CREATE INDEX ix_applicant_features_gpa
ON applicant_features (gpa);
```

Add more only after EXPLAIN proves need.

## Metrics

Track:

- worker task duration
- candidates retrieved
- candidates scored
- score rows written
- recommendation rows written
- queue lag
- task retries
- DB query duration

Example log shape:

```txt
matching_precompute target=applicant:123 candidates=1842 scored=1842 cached=100 durationMs=4821
```

## Verification

Benchmark with:

- 10k opportunities
- 100k opportunities
- 10k applicants
- 100k applicants

Expected:

- no worker OOM
- queue lag remains bounded
- DB CPU spikes are short
- recommendation cache eventually refreshes
- API recommendation reads stay fast

## AI Handoff Prompt

```txt
You are optimizing EduMatch matching workers.
Read docs/learning/production-hardening/matching-worker-full-scan.md,
matching-service/app/service.py, and matching-service/app/workers.py.
Replace query.all() precompute paths with indexed candidate retrieval, chunking, and bulk score cache writes.
Keep recommendation API behavior unchanged.
Add metrics/logs for candidates retrieved, scored, cached, and task duration.
```
