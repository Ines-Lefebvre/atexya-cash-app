CREATE TABLE contracts (
  id VARCHAR(255) PRIMARY KEY,
  siren VARCHAR(9) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN ('standard', 'premium')),
  garantie_amount INTEGER NOT NULL,
  premium_ttc INTEGER NOT NULL,
  premium_ht INTEGER NOT NULL,
  taxes INTEGER NOT NULL,
  payment_type VARCHAR(20) CHECK (payment_type IN ('annual', 'monthly')),
  broker_code VARCHAR(50),
  broker_commission_percent INTEGER,
  broker_commission_amount INTEGER,
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'disputed', 'cancelled')),
  stripe_session_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  cgv_version VARCHAR(50) NOT NULL,
  contract_start_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB
);

-- Index pour optimiser les requêtes
CREATE INDEX idx_contracts_siren ON contracts(siren);
CREATE INDEX idx_contracts_status ON contracts(payment_status);
CREATE INDEX idx_contracts_payment_type ON contracts(payment_type);
CREATE INDEX idx_contracts_broker ON contracts(broker_code);
CREATE INDEX idx_contracts_stripe_session ON contracts(stripe_session_id);
CREATE INDEX idx_contracts_stripe_customer ON contracts(stripe_customer_id);
CREATE INDEX idx_contracts_created ON contracts(created_at);
