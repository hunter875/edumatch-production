# Seed Data

Seed data keeps local development, QA, and performance tests repeatable.

## Main Script

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed-dev-data.ps1
```

## Useful Modes

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed-dev-data.ps1 -MatchingOnly
powershell -ExecutionPolicy Bypass -File .\scripts\seed-dev-data.ps1 -LoadTest
```

## Seed References

- [Seed Data Notes](../SEED_DATA.md)
- [Performance Playbook](../05-performance-playbook.md)
- [DB Optimization Report](../DB_OPTIMIZATION_REPORT.md)

## Data Levels

| Level | Purpose |
| --- | --- |
| Small | Local feature testing |
| Medium | API and DB performance checks |
| Stress | Cloud/staging load tests |

Do not use production data for local demos unless it has been anonymized.
