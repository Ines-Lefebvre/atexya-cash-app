import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");

interface ListTransactionsRequest {
  limit?: number;
  starting_after?: string;
  created_gte?: number;
  created_lte?: number;
}

interface ListTransactionsResponse {
  transactions: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    created: number;
    description: string;
    customer_email: string;
    metadata: Record<string, string>;
  }>;
  has_more: boolean;
  next_cursor?: string;
}

// Liste les transactions
export const listTransactions = api<ListTransactionsRequest, ListTransactionsResponse>(
  { auth: true, expose: true, method: "POST", path: "/admin/stripe/transactions" },
  async (params) => {
    try {
      const stripeKey = STRIPE_SECRET_KEY();
      
      if (!stripeKey || stripeKey.trim() === "") {
        throw APIError.internal("Configuration de paiement manquante.");
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-06-20",
        typescript: true,
      });

      const queryParams: any = {
        limit: params.limit || 50,
      };

      if (params.starting_after) {
        queryParams.starting_after = params.starting_after;
      }

      if (params.created_gte || params.created_lte) {
        queryParams.created = {};
        if (params.created_gte) queryParams.created.gte = params.created_gte;
        if (params.created_lte) queryParams.created.lte = params.created_lte;
      }

      const paymentIntents = await stripe.paymentIntents.list(queryParams);

      const transactions = paymentIntents.data.map(pi => ({
        id: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        status: pi.status,
        created: pi.created,
        description: pi.description || '',
        customer_email: '', // À récupérer depuis le customer si nécessaire
        metadata: pi.metadata
      }));

      return {
        transactions,
        has_more: paymentIntents.has_more,
        next_cursor: paymentIntents.data.length > 0 ? 
          paymentIntents.data[paymentIntents.data.length - 1].id : undefined
      };

    } catch (error: any) {
      log.error("Error listing transactions", { error: error.message });
      throw APIError.internal("Impossible de récupérer les transactions.");
    }
  }
);


interface RefundRequest {
  payment_intent_id: string;
  amount?: number; // optional, if not provided, full refund
  reason?: string;
}

interface RefundResponse {
  refund_id: string;
  amount: number;
  status: string;
}

// Effectue un remboursement
export const createRefund = api<RefundRequest, RefundResponse>(
  { auth: true, expose: true, method: "POST", path: "/admin/stripe/refund" },
  async (params) => {
    try {
      const stripeKey = STRIPE_SECRET_KEY();
      
      if (!stripeKey || stripeKey.trim() === "") {
        throw APIError.internal("Configuration de paiement manquante.");
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-06-20",
        typescript: true,
      });

      const refundParams: any = {
        payment_intent: params.payment_intent_id,
      };

      if (params.amount) {
        refundParams.amount = params.amount;
      }

      if (params.reason) {
        refundParams.reason = params.reason;
      }

      const refund = await stripe.refunds.create(refundParams);

      log.info("Refund created successfully", { 
        refundId: refund.id,
        amount: refund.amount,
        paymentIntent: params.payment_intent_id
      });

      return {
        refund_id: refund.id,
        amount: refund.amount,
        status: refund.status
      };

    } catch (error: any) {
      log.error("Error creating refund", { 
        error: error.message,
        payment_intent_id: params.payment_intent_id
      });
      
      throw APIError.internal("Impossible d'effectuer le remboursement: " + error.message);
    }
  }
);
