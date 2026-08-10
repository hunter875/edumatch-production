# Architecture Map

EduMatch is organized around service boundaries and operational behavior:

- Frontend renders user, provider, and admin workflows.
- Nginx gateway owns browser-facing routing, CORS, rate limits, and proxy timeouts.
- Java services own auth, scholarships, applications, bookmarks, chat, and notifications.
- Matching service owns scoring snapshots, score cache, and recommendation cache.
- RabbitMQ and workers keep slow side effects off the request path.

## Main Architecture Pages

| Topic | Page |
| --- | --- |
| System architecture | [System Architecture](../01-system-architecture.md) |
| Service boundaries | [Service Boundaries](services.md) |
| Data flow | [Data Flow](../06-data-flow.md) |
| Data model | [Data Model](../03-data-model.md) |
| Matching design | [Matching Design](../04-matching-design.md) |

## Current Design Bias

The system favors clear service ownership, batch endpoints, cacheable reads, and
async side effects. It does not try to solve scaling by adding AI or Kubernetes
before simpler bottlenecks are measured.
