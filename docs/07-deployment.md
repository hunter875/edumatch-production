# Deployment Guide

## Purpose

This guide explains how to run EduMatch locally and how to evolve it toward production-like deployment.

The immediate goal is not Kubernetes. The goal is:

- predictable Docker local stack
- separate local/prod config
- safe environment variables
- healthchecks
- gateway routing
- backup/restore
- CI/CD path

## Environments

### Local Development

Used for:

- coding
- debugging
- small seed data
- Docker Compose integration

Characteristics:

- services exposed on localhost ports
- local Nginx config
- Firebase disabled
- limited memory
- no HTTPS required

### Production-Like VPS

Used for:

- portfolio demo
- integration testing
- real deployment learning

Characteristics:

- Docker Compose or systemd-managed containers
- domain + HTTPS
- `.env.prod`
- persistent volumes/backups
- restart policy
- logs

### Cloud Managed

Optional later:

- FE on Vercel/Cloudflare
- services on ECS/Cloud Run/Azure Container Apps
- DB on RDS/Cloud SQL
- object storage on S3

Do not start here unless local/prod-compose is stable.

## Local Docker Commands

Start full stack:

```powershell
docker compose --profile workers up -d --build
```

Start only core services without workers:

```powershell
docker compose up -d --build frontend api-gateway auth-service scholarship-service chat-service matching-service
```

Check status:

```powershell
docker compose --profile workers ps
```

Logs:

```powershell
docker compose --profile workers logs --tail=120 frontend api-gateway auth-service scholarship-service matching-service chat-service
```

Recreate gateway after backend recreate:

```powershell
docker compose --profile workers up -d --force-recreate api-gateway
```

Why:

- Nginx can cache upstream container IP.
- Recreate gateway forces DNS resolution again.
- Better future fix: Docker DNS resolver in Nginx config.

## Local Ports

```txt
3000  frontend
8080  api-gateway
8081  auth-service
8082  scholarship-service
8083  chat-service
8084  chat websocket/service extra port
8000  matching-service
3307  auth mysql
3308  scholarship mysql
3309  chat mysql
5432  matching postgres
5672  rabbitmq
15672 rabbitmq management
```

## Environment Variables

### Frontend

```txt
NEXT_PUBLIC_API_GATEWAY=http://localhost:8080
NEXT_PUBLIC_SOCKET_URL=ws://localhost:8080/api/ws
NEXT_PUBLIC_API_TIMEOUT_MS=10000
```

### Auth Service

```txt
SPRING_PROFILES_ACTIVE=mysql
SPRING_DATASOURCE_URL=jdbc:mysql://auth-db:3306/auth_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
SPRING_DATASOURCE_USERNAME=auth_user
SPRING_DATASOURCE_PASSWORD=<auth-db-password>
APP_JWT_SECRET=<secret>
APP_JWT_EXPIRATION=86400000
RABBITMQ_HOST=rabbitmq
RABBITMQ_USERNAME=<rabbitmq-user>
RABBITMQ_PASSWORD=<rabbitmq-password>
APP_SERVICES_SCHOLARSHIP_SERVICE_URL=http://scholarship-service:8082
```

### Scholarship Service

```txt
SPRING_PROFILES_ACTIVE=dev
SPRING_DATASOURCE_URL=jdbc:mysql://scholarship-db:3306/scholarship_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
SPRING_DATASOURCE_USERNAME=scholarship_user
SPRING_DATASOURCE_PASSWORD=<scholarship-db-password>
JWT_SECRET=<secret>
AUTH_SERVICE_URL=http://auth-service:8081
MATCHING_SERVICE_URL=http://matching-service:8000
RABBITMQ_HOST=rabbitmq
RABBITMQ_USERNAME=<rabbitmq-user>
RABBITMQ_PASSWORD=<rabbitmq-password>
```

### Matching Service

```txt
DATABASE_URL=postgresql://matching_user:<matching-db-password>@matching-db:5432/matching_db
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=<rabbitmq-user>
RABBITMQ_PASSWORD=<rabbitmq-password>
JWT_SECRET=<secret>
JWT_ALGORITHM=HS256
CELERY_BROKER_URL=amqp://<rabbitmq-user>:<rabbitmq-password>@rabbitmq:5672//
```

### Chat Service

```txt
SPRING_PROFILES_ACTIVE=dev
SPRING_DATASOURCE_URL=jdbc:mysql://chat-db-test:3306/chat_db?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
SPRING_DATASOURCE_USERNAME=chat_user
SPRING_DATASOURCE_PASSWORD=<chat-db-password>
JWT_SECRET=<secret>
RABBITMQ_HOST=rabbitmq
RABBITMQ_USERNAME=<rabbitmq-user>
RABBITMQ_PASSWORD=<rabbitmq-password>
APP_FIREBASE_ENABLED=false
```

## Cloud Deploy Readiness

Use `.github/workflows/deploy.yml` for staging/production deploy.

Manual deploy:

```txt
GitHub Actions -> Build and Deploy EduMatch System -> Run workflow
operation: deploy
service: all
environment: staging
```

Production deploy uses the same workflow with `environment: production`. Configure GitHub Environment protection rules for `production` so it requires manual approval before jobs run.

Manual rollback:

```txt
GitHub Actions -> Build and Deploy EduMatch System -> Run workflow
operation: rollback
service: scholarship-service
environment: staging
revision: <optional-container-app-revision>
```

Required GitHub Actions secrets:

```txt
AZURE_CREDENTIALS
REGISTRY_USERNAME
REGISTRY_PASSWORD
APPLICATIONINSIGHTS_CONNECTION_STRING
```

Required GitHub environment variables for the frontend build:

```txt
NEXT_PUBLIC_API_GATEWAY=https://<nginx-gateway-fqdn>
NEXT_PUBLIC_SOCKET_URL=wss://<nginx-gateway-fqdn>/api/ws
```

Required Azure Container App secret names:

```txt
auth-service:
  auth-db-url
  auth-db-username
  auth-db-password
  jwt-secret
  rabbitmq-host
  rabbitmq-user
  rabbitmq-password
  redis-host
  mail-username
  mail-password

scholarship-service:
  scholarship-db-url
  scholarship-db-username
  scholarship-db-password
  jwt-secret
  rabbitmq-host
  rabbitmq-user
  rabbitmq-password
  redis-host
  auth-service-url
  matching-service-url

chat-service:
  chat-db-url
  chat-db-username
  chat-db-password
  jwt-secret
  rabbitmq-host
  rabbitmq-user
  rabbitmq-password
  auth-service-url

matching-service:
  matching-db-url
  rabbitmq-host
  rabbitmq-user
  rabbitmq-password
  jwt-secret
  celery-broker-url
```

The deploy workflow now has a cloud preflight job. It fails before deploy if required GitHub secrets or Azure Container App secret references are missing.

Staging smoke endpoints checked by workflow:

```txt
auth-service        /api/auth/health
scholarship-service /debug/health
chat-service        /api/health
matching-service    /health
frontend-app        /
nginx-gateway       /gateway/health
```

After deploy, check Application Insights with:

```kusto
requests
| summarize p95=percentile(duration, 95), errors=countif(success == false) by cloud_RoleName
```

```kusto
dependencies
| summarize p95=percentile(duration, 95), failures=countif(success == false) by cloud_RoleName, type
```

## Secrets Rules

Never commit:

- real JWT secret
- production DB password
- Firebase key
- cloud access keys
- email SMTP password

Use:

```txt
.env.local
.env.prod
GitHub Actions secrets
VPS environment files
```

## Local vs Prod Gateway

Local:

```txt
nginx-gateway/nginx.local.conf
```

Production:

```txt
nginx-gateway/nginx.prod.conf
```

Local config:

- allows localhost frontend origin
- routes to Docker service names
- can use relaxed CORS

Prod config:

- restricted CORS
- HTTPS termination or behind TLS proxy
- stronger security headers
- rate limits
- configured domain

## Production-Like VPS Plan

Minimum viable deploy:

1. Buy/use VPS.
2. Install Docker and Docker Compose plugin.
3. Clone repo.
4. Create `.env.prod`.
5. Configure DNS domain to VPS IP.
6. Use Nginx or Caddy for HTTPS.
7. Start stack.
8. Verify health.
9. Configure backup.

Example:

```bash
docker compose --env-file .env.prod --profile workers up -d --build
```

Recommended:

- Put DB volumes on persistent disk.
- Enable restart policy.
- Keep logs rotated.
- Backup DB before deploy.

## Healthchecks

Health endpoints:

```txt
auth-service:        /api/auth/health
scholarship-service: /debug/health
chat-service:        /api/health
matching-service:    /health
gateway:             /gateway/health if configured
```

Worker health:

- Do not use HTTP healthcheck for workers.
- Use process health, queue heartbeat, or disable Docker HTTP healthcheck.

## Backup And Restore

### MySQL Backup

Auth DB:

```bash
docker exec auth-db-test mysqldump -u root -p"$AUTH_DB_ROOT_PASSWORD" auth_db > backup-auth.sql
```

Scholarship DB:

```bash
docker exec scholarship-db-test mysqldump -u root -p"$SCHOLARSHIP_DB_ROOT_PASSWORD" scholarship_db > backup-scholarship.sql
```

Chat DB:

```bash
docker exec chat-db-test mysqldump -u root -p"$CHAT_DB_ROOT_PASSWORD" chat_db > backup-chat.sql
```

### PostgreSQL Backup

```bash
docker exec matching-db-test pg_dump -U matching_user matching_db > backup-matching.sql
```

### Restore MySQL

```bash
docker exec -i scholarship-db-test mysql -u root -p"$SCHOLARSHIP_DB_ROOT_PASSWORD" scholarship_db < backup-scholarship.sql
```

### Restore Postgres

```bash
docker exec -i matching-db-test psql -U matching_user matching_db < backup-matching.sql
```

## CI/CD Target

GitHub Actions stages:

```txt
lint/typecheck frontend
build frontend
test backend services
build Docker images
push images
deploy to VPS/cloud
smoke test
```

Minimum CI:

- build frontend
- run backend unit tests
- docker compose config check

Deploy should not happen if build/test fails.

## Smoke Tests After Deploy

```bash
curl -I https://your-domain.com
curl -I https://your-domain.com/user/scholarships
curl -s https://api.your-domain.com/api/auth/health
curl -s https://api.your-domain.com/api/scholarships?isPublic=true&page=0&size=1
curl -s https://api.your-domain.com/health
```

Manual smoke:

- login user
- browse scholarships
- apply
- bookmark
- admin login
- admin analytics
- matching recommendations
- chat/notification if enabled

## Rollback

Simple rollback plan:

1. Keep previous Docker image tag.
2. Backup DB before migration.
3. Deploy new version.
4. Smoke test.
5. If fail, deploy previous tag.
6. Restore DB only if migration corrupted data.

Do not rollback DB blindly if live writes happened after deploy.

## Deployment Tradeoffs

| Option | Pros | Cons | Recommendation |
|---|---|---|---|
| Docker Compose on VPS | simple, cheap, portfolio-friendly | manual scaling | best first deploy |
| Vercel FE + VPS backend | easy FE deploy | CORS/env split | good later |
| ECS/Cloud Run | managed scaling | learning/ops cost | later |
| Kubernetes | powerful | too heavy now | not needed |
| Managed DB | backup/reliability | cost | use for serious demo |

## Deployment Done Criteria

- [ ] local Docker works
- [ ] prod env separated
- [ ] domain configured
- [ ] HTTPS enabled
- [ ] healthchecks pass
- [ ] logs accessible
- [ ] DB backup documented
- [ ] smoke test documented
- [ ] rollback path exists
