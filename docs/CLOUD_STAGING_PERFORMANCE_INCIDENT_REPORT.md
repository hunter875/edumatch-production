# Cloud Staging Performance va Incident Report

Ngay ghi nhan: 2026-05-17

Tai lieu nay tong hop benchmark toc do hien tai cua staging tren Azure Container Apps, cac loi da gap khi deploy cloud, nguyen nhan, cach khac phuc, va cach tu kiem tra lai.

## 1. Ket luan nhanh

Trang thai hien tai:

- Gateway va cac backend chinh dang `Running`.
- Cac app chinh da bat `minReplicas=1`, tranh cold start nang.
- Moi app chi con 1 revision active/running, tranh revision cu con xu ly traffic/event ngam.
- Redis va RabbitMQ da chay noi bo trong Container Apps environment.
- Registration tu browser da fix loi CORS va test thanh cong.
- Benchmark qua gateway hien tai tot cho staging/cloud gia re: p95 cua cac endpoint do deu <= 91ms.

Nhan dinh:

```txt
He thong khong con "Backend service unavailable" o cac smoke endpoint.
Latency warm hien tai la nhanh/chap nhan tot.
Neu user con thay lag, nen soi FE waterfall, JS hydration, image, va API nao bi 401/403/retry.
```

## 2. Ha tang staging hien tai

Resource group:

```txt
EduMatch-VM-RG-v2
```

Gateway public:

```txt
https://nginx-gateway.politedune-4636e535.southeastasia.azurecontainerapps.io
```

Container Apps status:

| App | Running | Min | Max | Latest revision |
| --- | --- | ---: | ---: | --- |
| nginx-gateway | Running | 1 | 2 | `nginx-gateway--0000015` |
| frontend-app | Running | 1 | 2 | `frontend-app--0000004` |
| auth-service | Running | 1 | 2 | `auth-service--0000007` |
| scholarship-service | Running | 1 | 2 | `scholarship-service--0000006` |
| chat-service | Running | 1 | 2 | `chat-service--0000006` |
| matching-service | Running | 1 | 2 | `matching-service--0000007` |
| redis | Running | 1 | 1 | `redis--265jrph` |
| rabbitmq | Running | 1 | 1 | `rabbitmq--0000001` |

Ghi chu cost:

- `minReplicas=1` giup app nhanh hon vi khong bi ngu.
- Doi lai, staging se ton credit hon `minReplicas=0`.
- Neu can tiet kiem credit, co the giam frontend/gateway/API ve `0`, nhung request dau se cham lai.

## 3. Benchmark toc do

### 3.1 Dieu kien test

Test tu may local qua public gateway Azure:

```txt
Client -> Azure Southeast Asia -> nginx-gateway -> backend service
```

Moi endpoint duoc goi 25 lan, co delay ngan giua cac request. So do bao gom network/TLS/gateway/backend.

### 3.2 Ket qua tong hop

| Endpoint | Runs | Success | Errors | Min ms | Avg ms | P50 ms | P95 ms | Max ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/gateway/health` | 25 | 25 | 0 | 43 | 57.2 | 47 | 70 | 271 |
| `/api/auth/health` | 25 | 25 | 0 | 50 | 61.0 | 58 | 80 | 135 |
| `/debug/health` | 25 | 25 | 0 | 56 | 65.4 | 66 | 79 | 84 |
| `/api/health` | 25 | 25 | 0 | 54 | 65.6 | 64 | 75 | 92 |
| `/health` | 25 | 25 | 0 | 54 | 59.8 | 59 | 68 | 70 |
| `/api/scholarships?isPublic=true&page=0&size=12` | 25 | 25 | 0 | 69 | 79.5 | 76 | 91 | 128 |

### 3.3 Danh gia

Nguong doc nhanh:

| Latency | Danh gia |
| --- | --- |
| `<100ms` | Rat tot |
| `100-200ms` | Tot/chap nhan tot |
| `200-500ms` | Chap nhan duoc tren staging/cloud |
| `>500ms` | Nen soi tiep |
| `>1000ms` | Co van de ro |

Ket qua hien tai:

- Health endpoints p95 tu `68ms` den `80ms`.
- Public scholarship list p95 `91ms`, tot.
- Gateway health co max `271ms` o run dau, nhung p95 van `70ms`, khong dang lo.
- Khong co request loi trong benchmark.

## 4. Cac van de da gap va cach khac phuc

### 4.1 Backend service is currently unavailable

Hien tuong:

```txt
Backend service is currently unavailable. Please try again later.
```

Nguyen nhan:

- Gateway khong doc duoc upstream dung luc service dang ngu/khoi dong cham.
- Mot so service chay `minReplicas=0`, request dau bi cold start.
- Traffic cua mot so Container Apps van tro ve revision cu.

Cach khac phuc:

- Bat `minReplicas=1` cho app chinh:
  - `nginx-gateway`
  - `frontend-app`
  - `auth-service`
  - `scholarship-service`
  - `chat-service`
  - `matching-service`
- Route traffic 100% sang latest ready revision.
- Deactivate old revisions.

Ket qua:

```txt
Smoke endpoints deu 200.
Warm latency ve khoang 50-90ms.
```

### 4.2 Redis cache khong connect duoc

Log:

```txt
Cache get failed cache=scholarshipPublicList ... Unable to connect to Redis
Cache put failed cache=scholarshipPublicList ... Unable to connect to Redis
```

Nguyen nhan:

- Redis container app song nhung internal TCP endpoint chua cau hinh ro `exposedPort`.
- Service secret ban dau tro den FQDN internal dai. Trong cung Container Apps environment, app name noi bo on dinh hon cho TCP app.

Cach khac phuc:

```powershell
az containerapp ingress update -g EduMatch-VM-RG-v2 -n redis `
  --type internal `
  --transport tcp `
  --target-port 6379 `
  --exposed-port 6379
```

Cap nhat secret:

```txt
redis-host=redis
```

Restart cac service dung Redis:

```txt
auth-service
scholarship-service
```

### 4.3 RabbitMQ consumer timeout

Log:

```txt
SimpleMessageListenerContainer : Failed to check/redeclare auto-delete queue(s)
Consumer failed to start in 60000 milliseconds
Caused by: java.net.SocketTimeoutException: Connect timed out
```

Nguyen nhan:

- RabbitMQ container song va listening port `5672`, nhung chat-service timeout khi ket noi TCP qua internal FQDN.
- Old chat-service revisions con active/running, consumer cu van retry va spam log.

Cach khac phuc:

```powershell
az containerapp ingress update -g EduMatch-VM-RG-v2 -n rabbitmq `
  --type internal `
  --transport tcp `
  --target-port 5672 `
  --exposed-port 5672
```

Cap nhat secret:

```txt
rabbitmq-host=rabbitmq
```

Restart cac service dung RabbitMQ:

```txt
auth-service
scholarship-service
chat-service
matching-service
```

Deactivate old revisions de tranh duplicate consumers.

Ket qua tich cuc:

```txt
Created new connection: rabbitConnectionFactory ... amqp://edumatch@100.100.x.x:5672/
```

### 4.4 Old revisions con chay ngam

Hien tuong:

- Traffic da route sang revision moi, nhung revision cu van active/running.
- Chat consumer cu van retry RabbitMQ va spam log.
- Cost tang vi nhieu revision active.

Cach khac phuc:

Chi giu latest ready revision active:

```powershell
$app='chat-service'
$latest=az containerapp show -g EduMatch-VM-RG-v2 -n $app --query properties.latestReadyRevisionName -o tsv
az containerapp ingress traffic set -g EduMatch-VM-RG-v2 -n $app --revision-weight "$latest=100"
az containerapp revision deactivate -g EduMatch-VM-RG-v2 -n $app --revision <old-revision>
```

Ket qua:

```txt
Moi app chi con 1 active/running revision, traffic 100.
```

### 4.5 Registration failed tren browser

Hien tuong:

```txt
Registration failed
POST /api/auth/register -> 403
Body: Invalid CORS request
```

Nguyen nhan:

- Browser gui `Origin: https://nginx-gateway...`.
- Auth-service Spring CORS chi allow localhost.
- Request bi Spring CORS chan truoc khi vao controller, nen auth-service khong log `Registering new user`.
- Test bang PowerShell khong co `Origin` thi van thanh cong, nen luc dau de nham thanh endpoint OK.

Cach khac phuc:

- De gateway lam lop CORS chinh.
- Nginx `/api/auth` khong forward `Origin` xuong auth-service:

```nginx
proxy_set_header Origin "";
```

- Gateway allow Azure Container Apps origin:

```nginx
map $http_origin $cors_origin {
    default "";
    "https://${FRONTEND_HOST}" $http_origin;
    "~^https://.*\.azurecontainerapps\.io$" $http_origin;
}
```

- Source Java cung duoc noi CORS patterns cho Azure Container Apps:
  - `auth-service`
  - `scholarship-service`
  - `chat-service`

Nginx image da deploy:

```txt
nginx-gateway:cors-origin-fix-20260517-3
```

Test ket qua:

```txt
POST /api/auth/register  201
GET  /api/auth/me        200
```

## 5. Lenh benchmark lai

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
        Run=$i
        Status=[int]$resp.StatusCode
        Ms=[math]::Round($sw.Elapsed.TotalMilliseconds,0)
      }
    } catch {
      $sw.Stop()
      $results += [pscustomobject]@{
        Endpoint=$target.Name
        Run=$i
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
    MinMs=($rows | Select-Object -First 1).Ms
    AvgMs=[math]::Round((($rows | Measure-Object Ms -Average).Average),1)
    P50Ms=$rows[[Math]::Min($count-1,[Math]::Ceiling($count*0.50)-1)].Ms
    P95Ms=$rows[[Math]::Min($count-1,[Math]::Ceiling($count*0.95)-1)].Ms
    MaxMs=($rows | Select-Object -Last 1).Ms
  }
} | Format-Table -Auto
```

## 6. Lenh kiem tra log loi

```powershell
az monitor log-analytics query `
  --workspace cac28644-5c64-45fb-a252-e5c316399f2e `
  --analytics-query "ContainerAppConsoleLogs_CL
| where TimeGenerated > ago(10m)
| where ContainerAppName_s in ('auth-service','scholarship-service','chat-service','matching-service','nginx-gateway')
| where Log_s has_any ('ERROR','Exception','Invalid CORS','Unable to connect to Redis','Connect timed out','Backend service')
| project TimeGenerated, ContainerAppName_s, substring(Log_s,0,500)
| order by TimeGenerated desc
| take 80" `
  -o table
```

## 7. Lenh kiem tra revision

```powershell
az containerapp list `
  -g EduMatch-VM-RG-v2 `
  --query "[].{name:name,running:properties.runningStatus,min:properties.template.scale.minReplicas,max:properties.template.scale.maxReplicas,latest:properties.latestRevisionName,ready:properties.latestReadyRevisionName}" `
  -o table
```

Kiem tra revision active cua mot app:

```powershell
az containerapp revision list `
  -g EduMatch-VM-RG-v2 `
  -n nginx-gateway `
  --query "[].{name:name,active:properties.active,running:properties.runningState,traffic:properties.trafficWeight}" `
  -o table
```

## 8. Viec nen lam tiep

P0:

1. Commit cac thay doi Nginx CORS va Java CORS len repo, sau do de GitHub Actions deploy lai thay vi hotfix bang CLI.
2. Dam bao workflow deploy sau nay route traffic sang latest revision va deactivate revision cu neu staging khong can canary.
3. Them smoke test browser-like cho registration:

```txt
OPTIONS /api/auth/register voi Origin
POST /api/auth/register voi Origin
GET /api/auth/me voi token
```

P1:

1. Them App Insights dashboard:
   - p95 latency by service.
   - 4xx/5xx by endpoint.
   - dependency Redis/RabbitMQ/DB failures.
2. Them alert cho:
   - 5xx > threshold.
   - p95 > 500ms.
   - RabbitMQ/Redis connection timeout.
3. Can nhac dung Azure Cache for Redis va managed RabbitMQ/Service Bus neu can production on dinh hon container tu chay.

P2:

1. Giam cost staging bang schedule:
   - Gio demo/interview: `minReplicas=1`.
   - Ngoai gio: `minReplicas=0`.
2. Them synthetic monitor ping 5 phut neu muon tiet kiem hon nhung van giam cold start.

## 9. CV / phong van co the noi

Co the ghi:

```txt
Optimized and stabilized Azure Container Apps staging deployment for a microservice system:
- reduced warm API p95 to under 100ms for key public endpoints,
- fixed gateway-to-service routing, CORS, Redis, and RabbitMQ connectivity issues,
- configured min replicas and revision traffic control to avoid cold start and stale revision failures,
- added smoke/performance verification commands and incident documentation.
```

Noi khi bi hoi:

- `minReplicas=1` giam cold start nhung tang cost.
- Redis/RabbitMQ timeout khong phai service chet, ma la internal TCP ingress/host resolution issue.
- Browser registration fail vi CORS co `Origin`, PowerShell test khong co `Origin` nen ban dau khong reproduce duoc.
- Gateway nen own CORS, backend nen tap trung auth/business logic.
