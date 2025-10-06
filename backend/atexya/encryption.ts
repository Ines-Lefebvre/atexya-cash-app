import { secret } from "encore.dev/config";
import { contractsDB } from "./contracts";

// Secret utilisé pour chiffrer les données sensibles
const ENCRYPTION_KEY = secret("ENCRYPTION_KEY");

/**
 * Fonctions helper pour chiffrer/déchiffrer les données sensibles
 * Utilise pgcrypto avec pgp_sym_encrypt/pgp_sym_decrypt
 */

export interface EncryptedData {
  email: string;
  name: string;
  phone?: string;
}

export interface DecryptedData {
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
}

/**
 * Chiffre des données sensibles avant insertion en base
 */
export const encryptSensitiveData = async (data: EncryptedData) => {
  const key = ENCRYPTION_KEY();
  
  if (!key || key.trim() === "") {
    throw new Error("ENCRYPTION_KEY is not configured");
  }

  // Le chiffrement se fait directement dans la requête SQL via pgcrypto
  return {
    emailEncrypted: data.email,
    nameEncrypted: data.name,
    phoneEncrypted: data.phone,
    encryptionKey: key
  };
};

/**
 * Déchiffre des données depuis la base
 */
export const decryptSensitiveData = async (contractId: string): Promise<DecryptedData | null> => {
  const key = ENCRYPTION_KEY();
  
  if (!key || key.trim() === "") {
    throw new Error("ENCRYPTION_KEY is not configured");
  }

  const result = await contractsDB.rawQueryRow<any>(
    `SELECT 
      pgp_sym_decrypt(customer_email_encrypted, $1) as customer_email,
      pgp_sym_decrypt(customer_name_encrypted, $1) as customer_name,
      CASE 
        WHEN customer_phone_encrypted IS NOT NULL 
        THEN pgp_sym_decrypt(customer_phone_encrypted, $1)
        ELSE NULL 
      END as customer_phone
    FROM contracts 
    WHERE id = $2`,
    key,
    contractId
  );

  if (!result) {
    return null;
  }

  return {
    customer_email: result.customer_email?.toString('utf-8') || '',
    customer_name: result.customer_name?.toString('utf-8') || '',
    customer_phone: result.customer_phone?.toString('utf-8')
  };
};

/**
 * Vérifie si le chiffrement est actif
 */
export const isEncryptionEnabled = (): boolean => {
  try {
    const key = ENCRYPTION_KEY();
    return !!(key && key.trim() !== "");
  } catch {
    return false;
  }
};
