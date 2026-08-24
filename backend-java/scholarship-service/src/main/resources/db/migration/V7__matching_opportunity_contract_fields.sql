ALTER TABLE opportunities
    ADD COLUMN funding_type VARCHAR(100) NULL,
    ADD COLUMN source_url VARCHAR(1000) NULL,
    ADD COLUMN eligible_majors TEXT NULL,
    ADD COLUMN eligible_nationalities TEXT NULL;
