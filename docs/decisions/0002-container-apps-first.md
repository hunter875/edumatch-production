# ADR: Use Azure Container Apps Before Kubernetes

Date: 2026-05-25

Status: Accepted

## Context

EduMatch has several services, workers, databases, cache, and a gateway. The
project needs cloud deployment practice without the operational overhead of a
full Kubernetes cluster.

## Decision

Use Azure Container Apps for the first cloud deployment target. Keep the gateway
and services containerized, scale services independently, and use managed
observability through Log Analytics and Application Insights.

## Consequences

Benefits:

- simpler than Kubernetes
- supports per-service autoscale
- good fit for portfolio and staging environments
- integrates with Azure Container Registry and GitHub Actions

Tradeoffs:

- less control than Kubernetes
- service discovery and private networking still need careful configuration
- advanced rollout patterns may be limited compared with a tuned Kubernetes setup
