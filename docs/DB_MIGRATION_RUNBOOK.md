# DB Migration Runbook

Ngay cap nhat: 2026-05-14

## Muc tieu

DB schema/index cua EduMatch phai duoc version hoa, khong de staging/production tu y sua DB bang Hibernate.

## Java services

Cac service Java da dung Flyway:

| Service | Migration path | DB |
| --- | --- | --- |
| auth-service | `backend-java/auth-service/src/main/resources/db/migration` | MySQL |
| scholarship-service | `backend-java/scholarship-service/src/main/resources/db/migration` | MySQL |
| chat-service | `backend-java/chat-service/src/main/resources/db/migration` | MySQL |

Quy uoc:

- `V1__initial_schema.sql`: schema nen cho DB moi.
- `V2__*_indexes.sql`: index toi uu cho read path.
- Local/dev: `SPRING_JPA_HIBERNATE_DDL_AUTO=update` duoc giu de de chay.
- Staging/prod: `SPRING_JPA_HIBERNATE_DDL_AUTO=validate`.
- Flyway bat mac dinh: `SPRING_FLYWAY_ENABLED=true`.
- DB cu chua co Flyway history se dung `baseline-on-migrate=true` de khong tao lai schema nen.

## Matching service

Matching service dung SQL migration rieng:

```txt
matching-service/migrations/V1__initial_schema.sql
matching-service/migrations/V2__matching_indexes_and_compatibility.sql
```

Startup behavior:

- `RUN_MIGRATIONS=true`: chay SQL migration va ghi vao bang `schema_migrations`.
- `AUTO_CREATE_TABLES=false`: khong de SQLAlchemy tu tao/sua schema trong runtime.

## Production rule

Production nen set:

```txt
SPRING_JPA_HIBERNATE_DDL_AUTO=validate
SPRING_FLYWAY_ENABLED=true
SPRING_FLYWAY_BASELINE_ON_MIGRATE=true
RUN_MIGRATIONS=true
AUTO_CREATE_TABLES=false
```

## Local verify

Neu local da co Docker volumes cu, password DB trong volume phai khop voi `.env`.
Neu dung `.env.example` trong khi volume cu tao bang password khac, service se fail truoc Flyway voi loi:

```txt
Access denied for user '<service>_user'
```

Khi muon test migration tren DB sach, hay reset volume co chu dich roi chay lai compose. Dung viec nay can than vi se xoa data local.

## Checklist

1. Build images thanh cong.
2. Service start khong loi Flyway.
3. Bang `flyway_schema_history` ton tai trong MySQL services.
4. Bang `schema_migrations` ton tai trong matching PostgreSQL.
5. Index V2 ton tai trong DB.
6. Staging/prod khong chay Hibernate `ddl-auto=update`.
