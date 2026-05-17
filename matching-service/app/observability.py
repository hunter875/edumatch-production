"""
Azure Monitor/OpenTelemetry bootstrap for matching-service.

The import is intentionally defensive so local tests can still run without
Azure credentials. When APPLICATIONINSIGHTS_CONNECTION_STRING is present, the
Azure Monitor distro instruments FastAPI/requests/SQLAlchemy/logging where
supported and exports traces, metrics, and logs to Application Insights.
"""
import logging
import os

from .config import settings

logger = logging.getLogger(__name__)


def configure_observability() -> None:
    connection_string = settings.APPLICATIONINSIGHTS_CONNECTION_STRING
    if not connection_string:
        logger.info("Azure Monitor disabled: APPLICATIONINSIGHTS_CONNECTION_STRING is not set")
        return

    os.environ.setdefault("OTEL_SERVICE_NAME", settings.OTEL_SERVICE_NAME or "matching-service")
    os.environ.setdefault(
        "OTEL_RESOURCE_ATTRIBUTES",
        ",".join(
            [
                f"service.name={settings.OTEL_SERVICE_NAME or 'matching-service'}",
                f"service.version={settings.APP_VERSION}",
                f"deployment.environment={settings.DEPLOY_ENVIRONMENT}",
                f"service.instance.id={settings.GIT_COMMIT}",
            ]
        ),
    )

    try:
        from azure.monitor.opentelemetry import configure_azure_monitor

        configure_azure_monitor(connection_string=connection_string)
        logger.info(
            "Azure Monitor enabled service=%s version=%s env=%s commit=%s",
            settings.OTEL_SERVICE_NAME or "matching-service",
            settings.APP_VERSION,
            settings.DEPLOY_ENVIRONMENT,
            settings.GIT_COMMIT,
        )
    except Exception as exc:
        logger.warning("Azure Monitor bootstrap failed: %s", exc, exc_info=True)
