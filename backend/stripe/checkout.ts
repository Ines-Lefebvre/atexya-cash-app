import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import Stripe from "stripe";
import { stripeDB } from "./stripe";
import { safeLog, hashValue } from "../utils/safeLog";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");
const stripe = new Stripe(STRIPE_SECRET_KEY(), { apiVersion: "2025-02-24.acacia" });

interface CreateCheckoutSessionRequest {
  amount: number;
  currency: string;
  customer_email?: string;
  metadata?: Record<string, string>;
}

interface CreateCheckoutSessionResponse {
  sessionId: string;
}

export const createCheckoutSession = api<CreateCheckoutSessionRequest, CreateCheckoutSessionResponse>(
  { expose: true, method: "POST", path: "/api/checkout/create-session" },
  async (params) => {
    const { amount, currency, customer_email, metadata } = params;

    if (!amount || amount <= 0) {
      throw APIError.invalidArgument("Le montant doit être supérieur à 0");
    }

    if (!currency || !/^[A-Z]{3}$/i.test(currency)) {
      throw APIError.invalidArgument("La devise doit être au format ISO (ex: EUR, USD)");
    }

    const normalizedCurrency = currency.toLowerCase();

    try {
      safeLog.info("Creating checkout session", {
        amount,
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
            unit_amount: Math.round(amount * 100),
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
        amount: amount.toString(),
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
          ${"annual"}, 
          ${"standard"},
          ${Math.round(amount * 100)}, 
          ${normalizedCurrency}, 
          ${session.status || "open"},
          ${new Date().toISOString()}, 
          ${JSON.stringify(sessionMetadata)}, 
          ${session.id}
        )
      `;

      safeLog.info("Checkout session created", {
        sessionId: session.id,
        amount,
        currency: normalizedCurrency
      });

      return { sessionId: session.id };

    } catch (error: any) {
      safeLog.error("Error creating checkout session", { 
        error: error.message,
        amount,
        currency: normalizedCurrency
      });

      if (error instanceof APIError) {
        throw error;
      }

      throw APIError.internal("Impossible de créer la session de paiement");
    }
  }
);
