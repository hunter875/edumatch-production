ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS level VARCHAR(100);
ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS study_mode VARCHAR(100);
ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE applicant_features ADD COLUMN IF NOT EXISTS profile_version VARCHAR(100);

ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS application_deadline DATE;
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS scholarship_amount DOUBLE PRECISION;
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS level VARCHAR(100);
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS study_mode VARCHAR(100);
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS is_public BOOLEAN;
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50);
ALTER TABLE opportunity_features ADD COLUMN IF NOT EXISTS opportunity_version VARCHAR(100);

ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS gpa_score DOUBLE PRECISION;
ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS skills_score DOUBLE PRECISION;
ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS research_score DOUBLE PRECISION;
ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS score_breakdown JSON;
ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS profile_version VARCHAR(100);
ALTER TABLE matching_scores ADD COLUMN IF NOT EXISTS opportunity_version VARCHAR(100);

ALTER TABLE recommendation_cache ADD COLUMN IF NOT EXISTS cache_version VARCHAR(255);

CREATE INDEX IF NOT EXISTS ix_applicant_features_applicant_id ON applicant_features (applicant_id);
CREATE INDEX IF NOT EXISTS ix_opportunity_features_opportunity_id ON opportunity_features (opportunity_id);
CREATE INDEX IF NOT EXISTS ix_matching_score_applicant_opportunity ON matching_scores (applicant_id, opportunity_id);
CREATE INDEX IF NOT EXISTS ix_matching_score_applicant_score ON matching_scores (applicant_id, overall_score);
CREATE INDEX IF NOT EXISTS ix_matching_score_applicant_score_desc ON matching_scores (applicant_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS ix_matching_score_expires ON matching_scores (expires_at);
CREATE INDEX IF NOT EXISTS ix_recommendation_target ON recommendation_cache (target_type, target_id);
CREATE INDEX IF NOT EXISTS ix_recommendation_target_score ON recommendation_cache (target_type, target_id, matching_score);
CREATE INDEX IF NOT EXISTS ix_recommendation_target_score_desc ON recommendation_cache (target_type, target_id, matching_score DESC);
CREATE INDEX IF NOT EXISTS ix_recommendation_candidate ON recommendation_cache (candidate_type, candidate_id);
CREATE INDEX IF NOT EXISTS ix_recommendation_expires ON recommendation_cache (expires_at);
