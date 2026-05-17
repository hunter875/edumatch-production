"""
Celery configuration and application
"""
from celery import Celery
from .config import settings

# Create Celery app
celery_app = Celery(
    'matching_service',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=['app.workers']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,  # Process one task at a time
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks (prevent memory leaks)
)

# NOTE: We do NOT use task_routes here because the consumer handles
# routing via RabbitMQ exchanges/queues. Tasks are called directly.
