import { api, APIError } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { getAuthData } from "~encore/auth";
import type { AdminAuthData } from "../admin/auth";
import { safeLog, hashValue } from "../utils/safeLog";
import { getStripe, getFrontendUrl } from "../stripe/client";
import { normalizeStripeMetadata } from "../utils/stripeHelpers";

// Base de données pour les contrats
export const contractsDB = new SQLDatabase("contracts", {
  migrations: "./migrations",
});

interface Contract {
  id: string;
  siren: string;
  company_name: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  contract_type: 'standard' | 'premium';
  garantie_amount: number;
  premium_ttc: number;
  premium_ht: number;
  taxes: number;
  broker_code?: string;
  broker_commission_percent?: number;
  broker_commission_amount?: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'disputed' | 'cancelled';
  payment_type?: 'annual' | 'monthly';
  stripe_session_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  cgv_version: string;
  contract_start_date: string;
  contract_end_date: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

interface SanitizedContract {
  id: string;
  siren: string;
  company_name: string;
  contract_type: 'standard' | 'premium';
  garantie_amount: number;
  premium_ttc: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'disputed' | 'cancelled';
  payment_type?: 'annual' | 'monthly';
  contract_start_date: string;
  contract_end_date: string;
  created_at: string;
}

interface CreateContractRequest {
  siren: string;
  company_name: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  contract_type: 'standard' | 'premium';
  garantie_amount: number;
  premium_ttc: number;
  premium_ht: number;
  taxes: number;
  payment_type?: 'annual' | 'monthly';
  broker_code?: string;
  broker_commission_percent?: number;
  cgv_version: string;
  metadata?: Record<string, any>;
  idempotency_key: string;
  headcount: number;
  amount_cents: number;
  currency?: string;
}

function validateCreateContractRequest(params: any): { valid: boolean; error?: string } {
  if (!params.siren || typeof params.siren !== 'string' || params.siren.length !== 9) {
    return { valid: false, error: 'siren: must be exactly 9 characters' };
  }
  if (!params.company_name || typeof params.company_name !== 'string' || params.company_name.length === 0) {
    return { valid: false, error: 'company_name: must be a non-empty string' };
  }
  if (!params.customer_email || typeof params.customer_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.customer_email)) {
    return { valid: false, error: 'customer_email: must be a valid email' };
  }
  if (!params.customer_name || typeof params.customer_name !== 'string' || params.customer_name.length === 0) {
    return { valid: false, error: 'customer_name: must be a non-empty string' };
  }
  if (!['standard', 'premium'].includes(params.contract_type)) {
    return { valid: false, error: 'contract_type: must be either "standard" or "premium"' };
  }
  if (typeof params.garantie_amount !== 'number' || params.garantie_amount <= 0) {
    return { valid: false, error: 'garantie_amount: must be a positive number' };
  }
  if (typeof params.premium_ttc !== 'number' || params.premium_ttc <= 0) {
    return { valid: false, error: 'premium_ttc: must be a positive number' };
  }
  if (typeof params.premium_ht !== 'number' || params.premium_ht <= 0) {
    return { valid: false, error: 'premium_ht: must be a positive number' };
  }
  if (typeof params.taxes !== 'number' || params.taxes < 0) {
    return { valid: false, error: 'taxes: must be a non-negative number' };
  }
  if (!params.cgv_version || typeof params.cgv_version !== 'string' || params.cgv_version.length === 0) {
    return { valid: false, error: 'cgv_version: must be a non-empty string' };
  }
  if (!params.idempotency_key || typeof params.idempotency_key !== 'string' || params.idempotency_key.length === 0) {
    return { valid: false, error: 'idempotency_key: must be a non-empty string' };
  }
  if (!Number.isInteger(params.headcount) || params.headcount <= 0) {
    return { valid: false, error: 'headcount: must be a positive integer' };
  }
  if (!Number.isInteger(params.amount_cents) || params.amount_cents <= 0) {
    return { valid: false, error: 'amount_cents: must be a positive integer' };
  }
  if (params.payment_type && !['annual', 'monthly'].includes(params.payment_type)) {
    return { valid: false, error: 'payment_type: must be either "annual" or "monthly"' };
  }
  if (params.broker_commission_percent !== undefined && (typeof params.broker_commission_percent !== 'number' || params.broker_commission_percent < 0 || params.broker_commission_percent > 100)) {
    return { valid: false, error: 'broker_commission_percent: must be a number between 0 and 100' };
  }
  return { valid: true };
}

interface CreateContractResponse {
  contract_id: string;
  sessionId: string;
  sessionUrl: string;
}

// Fonction pour vérifier si l'utilisateur est admin
const isAdmin = (): boolean => {
  try {
    const authData = getAuthData()! as AdminAuthData;
    return authData?.userID === 'admin';
  } catch {
    return false;
  }
};

// Fonction pour sanitiser les données personnelles
const sanitizeContract = (contract: Contract): SanitizedContract => {
  return {
    id: contract.id,
    siren: contract.siren,
    company_name: contract.company_name,
    contract_type: contract.contract_type,
    garantie_amount: contract.garantie_amount,
    premium_ttc: contract.premium_ttc,
    payment_status: contract.payment_status,
    payment_type: contract.payment_type,
    contract_start_date: contract.contract_start_date,
    contract_end_date: contract.contract_end_date,
    created_at: contract.created_at
  };
};

export const createContract = api<CreateContractRequest, CreateContractResponse>(
  { expose: true, method: "POST", path: "/contracts/create" },
  async (params) => {
    const validation = validateCreateContractRequest(params);
    if (!validation.valid) {
      safeLog.warn("Contract validation failed", { error: validation.error });
      throw APIError.invalidArgument(validation.error || "Invalid payload");
    }

    try {
      const existingContract = await contractsDB.rawQueryRow<any>(
        `SELECT id, stripe_session_id FROM contracts WHERE idempotency_key = $1 LIMIT 1`,
        params.idempotency_key
      );

      if (existingContract?.stripe_session_id) {
        const stripe = getStripe();
        const existingSession = await stripe.checkout.sessions.retrieve(existingContract.stripe_session_id);
        safeLog.info("Contract and session already exist for idempotency_key", {
          contractId: existingContract.id,
          sessionId: existingContract.stripe_session_id,
          idempotencyKey: params.idempotency_key
        });
        return {
          contract_id: existingContract.id,
          sessionId: existingContract.stripe_session_id,
          sessionUrl: existingSession.url || ''
        };
      }

      const contractId = `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const brokerCommissionAmount = params.broker_code && params.broker_commission_percent ?
        Math.round(params.premium_ttc * (params.broker_commission_percent / 100)) : 0;

      const stripe = getStripe();
      const frontUrl = getFrontendUrl();

      const metadata = normalizeStripeMetadata({
        contract_id: contractId,
        company_name: params.company_name,
        siren: params.siren,
        contract_type: params.contract_type,
        payment_type: params.payment_type || 'annual',
        headcount: params.headcount,
        broker_code: params.broker_code || '',
        cgv_version: params.cgv_version,
      });

      const sessionParams: any = {
        mode: params.payment_type === 'monthly' ? 'subscription' : 'payment',
        payment_method_types: params.payment_type === 'monthly' ? ['card', 'sepa_debit'] : ['card'],
        line_items: [{
          price_data: {
            currency: params.currency,
            product_data: {
              name: `Garantie Financière AT/MP - ${params.contract_type === 'premium' ? 'Premium' : 'Standard'}`,
              description: `Garantie ${params.garantie_amount.toLocaleString()}€`,
            },
            unit_amount: params.amount_cents,
            ...(params.payment_type === 'monthly' && {
              recurring: { interval: 'month', interval_count: 1 }
            })
          },
          quantity: 1
        }],
        success_url: `${frontUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontUrl}/page6`,
        customer_email: params.customer_email,
        metadata,
        customer_update: {
          address: 'auto',
          name: 'auto'
        },
        billing_address_collection: 'required'
      };

      if (sessionParams.mode === 'payment') {
        sessionParams.invoice_creation = { enabled: true };
      }

      const session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey: params.idempotency_key
      });

      await contractsDB.exec`
        INSERT INTO contracts (
          id, siren, company_name, customer_email, customer_name, customer_phone,
          contract_type, garantie_amount, premium_ttc, premium_ht, taxes, payment_type,
          broker_code, broker_commission_percent, broker_commission_amount,
          payment_status, stripe_session_id, stripe_customer_id, stripe_subscription_id,
          cgv_version, contract_start_date, contract_end_date, created_at, updated_at, metadata, idempotency_key,
          headcount, amount_cents, currency
        ) VALUES (
          ${contractId}, ${params.siren}, ${params.company_name}, 
          ${params.customer_email}, ${params.customer_name}, ${params.customer_phone || null},
          ${params.contract_type}, ${params.garantie_amount}, ${params.premium_ttc}, 
          ${params.premium_ht}, ${params.taxes}, ${params.payment_type || 'annual'},
          ${params.broker_code || null}, ${params.broker_commission_percent || null}, ${brokerCommissionAmount},
          'pending', ${session.id}, ${null}, ${null},
          ${params.cgv_version},
          ${startDate}, ${endDate}, ${now}, ${now}, ${JSON.stringify(params.metadata || {})}, ${params.idempotency_key},
          ${params.headcount}, ${params.amount_cents}, ${params.currency}
        )
      `;

      safeLog.info("Contract and Stripe session created", { 
        contractId,
        sessionId: session.id,
        sirenHash: hashValue(params.siren),
        amount: params.premium_ttc,
        paymentType: params.payment_type || 'annual',
        brokerCommission: brokerCommissionAmount,
        headcount: params.headcount,
        amountCents: params.amount_cents
      });

      return { 
        contract_id: contractId,
        sessionId: session.id,
        sessionUrl: session.url || ''
      };

    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      safeLog.error("Error creating contract", { 
        error: error.message,
        stack: error.stack,
        idempotencyKey: params.idempotency_key,
        sirenHash: hashValue(params.siren)
      });
      throw APIError.internal("Impossible de créer le contrat");
    }
  }
);

interface UpdateContractStatusRequest {
  contract_id: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded' | 'disputed' | 'cancelled';
  stripe_session_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  payment_intent_id?: string;
  stripe_amount_total?: number;
  metadata?: Record<string, any>;
}

// Met à jour le statut d'un contrat (public car utilisé par webhooks Stripe)
export const updateContractStatus = api<UpdateContractStatusRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/contracts/update-status" },
  async (params) => {
    try {
      const now = new Date().toISOString();
      const updates: string[] = [];
      const values: any[] = [];
      let placeholderIndex = 1;

      updates.push(`payment_status = $${placeholderIndex++}`, `updated_at = $${placeholderIndex++}`);
      values.push(params.payment_status, now);

      if (params.stripe_session_id) {
        updates.push(`stripe_session_id = $${placeholderIndex++}`);
        values.push(params.stripe_session_id);
      }

      if (params.stripe_customer_id) {
        updates.push(`stripe_customer_id = $${placeholderIndex++}`);
        values.push(params.stripe_customer_id);
      }

      if (params.stripe_subscription_id) {
        updates.push(`stripe_subscription_id = $${placeholderIndex++}`);
        values.push(params.stripe_subscription_id);
      }

      if (params.payment_intent_id) {
        updates.push(`payment_intent_id = $${placeholderIndex++}`);
        values.push(params.payment_intent_id);
      }

      if (params.stripe_amount_total !== undefined) {
        updates.push(`stripe_amount_total = $${placeholderIndex++}`);
        values.push(params.stripe_amount_total);
      }

      if (params.metadata) {
        updates.push(`metadata = $${placeholderIndex++}`);
        values.push(JSON.stringify(params.metadata));
      }

      values.push(params.contract_id);

      await contractsDB.rawExec(
        `UPDATE contracts SET ${updates.join(', ')} WHERE id = $${placeholderIndex}`,
        ...values
      );

      safeLog.info("Contract status updated", {
        contractId: params.contract_id,
        newStatus: params.payment_status,
        stripeSessionIdHash: params.stripe_session_id ? hashValue(params.stripe_session_id) : undefined
      });

      return { success: true };

    } catch (error: any) {
      safeLog.error("Error updating contract status", { 
        error: error.message, 
        contractId: params.contract_id 
      });
      throw APIError.internal("Impossible de mettre à jour le contrat");
    }
  }
);

interface GetContractRequest {
  contract_id?: string;
  siren?: string;
  stripe_session_id?: string;
}

// Récupère un contrat (protégé - admin ou propriétaire uniquement)
export const getContract = api<GetContractRequest, Contract>(
  { expose: true, method: "POST", path: "/contracts/get", auth: true },
  async (params) => {
    try {
      let whereClause = '';
      const values: any[] = [];

      if (params.contract_id) {
        whereClause = 'id = $1';
        values.push(params.contract_id);
      } else if (params.siren) {
        whereClause = 'siren = $1';
        values.push(params.siren);
      } else if (params.stripe_session_id) {
        whereClause = 'stripe_session_id = $1';
        values.push(params.stripe_session_id);
      } else {
        throw APIError.invalidArgument("Aucun critère de recherche fourni");
      }

      const contract = await contractsDB.rawQueryRow<any>(
        `SELECT * FROM contracts WHERE ${whereClause} ORDER BY created_at DESC LIMIT 1`,
        ...values
      );

      if (!contract) {
        throw APIError.notFound("Contrat non trouvé");
      }

      const fullContract: Contract = {
        ...contract,
        metadata: JSON.parse(contract.metadata || '{}')
      };

      // Si admin, retourner toutes les données
      if (isAdmin()) {
        safeLog.info("Admin accessed contract", { contractId: contract.id });
        return fullContract;
      }

      // Sinon, sanitiser les données sensibles
      safeLog.info("Non-admin accessed contract (sanitized)", { contractId: contract.id });
      
      // Retourner le contrat avec les données personnelles masquées
      return {
        ...fullContract,
        customer_email: '***@***',
        customer_name: '***',
        customer_phone: undefined,
        broker_code: undefined,
        broker_commission_percent: undefined,
        broker_commission_amount: undefined,
        stripe_customer_id: undefined,
        metadata: {}
      } as Contract;

    } catch (error: any) {
      safeLog.error("Error getting contract", { error: error.message });
      if (error instanceof APIError) {
        throw error;
      }
      throw APIError.internal("Impossible de récupérer le contrat");
    }
  }
);

interface ListContractsRequest {
  limit?: number;
  offset?: number;
  status?: 'pending' | 'paid' | 'failed' | 'refunded' | 'disputed' | 'cancelled';
  payment_type?: 'annual' | 'monthly';
  broker_code?: string;
  date_from?: string;
  date_to?: string;
}

interface ListContractsResponse {
  contracts: Contract[];
  total: number;
  has_more: boolean;
}

// Liste les contrats avec filtres (admin uniquement)
export const listContracts = api<ListContractsRequest, ListContractsResponse>(
  { expose: true, method: "POST", path: "/contracts/list", auth: true },
  async (params) => {
    // Vérifier que l'utilisateur est admin
    if (!isAdmin()) {
      safeLog.warn("Unauthorized access attempt to listContracts");
      throw APIError.permissionDenied("Accès refusé : seuls les administrateurs peuvent lister les contrats");
    }

    try {
      const limit = params.limit || 50;
      const offset = params.offset || 0;
      
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let placeholderIndex = 1;

      if (params.status) {
        whereConditions.push(`payment_status = $${placeholderIndex++}`);
        queryParams.push(params.status);
      }

      if (params.payment_type) {
        whereConditions.push(`payment_type = $${placeholderIndex++}`);
        queryParams.push(params.payment_type);
      }

      if (params.broker_code) {
        whereConditions.push(`broker_code = $${placeholderIndex++}`);
        queryParams.push(params.broker_code);
      }

      if (params.date_from) {
        whereConditions.push(`created_at >= $${placeholderIndex++}`);
        queryParams.push(params.date_from);
      }

      if (params.date_to) {
        whereConditions.push(`created_at <= $${placeholderIndex++}`);
        queryParams.push(params.date_to);
      }

      const whereClause = whereConditions.length > 0 ? 
        `WHERE ${whereConditions.join(' AND ')}` : '';

      // Compter le total
      const totalResult = await contractsDB.rawQueryRow<{ count: number }>(
        `SELECT COUNT(*) as count FROM contracts ${whereClause}`,
        ...queryParams
      );
      const total = totalResult?.count || 0;

      // Récupérer les contrats
      const contracts = await contractsDB.rawQueryAll<any>(
        `SELECT * FROM contracts ${whereClause} ORDER BY created_at DESC LIMIT $${placeholderIndex++} OFFSET $${placeholderIndex++}`,
        ...queryParams, limit, offset
      );

      const formattedContracts = contracts.map(contract => ({
        ...contract,
        metadata: JSON.parse(contract.metadata || '{}')
      }));

      safeLog.info("Admin listed contracts", { total, limit, offset });

      return {
        contracts: formattedContracts,
        total,
        has_more: offset + limit < total
      };

    } catch (error: any) {
      safeLog.error("Error listing contracts", { error: error.message });
      throw APIError.internal("Impossible de lister les contrats");
    }
  }
);

interface BrokerCommissionSummaryRequest {
  broker_code: string;
  date_from?: string;
  date_to?: string;
}

interface BrokerCommissionSummaryResponse {
  broker_code: string;
  total_contracts: number;
  total_commission: number;
  paid_commission: number;
  pending_commission: number;
  contracts: Array<{
    contract_id: string;
    siren: string;
    company_name: string;
    premium_ttc: number;
    commission_amount: number;
    payment_status: string;
    payment_type?: string;
    created_at: string;
  }>;
}

// Récupère le résumé des commissions pour un courtier (admin uniquement)
export const getBrokerCommissionSummary = api<BrokerCommissionSummaryRequest, BrokerCommissionSummaryResponse>(
  { expose: true, method: "POST", path: "/contracts/broker-commission", auth: true },
  async (params) => {
    // Vérifier que l'utilisateur est admin
    if (!isAdmin()) {
      safeLog.warn("Unauthorized access attempt to getBrokerCommissionSummary", { 
        brokerCode: params.broker_code 
      });
      throw APIError.permissionDenied("Accès refusé : seuls les administrateurs peuvent consulter les commissions");
    }

    try {
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let placeholderIndex = 1;

      whereConditions.push(`broker_code = $${placeholderIndex++}`);
      queryParams.push(params.broker_code);

      if (params.date_from) {
        whereConditions.push(`created_at >= $${placeholderIndex++}`);
        queryParams.push(params.date_from);
      }

      if (params.date_to) {
        whereConditions.push(`created_at <= $${placeholderIndex++}`);
        queryParams.push(params.date_to);
      }

      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      const contracts = await contractsDB.rawQueryAll<any>(
        `SELECT id, siren, company_name, premium_ttc, broker_commission_amount, 
                payment_status, payment_type, created_at
         FROM contracts ${whereClause} 
         ORDER BY created_at DESC`,
        ...queryParams
      );

      let totalCommission = 0;
      let paidCommission = 0;
      let pendingCommission = 0;

      const formattedContracts = contracts.map(contract => {
        const commissionAmount = contract.broker_commission_amount || 0;
        totalCommission += commissionAmount;
        
        if (contract.payment_status === 'paid') {
          paidCommission += commissionAmount;
        } else if (contract.payment_status === 'pending') {
          pendingCommission += commissionAmount;
        }

        return {
          contract_id: contract.id,
          siren: contract.siren,
          company_name: contract.company_name,
          premium_ttc: contract.premium_ttc,
          commission_amount: commissionAmount,
          payment_status: contract.payment_status,
          payment_type: contract.payment_type,
          created_at: contract.created_at
        };
      });

      safeLog.info("Admin accessed broker commission summary", { 
        brokerCode: params.broker_code,
        totalContracts: contracts.length 
      });

      return {
        broker_code: params.broker_code,
        total_contracts: contracts.length,
        total_commission: totalCommission,
        paid_commission: paidCommission,
        pending_commission: pendingCommission,
        contracts: formattedContracts
      };

    } catch (error: any) {
      safeLog.error("Error getting broker commission summary", { 
        error: error.message
      });
      throw APIError.internal("Impossible de récupérer le résumé des commissions");
    }
  }
);
