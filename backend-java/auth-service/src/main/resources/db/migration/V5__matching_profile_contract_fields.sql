ALTER TABLE users
    ADD COLUMN level VARCHAR(100) NULL,
    ADD COLUMN study_mode VARCHAR(100) NULL,
    ADD COLUMN location VARCHAR(255) NULL,
    ADD COLUMN nationality VARCHAR(100) NULL,
    ADD COLUMN preferred_locations TEXT NULL,
    ADD COLUMN preferred_funding_types TEXT NULL;
