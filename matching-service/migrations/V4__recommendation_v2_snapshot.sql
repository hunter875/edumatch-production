ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS preferred_locations VARCHAR[];
ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS preferred_funding_types VARCHAR[];

ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS funding_type VARCHAR(100);
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255);
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP;
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS eligible_majors VARCHAR[];
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS eligible_nationalities VARCHAR[];

ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS rank INTEGER;
ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS eligibility_status VARCHAR(30);
ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS components_json JSON;
ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS reasons_json JSON;
ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS missing_information_json JSON;
ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP;
ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS model_version VARCHAR(100);
ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS profile_version VARCHAR(100);
ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS opportunity_version VARCHAR(100);
ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS generated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS ix_recommendation_target_rank
    ON recommendation_cache (target_type, target_id, rank);

CREATE INDEX IF NOT EXISTS ix_recommendation_model_version
    ON recommendation_cache (model_version);
