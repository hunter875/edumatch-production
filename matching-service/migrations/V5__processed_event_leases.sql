ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP NULL;
ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS lease_until TIMESTAMP NULL;
ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS last_error TEXT NULL;
ALTER TABLE processed_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NULL;

CREATE INDEX IF NOT EXISTS ix_processed_events_lease_until
    ON processed_events (lease_until);
