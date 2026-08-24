"""Status-aware event claim helpers for RabbitMQ at-least-once delivery."""
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.exc import IntegrityError

from .config import settings
from .database import SessionLocal
from .models import ProcessedEvent

logger = logging.getLogger(__name__)

CLAIMED = "CLAIMED"
PROCESSED_DUPLICATE = "PROCESSED_DUPLICATE"
BUSY = "BUSY"


def _lease_deadline(now: datetime, lease_seconds: Optional[int] = None) -> datetime:
    return now + timedelta(seconds=lease_seconds or settings.EVENT_CLAIM_LEASE_SECONDS)


def claim_event(event_id: str, routing_key: str, lease_seconds: Optional[int] = None) -> str:
    """
    Claim an event for processing.

    Returns:
        CLAIMED when the caller owns a new or expired claim.
        PROCESSED_DUPLICATE when the event already completed.
        BUSY when another consumer still owns an active lease.
    """
    now = datetime.utcnow()
    db = SessionLocal()
    try:
        event = db.get(ProcessedEvent, event_id, with_for_update=True)
        if event is None:
            event = ProcessedEvent(
                event_id=event_id,
                routing_key=routing_key,
                status="PROCESSING",
                first_seen_at=now,
                claimed_at=now,
                lease_until=_lease_deadline(now, lease_seconds),
                attempt_count=1,
                updated_at=now,
            )
            db.add(event)
            db.commit()
            return CLAIMED

        if event.status == "PROCESSED":
            db.commit()
            logger.info("Skipping completed duplicate event_id=%s routing_key=%s", event_id, routing_key)
            return PROCESSED_DUPLICATE

        lease_active = event.lease_until is not None and event.lease_until > now
        if event.status == "PROCESSING" and lease_active:
            db.commit()
            logger.info(
                "Event is already processing event_id=%s lease_until=%s",
                event_id,
                event.lease_until,
            )
            return BUSY

        event.routing_key = routing_key
        event.status = "PROCESSING"
        event.claimed_at = now
        event.lease_until = _lease_deadline(now, lease_seconds)
        event.attempt_count = (event.attempt_count or 0) + 1
        event.last_error = None
        event.updated_at = now
        db.commit()
        return CLAIMED
    except IntegrityError:
        db.rollback()
        # Another consumer inserted concurrently. Re-read status; do not treat
        # primary-key conflict alone as successful processing.
        event = db.get(ProcessedEvent, event_id)
        if event and event.status == "PROCESSED":
            return PROCESSED_DUPLICATE
        return BUSY
    finally:
        db.close()


def mark_event_processed(event_id: str) -> None:
    now = datetime.utcnow()
    db = SessionLocal()
    try:
        event = db.get(ProcessedEvent, event_id)
        if event:
            event.status = "PROCESSED"
            event.processed_at = now
            event.lease_until = None
            event.last_error = None
            event.updated_at = now
            db.commit()
    finally:
        db.close()


def record_event_failure(event_id: str, error: Exception) -> None:
    now = datetime.utcnow()
    db = SessionLocal()
    try:
        event = db.get(ProcessedEvent, event_id)
        if event:
            event.status = "FAILED"
            event.last_error = str(error)[:2000]
            event.lease_until = now
            event.updated_at = now
            db.commit()
    finally:
        db.close()


def release_event_claim(event_id: str) -> None:
    """Compatibility wrapper used by older callers; records a retryable failure marker."""
    record_event_failure(event_id, RuntimeError("event claim released for retry"))
