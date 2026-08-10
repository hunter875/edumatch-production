# EduMatch Agent Instructions

## Purpose

These instructions apply to the entire EduMatch repository. Treat the coding
agent as an implementer and verifier, not as the product owner. Do not invent
requirements, silently widen scope, or claim completion without evidence.

For the full human/agent workflow, read
`docs/AI_CODE_EXECUTION_WORKFLOW.md`.

## Repository Map

- `frontend/`: Next.js 14, React, TypeScript, Tailwind CSS and React Query.
- `backend-java/auth-service/`: Spring Boot authentication, users, roles and
  organizations. Owns `auth_db`.
- `backend-java/scholarship-service/`: Spring Boot scholarships, applications,
  bookmarks and provider/admin flows. Owns `scholarship_db`.
- `backend-java/chat-service/`: Spring Boot chat, notifications, REST and
  WebSocket flows. Owns `chat_db`.
- `matching-service/`: FastAPI, SQLAlchemy, Celery and RabbitMQ consumers. Owns
  `matching_db`.
- `nginx-gateway/`: the public API and WebSocket gateway.
- `docker-compose.yml`: local multi-service topology.
- `docs/`: architecture, API, data, QA, deployment and operations documents.
- `.github/workflows/deploy.yml`: the closest executable definition of CI
  validation commands.

## Sources of Truth

Use this order when information conflicts:

1. The current user task and its explicit acceptance criteria.
2. Applicable `CLAUDE.md` instructions.
3. Executable code, tests, migrations, manifests and runtime configuration.
4. `docs/02-api-contract.md`, architecture documents and service docs.
5. README files, reports and roadmap documents.

Documentation may describe a target state rather than the current state. Never
force code to match stale documentation without identifying the conflict. If a
conflict changes API behavior, data, security or deployment, stop after the
analysis and ask for a decision.

## Required Workflow

1. Restate the goal, scope, constraints and definition of done.
2. Inspect the affected execution path before editing. Trace entry point,
   business logic, persistence, integration boundaries and existing tests.
3. For high-risk or cross-service work, produce a file-level plan and wait for
   approval before editing. High-risk work includes authentication,
   authorization, database schema, public API contracts, messaging contracts,
   secrets, gateway rules, CI/CD and cloud infrastructure.
4. Implement the smallest coherent change. Do not mix unrelated cleanup or
   broad refactors into a feature or bug fix.
5. Add or update tests for changed behavior, including negative and boundary
   cases where relevant.
6. Run the narrowest relevant checks first, then the broader checks justified
   by the change.
7. Review the final diff for scope creep, regressions, security issues,
   accidental secrets, debug code and generated artifacts.
8. Report changed files, behavior, commands run, results, assumptions and any
   remaining risk. Never say a check passed if it was not run successfully.

## Stop Conditions

Stop and ask for direction when:

- acceptance criteria are missing and different interpretations would change
  public behavior or data;
- the task conflicts with the current API contract or another service;
- a destructive or irreversible migration is required;
- a new production dependency, external service or paid resource is required;
- credentials, production access or external coordination are required;
- existing unrelated changes overlap the files that must be edited;
- the requested verification cannot be performed and no safe equivalent exists.

Do not stop for minor implementation details that can be resolved safely from
existing patterns in the repository. State those assumptions in the final
report.

## Cross-Service Boundaries

- The frontend calls backend APIs through the Nginx gateway. Do not hardcode
  service ports in pages or components.
- Each service owns its database. Do not introduce cross-database joins or let
  one service write directly to another service's database.
- Preserve backward compatibility for HTTP and RabbitMQ contracts unless the
  task explicitly authorizes a breaking change and defines a rollout plan.
- When changing an event, inspect its producer and every consumer. Prefer
  additive fields and tolerant readers.
- Changes spanning multiple services require contract tests or an explicit
  integration test plan.

## Backend Rules

- Keep HTTP parsing and response mapping in controllers; put business logic in
  services and persistence queries in repositories.
- Use request and response DTOs at service boundaries. Do not expose persistence
  entities as public API contracts.
- Validate input at the boundary and enforce business invariants in the service
  layer.
- Derive the acting user and role from the authenticated principal or verified
  token. Do not authorize an action from a client-supplied user ID or role.
- Check ownership and role authorization on each protected resource endpoint,
  not only in frontend navigation.
- Use transactions for related writes that must succeed or fail together. Keep
  network calls outside long database transactions where possible.
- Avoid N+1 queries, unbounded list endpoints and in-memory filtering of large
  datasets. Preserve stable pagination and deterministic ordering.
- Do not log passwords, tokens, authorization headers, reset codes, private
  application data or secrets.
- Use versioned Flyway/Alembic migrations for schema changes. Do not edit an
  already-applied migration. Do not rely on ORM auto-update for production
  schema evolution.

## Frontend Rules

- Keep API base URLs in centralized configuration/client modules.
- Centralize authentication headers and error handling; do not duplicate token
  parsing across pages.
- Treat frontend role checks as user experience only. Backend authorization is
  mandatory.
- Preserve loading, empty, error, unauthorized and retry states for data-driven
  screens.
- Avoid `any` unless an existing external boundary makes it unavoidable and the
  reason is documented.
- Do not expose server secrets through `NEXT_PUBLIC_*` variables.

## Matching and Worker Rules

- Preserve deterministic hard filters before ranking: eligibility, public and
  approved state, deadline, and other available constraints.
- Keep request-path scoring bounded. Do not add an LLM or unbounded model call to
  the hot path without explicit latency, cost, fallback and caching criteria.
- Worker and consumer handlers must be retry-safe and idempotent where duplicate
  delivery is possible.
- Validate event payloads and log correlation identifiers without logging
  sensitive profile content.
- Ranking changes require representative fixtures and explicit assertions for
  constraint violations and ordering, not only that a numeric score is returned.

## Security and Secrets

- Never commit `.env`, access tokens, private keys, cloud credentials, database
  passwords or real user data.
- Use `.env.example` only for names and safe placeholders.
- Do not weaken CORS, authentication, TLS, rate limiting or gateway isolation to
  make a test pass.
- Use parameterized queries or repository APIs. Never concatenate untrusted
  input into SQL, shell commands or URLs.
- For file upload changes, validate authorization, type, size, storage name and
  download behavior.
- Security-sensitive changes require negative tests: unauthenticated, wrong
  role, wrong owner, malformed input and replay/duplicate request where relevant.

## Dependency and Generated-File Policy

- Reuse existing dependencies and patterns before adding a package.
- Before adding a production dependency, explain the need, alternatives,
  maintenance/security implications and affected lockfiles.
- Do not edit build outputs, caches, coverage output, IDE state or dependency
  directories.
- Do not modify unrelated formatting across the repository.

## Validation Commands

Run checks for every affected area. Match CI when practical.

### Java services

```bash
cd backend-java/auth-service && ./mvnw test -B
cd backend-java/scholarship-service && ./mvnw test -B
cd backend-java/chat-service && ./mvnw test -B
```

On Unix, if a wrapper from a Windows checkout is not executable, normalize only
that wrapper as CI does before rerunning. Do not change source formatting as a
side effect.

### Matching service

```bash
cd matching-service
python -m compileall app tests
ruff check app tests --select E9,F63,F7,F82
pytest -q
```

### Frontend

For a clean dependency install, use `npm ci`. Then run:

```bash
cd frontend
npm run type-check
npm run lint
npm run build
```

Use the safe local `NEXT_PUBLIC_*` values from CI or `.env.example` when the
build requires them. Never invent or expose production secrets.

### Compose and gateway

```bash
docker compose config --quiet
```

If runtime integration is required and the environment is available:

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=120 frontend api-gateway auth-service scholarship-service matching-service chat-service
```

Do not run destructive database cleanup, volume deletion or production deployment
unless the user explicitly requests it.

## Definition of Done

A task is complete only when all applicable items are true:

- the requested behavior and acceptance criteria are satisfied;
- relevant positive, negative and boundary tests exist and pass;
- public API, database and event contracts are preserved or intentionally
  updated together;
- authorization and ownership are enforced server-side;
- no secrets, debug code, temporary bypasses or unrelated edits were introduced;
- documentation is updated when behavior or operator steps changed;
- the final report distinguishes passed checks, failed checks and checks not run.

## Final Report Format

Use this concise structure:

```text
Outcome:
Changed:
Verification:
- PASS: <command/check>
- FAIL: <command/check and reason>
- NOT RUN: <check and reason>
Assumptions:
Remaining risks:
```

