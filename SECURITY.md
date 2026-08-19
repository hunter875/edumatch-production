# Security Policy

EduMatch is a portfolio/MVP project, but security issues should still be
handled carefully.

## Supported Branch

Security fixes are accepted on `main` unless an active release branch is
documented separately.

## Reporting A Vulnerability

Please report suspected vulnerabilities privately to the repository owner
instead of opening a public issue with exploit details. Include:

- affected service or endpoint,
- reproduction steps,
- expected impact,
- suggested fix if known.

## Project Security Baseline

- Do not commit `.env`, private keys, database dumps, real user data, access
  tokens or cloud credentials.
- Use `.env.example` for safe placeholders only.
- Keep backend authorization checks server-side; frontend role checks are only a
  user experience layer.
- Production-like environments should use RSA JWT keys with
  `APP_JWT_REQUIRE_RSA=true`.
- Treat RabbitMQ delivery as at-least-once and keep consumers idempotent.
