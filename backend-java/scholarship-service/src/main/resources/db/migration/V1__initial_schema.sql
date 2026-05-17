CREATE TABLE IF NOT EXISTS tags (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_tags_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS skills (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_skills_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunities (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    full_description TEXT,
    creator_user_id BIGINT NOT NULL,
    organization_id BIGINT NOT NULL,
    application_deadline DATE,
    start_date DATE,
    end_date DATE,
    scholarship_amount DECIMAL(10, 2),
    min_gpa DECIMAL(3, 2),
    contact_email VARCHAR(255),
    website VARCHAR(500),
    location VARCHAR(255),
    university VARCHAR(255),
    department VARCHAR(255),
    duration_months INT,
    study_mode VARCHAR(50),
    level VARCHAR(50),
    is_public BIT(1),
    moderation_status VARCHAR(50),
    views_cnt INT,
    created_at DATETIME(6),
    updated_at DATETIME(6),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunity_to_tags (
    opportunity_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (opportunity_id, tag_id),
    CONSTRAINT fk_opportunity_tags_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities (id),
    CONSTRAINT fk_opportunity_tags_tag FOREIGN KEY (tag_id) REFERENCES tags (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS opportunity_required_skills (
    opportunity_id BIGINT NOT NULL,
    skill_id BIGINT NOT NULL,
    PRIMARY KEY (opportunity_id, skill_id),
    CONSTRAINT fk_opportunity_skills_opportunity FOREIGN KEY (opportunity_id) REFERENCES opportunities (id),
    CONSTRAINT fk_opportunity_skills_skill FOREIGN KEY (skill_id) REFERENCES skills (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS applications (
    id BIGINT NOT NULL AUTO_INCREMENT,
    applicant_user_id BIGINT NOT NULL,
    opportunity_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL,
    submitted_at DATETIME(6),
    notes TEXT,
    applicant_user_name VARCHAR(255),
    applicant_email VARCHAR(255),
    phone VARCHAR(50),
    gpa DECIMAL(3, 2),
    cover_letter TEXT,
    motivation TEXT,
    additional_info TEXT,
    portfolio_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS application_documents (
    id BIGINT NOT NULL AUTO_INCREMENT,
    application_id BIGINT NOT NULL,
    document_name VARCHAR(255),
    document_url TEXT,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS bookmarks (
    id BIGINT NOT NULL AUTO_INCREMENT,
    applicant_user_id BIGINT NOT NULL,
    opportunity_id BIGINT NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS idempotency_records (
    id BIGINT NOT NULL AUTO_INCREMENT,
    idempotency_key VARCHAR(255) NOT NULL,
    user_identifier VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_body LONGTEXT NOT NULL,
    status_code INT NOT NULL,
    created_at DATETIME(6),
    updated_at DATETIME(6),
    PRIMARY KEY (id),
    UNIQUE KEY uk_idempotency_scope_key (user_identifier, endpoint, idempotency_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
