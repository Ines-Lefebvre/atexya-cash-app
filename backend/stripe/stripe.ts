import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import log from "encore.dev/log";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");
const stripe = new Stripe(STRIPE_SECRET_KEY(), { apiVersion: "2024-06-20" });

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
      const { quoteData, paymentOption, cgvVersion, contractId } = params;
      const { type: paymentType, productType } = paymentOption;

      // Calcul du prix
      const basePrice = productType === 'premium' ? quoteData.pricePremium : quoteData.priceStandard;
      const finalPrice = paymentType === 'monthly' ? Math.round((basePrice * 1.20) / 12) : basePrice;

      log.info("Creating Stripe payment session", {
        companyName: quoteData.companyName,
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

      // Métadonnées complètes pour la session
      const metadata = {
        company_name: quoteData.companyName,
        siren: quoteData.sirenNumber,
        effectif: quoteData.effectif.toString(),
        secteur_ctn: quoteData.secteurCTN,
        garantie_amount: quoteData.garantieAmount.toString(),
        product_type: productType,
        payment_type: paymentType,
        has_antecedents: quoteData.hasAntecedents.toString(),
        cgv_version: cgvVersion,
        contract_id: contractId || '',
        broker_code: quoteData.brokerCode || ''
      };

      // Créer la session Checkout
      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customer.id,
        payment_method_types: ['card', 'sepa_debit'],
        mode: paymentType === 'monthly' ? 'subscription' : 'payment',
        line_items: [{
          price: price.id,
          quantity: 1
        }],
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:4000'}/page6`,
        invoice_creation: { enabled: true },
        metadata,
        customer_update: {
          address: 'auto',
          name: 'auto'
        },
        automatic_tax: { enabled: false },
        allow_promotion_codes: false,
        billing_address_collection: 'required'
      };

      const session = await stripe.checkout.sessions.create(sessionParams);

      // Sauvegarder la session en base
      await stripeDB.exec`
        INSERT INTO stripe_sessions (
          session_id, customer_id, contract_id, payment_type, product_type,
          amount_total, currency, status, created_at, metadata
        ) VALUES (
          ${session.id}, ${customer.id}, ${contractId || ''}, ${paymentType}, ${productType},
          ${session.amount_total || 0}, ${session.currency || 'eur'}, ${session.status || 'open'},
          ${new Date().toISOString()}, ${JSON.stringify(metadata)}
        )
      `;

      log.info("Stripe session created successfully", {
        sessionId: session.id,
        customerId: customer.id,
        amount: session.amount_total
      });

      return {
        sessionId: session.id,
        sessionUrl: session.url || '',
        customerId: customer.id
      };

    } catch (error: any) {
      log.error("Error creating Stripe session", { error: error.message });
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
  customerEmail?: string;
  amountTotal?: number;
  currency?: string;
  paymentStatus?: string;
  metadata?: Record<string, any>;
}

// Récupère les détails d'une session Stripe
export const getSession = api<GetSessionRequest, GetSessionResponse>(
  { expose: true, method: "GET", path: "/stripe/session/:sessionId" },
  async (params) => {
    try {
      const session = await stripe.checkout.sessions.retrieve(params.sessionId, {
        expand: ['customer', 'subscription', 'payment_intent']
      });

      return {
        sessionId: session.id,
        status: session.status || 'unknown',
        customerEmail: session.customer_details?.email,
        amountTotal: session.amount_total,
        currency: session.currency,
        paymentStatus: session.payment_status,
        metadata: session.metadata || {}
      };

    } catch (error: any) {
      log.error("Error retrieving Stripe session", { error: error.message, sessionId: params.sessionId });
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

// Crée un remboursement
export const createRefund = api<RefundRequest, RefundResponse>(
  { expose: true, method: "POST", path: "/stripe/refund" },
  async (params) => {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: params.paymentIntentId,
        reason: (params.reason as Stripe.RefundCreateParams.Reason) || 'requested_by_customer'
      };

      if (params.amount) {
        refundParams.amount = Math.round(params.amount * 100);
      }

      const refund = await stripe.refunds.create(refundParams);

      log.info("Refund created", {
        refundId: refund.id,
        amount: refund.amount,
        paymentIntentId: params.paymentIntentId
      });

      return {
        refundId: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      };

    } catch (error: any) {
      log.error("Error creating refund", { error: error.message, paymentIntentId: params.paymentIntentId });
      throw APIError.internal("Impossible de créer le remboursement");
    }
  }
);
