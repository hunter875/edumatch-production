# Environment Variables

EduMatch uses one `.env` file for local Docker Compose and cloud secrets for
deployed environments.

## Rules

- Do not commit `.env`.
- Keep `.env.example` as the committed template.
- Use one shared JWT secret across services in a single environment.
- Use Docker service names for local service-to-service URLs.
- Use cloud secret stores for staging and production.

## Local Service URLs

| Dependency | Local URL |
| --- | --- |
| Auth service | `http://auth-service:8081` |
| Scholarship service | `http://scholarship-service:8082` |
| Chat service | `http://chat-service:8083` |
| Matching service | `http://matching-service:8000` |
| Redis | `redis:6379` |
| RabbitMQ | `rabbitmq:5672` |

## Frontend Variables

```txt
NEXT_PUBLIC_API_GATEWAY=http://localhost:19080
NEXT_PUBLIC_API_URL=http://localhost:19080
NEXT_PUBLIC_SOCKET_URL=ws://localhost:19080/api/ws
```

## Backend Secret Groups

| Group | Examples |
| --- | --- |
| Database | JDBC URLs, usernames, passwords |
| Auth | JWT secret, token expiration |
| Messaging | RabbitMQ host/user/password |
| Cache | Redis host/port/password if used |
| Email/Firebase | SMTP credentials, Firebase key |
| Observability | Application Insights connection string |

For the full cloud secret list, see [Local And Cloud Deployment](../07-deployment.md).
