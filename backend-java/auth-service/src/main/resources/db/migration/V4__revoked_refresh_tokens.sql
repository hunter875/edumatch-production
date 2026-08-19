CREATE TABLE IF NOT EXISTS revoked_refresh_tokens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    token_hash VARCHAR(128) NOT NULL,
    user_id BIGINT NOT NULL,
    replaced_by_hash VARCHAR(128),
    revoked_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_revoked_refresh_token_hash (token_hash),
    INDEX idx_revoked_refresh_tokens_user (user_id),
    CONSTRAINT fk_revoked_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
