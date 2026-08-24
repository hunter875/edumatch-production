ALTER TABLE recommendation_cache
    ADD COLUMN IF NOT EXISTS score_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS corpus_version VARCHAR(150);

CREATE INDEX IF NOT EXISTS ix_recommendation_corpus_version
    ON recommendation_cache (corpus_version);
