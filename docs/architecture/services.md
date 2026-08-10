# Service Boundaries

## Frontend

The Next.js app owns UI state, route structure, user workflows, and API clients.
Server state should flow through stable service functions and React Query.

## API Gateway

Nginx is the browser-facing entrypoint for local and cloud deployments.

Responsibilities:

- route `/api/*` paths to internal services
- apply CORS headers consistently
- enforce rate limits for auth, general API, and matching routes
- forward request IDs and tracing headers
- protect backends from direct browser exposure

## Auth Service

Owns users, roles, organizations, employer requests, JWT issuance, and user
profile fields used by matching.

## Scholarship Service

Owns opportunities, applications, bookmarks, provider dashboards, moderation,
and scholarship analytics.

## Chat Service

Owns conversations, messages, notification records, WebSocket/STOMP delivery,
and notification event consumption.

## Matching Service

Owns applicant/opportunity feature snapshots, hard filters, score calculation,
score cache, and recommendation cache.

Matching should not own source-of-truth profile or scholarship data. It stores
read models built from events.

## Shared Infrastructure

| Component | Responsibility |
| --- | --- |
| Redis | short-lived cache and user lookup cache |
| RabbitMQ | async events and worker dispatch |
| MySQL | auth, scholarship, and chat source-of-truth data |
| PostgreSQL | matching read models and caches |
