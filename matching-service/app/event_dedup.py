"""Event de-duplication helpers for RabbitMQ at-least-once delivery."""
import logging
from datetime import datetime

from sqlalchemy.exc import IntegrityError

from .database import SessionLocal
from .models import ProcessedEvent

logger = logging.getLogger(__name__)


def claim_event(event_id: str, routing_key: str) -> bool:
    """Return True when this consumer owns the event, False for duplicates."""
    db = SessionLocal()
    try:
        db.add(ProcessedEvent(event_id=event_id, routing_key=routing_key))
        db.commit()
        return True
    except IntegrityError:
        db.rollback()
        logger.info("Skipping duplicate event_id=%s routing_key=%s", event_id, routing_key)
        return False
    finally:
        db.close()


def mark_event_processed(event_id: str) -> None:
    db = SessionLocal()
    try:
        event = db.get(ProcessedEvent, event_id)
        if event:
            event.status = "PROCESSED"
            event.processed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


def release_event_claim(event_id: str) -> None:
    """Remove a failed processing claim so RabbitMQ retry can run it again."""
    db = SessionLocal()
    try:
        event = db.get(ProcessedEvent, event_id)
        if event and event.status == "PROCESSING":
            db.delete(event)
            db.commit()
    finally:
        db.close()
