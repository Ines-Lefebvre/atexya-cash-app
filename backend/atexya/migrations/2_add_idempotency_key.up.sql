-- Add idempotency_key column with UNIQUE constraint
ALTER TABLE contracts ADD COLUMN idempotency_key VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_contracts_idempotency ON contracts(idempotency_key);
