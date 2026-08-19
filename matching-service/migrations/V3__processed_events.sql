CREATE TABLE IF NOT EXISTS processed_events (
    event_id VARCHAR(36) PRIMARY KEY,
    routing_key VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
    first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_processed_events_routing_key
    ON processed_events (routing_key);

CREATE INDEX IF NOT EXISTS idx_processed_events_status
    ON processed_events (status);
