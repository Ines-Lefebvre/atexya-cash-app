import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import Stripe from "stripe";
import { stripeDB } from "../stripe/stripe";
import { safeLog, hashValue } from "../utils/safeLog";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");
const stripe = new Stripe(STRIPE_SECRET_KEY(), { apiVersion: "2025-02-24.acacia" });

interface CreateCheckoutSessionRequest {
  amount_cents: number;
  currency: string;
  customer_email?: string;
  metadata?: Record<string, string>;
}

interface CreateCheckoutSessionResponse {
  sessionId: string;
}

export const createCheckoutSession = api(
  { expose: true, method: "POST", path: "/api/checkout/create-session" },
  async (params: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> => {
    const { amount_cents, currency, customer_email, metadata } = params;

    if (!amount_cents || amount_cents <= 0 || typeof amount_cents !== 'number') {
      throw APIError.invalidArgument("Le montant doit être un nombre supérieur à 0 (en centimes)");
    }

    if (!currency || !/^[A-Z]{3}$/i.test(currency)) {
      throw APIError.invalidArgument("La devise doit être au format ISO (ex: EUR, USD)");
    }

    const normalizedCurrency = currency.toLowerCase();

    try {
      safeLog.info("Creating checkout session", {
        amount_cents,
        currency: normalizedCurrency,
        emailHash: customer_email ? hashValue(customer_email) : undefined
      });

      const frontendUrl = process.env.FRONTEND_URL || "https://atexya-cash-app-d2vtgnc82vjvosnddaqg.lp.dev";

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: normalizedCurrency,
            product_data: {
              name: "Commande",
            },
            unit_amount: amount_cents,
          },
          quantity: 1,
        }],
        success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendUrl}/checkout/cancel`,
        metadata: metadata || {},
      };

      if (customer_email) {
        sessionParams.customer_email = customer_email;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      const sessionMetadata = {
        ...metadata,
        amount_cents: amount_cents.toString(),
        currency: normalizedCurrency,
      };

      await stripeDB.exec`
        INSERT INTO stripe_sessions (
          session_id, customer_id, contract_id, payment_type, product_type,
          amount_total, currency, status, created_at, metadata, idempotency_key
        ) VALUES (
          ${session.id}, 
          ${session.customer || ""}, 
          ${metadata?.contract_id || ""}, 
          ${metadata?.payment_type || "annual"}, 
          ${metadata?.product_type || "standard"},
          ${amount_cents}, 
          ${normalizedCurrency}, 
          ${session.status || "open"},
          ${new Date().toISOString()}, 
          ${JSON.stringify(sessionMetadata)}, 
          ${session.id}
        )
      `;

      safeLog.info("Checkout session created", {
        sessionId: session.id,
        amount_cents,
        currency: normalizedCurrency
      });

      return { sessionId: session.id };

    } catch (error: any) {
      safeLog.error("Error creating checkout session", { 
        error: error.message,
        amount_cents,
        currency: normalizedCurrency
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw APIError.internal("Impossible de créer la session de paiement");
    }
  }
);
