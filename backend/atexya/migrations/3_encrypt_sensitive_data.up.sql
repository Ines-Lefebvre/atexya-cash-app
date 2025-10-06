-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns for sensitive data
ALTER TABLE contracts ADD COLUMN customer_email_encrypted BYTEA;
ALTER TABLE contracts ADD COLUMN customer_name_encrypted BYTEA;
ALTER TABLE contracts ADD COLUMN customer_phone_encrypted BYTEA;

-- Migrate existing data to encrypted columns (if any exists)
-- Note: This requires ENCRYPTION_KEY to be set as environment variable
-- UPDATE contracts SET 
--   customer_email_encrypted = pgp_sym_encrypt(customer_email, current_setting('app.encryption_key')),
--   customer_name_encrypted = pgp_sym_encrypt(customer_name, current_setting('app.encryption_key')),
--   customer_phone_encrypted = CASE 
--     WHEN customer_phone IS NOT NULL THEN pgp_sym_encrypt(customer_phone, current_setting('app.encryption_key'))
--     ELSE NULL
--   END;

-- After migration, you can drop the old columns:
-- ALTER TABLE contracts DROP COLUMN customer_email;
-- ALTER TABLE contracts DROP COLUMN customer_name;
-- ALTER TABLE contracts DROP COLUMN customer_phone;

-- Add comment explaining encryption
COMMENT ON COLUMN contracts.customer_email_encrypted IS 'Encrypted email using pgcrypto pgp_sym_encrypt';
COMMENT ON COLUMN contracts.customer_name_encrypted IS 'Encrypted name using pgcrypto pgp_sym_encrypt';
COMMENT ON COLUMN contracts.customer_phone_encrypted IS 'Encrypted phone using pgcrypto pgp_sym_encrypt';
