CREATE TABLE deletion_requests (
  id VARCHAR(255) PRIMARY KEY,
  customer_email VARCHAR(255) NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  request_ip VARCHAR(100),
  request_user_agent TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  metadata JSONB
);

CREATE TABLE deletion_audit (
  id BIGSERIAL PRIMARY KEY,
  deletion_request_id VARCHAR(255) REFERENCES deletion_requests(id),
  customer_email VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  data_type VARCHAR(100) NOT NULL,
  records_deleted INTEGER DEFAULT 0,
  executed_by VARCHAR(255),
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX idx_deletion_requests_email ON deletion_requests(customer_email);
CREATE INDEX idx_deletion_requests_token ON deletion_requests(token_hash);
CREATE INDEX idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX idx_deletion_requests_expires ON deletion_requests(expires_at);
CREATE INDEX idx_deletion_audit_request_id ON deletion_audit(deletion_request_id);
CREATE INDEX idx_deletion_audit_email ON deletion_audit(customer_email);
CREATE INDEX idx_deletion_audit_executed_at ON deletion_audit(executed_at);
