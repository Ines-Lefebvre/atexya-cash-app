import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import Stripe from "stripe";
import { subscriptionDB } from "./db";
import { safeLog, hashValue } from "../utils/safeLog";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");
const stripe = new Stripe(STRIPE_SECRET_KEY(), { apiVersion: "2025-02-24.acacia" });

export interface CreatePortalSessionRequest {
  customer_email: string;
  return_url: string;
}

export interface CreatePortalSessionResponse {
  url: string;
}

export const createPortalSession = api(
  { expose: true, method: "POST", path: "/subscription/portal" },
  async (req: CreatePortalSessionRequest): Promise<CreatePortalSessionResponse> => {
    try {
      const customers = await stripe.customers.list({
        email: req.customer_email,
        limit: 1,
      });

      if (customers.data.length === 0) {
        throw APIError.notFound("Customer not found");
      }

      const customer = customers.data[0];

      const session = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: req.return_url,
      });

      safeLog.info("Customer portal session created", {
        customerEmail: hashValue(req.customer_email),
        customerId: hashValue(customer.id),
      });

      return { url: session.url };
    } catch (error: any) {
      safeLog.error("Error creating portal session", { error: error.message });
      throw APIError.internal("Failed to create customer portal session");
    }
  }
);

export interface UpdatePaymentMethodRequest {
  customer_email: string;
  return_url: string;
}

export interface UpdatePaymentMethodResponse {
  url: string;
}

export const updatePaymentMethod = api(
  { expose: true, method: "POST", path: "/subscription/update-payment" },
  async (req: UpdatePaymentMethodRequest): Promise<UpdatePaymentMethodResponse> => {
    try {
      const customers = await stripe.customers.list({
        email: req.customer_email,
        limit: 1,
      });

      if (customers.data.length === 0) {
        throw APIError.notFound("Customer not found");
      }

      const customer = customers.data[0];

      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: 'setup',
        payment_method_types: ['card', 'sepa_debit', 'link'],
        success_url: req.return_url,
        cancel_url: req.return_url,
      });

      safeLog.info("Payment method update session created", {
        customerEmail: hashValue(req.customer_email),
        customerId: hashValue(customer.id),
      });

      return { url: session.url || '' };
    } catch (error: any) {
      safeLog.error("Error creating payment method update session", { error: error.message });
      throw APIError.internal("Failed to create payment method update session");
    }
  }
);
