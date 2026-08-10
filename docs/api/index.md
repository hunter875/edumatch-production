# API Overview

The API surface is split by service, but browser traffic should go through the
gateway. The long-term goal is a stable versioned contract with consistent
pagination, errors, and batch endpoints.

## Primary Documents

| Topic | Page |
| --- | --- |
| API contracts | [API Contract](../02-api-contract.md) |
| API standardization | [API Standardization Guide](../API_STANDARDIZATION_GUIDE.md) |

## API Principles

- Public list/detail reads should work without authentication.
- Authenticated card extras should use batch endpoints.
- API errors should have a consistent shape.
- Frontend should not hardcode service container URLs.
- Gateway path rewriting must be tested in both local and production configs.

## Hot Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/scholarships` | public scholarship search/list |
| `POST /api/applications/my/statuses` | batch application status for visible cards |
| `POST /api/v1/matching/batch-scores` | batch matching scores |
| `GET /api/v1/recommendations/applicant/{id}` | cached recommendations |
