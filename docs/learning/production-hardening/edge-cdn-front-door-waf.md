# CDN, Front Door, And WAF

## Current Problem

EduMatch currently has an Nginx gateway. That is useful, but it is not the same
as a full edge layer.

Nginx gateway handles:

- routing
- CORS
- rate limits
- proxy timeouts
- request IDs

An edge layer handles:

- global entrypoint
- TLS at the edge
- CDN caching
- WAF rules
- bot and abuse filtering
- routing users to healthy origins

For Azure, the usual edge candidate is Azure Front Door. Cloudflare can also do
this well.

## Mental Model

Traffic should lose pressure before it reaches the services:

```txt
User
  -> CDN / Front Door / WAF
  -> Nginx Gateway
  -> services
  -> Redis
  -> DB
```

If 3,000 users request the same public page, the edge or Redis should absorb
most of that traffic. MySQL should not execute the same query 3,000 times.

## What CDN Should Cache

Good cache targets:

- static frontend assets
- images
- public scholarship list pages for common filters
- public scholarship detail pages
- public metadata such as categories/tags

Bad cache targets:

- user profile
- application statuses
- bookmarks
- chat messages
- admin dashboards
- personalized recommendations unless keyed per user and carefully controlled

## Cache Headers

Static assets:

```http
Cache-Control: public, max-age=31536000, immutable
```

Public scholarship list:

```http
Cache-Control: public, max-age=30, stale-while-revalidate=120
```

Private authenticated response:

```http
Cache-Control: private, no-store
```

## WAF Responsibilities

WAF should protect from:

- obvious SQL injection probes
- XSS probes
- path traversal
- bot floods
- suspicious user agents
- abnormal request rates

WAF should not be the only security layer. The services still need validation,
authorization, and safe queries.

## Recommended EduMatch Routing

```txt
Azure Front Door
  /_next/static/* -> frontend static cache
  /assets/*       -> frontend/static storage cache
  /uploads/*      -> object storage or auth-service upload route
  /api/*          -> nginx-gateway
  /*              -> frontend-app
```

Then gateway routes:

```txt
/api/auth/*         -> auth-service
/api/scholarships*  -> scholarship-service
/api/applications*  -> scholarship-service
/api/v1/matching*   -> matching-service
/api/ws             -> chat-service websocket
```

## Why Nginx Alone Is Not Enough

Nginx inside Container Apps is close to your services. If a burst hits Nginx,
it has already entered your cloud runtime and can still create container and DB
pressure.

An edge CDN/WAF can reject or cache requests earlier.

## Implementation Steps

1. Put Front Door or Cloudflare in front of the app.
2. Make gateway the primary API origin.
3. Keep backend services internal if possible.
4. Add cache headers for public static and public read responses.
5. Verify authenticated responses are not cached publicly.
6. Add WAF managed rules in detection mode first.
7. Observe false positives.
8. Move to prevention mode.

## Verification

Check:

- static assets served from edge cache
- repeated public list requests show cache hit
- private API responses are not cached
- WAF logs are visible
- gateway receives fewer requests during repeated public browsing
- p95 improves under repeated popular-route load

## Common Mistakes

- caching authenticated response with `Authorization` header
- forgetting `Vary: Authorization` or avoiding cache entirely for private data
- caching errors for too long
- putting WAF in prevention mode before reviewing false positives
- exposing backend service URLs and letting users bypass gateway

## AI Handoff Prompt

```txt
You are designing an edge layer for EduMatch.
Read docs/learning/production-hardening/edge-cdn-front-door-waf.md,
nginx-gateway/nginx.prod.conf, and infra/azure/container-apps.bicep.
Propose an Azure Front Door routing and caching plan.
Classify every major endpoint as public-cacheable, private-no-store, or websocket/pass-through.
Do not change code yet.
```
