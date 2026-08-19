import json
from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app import event_dedup
from app.consumer import RabbitMQConsumer
from app.models import ProcessedEvent


class FakeChannel:
    def __init__(self):
        self.acks = 0
        self.nacks = []

    def basic_ack(self, delivery_tag):
        self.acks += 1

    def basic_nack(self, delivery_tag, requeue):
        self.nacks.append((delivery_tag, requeue))


def sqlite_session_factory():
    engine = create_engine("sqlite:///:memory:")
    ProcessedEvent.__table__.create(engine)
    return sessionmaker(bind=engine)


def message(routing_key, body):
    method = SimpleNamespace(routing_key=routing_key, delivery_tag=1)
    properties = SimpleNamespace(content_type="application/json", headers={}, message_id=None)
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
        assert db.get(ProcessedEvent, "evt-retry") is None
    finally:
        db.close()
    assert channel.acks == 0
    assert channel.nacks == [(1, True)]
