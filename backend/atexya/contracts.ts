import { api, APIError } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import log from "encore.dev/log";

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
  stripe_session_id?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  cgv_version: string;
  metadata?: Record<string, any>;
}

interface CreateContractResponse {
  contract_id: string;
}

// Crée un nouveau contrat
export const createContract = api<CreateContractRequest, CreateContractResponse>(
  { expose: true, method: "POST", path: "/contracts/create" },
  async (params) => {
    try {
      const contractId = `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 1 an

      // Calcul commission courtier
      const brokerCommissionAmount = params.broker_code && params.broker_commission_percent ?
        Math.round(params.premium_ttc * (params.broker_commission_percent / 100)) : 0;

      await contractsDB.exec`
        INSERT INTO contracts (
          id, siren, company_name, customer_email, customer_name, customer_phone,
          contract_type, garantie_amount, premium_ttc, premium_ht, taxes, payment_type,
          broker_code, broker_commission_percent, broker_commission_amount,
          payment_status, stripe_session_id, stripe_customer_id, stripe_subscription_id,
          cgv_version, contract_start_date, contract_end_date, created_at, updated_at, metadata
        ) VALUES (
          ${contractId}, ${params.siren}, ${params.company_name}, 
          ${params.customer_email}, ${params.customer_name}, ${params.customer_phone},
          ${params.contract_type}, ${params.garantie_amount}, ${params.premium_ttc}, 
          ${params.premium_ht}, ${params.taxes}, ${params.payment_type},
          ${params.broker_code}, ${params.broker_commission_percent}, ${brokerCommissionAmount},
          'pending', ${params.stripe_session_id}, ${params.stripe_customer_id}, 
          ${params.stripe_subscription_id}, ${params.cgv_version},
          ${startDate}, ${endDate}, ${now}, ${now}, ${JSON.stringify(params.metadata || {})}
        )
      `;

      log.info("Contract created successfully", { 
        contractId,
        siren: params.siren,
        amount: params.premium_ttc,
        paymentType: params.payment_type,
        stripeSessionId: params.stripe_session_id,
        brokerCommission: brokerCommissionAmount
      });

      return { contract_id: contractId };

    } catch (error: any) {
      log.error("Error creating contract", { error: error.message, params });
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
  metadata?: Record<string, any>;
}

// Met à jour le statut d'un contrat
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

      if (params.metadata) {
        updates.push(`metadata = $${placeholderIndex++}`);
        values.push(JSON.stringify(params.metadata));
      }

      values.push(params.contract_id);

      await contractsDB.rawExec(
        `UPDATE contracts SET ${updates.join(', ')} WHERE id = $${placeholderIndex}`,
        ...values
      );

      log.info("Contract status updated", {
        contractId: params.contract_id,
        newStatus: params.payment_status,
        stripeSessionId: params.stripe_session_id
      });

      return { success: true };

    } catch (error: any) {
      log.error("Error updating contract status", { 
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

// Récupère un contrat
export const getContract = api<GetContractRequest, Contract>(
  { expose: true, method: "POST", path: "/contracts/get" },
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

      return {
        ...contract,
        metadata: JSON.parse(contract.metadata || '{}')
      };

    } catch (error: any) {
      log.error("Error getting contract", { error: error.message, params });
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

// Liste les contrats avec filtres
export const listContracts = api<ListContractsRequest, ListContractsResponse>(
  { expose: true, method: "POST", path: "/contracts/list" },
  async (params) => {
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

      return {
        contracts: formattedContracts,
        total,
        has_more: offset + limit < total
      };

    } catch (error: any) {
      log.error("Error listing contracts", { error: error.message, params });
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

// Récupère le résumé des commissions pour un courtier
export const getBrokerCommissionSummary = api<BrokerCommissionSummaryRequest, BrokerCommissionSummaryResponse>(
  { expose: true, method: "POST", path: "/contracts/broker-commission" },
  async (params) => {
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

      return {
        broker_code: params.broker_code,
        total_contracts: contracts.length,
        total_commission: totalCommission,
        paid_commission: paidCommission,
        pending_commission: pendingCommission,
        contracts: formattedContracts
      };

    } catch (error: any) {
      log.error("Error getting broker commission summary", { 
        error: error.message, 
        brokerCode: params.broker_code 
      });
      throw APIError.internal("Impossible de récupérer le résumé des commissions");
    }
  }
);
