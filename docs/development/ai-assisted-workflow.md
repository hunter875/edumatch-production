# AI-Assisted Development Workflow

EduMatch uses coding agents as implementation and verification assistants. The
project owner remains responsible for requirements, product decisions and final
review.

## Working Principles

- Keep changes scoped to the requested behavior.
- Inspect the affected service path before editing controllers, services,
  repositories, migrations, events or workflows.
- Prefer existing patterns over new abstractions.
- Add focused tests for changed behavior, especially authorization, ownership,
  idempotency, worker retries and security-sensitive flows.
- Run the narrowest useful checks first, then broader validation when the
  change touches shared contracts or deployment.

## Review Checklist

- Public API, database and messaging contracts are preserved or intentionally
  updated together.
- Backend authorization is enforced server-side.
- No secrets, local environment files, generated artifacts or personal files are
  committed.
- Documentation reflects the code that actually runs.
- CI validation does not require production cloud credentials.

## Verification

Use the commands in each service README and the GitHub Actions CI workflow as
the executable source of truth for local validation.
