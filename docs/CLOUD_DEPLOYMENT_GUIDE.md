# EduMatch Cloud Deployment Guide

Ngay ghi nhan: 2026-05-17

Tai lieu nay la huong dan deploy EduMatch len cloud theo huong hien tai cua repo: **Azure Container Apps**. No khac voi runbook bao tri: tai lieu nay di tu luc chuan bi cloud, tao infra, set secret, deploy, smoke test, rollback, roi bat/tat de tiet kiem credit.

## 1. Kien truc cloud hien tai

Target cloud dang dung:

```txt
Internet
  -> frontend-app
  -> nginx-gateway
  -> auth-service
  -> scholarship-service
  -> chat-service
  -> matching-service
  -> MySQL/PostgreSQL/Redis/RabbitMQ
```

Nen nho:

- Repo dang toi uu cho **Azure Container Apps**, khong phai VM.
- Frontend va gateway la public entrypoint.
- Backend services co the public trong staging de smoke test, nhung production nen harden lai.
- Redis/RabbitMQ neu chay bang Container Apps chi hop staging/demo. Production nen can nhac managed Redis/managed broker.

Resource dang dung trong staging cua minh:

```txt
Subscription: Azure for Students
Resource group: EduMatch-VM-RG-v2
Region: southeastasia
ACR: edumatchminhacr.azurecr.io
Container Apps Environment: edumatch-staging-apps-env
Gateway: https://nginx-gateway.politedune-4636e535.southeastasia.azurecontainerapps.io
```

## 2. Dieu kien truoc khi deploy

May local can co:

```powershell
az version
gh --version
git --version
docker --version
```

Neu `az` chua login:

```powershell
az login
az account list --output table
az account set --subscription "5eb63f46-640b-4a39-b5e0-308b592a79b2"
```

Neu `gh secret set ...` bao chua login:

```powershell
gh auth login
```

Neu project la file zip tai ve, nen dua vao git repo that su truoc khi chay GitHub Actions:

```powershell
git init
git add .
git commit -m "Initial EduMatch cloud deploy setup"
git branch -M main
git remote add origin https://github.com/<owner>/<repo>.git
git push -u origin main
```

Khong commit file secret, `.env`, dump DB, token, password.

## 3. Buoc 1 - Tao Azure infrastructure

Script provision co san:

```txt
scripts/provision-azure-container-apps.ps1
infra/azure/container-apps.bicep
```

Chay:

```powershell
.\scripts\provision-azure-container-apps.ps1 `
  -ResourceGroup "EduMatch-VM-RG-v2" `
  -Location "southeastasia" `
  -Environment "staging" `
  -AcrName "edumatchminhacr" `
  -ExposeBackends $true
```

Script nay tao:

- Azure Container Registry.
- Log Analytics workspace.
- Application Insights.
- Container Apps Environment.
- Container App shell cho `auth-service`, `scholarship-service`, `chat-service`, `matching-service`, `frontend-app`, `nginx-gateway`.

Script nay **chua tao database**, va trong Bicep hien tai **chua tao Redis/RabbitMQ app**. Hai cai do can tao rieng neu dung self-hosted Container Apps.

Kiem tra:

```powershell
az acr list --query "[].{name:name,loginServer:loginServer,resourceGroup:resourceGroup}" -o table
az containerapp list -g EduMatch-VM-RG-v2 -o table
```

## 4. Buoc 2 - Tao database

Can 4 database rieng:

| Service | Engine | DB name goi y |
| --- | --- | --- |
| auth-service | MySQL | `auth_db` |
| scholarship-service | MySQL | `scholarship_db` |
| chat-service | MySQL | `chat_db` |
| matching-service | PostgreSQL | `matching_db` |

Java services dung JDBC URL:

```txt
jdbc:mysql://<mysql-host>:3306/auth_db?useSSL=true&requireSSL=true&serverTimezone=UTC
jdbc:mysql://<mysql-host>:3306/scholarship_db?useSSL=true&requireSSL=true&serverTimezone=UTC
jdbc:mysql://<mysql-host>:3306/chat_db?useSSL=true&requireSSL=true&serverTimezone=UTC
```

Matching service dung SQLAlchemy/Postgres URL:

```txt
postgresql+psycopg2://<user>:<password>@<postgres-host>:5432/matching_db?sslmode=require
```

Production note:

- Bat backup cho DB.
- Dung strong password.
- Khong de DB public rong neu khong can.
- Chay migration bang Flyway/Alembic, khong dua vao Hibernate `ddl-auto=update`.

## 5. Buoc 3 - Tao Redis va RabbitMQ

Neu dung self-hosted Container Apps cho staging:

```powershell
$rg = "EduMatch-VM-RG-v2"
$env = "edumatch-staging-apps-env"

az containerapp create `
  --name redis `
  --resource-group $rg `
  --environment $env `
  --image redis:7-alpine `
  --ingress internal `
  --target-port 6379 `
  --transport tcp `
  --exposed-port 6379 `
  --min-replicas 0 `
  --max-replicas 1

az containerapp create `
  --name rabbitmq `
  --resource-group $rg `
  --environment $env `
  --image rabbitmq:3-management-alpine `
  --ingress internal `
  --target-port 5672 `
  --transport tcp `
  --exposed-port 5672 `
  --min-replicas 0 `
  --max-replicas 1 `
  --env-vars RABBITMQ_DEFAULT_USER="<rabbitmq-user>" RABBITMQ_DEFAULT_PASS="<rabbitmq-password>"
```

Important fix da gap thuc te:

- Redis phai co internal TCP exposed port `6379`.
- RabbitMQ phai co internal TCP exposed port `5672`.
- Secret host nen la app name:

```txt
redis-host=redis
rabbitmq-host=rabbitmq
```

Neu bi timeout Redis/RabbitMQ trong log, check lai:

```powershell
az containerapp ingress show -g EduMatch-VM-RG-v2 -n redis
az containerapp ingress show -g EduMatch-VM-RG-v2 -n rabbitmq
```

## 6. Buoc 4 - Set Azure Container App secrets

Script co san:

```txt
scripts/set-containerapp-secrets.ps1
```

Chay voi placeholder nhu sau. Khong paste secret that vao tai lieu.

```powershell
.\scripts\set-containerapp-secrets.ps1 `
  -ResourceGroup "EduMatch-VM-RG-v2" `
  -AuthDbUrl "<jdbc-mysql-auth-url>" `
  -AuthDbUsername "<auth-db-user>" `
  -AuthDbPassword "<auth-db-password>" `
  -ScholarshipDbUrl "<jdbc-mysql-scholarship-url>" `
  -ScholarshipDbUsername "<scholarship-db-user>" `
  -ScholarshipDbPassword "<scholarship-db-password>" `
  -ChatDbUrl "<jdbc-mysql-chat-url>" `
  -ChatDbUsername "<chat-db-user>" `
  -ChatDbPassword "<chat-db-password>" `
  -MatchingDbUrl "<postgresql-sqlalchemy-url>" `
  -JwtSecret "<long-random-jwt-secret>" `
  -RabbitMqHost "rabbitmq" `
  -RabbitMqUser "<rabbitmq-user>" `
  -RabbitMqPassword "<rabbitmq-password>" `
  -RedisHost "redis" `
  -AuthServiceUrl "http://auth-service" `
  -MatchingServiceUrl "http://matching-service" `
  -CeleryBrokerUrl "amqp://<rabbitmq-user>:<rabbitmq-password>@rabbitmq:5672//" `
  -MailUsername "<mail-user-or-disabled>" `
  -MailPassword "<mail-password-or-disabled>"
```

Kiem tra secret da co:

```powershell
az containerapp secret list -g EduMatch-VM-RG-v2 -n auth-service --query "[].name" -o table
az containerapp secret list -g EduMatch-VM-RG-v2 -n scholarship-service --query "[].name" -o table
az containerapp secret list -g EduMatch-VM-RG-v2 -n chat-service --query "[].name" -o table
az containerapp secret list -g EduMatch-VM-RG-v2 -n matching-service --query "[].name" -o table
```

## 7. Buoc 5 - Set GitHub Actions secrets

Workflow deploy can:

```txt
AZURE_CREDENTIALS
REGISTRY_USERNAME
REGISTRY_PASSWORD
APPLICATIONINSIGHTS_CONNECTION_STRING
```

Tao Azure service principal cho GitHub Actions:

```powershell
$sub = "5eb63f46-640b-4a39-b5e0-308b592a79b2"
$rg = "EduMatch-VM-RG-v2"

az ad sp create-for-rbac `
  --name "edumatch-github-actions" `
  --role contributor `
  --scopes "/subscriptions/$sub/resourceGroups/$rg" `
  --sdk-auth
```

Copy JSON output roi set vao GitHub:

```powershell
gh secret set AZURE_CREDENTIALS
```

Lay ACR credential:

```powershell
az acr credential show --name edumatchminhacr --query username -o tsv
az acr credential show --name edumatchminhacr --query "passwords[0].value" -o tsv
```

Set GitHub secrets:

```powershell
gh secret set REGISTRY_USERNAME
gh secret set REGISTRY_PASSWORD
gh secret set APPLICATIONINSIGHTS_CONNECTION_STRING
```

Neu `az acr credential show` bao khong thay ACR:

- Chua provision ACR.
- Dang sai subscription.
- Dang sai ACR name.

Check lai:

```powershell
az account show -o table
az acr list --query "[].{name:name,loginServer:loginServer,resourceGroup:resourceGroup}" -o table
```

## 8. Buoc 6 - Chay workflow deploy staging

Workflow:

```txt
.github/workflows/deploy.yml
Build and Deploy EduMatch System
```

Tren GitHub:

```txt
Actions
  -> Build and Deploy EduMatch System
  -> Run workflow
     operation: deploy
     service: all
     environment: staging
```

Workflow se chay:

```txt
detect-changes
  -> validate
  -> preflight-cloud
  -> build image
  -> push ACR
  -> deploy Azure Container Apps
  -> smoke-test-staging
```

Neu `validate` fail thi khong deploy. Neu `preflight-cloud` fail thi thieu Azure Container App secret. Neu `smoke-test-staging` fail thi app da deploy nhung staging chua dat.

## 9. Buoc 7 - Check revision va traffic

List apps:

```powershell
az containerapp list -g EduMatch-VM-RG-v2 `
  --query "[].{name:name,fqdn:properties.configuration.ingress.fqdn}" `
  -o table
```

List revision:

```powershell
az containerapp revision list `
  -g EduMatch-VM-RG-v2 `
  -n nginx-gateway `
  --query "[].{name:name,active:properties.active,running:properties.runningState,traffic:properties.trafficWeight}" `
  -o table
```

Neu co nhieu revision cu cung active va khong can canary, route 100% ve revision moi:

```powershell
az containerapp ingress traffic set `
  -g EduMatch-VM-RG-v2 `
  -n nginx-gateway `
  --revision-weight "<latest-ready-revision>=100"
```

Tat revision cu neu no gay duplicate worker/consumer:

```powershell
az containerapp revision deactivate `
  -g EduMatch-VM-RG-v2 `
  -n nginx-gateway `
  --revision "<old-revision>"
```

Luu y thuc te da gap: nhieu active revisions co the tao duplicate RabbitMQ consumers va log spam.

## 10. Buoc 8 - Smoke test sau deploy

Health endpoints dang duoc workflow smoke:

```txt
auth-service        /api/auth/health
scholarship-service /debug/health
chat-service        /api/health
matching-service    /health
frontend-app        /
nginx-gateway       /gateway/health
```

Smoke nhanh qua gateway:

```powershell
$gateway = "https://nginx-gateway.politedune-4636e535.southeastasia.azurecontainerapps.io"

Invoke-WebRequest "$gateway/gateway/health" -UseBasicParsing
Invoke-WebRequest "$gateway/api/auth/health" -UseBasicParsing
Invoke-WebRequest "$gateway/debug/health" -UseBasicParsing
Invoke-WebRequest "$gateway/api/health" -UseBasicParsing
Invoke-WebRequest "$gateway/health" -UseBasicParsing
Invoke-WebRequest "$gateway/api/scholarships?isPublic=true&page=0&size=12" -UseBasicParsing
```

Smoke business flow nen test thu cong:

```txt
1. Guest mo public scholarship list.
2. Register/login student.
3. Student apply scholarship.
4. Provider xem applications.
5. Admin approve/reject scholarship.
6. Chat gui 1 message.
7. Notification co vao khong.
8. Matching recommendation co tra du lieu khong.
```

Browser CORS test cho register:

```powershell
$gateway = "https://nginx-gateway.politedune-4636e535.southeastasia.azurecontainerapps.io"
$origin = $gateway
$body = @{
  username = "smoke_student_$(Get-Random)"
  email = "smoke$(Get-Random)@example.com"
  password = "Password123!"
  fullName = "Smoke Student"
  role = "APPLICANT"
} | ConvertTo-Json

Invoke-WebRequest "$gateway/api/auth/register" `
  -Method POST `
  -Headers @{ Origin = $origin; "Content-Type" = "application/json" } `
  -Body $body `
  -UseBasicParsing
```

Neu registration fail voi `Invalid CORS request`, check lai:

- Nginx CORS allowlist.
- Backend Spring CORS allowed origin pattern.
- Gateway co strip Origin cho `/api/auth` hay khong.

## 11. Buoc 9 - Check log va observability

Container App logs:

```powershell
az containerapp logs show -g EduMatch-VM-RG-v2 -n nginx-gateway --tail 100
az containerapp logs show -g EduMatch-VM-RG-v2 -n auth-service --tail 100
az containerapp logs show -g EduMatch-VM-RG-v2 -n scholarship-service --tail 100
az containerapp logs show -g EduMatch-VM-RG-v2 -n chat-service --tail 100
az containerapp logs show -g EduMatch-VM-RG-v2 -n matching-service --tail 100
```

App Insights can check:

```kusto
requests
| summarize p95=percentile(duration, 95), errors=countif(success == false) by cloud_RoleName
| order by p95 desc
```

```kusto
dependencies
| summarize p95=percentile(duration, 95), failures=countif(success == false) by cloud_RoleName, type
| order by failures desc, p95 desc
```

```kusto
traces
| where severityLevel >= 2
| order by timestamp desc
| take 100
```

Can thay cac field:

```txt
service.name
service.version
deployment.environment
APP_VERSION
requestId / trace id
```

Neu muon provision workbook/alert:

```txt
.github/workflows/observability.yml
Provision EduMatch Observability
```

Input can:

```txt
environment: staging
appInsightsResourceId: <Application Insights resource id>
actionGroupResourceIds: []
```

Lay App Insights resource id:

```powershell
az resource list `
  -g EduMatch-VM-RG-v2 `
  --resource-type "microsoft.insights/components" `
  --query "[].id" `
  -o tsv
```

## 12. Buoc 10 - Rollback

Rollback bang GitHub Actions:

```txt
Actions
  -> Build and Deploy EduMatch System
  -> Run workflow
     operation: rollback
     service: scholarship-service
     environment: staging
     revision: <optional-revision-name>
```

Neu bo trong `revision`, workflow lay revision running truoc do.

Rollback bang CLI:

```powershell
az containerapp revision list `
  -g EduMatch-VM-RG-v2 `
  -n scholarship-service `
  --query "[].{name:name,active:properties.active,running:properties.runningState,created:properties.createdTime}" `
  -o table

az containerapp revision activate `
  -g EduMatch-VM-RG-v2 `
  -n scholarship-service `
  --revision "<old-good-revision>"

az containerapp ingress traffic set `
  -g EduMatch-VM-RG-v2 `
  -n scholarship-service `
  --revision-weight "<old-good-revision>=100"
```

Sau rollback phai smoke lai service do.

## 13. Bat/tat staging de tiet kiem credit

Truoc khi demo/test, wake services:

```powershell
$rg = "EduMatch-VM-RG-v2"
$apps = @(
  "redis",
  "rabbitmq",
  "auth-service",
  "scholarship-service",
  "chat-service",
  "matching-service",
  "frontend-app",
  "nginx-gateway"
)

foreach ($app in $apps) {
  az containerapp update -g $rg -n $app --min-replicas 1
}
```

Sau khi dung xong, scale ve 0:

```powershell
$rg = "EduMatch-VM-RG-v2"
$apps = @(
  "auth-service",
  "scholarship-service",
  "chat-service",
  "matching-service",
  "frontend-app",
  "nginx-gateway",
  "redis",
  "rabbitmq"
)

foreach ($app in $apps) {
  az containerapp update -g $rg -n $app --min-replicas 0
}
```

Can hieu:

- `minReplicas=0` giup tiet kiem tien nhung co cold start.
- Luc moi wake co the cham vai chuc giay.
- RabbitMQ/Redis self-hosted khong nen tat trong production vi co the mat state/queue neu khong co persistent storage.

## 14. Troubleshooting nhanh

| Trieu chung | Nguyen nhan hay gap | Cach check/fix |
| --- | --- | --- |
| `Backend service is currently unavailable` | Backend cold start, revision sai, upstream down | Check `az containerapp revision list`, logs gateway/backend, set `minReplicas=1` |
| Browser register fail `Invalid CORS request` | Service-level CORS chan Azure origin | Check Nginx CORS + Spring CORS, test POST co `Origin` |
| Redis timeout | Chua expose TCP 6379 hoac secret host sai | Check `az containerapp ingress show -n redis`, set `redis-host=redis` |
| RabbitMQ timeout | Chua expose TCP 5672 hoac user/pass sai | Check `az containerapp ingress show -n rabbitmq`, check app env/secrets |
| Workflow fail o validate | Test/lint/build fail | Mo job log, fix code truoc khi deploy |
| Workflow fail o preflight-cloud | Thieu Container App secret | Chay lai `scripts/set-containerapp-secrets.ps1` |
| Smoke fail 404 Container App stopped | App chua co revision ready hoac scale-to-zero | Wake app, xem revision, route traffic |
| API health 200 nhung business fail | DB/migration/secret/service-to-service URL loi | Check logs service, App Insights dependencies |
| Cham sau khi bat lai cloud | Cold start | Set `minReplicas=1` truoc demo |

## 15. Checklist deploy staging

Truoc deploy:

```txt
[ ] Azure CLI login dung subscription.
[ ] Resource group ton tai.
[ ] ACR ton tai.
[ ] Container Apps ton tai.
[ ] MySQL/PostgreSQL ton tai.
[ ] Redis/RabbitMQ co internal TCP ingress.
[ ] Azure Container App secrets day du.
[ ] GitHub secrets day du.
[ ] GitHub environment staging/production da tao.
[ ] Production co manual approval.
```

Sau deploy:

```txt
[ ] Workflow validate pass.
[ ] Workflow preflight-cloud pass.
[ ] Images push len ACR thanh cong.
[ ] Container Apps co latest ready revision.
[ ] Smoke test health pass.
[ ] Guest scholarship list pass.
[ ] Register/login pass.
[ ] Student apply pass.
[ ] Provider/admin flow pass.
[ ] Chat pass.
[ ] Matching pass.
[ ] App Insights co request/dependency/trace.
[ ] Khong co 5xx bat thuong.
```

## 16. Production hardening nen lam tiep

Cho production that su:

```txt
1. Gan custom domain + TLS.
2. Tat public backend ingress, chi de gateway public.
3. Dung managed Redis hoac Azure Cache for Redis.
4. Dung managed broker hoac Azure Service Bus thay RabbitMQ self-hosted neu can reliability.
5. Bat DB backup va alert storage/CPU/connection.
6. Dung Key Vault lam source secret chinh.
7. Enforce GitHub environment protection cho production.
8. Chay migration co kiem soat truoc khi app traffic 100%.
9. Them alert p95 latency, 5xx, dependency failure, DB connection, Redis/RabbitMQ health.
10. Dat budget alert cho Azure for Students credit.
```

## 17. Ket luan

Flow deploy chuan cua EduMatch nen la:

```txt
Provision infra
  -> create DB/Redis/RabbitMQ
  -> set Azure Container App secrets
  -> set GitHub Actions secrets
  -> run staging deploy workflow
  -> smoke test
  -> check logs/App Insights
  -> promote production khi on
  -> rollback neu co loi
```

Mot cau ngan gon de nho:

```txt
Deploy khong chi la build image. Deploy dung la: secret dung, migration dung, revision dung, smoke dung, rollback co san.
```
