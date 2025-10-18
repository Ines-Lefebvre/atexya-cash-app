CREATE TABLE failed_login_attempts (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  attempt_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_failed_login_ip ON failed_login_attempts(ip_address, attempt_time);
CREATE INDEX idx_failed_login_username ON failed_login_attempts(username, attempt_time);
CREATE INDEX idx_failed_login_time ON failed_login_attempts(attempt_time);

CREATE TABLE ip_blocks (
  id BIGSERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  blocked_until TIMESTAMP NOT NULL,
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ip_blocks_ip ON ip_blocks(ip_address, blocked_until);
CREATE INDEX idx_ip_blocks_until ON ip_blocks(blocked_until);

CREATE TABLE revoked_tokens (
  id BIGSERIAL PRIMARY KEY,
  token_jti VARCHAR(255) NOT NULL UNIQUE,
  revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_revoked_tokens_jti ON revoked_tokens(token_jti);
CREATE INDEX idx_revoked_tokens_expires ON revoked_tokens(expires_at);

CREATE TABLE refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  token_id VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token_id);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
