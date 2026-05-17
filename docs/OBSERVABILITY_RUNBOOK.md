# Phase 6 - Observability Runbook EduMatch

Ngay ghi nhan: 2026-05-14

Muc tieu phase nay: he thong khong chi "deploy duoc" ma con nhin duoc no dang song, cham o dau, loi o service nao, va mot request di qua cac service nao.

## 0. Trang thai sau khi khac phuc

Da nang tu baseline observability len Azure-ready observability:

- Java services da attach Application Insights Java agent trong Docker image:
  - `auth-service`
  - `scholarship-service`
  - `chat-service`
- GitHub deploy da truyen:
  - `JAVA_TOOL_OPTIONS=-javaagent:/opt/applicationinsights-agent.jar ...`
  - `APPLICATIONINSIGHTS_CONNECTION_STRING`
  - `APPLICATIONINSIGHTS_ROLE_NAME`
  - `APPLICATIONINSIGHTS_ROLE_INSTANCE`
  - `OTEL_SERVICE_NAME`
  - `OTEL_RESOURCE_ATTRIBUTES`
  - `APP_VERSION`
  - `GIT_COMMIT`
  - `DEPLOY_ENVIRONMENT`
- Matching service da co Azure Monitor/OpenTelemetry bootstrap bang `azure-monitor-opentelemetry`.
- Gateway Nginx da:
  - ghi access log dang JSON.
  - gan `requestId`.
  - forward `X-Request-Id`.
  - forward W3C trace headers: `traceparent`, `tracestate`, `baggage`.
- Java/FastAPI request logs da co release metadata:
  - env
  - version
  - commit
- Da them Azure IaC:
  - `infra/azure/observability.bicep`
  - `.github/workflows/observability.yml`
  - `scripts/setup-azure-observability.ps1`
  - `scripts/setup-azure-diagnostics.ps1`
- IaC tao:
  - Azure Monitor/Application Insights workbook.
  - alert p95 latency.
  - alert 5xx spike.
  - alert dependency failures.
  - alert matching recommendation fallback.

Con phu thuoc vao Azure thuc te:

- `APPLICATIONINSIGHTS_CONNECTION_STRING` phai co trong GitHub environment secrets.
- Container Apps environment phai gan Log Analytics workspace.
- Neu muon alert gui mail/Teams/Slack thi can truyen `actionGroupResourceIds`.

## 1. Cong nghe su dung

| Lop | Cong nghe | Vai tro |
| --- | --- | --- |
| Java service metrics | Spring Boot Actuator + Micrometer Prometheus | Health, JVM, HTTP/server metrics |
| Matching metrics | `prometheus-client` | Expose `/metrics` cho FastAPI |
| Cloud logs | Azure Container Apps + Log Analytics | Luu container stdout/stderr, query log |
| Cloud APM | Application Insights Java agent + Azure Monitor OpenTelemetry Python | Distributed tracing, dependencies, logs/metrics |
| Request tracing nhe | `X-Request-Id` + log field `requestId` | Tim request qua gateway/service |

## 2. Nhung gi da implement

### Java services

Services:

- auth-service
- scholarship-service
- chat-service

Da them:

- Application Insights Java agent trong Docker image:
  - `/opt/applicationinsights-agent.jar`
- Deploy runtime:
  - `-javaagent:/opt/applicationinsights-agent.jar`
- `spring-boot-starter-actuator`
- `micrometer-registry-prometheus`
- expose endpoint:
  - `/actuator/health`
  - `/actuator/info`
  - `/actuator/metrics`
  - `/actuator/prometheus`
- response header:
  - `X-Request-Id`
  - `X-Response-Time-Ms`
- log request dang:

```txt
http_request requestId=<id> method=GET path=/api/... status=200 durationMs=42 env=staging version=<sha> commit=<sha>
```

RestTemplate cua auth/scholarship/chat tu dong forward `X-Request-Id` neu request hien tai co MDC `requestId`.

### Matching service

Da them:

- Azure Monitor OpenTelemetry bootstrap:
  - package `azure-monitor-opentelemetry`
  - config qua `APPLICATIONINSIGHTS_CONNECTION_STRING`
- `/metrics`
- Prometheus counter:

```txt
matching_http_requests_total
```

- Prometheus histogram:

```txt
matching_http_request_duration_seconds
```

- response header:
  - `X-Request-Id`
  - `X-Response-Time-Ms`

## 3. Cach test local

Chay service:

```powershell
docker compose --env-file .env up -d --build auth-service scholarship-service chat-service matching-service
```

Luu y: neu da tung tao DB volumes bang password khac, dung `.env.example` de smoke test co the bi:

```txt
Access denied for user ...
password authentication failed
```

Day khong phai loi observability code. Cach xu ly la dung dung file `.env` da tao volumes, hoac chi reset volumes khi chap nhan xoa data local.

Kiem tra health Java:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:19081/actuator/health
Invoke-WebRequest -UseBasicParsing http://localhost:19082/actuator/health
Invoke-WebRequest -UseBasicParsing http://localhost:19083/actuator/health
```

Kiem tra Prometheus Java:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:19081/actuator/prometheus
Invoke-WebRequest -UseBasicParsing http://localhost:19082/actuator/prometheus
Invoke-WebRequest -UseBasicParsing http://localhost:19083/actuator/prometheus
```

Kiem tra matching:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/health
Invoke-WebRequest -UseBasicParsing http://localhost:8000/metrics
```

Kiem tra request id:

```powershell
$headers=@{"X-Request-Id"="manual-test-001"}
Invoke-WebRequest -UseBasicParsing http://localhost:19082/debug/health -Headers $headers
docker compose logs --tail=80 scholarship-service
```

Trong log phai thay:

```txt
requestId=manual-test-001
```

## 4. Cloud setup can co

### GitHub secret

Them required secret neu muon trace/telemetry that su vao Application Insights:

```txt
APPLICATIONINSIGHTS_CONNECTION_STRING
```

Neu chua co secret nay, deploy van co the chay nhung App Insights tracing se chua day du. Container logs van ve Log Analytics neu Container Apps environment da gan workspace.

### Azure Container Apps

Moi Container App nen co:

- Log Analytics workspace gan voi Container Apps environment.
- Revision mode phu hop rollback.
- Ingress health endpoint dung cho smoke test.
- Min replicas cho service quan trong neu can warm latency.
- Java services phai chay image moi co `/opt/applicationinsights-agent.jar`.
- Runtime env `JAVA_TOOL_OPTIONS` phai co `-javaagent:/opt/applicationinsights-agent.jar`.
- `APPLICATIONINSIGHTS_ROLE_NAME` nen trung voi service name.

### Provision workbook/alerts

Chay local bang PowerShell:

```powershell
.\scripts\setup-azure-observability.ps1 `
  -ResourceGroup EduMatch-RG `
  -AppInsightsResourceId "/subscriptions/<sub>/resourceGroups/<rg>/providers/microsoft.insights/components/<appinsights>" `
  -Environment staging `
  -ActionGroupResourceIds @("/subscriptions/<sub>/resourceGroups/<rg>/providers/microsoft.insights/actionGroups/<ag>")
```

Hoac dung GitHub Actions:

```txt
Actions -> Provision EduMatch Observability -> Run workflow
```

Nhap:

```txt
environment=staging|production
appInsightsResourceId=/subscriptions/.../providers/microsoft.insights/components/...
actionGroupResourceIds=[] hoac ["...actionGroups/..."]
```

### Export Redis/RabbitMQ/DB platform metrics

Neu Redis/DB/RabbitMQ la Azure managed resources, bat diagnostic settings de day metrics/logs ve Log Analytics:

```powershell
.\scripts\setup-azure-diagnostics.ps1 `
  -LogAnalyticsWorkspaceId "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.OperationalInsights/workspaces/<workspace>" `
  -ResourceIds @(
    "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Cache/Redis/<redis>",
    "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.DBforMySQL/flexibleServers/<mysql>",
    "/subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.DBforPostgreSQL/flexibleServers/<postgres>"
  )
```

Neu RabbitMQ dang chay container tu quan ly, can expose Prometheus metrics hoac gui container logs/metrics qua Container Apps/Log Analytics. Neu dung broker managed/Service Bus, dung diagnostic settings nhu tren.

## 5. Dashboard nen co

Can theo doi 6 nhom metric:

| Nhom | Metric |
| --- | --- |
| Availability | health status, restart count |
| Latency | p50/p95/p99 request duration |
| Error | 4xx/5xx rate |
| Saturation | CPU, memory, replica count |
| DB pressure | slow query, connection pool usage |
| Messaging | RabbitMQ queue depth, consumer lag |

Dashboard toi thieu:

- API p95 latency by service.
- 5xx count by service.
- Container restart by service.
- CPU/memory by container.
- Matching `/api/v1/recommendations/*` latency.
- Scholarship list/search latency.

## 6. Alert rules nen dat

P0 alerts:

| Alert | Dieu kien goi y |
| --- | --- |
| Service down | health/smoke fail 2 lan lien tiep |
| High 5xx | 5xx rate > 2% trong 5 phut |
| High latency | p95 > budget trong 10 phut |
| Container restart loop | restart > 3 lan / 10 phut |
| Memory pressure | memory > 85% trong 10 phut |
| RabbitMQ backlog | queue depth tang lien tuc trong 10 phut |

P1 alerts:

- DB CPU cao.
- DB connection pool gan full.
- Matching recommendation cache hit rate thap.
- Smoke staging fail sau deploy.

## 7. Performance budget nen dung

| Endpoint | P95 target |
| --- | --- |
| `GET /api/scholarships` | < 150ms |
| `GET /api/v1/recommendations/applicant/{id}` cache/read model | < 200ms |
| batch matching score | < 500ms |
| bookmark/application status batch | < 80ms |
| auth login/register | < 300ms |
| chat send message | < 250ms |

## 8. KQL mau tren Log Analytics

Tim request cham:

```kusto
ContainerAppConsoleLogs_CL
| where Log_s contains "http_request"
| where Log_s contains "durationMs="
| project TimeGenerated, ContainerAppName_s, Log_s
| order by TimeGenerated desc
```

Tim request theo request id:

```kusto
ContainerAppConsoleLogs_CL
| where Log_s contains "requestId=manual-test-001"
| project TimeGenerated, ContainerAppName_s, Log_s
| order by TimeGenerated asc
```

Tim loi:

```kusto
ContainerAppConsoleLogs_CL
| where Log_s contains "ERROR" or Log_s contains "status=500"
| project TimeGenerated, ContainerAppName_s, Log_s
| order by TimeGenerated desc
```

## 9. Viec con lai de len production hon

1. Chay workflow `Provision EduMatch Observability` tren Azure that.
2. Tao/gan Action Group that cho email/Teams/Slack/PagerDuty.
3. Chay `scripts/setup-azure-diagnostics.ps1` cho Azure Cache for Redis/Azure Database/RabbitMQ/Service Bus neu dung managed resource.
4. Kiem tra Application Insights co dependency telemetry cho JDBC/Redis/RabbitMQ/HTTP.
5. Do p95/p99 bang load test, khong chi nhin log don le.
6. Neu gateway can nam trong distributed trace that su, can them OpenTelemetry-capable ingress/gateway hoac Nginx OTEL module. Ban hien tai da forward trace context va log JSON request id.

Ket luan ngan gon: phase nay da co "mat" de nhin he thong: health, metrics, request id, latency log, Application Insights agent, Azure Monitor OpenTelemetry Python, workbook/alerts bang IaC, va release metadata. Buoc tiep theo la chay IaC tren Azure that va gan action group de alert bay den nguoi truc.
