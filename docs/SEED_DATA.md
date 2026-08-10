# Dev seed data

Chay sau khi cac DB containers va service da tao schema xong:

```powershell
docker compose up -d auth-db scholarship-db matching-db chat-db auth-service scholarship-service matching-service chat-service
.\scripts\seed-dev-data.ps1
```

Seed rieng tung DB:

```powershell
.\scripts\seed-dev-data.ps1 -AuthOnly
.\scripts\seed-dev-data.ps1 -ScholarshipOnly
.\scripts\seed-dev-data.ps1 -MatchingOnly
.\scripts\seed-dev-data.ps1 -ChatOnly
```

Seed load test cho scholarship DB:

```powershell
.\scripts\seed-dev-data.ps1 -LoadTest
```

Seed load test lon cho DB benchmark/index:

```powershell
.\scripts\seed-dev-data.ps1 -LargeLoadTest
```

Tai khoan demo:

- `admin.test@edumatch.dev` / `admin123`
- `student1@edumatch.dev` / `admin123`
- `student2@edumatch.dev` / `admin123`
- `student3@edumatch.dev` / `admin123`
- `teacher1@edumatch.dev` / `admin123`
- `teacher2@edumatch.dev` / `admin123`
- `mit.provider@edumatch.dev` / `admin123`
- `stanford.provider@edumatch.dev` / `admin123`
- `google.provider@edumatch.dev` / `admin123`
- Admin mac dinh van do app tao: `admin` / `admin123`

Ghi chu:

- SQL seed dung ID cao (`1001+`) de tranh dung voi du lieu san co.
- Scripts co the chay lai nhieu lan; data seed se update thay vi nhan ban.
- `matching-dev.sql` seed feature rows cho applicant/opportunity de matching-service co du lieu tinh score.
- `chat-dev.sql` seed conversation, message, notification va FCM token demo cho chat-service.
- `scholarship-load-test.sql` tao 100 scholarships, 300 applications va 240 bookmarks de soi pagination/N+1.
- `scholarship-large-load-test.sql` tao 10,000 scholarships, 30,000 applications va 20,000 bookmarks de benchmark query/index.
- Apply index toi uu scholarship DB:

```powershell
Get-Content .\db\optimization\scholarship-indexes.sql | docker compose exec -T scholarship-db mysql -uroot "-p$env:SCHOLARSHIP_DB_ROOT_PASSWORD" scholarship_db
```
