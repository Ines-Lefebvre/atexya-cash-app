-- Add idempotency_key column with UNIQUE constraint
ALTER TABLE stripe_sessions ADD COLUMN idempotency_key VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_stripe_sessions_idempotency ON stripe_sessions(idempotency_key);
