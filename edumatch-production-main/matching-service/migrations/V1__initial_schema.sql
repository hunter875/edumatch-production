CREATE TABLE IF NOT EXISTS applicant_features (
    id UUID PRIMARY KEY,
    applicant_id VARCHAR(255) NOT NULL UNIQUE,
    gpa DOUBLE PRECISION,
    major VARCHAR(255),
    university VARCHAR(255),
    year_of_study INTEGER,
    level VARCHAR(100),
    study_mode VARCHAR(100),
    location VARCHAR(255),
    skills VARCHAR[],
    research_interests VARCHAR[],
    skills_vector JSON,
    research_vector JSON,
    combined_text TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_processed_at TIMESTAMP,
    profile_version VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS opportunity_features (
    id UUID PRIMARY KEY,
    opportunity_id VARCHAR(255) NOT NULL UNIQUE,
    opportunity_type VARCHAR(50) NOT NULL,
    title VARCHAR(500),
    description TEXT,
    application_deadline DATE,
    min_gpa DOUBLE PRECISION,
    scholarship_amount DOUBLE PRECISION,
    level VARCHAR(100),
    study_mode VARCHAR(100),
    location VARCHAR(255),
    is_public BOOLEAN,
    moderation_status VARCHAR(50),
    required_skills VARCHAR[],
    preferred_majors VARCHAR[],
    research_areas VARCHAR[],
    skills_vector JSON,
    research_vector JSON,
    combined_text TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    last_processed_at TIMESTAMP,
    opportunity_version VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS matching_scores (
    id UUID PRIMARY KEY,
    applicant_id VARCHAR(255) NOT NULL,
    opportunity_id VARCHAR(255) NOT NULL,
    overall_score DOUBLE PRECISION NOT NULL,
    gpa_score DOUBLE PRECISION,
    skills_score DOUBLE PRECISION,
    research_score DOUBLE PRECISION,
    score_breakdown JSON,
    profile_version VARCHAR(100),
    opportunity_version VARCHAR(100),
    calculated_at TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recommendation_cache (
    id UUID PRIMARY KEY,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    candidate_type VARCHAR(50) NOT NULL,
    candidate_id VARCHAR(255) NOT NULL,
    matching_score DOUBLE PRECISION NOT NULL,
    calculated_at TIMESTAMP,
    expires_at TIMESTAMP,
    cache_version VARCHAR(255)
);
