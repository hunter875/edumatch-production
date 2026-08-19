ALTER TABLE applications
    ADD CONSTRAINT uk_applications_applicant_opportunity
        UNIQUE (applicant_user_id, opportunity_id);

ALTER TABLE outbox_events
    ADD COLUMN event_id VARCHAR(36) NULL;

UPDATE outbox_events
SET event_id = UUID()
WHERE event_id IS NULL;

ALTER TABLE outbox_events
    MODIFY event_id VARCHAR(36) NOT NULL;

ALTER TABLE outbox_events
    ADD CONSTRAINT uk_outbox_event_id UNIQUE (event_id);
