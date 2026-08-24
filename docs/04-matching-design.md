# Matching Design

## Purpose

Matching is the most portfolio-worthy part of EduMatch. It should not be a black box and should not simply call AI on every request.

The target design:

```txt
hard filter -> candidate retrieval -> rule score -> semantic score -> rerank -> cache -> explain
```

## EduMatch Matching Design v2

Current implementation target:

```txt
hard eligibility filter -> TF-IDF retrieval -> structured weighted score -> diversity -> cache -> explain
```

This is an explainable rule-based hybrid, not an "AI-powered" black box. TF-IDF is a deterministic text-similarity component inside the same scoring model.

Workers precompute recommendations asynchronously when applicant profiles or opportunities change. PostgreSQL remains the source of truth; Redis/API caches are acceleration only. RabbitMQ delivery is at-least-once, so consumers must be idempotent and use processed event IDs for deduplication.

Applicant snapshot fields:

```txt
applicant_id
major
degree_level
gpa
skills
research_interests
preferred_locations
preferred_funding_types
nationality
profile_version
updated_at
```

Opportunity snapshot fields:

```txt
opportunity_id
status
deadline
degree_levels
eligible_majors
min_gpa
eligible_nationalities
required_skills
research_areas
funding_type
location
description
source_url
last_verified_at
version
```

Hard filters:

- opportunity status is approved/active/published
- deadline is not expired
- applicant degree level is compatible when required
- applicant GPA meets minimum when GPA is present
- applicant nationality is eligible when nationality rules exist
- applicant major is eligible when major is required
- applicant has not already applied
- deleted or blocked opportunities are excluded

If a hard condition cannot be determined because profile data is missing, the result uses `eligibilityStatus = UNKNOWN` with `missingInformation`. The service must not silently assert eligibility. Target `constraint_violation_rate = 0`.

Baseline v2 weights:

```txt
skill           0.30
textSimilarity  0.25
major           0.15
interest        0.10
funding         0.08
location        0.05
gpa             0.04
freshness       0.03
```

The model version changes when weights or hard-filter semantics change. Current implementation version:

```txt
hybrid-v2.0
```

TF-IDF rules:

- fit the vectorizer once on the active opportunity corpus
- transform the applicant profile in that same vector space
- do not fit applicant and opportunity text separately
- fall back to rule-only ranking when the vectorizer is not ready

Recommendation output includes:

```txt
rank
score
eligibilityStatus
components
reasons
missingInformation
sourceUrl
lastVerifiedAt
modelVersion
profileVersion
opportunityVersion
```

Recommendation cache rows store rank, eligibility status, component JSON, reasons JSON, missing-information JSON, model version, profile version, opportunity version, generated time, and expiry. Delivery reliability is documented as at-least-once, not exactly-once.

Earlier implementation phases used this practical baseline:

```txt
rule-based scoring + batch endpoint + DB cache + worker precompute
```

Add embeddings only when evaluation proves value beyond deterministic TF-IDF and rule scoring.

## Goals

Matching must be:

- fast enough for page load
- correct on hard constraints
- explainable to user/employer
- testable with labeled pairs
- cheap enough to run
- resilient when AI/vector services fail

## Non-Goals

Do not:

- call LLM for every card
- full scan all opportunities on every request
- rank expired/rejected/private opportunities
- hide score logic completely
- use AI without eval metrics

## Matching Inputs

### Applicant Signals

```txt
userId
educationLevel
major
gpa
skills
interests
languages
location
preferredStudyMode
profileText
applicationHistory
bookmarkHistory
```

### Opportunity Signals

```txt
opportunityId
title
description
level
studyMode
location
minGpa
requiredSkills
preferredSkills
tags
applicationDeadline
scholarshipAmount
moderationStatus
isPublic
```

## Hard Filters

Hard filters run before scoring. If a candidate fails hard filter, it should not be recommended.

Applicant -> Opportunity hard filters:

- opportunity is public
- opportunity is approved/published
- deadline is not expired
- applicant GPA >= minGpa if minGpa exists
- level compatible if level is mandatory
- study mode/location compatible if opportunity declares strict requirement
- applicant has not already applied if recommendation page should exclude applied items

Candidate violation metric:

```txt
constraint_violation_rate = invalid_recommendations / total_recommendations
```

Target:

```txt
constraint_violation_rate = 0
```

## Rule-Based Score

Score should produce both total and breakdown.

Example weighting:

```txt
skillsMatch     35
fieldMatch      20
gpaFit          15
levelMatch      10
studyModeMatch  10
locationMatch    5
deadlineBoost    3
amountBoost      2
total          100
```

Example breakdown:

```json
{
  "overallScore": 84.5,
  "breakdown": {
    "skillsMatch": 90,
    "fieldMatch": 80,
    "gpaFit": 100,
    "levelMatch": 100,
    "studyModeMatch": 70,
    "locationMatch": 50,
    "deadlineBoost": 20,
    "amountBoost": 60
  },
  "reasons": [
    "Strong overlap with required skills: Python, Machine Learning",
    "Applicant GPA 3.6 meets minimum GPA 3.2",
    "Education level MASTER matches opportunity level"
  ]
}
```

## Batch Score API

Purpose:

- Scholarship list should not call one score endpoint per card.

Request:

```json
{
  "applicantId": "2",
  "opportunityIds": ["1", "2", "3"]
}
```

Response:

```json
{
  "1": 82.5,
  "2": 67.0,
  "3": 91.2
}
```

Performance target:

```txt
p95 batch score <= 500ms for 12-50 ids
cache hit rate >= 80% after warmup
```

## Score Cache

Table:

```txt
matching_scores
```

Key:

```txt
applicantId + opportunityId
```

Better key with version:

```txt
applicantId + opportunityId + profileVersion + opportunityVersion
```

Cache fields:

```txt
overall_score
breakdown scores
calculated_at
expires_at
profile_version
opportunity_version
```

Invalidation:

- applicant profile update -> delete scores for applicant
- opportunity update -> delete scores for opportunity
- scheduled expiry -> ignore expired scores

Tradeoff:

- Cache gives speed.
- Cache can be stale.
- Versioning reduces stale correctness bugs.

## Recommendation Cache

Table:

```txt
recommendation_cache
```

Rows:

```txt
target_type = applicant
target_id = applicantId
candidate_type = opportunity
candidate_id = opportunityId
matching_score
rank
generated_at
expires_at
```

API reads:

```txt
GET /api/v1/recommendations/applicant/{id}
```

Read path:

```txt
cache hit -> return top-N
cache miss -> compute fallback or enqueue precompute
```

Target:

```txt
p95 recommendation read <= 200ms when cache hit
```

## Worker Precompute

Events:

```txt
user.profile.updated
scholarship.created
scholarship.updated
application.submitted
bookmark.changed
```

Worker flow for applicant:

```txt
receive user.profile.updated
load applicant snapshot
load eligible opportunities
hard filter
calculate scores
store matching_scores
replace recommendation_cache top-N
publish optional high-match notification
```

Worker flow for opportunity:

```txt
receive scholarship.created/updated
load opportunity snapshot
load eligible applicants
hard filter
calculate scores
store matching_scores
replace recommendation_cache top-N
publish optional high-match notifications
```

Failure behavior:

- Worker failure should not break user request.
- Retry transient errors.
- Dead-letter events later if needed.
- Log target id, event type, duration.

## AI And Embedding Strategy

### What AI Should Do

Use AI/embedding for:

- semantic skill matching
- major/field normalization
- parsing CV/profile into structured skills
- generating explanation text
- expanding equivalent skills (`ML` -> `Machine Learning`, `NLP` -> `Natural Language Processing`)

### What AI Should Not Do

Do not use LLM for:

- deadline validation
- GPA eligibility
- auth/role decisions
- every card score on hot path
- database filtering

### Recommended Phases

Phase A: rule-only

- stable
- explainable
- cheap
- baseline metrics

Phase B: embedding

- generate embedding for applicant profile text
- generate embedding for opportunity text
- vector similarity becomes one signal
- still apply hard filters and rule scorer

Phase C: LLM offline

- parse profile/CV
- normalize skills
- generate explanation
- cache output

## Technology Options

### Rule-Based Only

Pros:

- fastest
- simplest
- easy to debug
- no AI cost

Cons:

- weak semantic understanding
- needs manual tuning

Use:

- mandatory baseline

### pgvector

Pros:

- uses PostgreSQL already present in matching service
- fewer services
- good for early vector search

Cons:

- not as specialized as Qdrant
- vector indexes need tuning
- memory/build-time tradeoffs

Use:

- first vector option for this project

### Qdrant

Pros:

- strong vector search
- payload filtering
- good scaling path

Cons:

- extra service
- more ops/deploy complexity

Use:

- when pgvector becomes bottleneck or vector matching becomes core product feature

### LLM Realtime

Pros:

- rich explanations
- flexible reasoning

Cons:

- slow
- costly
- nondeterministic
- hard to guarantee constraints

Use:

- avoid for hot path

### LLM Offline

Pros:

- better data normalization/explanation
- controlled cost
- cacheable

Cons:

- more worker pipeline complexity

Use:

- later, after rule/cache baseline

## Evaluation Dataset

Create labeled pairs:

```csv
applicant_id,opportunity_id,label,reason
1,101,3,perfect skill and level match
1,102,0,gpa below requirement
1,103,2,good skill overlap but location mismatch
2,101,1,weak skill overlap
```

Labels:

```txt
0 = not suitable
1 = weak
2 = good
3 = excellent
```

Dataset size:

```txt
initial: 50-100 pairs
useful: 200-500 pairs
strong: 1000+ pairs
```

Include edge cases:

- applicant missing GPA
- applicant missing skills
- opportunity missing skills
- expired opportunity
- GPA below min
- level mismatch
- similar semantic skills but different wording
- applicant already applied

## Metrics

Quality:

```txt
precision@10
recall@10
ndcg@10
coverage
diversity
constraint_violation_rate
```

Performance:

```txt
p50 latency
p95 latency
p99 latency
cache hit rate
worker task duration
queue lag
DB rows scanned
```

Cost:

```txt
embedding cost per 1k profiles
LLM cost per 1k explanations
storage growth
worker CPU/memory
```

Target:

```txt
constraint_violation_rate = 0
p95 recommendation cache read < 200ms
p95 batch score < 500ms
hybrid ndcg@10 > rule-only baseline
```

## Testing AI

Do not test AI by feeling. Compare variants:

```txt
A: rule-only
B: embedding-only
C: rule + embedding
D: rule + embedding + offline explanation
```

For each:

- run eval dataset
- calculate metrics
- compare cost
- compare latency
- inspect top bad recommendations

Keep AI only if:

- quality improves meaningfully
- hard constraint violation remains zero
- latency/cost is acceptable
- fallback exists when AI/vector service fails

## API Behavior When Matching Fails

Scholarship list:

- show cards without score
- do not block page
- log matching error

Recommendation page:

- if cache exists, return stale cache with warning internally
- if no cache, return empty list or rule fallback
- never hang indefinitely

## Matching Roadmap

1. Ensure rule scorer has breakdown.
2. Keep batch score endpoint.
3. Ensure cache table indexes.
4. Add recommendation cache hit path.
5. Worker precomputes top-N.
6. Create eval dataset.
7. Measure rule-only baseline.
8. Add embedding with pgvector.
9. Measure hybrid vs baseline.
10. Add offline explanation if useful.
11. Consider Qdrant only if pgvector is bottleneck.

## Interview Explanation

Short answer:

> I used rule-based matching for hard constraints and explainability, then cached and precomputed recommendations to avoid full scans on request. AI is useful for semantic matching and explanation, but I would not call an LLM on every request because it is slow, expensive, and harder to make deterministic. The design uses workers and cache so the frontend reads fast top-N recommendations while the heavier matching pipeline runs asynchronously.
