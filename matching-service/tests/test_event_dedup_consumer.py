import json
from types import SimpleNamespace
from datetime import datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import event_dedup
from app.consumer import RabbitMQConsumer
from app.models import ProcessedEvent


class FakeChannel:
    def __init__(self):
        self.acks = 0
        self.nacks = []
        self.published = []

    def basic_ack(self, delivery_tag):
        self.acks += 1

    def basic_nack(self, delivery_tag, requeue):
        self.nacks.append((delivery_tag, requeue))

    def basic_publish(self, exchange, routing_key, body, properties, mandatory=False):
        self.published.append({
            "exchange": exchange,
            "routing_key": routing_key,
            "body": body,
            "properties": properties,
            "mandatory": mandatory,
        })


def sqlite_session_factory():
    engine = create_engine("sqlite:///:memory:")
    ProcessedEvent.__table__.create(engine)
    return sessionmaker(bind=engine)


def message(routing_key, body):
    method = SimpleNamespace(routing_key=routing_key, delivery_tag=1)
    properties = SimpleNamespace(
        content_type="application/json",
        headers={},
        message_id=body.get("event_id"),
        correlation_id="corr-1",
    )
    return method, properties, json.dumps(body).encode("utf-8")


def test_duplicate_event_id_runs_handler_once(monkeypatch):
    monkeypatch.setattr(event_dedup, "SessionLocal", sqlite_session_factory())
    calls = []
    consumer = RabbitMQConsumer()
    consumer.event_handlers = {"user.profile.updated": lambda payload: calls.append(payload["userId"])}
    channel = FakeChannel()
    method, properties, body = message(
        "user.profile.updated",
        {"event_id": "evt-1", "userId": "99"},
    )

    consumer.callback(channel, method, properties, body)
    consumer.callback(channel, method, properties, body)

    assert calls == ["99"]
    assert channel.acks == 2
    assert channel.nacks == []


def test_failed_event_releases_claim_for_retry(monkeypatch):
    SessionLocal = sqlite_session_factory()
    monkeypatch.setattr(event_dedup, "SessionLocal", SessionLocal)
    consumer = RabbitMQConsumer()
    consumer.event_handlers = {"user.profile.updated": lambda payload: (_ for _ in ()).throw(RuntimeError("boom"))}
    channel = FakeChannel()
    method, properties, body = message(
        "user.profile.updated",
        {"event_id": "evt-retry", "userId": "99"},
    )

    consumer.callback(channel, method, properties, body)

    db = SessionLocal()
    try:
        event = db.get(ProcessedEvent, "evt-retry")
        assert event.status == "FAILED"
        assert event.last_error == "boom"
    finally:
        db.close()
    assert channel.acks == 1
    assert channel.nacks == []
    assert channel.published[0]["exchange"] == "events_retry_exchange"
    assert channel.published[0]["routing_key"] == "retry.1.user.profile.updated"
    assert channel.published[0]["properties"].headers["x-edumatch-retry-attempt"] == 1


def test_expired_processing_claim_can_be_reclaimed(monkeypatch):
    SessionLocal = sqlite_session_factory()
    monkeypatch.setattr(event_dedup, "SessionLocal", SessionLocal)
    now = datetime.utcnow()
    db = SessionLocal()
    try:
        db.add(ProcessedEvent(
            event_id="evt-crash",
            routing_key="user.profile.updated",
            status="PROCESSING",
            first_seen_at=now - timedelta(minutes=10),
            claimed_at=now - timedelta(minutes=10),
            lease_until=now - timedelta(minutes=1),
            attempt_count=1,
        ))
        db.commit()
    finally:
        db.close()

    result = event_dedup.claim_event("evt-crash", "user.profile.updated", lease_seconds=60)

    db = SessionLocal()
    try:
        event = db.get(ProcessedEvent, "evt-crash")
        assert result == event_dedup.CLAIMED
        assert event.status == "PROCESSING"
        assert event.attempt_count == 2
        assert event.lease_until > now
    finally:
        db.close()


def test_active_processing_claim_is_busy_not_processed(monkeypatch):
    SessionLocal = sqlite_session_factory()
    monkeypatch.setattr(event_dedup, "SessionLocal", SessionLocal)
    now = datetime.utcnow()
    db = SessionLocal()
    try:
        db.add(ProcessedEvent(
            event_id="evt-busy",
            routing_key="user.profile.updated",
            status="PROCESSING",
            first_seen_at=now,
            claimed_at=now,
            lease_until=now + timedelta(minutes=5),
            attempt_count=1,
        ))
        db.commit()
    finally:
        db.close()

    assert event_dedup.claim_event("evt-busy", "user.profile.updated") == event_dedup.BUSY


def test_primary_key_conflict_alone_is_not_success(monkeypatch):
    SessionLocal = sqlite_session_factory()
    monkeypatch.setattr(event_dedup, "SessionLocal", SessionLocal)
    now = datetime.utcnow()
    db = SessionLocal()
    try:
        db.add(ProcessedEvent(
            event_id="evt-processing",
            routing_key="user.profile.updated",
            status="PROCESSING",
            first_seen_at=now,
            claimed_at=now,
            lease_until=now + timedelta(minutes=5),
            attempt_count=1,
        ))
        db.commit()
    finally:
        db.close()

    assert event_dedup.claim_event("evt-processing", "user.profile.updated") == event_dedup.BUSY


def test_retry_topology_routes_three_delays_then_dlq():
    consumer = RabbitMQConsumer()
    method, properties, body = message(
        "user.profile.updated",
        {"event_id": "evt-retry-seq", "userId": "99"},
    )

    channel = FakeChannel()
    consumer._publish_retry_or_dlq(channel, method, properties, body)
    assert channel.published[-1]["routing_key"] == "retry.1.user.profile.updated"

    for attempt in [1, 2]:
        properties.headers = {"x-edumatch-retry-attempt": attempt}
        consumer._publish_retry_or_dlq(channel, method, properties, body)
        assert channel.published[-1]["routing_key"] == f"retry.{attempt + 1}.user.profile.updated"

    properties.headers = {"x-edumatch-retry-attempt": 3}
    consumer._publish_retry_or_dlq(channel, method, properties, body)
    assert channel.published[-1]["exchange"] == "events_dlx"
    assert channel.published[-1]["routing_key"] == "user.profile.updated"
