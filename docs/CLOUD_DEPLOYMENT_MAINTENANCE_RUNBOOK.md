# Cloud Deployment va Maintenance Runbook EduMatch

Ngay cap nhat: 2026-05-17

Tai lieu nay la checklist van hanh cloud cho EduMatch staging tren Azure. Muc tieu la sau nay muon deploy, test, debug, tiet kiem credit, rollback hay on-call su co thi lam theo tung buoc, khong phai nho lai tu dau.

## 1. Ket luan quan trong

Nhung viec quan trong nhat con phai nho:

1. Khong hotfix bang Azure CLI roi de quen. Neu sua tren cloud, phai dua thay doi ve repo va deploy lai bang GitHub Actions.
2. Sau deploy phai smoke test, khong chi nhin workflow xanh.
3. Khi het test/demo, scale staging ve `minReplicas=0` de giu credit.
4. Khi can demo, scale app ve `minReplicas=1` truoc vai phut.
5. Khong mo IP `20.198.133.183` truc tiep. Azure Container Apps can dung FQDN gateway hoac custom domain.
6. Neu browser loi ma PowerShell/curl khong loi, nghi ngay den CORS, cookie, Origin header, hoac frontend runtime.
7. Redis/RabbitMQ dang chay bang container tu quan ly. Production nghiem tuc nen can nhac managed service.

## 2. Thong tin ha tang hien tai

Resource group:

```txt
EduMatch-VM-RG-v2
```

Region:

```txt
southeastasia
```

Azure Container Apps Environment:

```txt
edumatch-staging-apps-env
```

ACR:

```txt
edumatchminhacr.azurecr.io
```

Public gateway:

```txt
https://nginx-gateway.politedune-4636e535.southeastasia.azurecontainerapps.io
```

Log Analytics workspace:

```txt
cac28644-5c64-45fb-a252-e5c316399f2e
```

Container Apps:

| App | Vai tro |
| --- | --- |
| `nginx-gateway` | Public API gateway + frontend reverse proxy |
| `frontend-app` | Next.js frontend |
| `auth-service` | Auth/user/admin/org service |
| `scholarship-service` | Scholarship/application/bookmark service |
| `chat-service` | Chat/notification/WebSocket service |
| `matching-service` | FastAPI matching/recommendation service |
| `redis` | Cache internal TCP |
| `rabbitmq` | Event broker internal TCP |

## 3. Nguyen tac deploy

### 3.1 Deploy dung chuan

Duong chuan:

```txt
Code repo
 -> GitHub Actions validate
 -> build Docker image
 -> push ACR
 -> deploy Azure Container Apps
 -> smoke test
 -> monitor logs/metrics
```

Khong nen:

```txt
Sua tay tren Azure Portal/CLI
 -> quen commit
 -> lan sau workflow deploy overwrite mat fix
```

Neu bat buoc hotfix bang CLI:

1. Ghi lai thay doi.
2. Sua lai file source/config trong repo.
3. Commit/push.
4. Deploy lai bang workflow.

### 3.2 Deploy order an toan

Thu tu nen dung khi deploy all:

1. Infra/dependency: Redis/RabbitMQ/DB secrets neu co thay doi.
2. Backend services:
   - `auth-service`
   - `scholarship-service`
   - `chat-service`
   - `matching-service`
3. Gateway:
   - `nginx-gateway`
4. Frontend:
   - `frontend-app`
5. Smoke test qua gateway.

Neu chi sua FE:

```txt
deploy frontend-app
smoke /
smoke mot luong dang nhap/list scholarship
```

Neu chi sua gateway:

```txt
deploy nginx-gateway
smoke all health endpoints
test CORS/auth/register
```

Neu chi sua backend:

```txt
deploy service do
smoke service health direct/gateway
smoke flow lien quan
```

## 4. Trước khi deploy

### 4.1 Kiem tra git

```powershell
git status --short
```

Can chac:

- Khong co secret bi commit.
- Cac file fix cloud da nam trong repo.
- Khong co file tam nhu `.tmp-edge-qc`, log, build output.

### 4.2 Kiem tra GitHub secrets

GitHub Actions can co:

```txt
AZURE_CREDENTIALS
REGISTRY_USERNAME
REGISTRY_PASSWORD
APPLICATIONINSIGHTS_CONNECTION_STRING
```

Kiem tra bang GitHub UI:

```txt
Repo -> Settings -> Secrets and variables -> Actions
```

Hoac bang GitHub CLI:

```powershell
gh auth login
gh secret list
```

### 4.3 Kiem tra Azure Container App secrets

Lenh mau:

```powershell
az containerapp secret list `
  -g EduMatch-VM-RG-v2 `
  -n auth-service `
  -o table
```

Secrets quan trong:

```txt
jwt-secret
auth-db-url
auth-db-username
auth-db-password
scholarship-db-url
scholarship-db-username
scholarship-db-password
chat-db-url
chat-db-username
chat-db-password
matching-db-url
rabbitmq-host
rabbitmq-user
rabbitmq-password
redis-host
auth-service-url
matching-service-url
```

Khong in gia tri secret ra man hinh neu khong can.

## 5. Bật staging trước khi test/demo

Neu staging dang ngu, bat lai app:

```powershell
$rg='EduMatch-VM-RG-v2'
$apps=@(
  'redis',
  'rabbitmq',
  'auth-service',
  'scholarship-service',
  'chat-service',
  'matching-service',
  'nginx-gateway',
  'frontend-app'
)

foreach($app in $apps){
  az containerapp update -g $rg -n $app --min-replicas 1
}
```

Doi vai phut roi check:

```powershell
az containerapp list `
  -g EduMatch-VM-RG-v2 `
  --query "[].{name:name,running:properties.runningStatus,min:properties.template.scale.minReplicas,max:properties.template.scale.maxReplicas,latest:properties.latestRevisionName,ready:properties.latestReadyRevisionName}" `
  -o table
```

## 6. Deploy bằng GitHub Actions

### 6.1 Deploy workflow

Vao:

```txt
GitHub -> Actions -> Build and Deploy EduMatch System -> Run workflow
```

Chon:

```txt
operation: deploy
service: all hoac service can deploy
environment: staging
```

Workflow mong doi:

```txt
validate -> build image -> push ACR -> deploy Container Apps -> smoke test
```

Neu validate fail:

```txt
Khong deploy. Sua test/lint/build truoc.
```

Neu deploy xanh nhung app loi:

```txt
Xem logs va smoke test, khong tin moi workflow status.
```

### 6.2 Deploy nhanh Nginx bằng CLI khi cần hotfix

Chi dung khi can sua gateway gap:

```powershell
az acr build `
  --registry edumatchminhacr `
  --image nginx-gateway:<tag> `
  nginx-gateway

az containerapp update `
  -g EduMatch-VM-RG-v2 `
  -n nginx-gateway `
  --image edumatchminhacr.azurecr.io/nginx-gateway:<tag> `
  --min-replicas 1 `
  --max-replicas 2
```

Route traffic sang latest ready revision:

```powershell
$latest=az containerapp show `
  -g EduMatch-VM-RG-v2 `
  -n nginx-gateway `
  --query properties.latestReadyRevisionName `
  -o tsv

az containerapp ingress traffic set `
  -g EduMatch-VM-RG-v2 `
  -n nginx-gateway `
  --revision-weight "$latest=100"
```

Sau hotfix, phai commit file da sua vao repo.

## 7. Smoke test sau deploy

Base URL:

```powershell
$base='https://nginx-gateway.politedune-4636e535.southeastasia.azurecontainerapps.io'
```

### 7.1 Health smoke

```powershell
$paths=@(
  '/gateway/health',
  '/api/auth/health',
  '/debug/health',
  '/api/health',
  '/health',
  '/api/scholarships?isPublic=true&page=0&size=12'
)

foreach($path in $paths){
  $sw=[Diagnostics.Stopwatch]::StartNew()
  $resp=Invoke-WebRequest -UseBasicParsing -TimeoutSec 30 "$base$path"
  $sw.Stop()
  [pscustomobject]@{
    Path=$path
    Status=$resp.StatusCode
    Ms=[math]::Round($sw.Elapsed.TotalMilliseconds,0)
  }
}
```

Expected:

```txt
Tat ca 200
Warm latency phan lon < 100-200ms
```

### 7.2 Browser-like registration smoke

Quan trong vi CORS chi xuat hien khi co `Origin`.

```powershell
$origin=$base
$email='smoke-' + (Get-Random) + '@example.com'
$body=@{
  username=$email
  email=$email
  password='Test123456'
  firstName='Smoke'
  lastName='User'
  sex='OTHER'
} | ConvertTo-Json

$reg=Invoke-WebRequest `
  -UseBasicParsing `
  -Method POST `
  -Uri "$base/api/auth/register" `
  -Headers @{Origin=$origin} `
  -ContentType 'application/json' `
  -Body $body `
  -TimeoutSec 30

$data=$reg.Content | ConvertFrom-Json

$me=Invoke-WebRequest `
  -UseBasicParsing `
  -Method GET `
  -Uri "$base/api/auth/me" `
  -Headers @{
    Origin=$origin
    Authorization="Bearer $($data.accessToken)"
  } `
  -TimeoutSec 30

[pscustomobject]@{
  RegisterStatus=$reg.StatusCode
  MeStatus=$me.StatusCode
  Email=$email
  MeBody=$me.Content
}
```

Expected:

```txt
RegisterStatus = 201
MeStatus = 200
```

### 7.3 Business smoke thủ công trên browser

Can test nhanh:

1. Guest mo homepage.
2. Guest xem scholarship list.
3. Register user moi.
4. Login user.
5. User xem dashboard.
6. User apply/bookmark scholarship neu co data.
7. Provider login, xem scholarships/applications.
8. Admin login, approve/reject scholarship.
9. Chat/notification co load khong.
10. Matching recommendation endpoint co response khong.

## 8. Benchmark latency

Benchmark 25 lan moi endpoint:

```powershell
$base='https://nginx-gateway.politedune-4636e535.southeastasia.azurecontainerapps.io'
$paths=@(
  @{Name='gateway_health'; Path='/gateway/health'},
  @{Name='auth_health'; Path='/api/auth/health'},
  @{Name='scholarship_health'; Path='/debug/health'},
  @{Name='chat_health'; Path='/api/health'},
  @{Name='matching_health'; Path='/health'},
  @{Name='scholarship_public_list'; Path='/api/scholarships?isPublic=true&page=0&size=12'}
)

$results=@()
foreach($target in $paths){
  foreach($i in 1..25){
    $sw=[Diagnostics.Stopwatch]::StartNew()
    try {
      $resp=Invoke-WebRequest -UseBasicParsing -TimeoutSec 30 "$base$($target.Path)"
      $sw.Stop()
      $results += [pscustomobject]@{
        Endpoint=$target.Name
        Status=[int]$resp.StatusCode
        Ms=[math]::Round($sw.Elapsed.TotalMilliseconds,0)
      }
    } catch {
      $sw.Stop()
      $results += [pscustomobject]@{
        Endpoint=$target.Name
        Status=0
        Ms=[math]::Round($sw.Elapsed.TotalMilliseconds,0)
      }
    }
    Start-Sleep -Milliseconds 150
  }
}

foreach($group in ($results | Group-Object Endpoint)){
  $rows=$group.Group | Sort-Object Ms
  $count=$rows.Count
  [pscustomobject]@{
    Endpoint=$group.Name
    Runs=$count
    Success=($rows | Where-Object { $_.Status -ge 200 -and $_.Status -lt 400 }).Count
    Errors=($rows | Where-Object { $_.Status -lt 200 -or $_.Status -ge 400 }).Count
    MinMs=($rows | Select-Object -First 1).Ms
    AvgMs=[math]::Round((($rows | Measure-Object Ms -Average).Average),1)
    P50Ms=$rows[[Math]::Min($count-1,[Math]::Ceiling($count*0.50)-1)].Ms
    P95Ms=$rows[[Math]::Min($count-1,[Math]::Ceiling($count*0.95)-1)].Ms
    MaxMs=($rows | Select-Object -Last 1).Ms
  }
} | Format-Table -Auto
```

Nguong doc:

| Latency | Danh gia |
| --- | --- |
| `<100ms` | Rat tot |
| `100-200ms` | Tot |
| `200-500ms` | Chap nhan duoc tren staging |
| `>500ms` | Can soi |
| `>1000ms` | Loi/qua cham |

Ket qua gan nhat xem tai:

```txt
docs/CLOUD_STAGING_PERFORMANCE_INCIDENT_REPORT.md
```

## 9. Xem logs

### 9.1 Error logs 10 phut gan nhat

```powershell
az monitor log-analytics query `
  --workspace cac28644-5c64-45fb-a252-e5c316399f2e `
  --analytics-query "ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(10m)
| where ContainerAppName_s in ('auth-service','scholarship-service','chat-service','matching-service','nginx-gateway')
| where Log_s has_any ('ERROR','Exception','Invalid CORS','Unable to connect to Redis','Connect timed out','Backend service','upstream timed out')
| project TimeGenerated, ContainerAppName_s, substring(Log_s,0,600)
| order by TimeGenerated desc
| take 100" `
  -o table
```

### 9.2 Registration logs

```powershell
az monitor log-analytics query `
  --workspace cac28644-5c64-45fb-a252-e5c316399f2e `
  --analytics-query "ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(10m)
| where ContainerAppName_s in ('auth-service','nginx-gateway')
| where Log_s has_any ('/api/auth/register','Registering new user','registered successfully','Invalid CORS','403')
| project TimeGenerated, ContainerAppName_s, substring(Log_s,0,700)
| order by TimeGenerated desc
| take 80" `
  -o table
```

### 9.3 Tail logs mot app

```powershell
az containerapp logs show `
  -g EduMatch-VM-RG-v2 `
  -n auth-service `
  --tail 120 `
  --type console
```

## 10. Rollback

### 10.1 Rollback bằng workflow

Vao:

```txt
GitHub -> Actions -> Build and Deploy EduMatch System -> Run workflow
```

Chon:

```txt
operation: rollback
service: <service-can-rollback>
environment: staging
targetRevision: bo trong hoac nhap revision cu
```

### 10.2 Rollback bằng CLI

List revisions:

```powershell
az containerapp revision list `
  -g EduMatch-VM-RG-v2 `
  -n nginx-gateway `
  --query "[].{name:name,active:properties.active,running:properties.runningState,traffic:properties.trafficWeight,created:properties.createdTime}" `
  -o table
```

Activate revision cu:

```powershell
az containerapp revision activate `
  -g EduMatch-VM-RG-v2 `
  -n nginx-gateway `
  --revision <old-revision>
```

Route 100% traffic:

```powershell
az containerapp ingress traffic set `
  -g EduMatch-VM-RG-v2 `
  -n nginx-gateway `
  --revision-weight "<old-revision>=100"
```

Smoke test lai ngay sau rollback.

## 11. Tắt staging để tiết kiệm credit

Khi test xong:

```powershell
$rg='EduMatch-VM-RG-v2'
$apps=@(
  'nginx-gateway',
  'frontend-app',
  'auth-service',
  'scholarship-service',
  'chat-service',
  'matching-service',
  'redis',
  'rabbitmq'
)

foreach($app in $apps){
  az containerapp update -g $rg -n $app --min-replicas 0
}
```

Ghi chu:

- Azure van co the hien `Running` mot luc sau khi scale down.
- Quan trong la `minReplicas=0`.
- Neu co request vao public gateway, app co the bi wake lai.

## 12. Su co thuong gap va playbook

### 12.1 Gateway tra "Backend service is currently unavailable"

Kiem tra:

```powershell
az containerapp list -g EduMatch-VM-RG-v2 -o table
```

Smoke:

```powershell
Invoke-WebRequest -UseBasicParsing "$base/gateway/health"
Invoke-WebRequest -UseBasicParsing "$base/api/auth/health"
Invoke-WebRequest -UseBasicParsing "$base/debug/health"
```

Nguyen nhan hay gap:

- Service cold start.
- Revision moi chua ready.
- Traffic van tro revision cu.
- Gateway proxy sai upstream.

Fix:

1. Bat `minReplicas=1`.
2. Route traffic sang `latestReadyRevisionName`.
3. Xem Nginx log `upstream timed out`.

### 12.2 Browser registration failed, PowerShell register OK

Nghi CORS.

Test co Origin:

```powershell
Invoke-WebRequest `
  -UseBasicParsing `
  -Method POST `
  -Uri "$base/api/auth/register" `
  -Headers @{Origin=$base} `
  -ContentType 'application/json' `
  -Body $body
```

Neu body:

```txt
Invalid CORS request
```

Fix:

- Gateway `/api/auth` khong forward Origin:

```nginx
proxy_set_header Origin "";
```

- Gateway tra CORS header cho browser.
- Auth-service CORS allow Azure origin neu can.

### 12.3 Redis cache failed

Log:

```txt
Unable to connect to Redis
```

Check:

```powershell
az containerapp show -g EduMatch-VM-RG-v2 -n redis --query properties.configuration.ingress -o json
```

Expected:

```txt
transport: Tcp
targetPort: 6379
exposedPort: 6379
external: false
```

Secret:

```txt
redis-host=redis
```

### 12.4 RabbitMQ timeout

Log:

```txt
SocketTimeoutException: Connect timed out
Failed to check/redeclare auto-delete queue(s)
```

Check:

```powershell
az containerapp show -g EduMatch-VM-RG-v2 -n rabbitmq --query properties.configuration.ingress -o json
```

Expected:

```txt
transport: Tcp
targetPort: 5672
exposedPort: 5672
external: false
```

Secret:

```txt
rabbitmq-host=rabbitmq
```

Neu van spam:

- Kiem tra old revisions.
- Deactivate revisions cu.

### 12.5 Old revisions con active

List:

```powershell
az containerapp revision list `
  -g EduMatch-VM-RG-v2 `
  -n chat-service `
  --query "[].{name:name,active:properties.active,running:properties.runningState,traffic:properties.trafficWeight}" `
  -o table
```

Deactivate:

```powershell
az containerapp revision deactivate `
  -g EduMatch-VM-RG-v2 `
  -n chat-service `
  --revision <old-revision>
```

## 13. Bao tri dinh ky

### Moi lan deploy

- Chay smoke health.
- Chay browser-like registration.
- Kiem tra logs 10 phut gan nhat.
- Kiem tra revision traffic.
- Neu demo xong, scale down.

### Hang tuan

- Kiem tra Azure credit/cost.
- Kiem tra Container Apps co old revisions active khong.
- Kiem tra App Insights error rate va p95 latency.
- Kiem tra slow query/DB metrics neu co traffic.
- Kiem tra secret nao gan het han/bi rotate khong.

### Truoc demo/phong van

1. Scale up app ve `minReplicas=1`.
2. Doi 3-5 phut.
3. Smoke test.
4. Test browser flow:
   - homepage
   - list scholarship
   - register/login
   - dashboard
   - admin/provider neu can
5. Mo san App Insights/Log Analytics de show observability neu duoc hoi.

### Sau demo/phong van

1. Scale down `minReplicas=0`.
2. Ghi lai loi neu co.
3. Neu hotfix CLI, commit lai source.

## 14. Production readiness con nen lam

P0/P1 neu muon tien gan production:

1. Dua tat ca hotfix CLI ve GitHub Actions flow.
2. Them smoke test browser-like vao workflow staging.
3. Them rollback test that su sau deploy.
4. Them alert Azure Monitor:
   - p95 > 500ms.
   - 5xx tang bat thuong.
   - Redis/RabbitMQ connection timeout.
5. Them DB backup/restore runbook.
6. Dung managed Redis / managed message broker neu he thong chay that.
7. Dung custom domain + HTTPS cert that, khong dung URL default dai cua Azure Container Apps.
8. Tach staging va production bang environment protection/manual approval.
9. Them rate limit theo endpoint nhay cam:
   - auth/login/register
   - matching/recommendation
   - upload
10. Theo doi cost budget alert de khong het credit dot ngot.

## 15. Ghi chu cho CV/phong van

Co the noi:

```txt
I deployed and stabilized a microservice system on Azure Container Apps with Nginx Gateway, Java Spring Boot services, FastAPI matching service, Redis cache, RabbitMQ events, MySQL/PostgreSQL databases, GitHub Actions CI/CD, smoke tests, rollback strategy, and Azure Monitor observability.
```

Noi ro hon:

```txt
- Fixed cold start and stale revision problems by tuning min replicas and traffic routing.
- Fixed internal TCP dependency issues for Redis/RabbitMQ in Azure Container Apps.
- Fixed browser-only CORS failure on registration by centralizing CORS behavior at the gateway.
- Measured warm staging p95 latency under 100ms for key health/list endpoints.
- Created operational runbooks for deploy, smoke test, rollback, log analysis, and cost control.
```

Neu bi hoi trade-off:

```txt
minReplicas=1 gives better latency but costs more.
minReplicas=0 saves credit but first request is slower.
Self-hosted Redis/RabbitMQ is OK for staging, but managed services are safer for production.
Gateway-owned CORS simplifies frontend traffic, but backend CORS still needs sane defaults for direct/internal calls.
```
