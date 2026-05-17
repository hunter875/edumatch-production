# EduMatch API Gateway

Nginx is the single entry point for the EduMatch frontend and backend services.

## Config Files

| File | Purpose | Used by |
| --- | --- | --- |
| `nginx.local.conf` | Local Docker Compose/dev config. Allows localhost-style CORS and exposes detailed local status. | `docker-compose.yml` |
| `nginx.prod.conf` | Production config. Uses a CORS allowlist, hides internal service URLs, and adds baseline browser hardening headers. | `nginx-gateway/Dockerfile` |
| `nginx.conf` | Backward-compatible local copy for older commands/scripts. Prefer the explicit local/prod files above. | Legacy/manual use |

The split matters because local development and production have different risk profiles:

- Local needs to accept requests from ports like `localhost:3000` and `localhost:8080`.
- Production should only trust the real frontend origin.
- Local status output can show concrete container URLs for debugging.
- Production status output should not leak internal hostnames or ports.
- A production image should be buildable without relying on a bind-mounted config file.

## Local Routing

`docker-compose.yml` mounts:

```yaml
./nginx-gateway/nginx.local.conf:/etc/nginx/nginx.conf:ro
```

Local upstreams:

| Gateway path | Upstream |
| --- | --- |
| `/api/auth`, `/api/user`, `/api/users`, `/api/admin`, `/api/organizations`, `/api/employer`, `/uploads` | `auth-service:8081` |
| `/api/scholarships`, `/api/opportunities`, `/api/applications`, `/api/bookmarks`, `/api/v1/scholarships`, `/api/v1/applications`, `/api/v1/bookmarks`, `/api/v1/provider/scholarships`, `/api/v1/provider/applications`, `/api/v1/provider/analytics`, `/api/v1/admin/scholarships`, `/api/v1/admin/applications`, `/api/v1/me/applications`, `/api/v1/me/bookmarks` | `scholarship-service:8082` |
| `/api/v1/match`, `/api/v1/recommendations`, `/api/matching`, `/health`, `/recommendations` | `matching-service:8000` |
| `/api/chat`, `/api/conversations`, `/api/messages`, `/api/fcm`, `/api/notifications`, `/api/ws` | `chat-service:8083` |
| `/` | `frontend:3000` |

Important fixes in the current config:

- `/api/notifications` routes to `chat-service`, where `NotificationController` actually lives.
- `/api/matching` forwards the `Authorization` header after rewriting to `/api/v1/matching/*`.
- WebSocket timeouts are longer than the old 60 second setting.
- Rate limited requests return HTTP `429`.
- Docker image builds use `nginx.prod.conf` as `/etc/nginx/nginx.conf`.

## Production Setup

Before deploying `nginx.prod.conf`, replace:

```nginx
server_name edumatch.your-domain.com;

map $http_origin $cors_origin {
    default "";
    "~^https://edumatch\.your-domain\.com$" $http_origin;
    "~^https://www\.edumatch\.your-domain\.com$" $http_origin;
}
```

with the real production domain(s). If the platform exposes services on different internal ports, update the upstream block too.

The production file intentionally does not echo arbitrary origins. If an origin is not in the allowlist, Nginx omits `Access-Control-Allow-Origin`, and browsers block cross-origin credentialed requests.

## Quick Checks

Local gateway health:

```bash
curl http://localhost:8080/gateway/health
```

Local status:

```bash
curl http://localhost:8080/gateway/status
```

Nginx syntax with Docker:

```bash
docker run --rm -v "$PWD/nginx-gateway/nginx.local.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t
docker run --rm -v "$PWD/nginx-gateway/nginx.prod.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t
```
