# [YOUR NAME]

**Junior Full-Stack / Backend Developer**  
Ho Chi Minh City, Vietnam | [phone] | [email] | [GitHub] | [LinkedIn/Upwork]

## Summary

Junior full-stack developer with hands-on project experience building and debugging web applications across frontend, backend, database, Docker, and cloud deployment. Comfortable working with React/Next.js, Spring Boot, FastAPI, MySQL, PostgreSQL, Redis, RabbitMQ, Docker, GitHub Actions, and Azure Container Apps.

I focus on practical engineering work: fixing API issues, improving database queries, setting up Docker environments, deploying services, writing technical documentation, and testing important user flows. I am still growing as a developer, but I work carefully, communicate clearly, and enjoy investigating problems across the whole stack.

## Technical Skills

**Frontend:** React, Next.js, TypeScript, Tailwind CSS, React Query  
**Backend:** Spring Boot, FastAPI, REST API, JWT authentication, role-based access control  
**Databases:** MySQL, PostgreSQL, SQL indexing, query analysis, `EXPLAIN ANALYZE`  
**Infrastructure:** Docker, Docker Compose, Nginx gateway, Azure Container Apps, Azure Container Registry  
**Async & Cache:** Redis, RabbitMQ, Celery, background workers, cache invalidation basics  
**Dev Tools:** Git, GitHub Actions, smoke testing, API testing, technical documentation

## Projects

### EduMatch - Microservices Scholarship Matching Platform

Built and improved a microservices-based education platform with student, provider, and admin workflows.

- Developed and debugged frontend flows using React/Next.js, including scholarship browsing, authentication, dashboards, application flows, chat, and notifications.
- Worked on Spring Boot services for authentication, scholarship management, applications, bookmarks, provider analytics, and admin moderation.
- Improved matching service design using FastAPI, PostgreSQL read models, rule-based scoring, batch scoring, recommendation cache, and worker-based precomputation.
- Optimized database performance by adding load-test seed data, analyzing slow queries with `EXPLAIN ANALYZE`, and adding indexes for scholarship listing, application counts, and bookmark lookup.
- Reduced suspected frontend/API fan-out by introducing batch endpoints and documenting API response contracts, pagination caps, and cache boundaries.
- Added Redis cache strategy for public scholarship list/detail and analytics while avoiding shared cache leakage of personalized fields.
- Deployed staging environment to Azure Container Apps with Docker images, Azure Container Registry, Nginx gateway, GitHub Actions CI/CD, smoke tests, rollback workflow, and App Insights observability.
- Debugged real deployment issues including CORS registration failure, backend unavailable errors, Redis/RabbitMQ internal TCP routing, old active revisions, cold starts, and cloud cost scale-down.
- Wrote engineering documentation: API standardization guide, DB optimization report, cache layer plan, deployment guide, maintenance runbook, performance incident report, and QA checklist.

**Tech:** React, Next.js, Spring Boot, FastAPI, MySQL, PostgreSQL, Redis, RabbitMQ, Docker, Nginx, Azure Container Apps, GitHub Actions

### Doc Automation Engine - PDF Report Extraction and Word Export System

Analyzed and worked with a document automation system for extracting structured data from PDF reports, reviewing results, aggregating daily reports, and exporting Word documents from templates.

- Reviewed a FastAPI-based architecture with clear layers for API, application services, domain models, infrastructure, extraction engines, and worker tasks.
- Worked with a two-stage document pipeline: deterministic PDF parsing with `pdfplumber` and regex, followed by optional asynchronous LLM enrichment.
- Reviewed Celery worker design using Redis queues for extraction, enrichment, document processing, and scheduled background jobs.
- Analyzed PostgreSQL JSONB models for extraction jobs, reviewed data priority rules, and identified migration risks around startup-time schema changes.
- Reviewed MinIO/S3-compatible document storage flow for upload, checksum-based deduplication, download, and Word template export.
- Identified production-readiness issues including missing committed frontend API library files, weak development secrets, wildcard CORS, startup DDL changes, missing CI, N+1 member listing query, and heavy in-process extraction endpoint.
- Proposed improvements for security hardening, Alembic migrations, CI validation, tenant-safe file handling, and moving heavy processing consistently to background workers.

**Tech:** FastAPI, Celery, Redis, PostgreSQL, SQLAlchemy, MinIO, pdfplumber, docxtpl, Docker Compose, Next.js

## Selected Engineering Work

- Database optimization: created seed/load-test data, added composite indexes, compared before/after query plans, and documented performance results.
- API design: standardized `/api/v1` contracts, pagination rules, error response shape, batch endpoints, idempotency notes, and performance budgets.
- Cloud deployment: set up Azure Container Apps staging flow, configured secrets, deployed services, checked logs, smoke-tested endpoints, and documented rollback/maintenance steps.
- QA/debugging: tested guest, student, provider, admin, chat, notification, and matching flows; documented bugs and fixes.

## Education

[Your University] - [Degree / Major]  
[Expected Graduation Year or Graduation Year]

## Availability

Open to junior full-stack, backend, API development, bug fixing, Docker deployment, and database optimization work.
