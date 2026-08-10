# Local Setup

Use this page when bringing EduMatch up from a fresh clone.

## Requirements

- Docker Desktop
- Docker Compose plugin
- PowerShell on Windows
- A local `.env` file based on `.env.example`

## Start The Stack

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

Start workers as well:

```powershell
docker compose --profile workers up -d --build
```

Check status:

```powershell
docker compose --profile workers ps
```

## Seed Development Data

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed-dev-data.ps1
```

Optional load-test seed:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed-dev-data.ps1 -LoadTest
```

## Open Local Services

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| API Gateway | `http://localhost:19080` |
| Matching Service | `http://localhost:8000` |
| RabbitMQ Management | `http://localhost:15672` |

## First Smoke Test

```powershell
curl.exe -I http://localhost:3000
curl.exe -I http://localhost:3000/user/scholarships
curl.exe -s -o NUL -w "status=%{http_code} time=%{time_total}`n" "http://localhost:19080/api/scholarships?isPublic=true&page=0&size=12"
```

## Useful Logs

```powershell
docker compose --profile workers logs --tail=120 frontend api-gateway auth-service scholarship-service matching-service chat-service
```

For the long-form deployment notes, see [Local And Cloud Deployment](../07-deployment.md).
