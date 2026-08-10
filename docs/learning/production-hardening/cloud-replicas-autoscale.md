# Cloud Replicas And Autoscale

## Current Problem

The current Azure Container Apps template sets most services to:

```txt
minReplicas: 0
maxReplicas: 2
```

This is acceptable for cheap staging. It is not good for bursty
production-like traffic.

Why:

- `minReplicas: 0` means the app can sleep.
- Sleeping apps create cold starts.
- Cold starts during a traffic burst feel like random timeout.
- `maxReplicas: 2` means the service cannot scale beyond two containers even if
  traffic keeps increasing.

## Mental Model

Autoscale is not magic. It reacts after pressure appears.

```txt
traffic arrives -> concurrency rises -> scale rule triggers -> new replica starts -> traffic spreads
```

If the app is at zero replicas, there is no warm process to handle the first
wave. If startup takes 10-30 seconds, users see slow requests or failures.

## What Each Setting Means

### `minReplicas`

Minimum number of always-running containers.

Use:

- `0` for cheap demos
- `1` for low-traffic staging
- `2+` for production public entrypoints

### `maxReplicas`

Maximum number of containers the platform can create.

Use:

- low number to control cost
- higher number for burst tolerance
- must be paired with DB/cache protection

### `concurrentRequests`

Azure Container Apps HTTP scaling threshold.

If set to `80`, the platform tries to add replicas when a revision handles more
than about 80 concurrent requests.

Lower value:

- scales earlier
- costs more
- protects p95 latency

Higher value:

- scales later
- cheaper
- can increase p95 latency

## Suggested EduMatch Profiles

### Cheap Staging

| App | min | max |
| --- | ---: | ---: |
| nginx-gateway | 1 | 2 |
| frontend-app | 1 | 2 |
| auth-service | 0 | 2 |
| scholarship-service | 1 | 2 |
| matching-service | 0 | 2 |
| chat-service | 0 | 2 |

### Portfolio Demo

| App | min | max |
| --- | ---: | ---: |
| nginx-gateway | 2 | 5 |
| frontend-app | 2 | 5 |
| auth-service | 1 | 4 |
| scholarship-service | 2 | 6 |
| matching-service | 1 | 4 |
| chat-service | 1 | 4 |

### Burst Test

| App | min | max |
| --- | ---: | ---: |
| nginx-gateway | 2 | 10 |
| frontend-app | 2 | 10 |
| auth-service | 2 | 8 |
| scholarship-service | 3 | 12 |
| matching-service | 2 | 8 |
| chat-service | 1 | 6 |

Do not run burst profile all the time unless cost is acceptable.

## DB Protection Warning

Scaling app replicas can hurt the DB if every replica opens too many
connections.

Example:

```txt
scholarship-service maxReplicas = 12
Hikari max pool = 10
possible DB connections = 120
```

If MySQL allows only 100 connections, the system fails under load.

Therefore tune:

- service replicas
- Hikari pool size
- SQLAlchemy pool size
- DB max connections
- cache hit rate
- gateway rate limits

## Recommended Change In Bicep

Current app objects live in `infra/azure/container-apps.bicep`.

Example target:

```bicep
{
  name: 'scholarship-service'
  port: 8082
  external: false
  cpu: json('1.0')
  memory: '2Gi'
  minReplicas: 2
  maxReplicas: 8
}
```

For production hardening:

- set `external: false` for backend services
- keep gateway/frontend public
- increase min replicas for hot services
- increase CPU/memory for Java services

## What To Measure After Changing

Run the same benchmark before and after.

Measure:

- cold start latency
- p95 under steady load
- p99 during ramp-up
- replica count over time
- DB connection count
- error rate

## Anti-Patterns

Do not:

- set `maxReplicas: 20` without DB connection planning
- expose every backend publicly
- rely on autoscale to save slow queries
- run with `minReplicas: 0` for a public demo and expect no cold start
- tune replicas without benchmark data

## AI Handoff Prompt

```txt
You are tuning EduMatch Azure Container Apps scaling.
Read infra/azure/container-apps.bicep and docs/learning/production-hardening/cloud-replicas-autoscale.md.
Create a conservative staging profile and a burst-test profile.
Update docs with expected cost/latency tradeoffs.
Do not expose backend services publicly unless required for smoke tests.
```
