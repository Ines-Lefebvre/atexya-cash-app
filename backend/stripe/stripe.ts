import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import Stripe from "stripe";
import { getAuthData } from "~encore/auth";
import type { AdminAuthData } from "../admin/auth";
import { safeLog, hashValue } from "../utils/safeLog";
import { normalizeStripeMetadata } from "../utils/stripeHelpers";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");
const stripe = new Stripe(STRIPE_SECRET_KEY(), { apiVersion: "2025-02-24.acacia" });

// Base de données pour les sessions Stripe
export const stripeDB = new SQLDatabase("stripe", {
  migrations: "./migrations",
});

interface QuoteData {
  companyName: string;
  sirenNumber: string;
  effectif: number;
  secteurCTN: string;
  garantieAmount: number;
  priceStandard: number;
  pricePremium: number;
  hasAntecedents: boolean;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  brokerCode?: string;
}

interface PaymentOption {
  type: 'annual' | 'monthly';
  productType: 'standard' | 'premium';
}

interface CreatePaymentSessionRequest {
  quoteData: QuoteData;
  paymentOption: PaymentOption;
  cgvVersion: string;
  contractId?: string;
  idempotencyKey: string;
}

interface CreatePaymentSessionResponse {
  sessionId: string;
  sessionUrl: string;
  customerId: string;
}

// Crée une session de paiement Stripe
export const createPaymentSession = api<CreatePaymentSessionRequest, CreatePaymentSessionResponse>(
  { expose: true, method: "POST", path: "/stripe/create-payment-session" },
  async (params) => {
    try {
      const { quoteData, paymentOption, cgvVersion, contractId, idempotencyKey } = params;
      const { type: paymentType, productType } = paymentOption;

      // Vérifier si une session existe déjà avec cette clé d'idempotence
      const existingSession = await stripeDB.rawQueryRow<any>(
        `SELECT session_id, customer_id FROM stripe_sessions WHERE idempotency_key = $1 LIMIT 1`,
        idempotencyKey
      );

      if (existingSession) {
        // Récupérer l'URL de la session depuis Stripe
        const session = await stripe.checkout.sessions.retrieve(existingSession.session_id);
        
        safeLog.info("Stripe session already exists for idempotency_key", {
          sessionId: existingSession.session_id,
          idempotencyKey
        });

        return {
          sessionId: existingSession.session_id,
          sessionUrl: session.url || '',
          customerId: existingSession.customer_id
        };
      }

      // Calcul du prix
      const basePrice = productType === 'premium' ? quoteData.pricePremium : quoteData.priceStandard;
      const finalPrice = paymentType === 'monthly' ? Math.round((basePrice * 1.20) / 12) : basePrice;

      safeLog.info("Creating Stripe payment session", {
        sirenHash: hashValue(quoteData.sirenNumber),
        paymentType,
        productType,
        basePrice,
        finalPrice
      });

      // Créer ou récupérer le client Stripe
      let customer: Stripe.Customer;
      const existingCustomers = await stripe.customers.list({
        email: quoteData.customerEmail,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: quoteData.customerEmail,
          name: quoteData.customerName,
          phone: quoteData.customerPhone,
          metadata: {
            siren: quoteData.sirenNumber,
            company_name: quoteData.companyName,
            broker_code: quoteData.brokerCode || ''
          }
        });
      }

      // Créer ou récupérer le produit Stripe
      const productName = `Garantie Financière AT/MP - ${productType === 'premium' ? 'Premium' : 'Standard'}`;
      let product: Stripe.Product;

      const existingProducts = await stripe.products.list({
        active: true,
        limit: 10
      });

      const foundProduct = existingProducts.data.find(p => p.name === productName);
      
      if (foundProduct) {
        product = foundProduct;
      } else {
        product = await stripe.products.create({
          name: productName,
          description: `Assurance responsabilité civile professionnelle - Garantie ${quoteData.garantieAmount.toLocaleString()}€`,
          metadata: {
            product_type: productType,
            garantie_amount: quoteData.garantieAmount.toString()
          }
        });
      }

      // Créer le prix
      const priceParams: Stripe.PriceCreateParams = {
        unit_amount: Math.round(finalPrice * 100), // en centimes
        currency: 'eur',
        product: product.id,
        metadata: {
          payment_type: paymentType,
          product_type: productType,
          garantie_amount: quoteData.garantieAmount.toString(),
          siren: quoteData.sirenNumber
        }
      };

      if (paymentType === 'monthly') {
        priceParams.recurring = {
          interval: 'month',
          interval_count: 1
        };
      }

      const price = await stripe.prices.create(priceParams);

      const metadata = normalizeStripeMetadata({
        company_name: quoteData.companyName,
        siren: quoteData.sirenNumber,
        effectif: quoteData.effectif,
        secteur_ctn: quoteData.secteurCTN,
        garantie_amount: quoteData.garantieAmount,
        product_type: productType,
        payment_type: paymentType,
        has_antecedents: quoteData.hasAntecedents,
        cgv_version: cgvVersion,
        contract_id: contractId || '',
        broker_code: quoteData.brokerCode || ''
      });

      const frontendUrl =
        process.env.FRONTEND_URL ||
        process.env.FRONT_URL ||
        "https://atexya-cash-app-d2vtgnc82vjvosnddaqg.lp.dev";

      const sessionMode: Stripe.Checkout.SessionCreateParams.Mode =
        paymentType === 'monthly' ? 'subscription' : 'payment';
      const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
        sessionMode === 'subscription' ? ['card', 'sepa_debit'] : ['card'];

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customer.id,
        payment_method_types: paymentMethodTypes,
        mode: sessionMode,
        line_items: [{
          price: price.id,
          quantity: 1
        }],
        success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/page6`,
        metadata,
        customer_update: {
          address: 'auto',
          name: 'auto'
        },
        automatic_tax: { enabled: false },
        allow_promotion_codes: false,
        billing_address_collection: 'required'
      };

      if (sessionParams.mode === 'payment') {
        sessionParams.invoice_creation = { enabled: true };
      }

      const session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey
      });

      // Sauvegarder la session en base
      await stripeDB.exec`
        INSERT INTO stripe_sessions (
          session_id, customer_id, contract_id, payment_type, product_type,
          amount_total, currency, status, created_at, metadata, idempotency_key
        ) VALUES (
          ${session.id}, ${customer.id}, ${contractId || ''}, ${paymentType}, ${productType},
          ${session.amount_total || 0}, ${session.currency || 'eur'}, ${session.status || 'open'},
          ${new Date().toISOString()}, ${JSON.stringify(metadata)}, ${idempotencyKey}
        )
      `;

      safeLog.info("Stripe session created successfully", {
        sessionId: session.id,
        customerIdHash: hashValue(customer.id),
        amount: session.amount_total
      });

      return {
        sessionId: session.id,
        sessionUrl: session.url || '',
        customerId: customer.id
      };

    } catch (error: any) {
      safeLog.error("Error creating Stripe session", {
        error: error.message,
        stripeError: error?.raw?.message,
        stripeErrorType: error?.raw?.type
      });
      throw APIError.internal("Impossible de créer la session de paiement");
    }
  }
);

interface GetSessionRequest {
  sessionId: string;
}

interface GetSessionResponse {
  sessionId: string;
  status: string;
  paymentStatus?: string;
  amountTotal?: number;
  currency?: string;
}

// Récupère les détails d'une session Stripe (statut uniquement, pas de métadonnées)
export const getSession = api<GetSessionRequest, GetSessionResponse>(
  { expose: true, method: "GET", path: "/stripe/session/:sessionId" },
  async (params) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(params.sessionId);

      // Ne retourner QUE le statut du paiement, pas de métadonnées ni d'infos client
      safeLog.info("Public session status check", { 
        sessionId: session.id,
        status: session.status
      });

      return {
        sessionId: session.id,
        status: session.status || 'unknown',
        paymentStatus: session.payment_status ?? undefined,
        amountTotal: session.amount_total ?? undefined,
        currency: session.currency ?? undefined
      };

    } catch (error: any) {
      safeLog.error("Error retrieving Stripe session", { 
        error: error.message, 
        sessionId: params.sessionId
      });
      throw APIError.notFound("Session non trouvée");
    }
  }
);

interface RefundRequest {
  paymentIntentId: string;
  amount?: number;
  reason?: string;
}

interface RefundResponse {
  refundId: string;
  amount: number;
  status: string;
}

// Crée un remboursement (admin uniquement)
export const createRefund = api<RefundRequest, RefundResponse>(
  { expose: true, method: "POST", path: "/stripe/refund", auth: true },
  async (params) => {
    const authData = getAuthData()! as AdminAuthData;
    
    if (!authData || authData.userID !== 'admin') {
      safeLog.warn("Unauthorized refund attempt", { userID: authData?.userID });
      throw APIError.permissionDenied("Accès refusé : seuls les administrateurs peuvent créer des remboursements");
    }

    try {
      const idempotencyKey = `refund_${params.paymentIntentId}_${Date.now()}`;
      
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: params.paymentIntentId,
        reason: (params.reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer'
      };

      if (params.amount) {
        refundParams.amount = Math.round(params.amount * 100);
      }

      const refund = await stripe.refunds.create(refundParams, {
        idempotencyKey
      });

      safeLog.info("Refund created by admin", {
        refundId: refund.id,
        amount: refund.amount,
        paymentIntentIdHash: hashValue(params.paymentIntentId),
        adminId: authData.userID,
        idempotencyKey
      });

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status ?? 'unknown'
      };

    } catch (error: any) {
      safeLog.error("Error creating refund", { 
        error: error.message, 
        paymentIntentIdHash: hashValue(params.paymentIntentId),
        adminId: authData.userID
      });
      throw APIError.internal("Impossible de créer le remboursement");
    }
  }
);
