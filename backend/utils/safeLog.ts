import crypto from "crypto";
import log from "encore.dev/log";

// Champs sensibles à filtrer
const SENSITIVE_FIELDS = [
  'password',
  'secret',
  'token',
  'api_key',
  'apiKey',
  'customer_email',
  'customerEmail',
  'email',
  'customer_name',
  'customerName',
  'name',
  'customer_phone',
  'customerPhone',
  'phone',
  'siren',
  'siret',
  'username',
  'address',
  'adresse',
  'stripe_customer_id',
  'stripeCustomerId',
  'stripe_session_id',
  'stripeSessionId',
  'payment_intent',
  'paymentIntent'
];

// Fonction pour hasher une valeur en SHA256
export const hashValue = (value: string): string => {
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
};

// Fonction pour nettoyer un objet de ses données sensibles
export const sanitizeObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    
    // Si le champ est sensible, le hasher
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
      if (typeof value === 'string' && value.length > 0) {
        sanitized[key] = `***${hashValue(value)}`;
      } else {
        sanitized[key] = '***';
      }
    } else if (typeof value === 'object' && value !== null) {
      // Récursivement sanitiser les objets imbriqués
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

// Fonction de log sécurisée
export const safeLog = {
  info: (message: string, data?: any) => {
    const sanitizedData = data ? sanitizeObject(data) : undefined;
    log.info(message, sanitizedData);
  },
  
  warn: (message: string, data?: any) => {
    const sanitizedData = data ? sanitizeObject(data) : undefined;
    log.warn(message, sanitizedData);
  },
  
  error: (message: string, data?: any) => {
    const sanitizedData = data ? sanitizeObject(data) : undefined;
    log.error(message, sanitizedData);
  }
};
