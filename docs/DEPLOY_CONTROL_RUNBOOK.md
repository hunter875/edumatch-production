# Deploy Control Runbook

Ngay cap nhat: 2026-05-14

## Phase 4 - Smoke test staging

Workflow `deploy.yml` chay smoke test sau staging deploy thanh cong.

Smoke test lay FQDN truc tiep tu Azure Container Apps:

| App | Endpoint |
| --- | --- |
| auth-service | `/api/auth/health` |
| scholarship-service | `/debug/health` |
| chat-service | `/api/health` |
| matching-service | `/health` |
| frontend-app | `/` |
| nginx-gateway | `/gateway/health` |

Quy tac:

- Chi chay smoke test khi environment la `staging`.
- Chi test service nao vua deploy thanh cong.
- Moi endpoint retry 12 lan, moi lan cach nhau 10 giay.
- Smoke test fail thi workflow fail, de minh biet staging deploy khong on.

## Phase 5 - Rollback

Rollback la manual workflow dispatch:

```txt
operation = rollback
service = auth-service | scholarship-service | chat-service | matching-service | frontend | nginx | all
environment = staging | production
revision = optional
```

Neu khong nhap `revision`, workflow tu chon revision running lien truoc revision moi nhat.

Neu nhap `revision`, chi nen rollback mot service. Khong dung `service=all` voi mot revision cu the vi moi Container App co revision name rieng.

Lenh rollback dung Azure Container Apps revision traffic:

```txt
az containerapp revision activate ...
az containerapp ingress traffic set --revision-weight <revision>=100
```

Sau rollback staging, workflow smoke test lai endpoint tuong ung.

## Production approval

Workflow da gan job vao GitHub Environment theo input `environment`.

Can cau hinh trong GitHub:

1. Repo Settings.
2. Environments.
3. Tao environment `production`.
4. Bat `Required reviewers`.

Khi chon `environment=production`, job se dung approval gate cua GitHub truoc khi deploy/rollback.
