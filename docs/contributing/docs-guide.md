# Documentation Guide

EduMatch documentation is written in Markdown and published as a static HTML
site with MkDocs Material.

## Run Locally

```powershell
pip install -r requirements-docs.txt
mkdocs serve
```

Open:

```txt
http://127.0.0.1:8000
```

## Build Static HTML

```powershell
mkdocs build
```

The generated HTML is written to `site/`.

## Writing Rules

- Keep root `README.md` short.
- Put long operational details in `docs/`.
- Prefer one page per problem area.
- Add diagrams when architecture is easier to see than read.
- Record tradeoffs in `docs/decisions/`.
- Update runbooks when fixing incidents.
- Add each new document to [Documentation Inventory](../DOCS_INVENTORY.md).
- Mark documents as canonical, runbook, report, reference, or archive candidate.

## Page Types

| Type | Purpose |
| --- | --- |
| Overview | explains the system at a high level |
| Guide | gives setup or deployment steps |
| Runbook | debugs a symptom under pressure |
| Decision record | explains tradeoffs |
| Benchmark report | records before/after measurements |

## Document Lifecycle

```txt
draft -> reviewed -> canonical/runbook/reference/report -> archive candidate
```

Use this lifecycle to avoid a docs folder that becomes a pile of unrelated
notes. A document can be useful even when it is not canonical, but its status
must be visible.

### Canonical

Current source of truth. Keep it concise and linked from the main navigation.

### Runbook

Operational instructions for deploy, debug, rollback, incident response, or
maintenance. These should contain commands and clear symptoms.

### Report

A dated investigation or benchmark. Reports can become stale, so they should
include date, environment, and conclusion.

### Reference

Supporting detail, learning material, checklist, or implementation guide.

### Archive Candidate

Old or specialized material that should stay available but should not be read
as current truth without review.

## Do Not

- Hand-write generated HTML.
- Commit `site/`.
- Hide important operational steps only in chat messages.
- Mix outdated local ports with current Docker Compose ports.
