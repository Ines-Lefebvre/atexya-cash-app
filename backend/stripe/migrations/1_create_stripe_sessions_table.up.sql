CREATE TABLE stripe_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  customer_id VARCHAR(255) NOT NULL,
  contract_id VARCHAR(255),
  payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('annual', 'monthly')),
  product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('standard', 'premium')),
  amount_total INTEGER,
  currency VARCHAR(3) DEFAULT 'eur',
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_stripe_sessions_session_id ON stripe_sessions(session_id);
CREATE INDEX idx_stripe_sessions_customer_id ON stripe_sessions(customer_id);
CREATE INDEX idx_stripe_sessions_contract_id ON stripe_sessions(contract_id);
CREATE INDEX idx_stripe_sessions_status ON stripe_sessions(status);
CREATE INDEX idx_stripe_sessions_created ON stripe_sessions(created_at);
