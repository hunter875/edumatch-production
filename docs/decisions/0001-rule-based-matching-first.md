# ADR: Use Rule-Based Matching Before AI Matching

Date: 2026-05-25

Status: Accepted

## Context

EduMatch needs personalized scholarship recommendations, but the hot path must
remain fast, explainable, testable, and cheap. Hard constraints such as deadline,
public status, moderation status, GPA, and duplicate applications must not be
left to a probabilistic model.

## Decision

Use deterministic hard filters and rule-based scoring as the baseline. Store
score breakdowns and recommendation rows in cache/read-model tables. Add AI only
as an offline or secondary semantic signal after baseline evaluation exists.

## Consequences

Benefits:

- predictable output
- easy debugging
- low latency
- low cost
- hard constraints can target zero violations

Tradeoffs:

- weaker semantic understanding at first
- manual tuning is needed
- later embedding support requires evaluation data and vector storage
