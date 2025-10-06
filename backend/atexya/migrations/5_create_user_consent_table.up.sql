CREATE TABLE user_consent (
  id BIGSERIAL PRIMARY KEY,
  user_identifier VARCHAR(255),
  session_id VARCHAR(255),
  analytics_consent BOOLEAN NOT NULL DEFAULT false,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(100),
  user_agent TEXT,
  metadata JSONB
);

CREATE INDEX idx_user_consent_identifier ON user_consent(user_identifier);
CREATE INDEX idx_user_consent_session ON user_consent(session_id);
CREATE INDEX idx_user_consent_date ON user_consent(consent_date);
