import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import Stripe from "stripe";
import { subscriptionDB } from "./db";
import { safeLog, hashValue } from "../utils/safeLog";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");
const stripe = new Stripe(STRIPE_SECRET_KEY(), { apiVersion: "2025-02-24.acacia" });

export interface Subscription {
  id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  customer_email: string;
  plan_id: string;
  price_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
  trial_start?: string;
  trial_end?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionRequest {
  customer_email: string;
  customer_name?: string;
  price_id: string;
  success_url: string;
  cancel_url: string;
  trial_period_days?: number;
  metadata?: Record<string, any>;
}

export interface CreateSubscriptionResponse {
  sessionId: string;
  sessionUrl: string;
}

export const createSubscription = api(
  { expose: true, method: "POST", path: "/subscription/create" },
  async (req: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> => {
    try {
      const price = await subscriptionDB.queryRow<any>`
        SELECT sp.*, spl.stripe_product_id 
        FROM subscription_prices sp
        JOIN subscription_plans spl ON sp.plan_id = spl.id
        WHERE sp.id = ${req.price_id} AND sp.is_active = true
        LIMIT 1
      `;

      if (!price) throw APIError.notFound("Price not found");

      let customer: Stripe.Customer;
      const existingCustomers = await stripe.customers.list({
        email: req.customer_email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: req.customer_email,
          name: req.customer_name,
          metadata: req.metadata || {},
        });
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customer.id,
        payment_method_types: [
          'card',
          'sepa_debit',
          'link',
          'paypal',
          'bancontact',
          'ideal',
          'giropay',
          'sofort',
        ],
        mode: 'subscription',
        line_items: [
          {
            price: price.stripe_price_id,
            quantity: 1,
          },
        ],
        success_url: req.success_url,
        cancel_url: req.cancel_url,
        subscription_data: {
          metadata: req.metadata || {},
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        customer_update: {
          address: 'auto',
          name: 'auto',
        },
        automatic_tax: {
          enabled: true,
        },
        tax_id_collection: {
          enabled: true,
        },
      };

      if (req.trial_period_days && req.trial_period_days > 0) {
        sessionParams.subscription_data!.trial_period_days = req.trial_period_days;
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      safeLog.info("Subscription checkout session created", {
        sessionId: session.id,
        customerEmail: hashValue(req.customer_email),
        priceId: req.price_id,
      });

      return {
        sessionId: session.id,
        sessionUrl: session.url || '',
      };
    } catch (error: any) {
      safeLog.error("Error creating subscription", { error: error.message });
      throw APIError.internal("Failed to create subscription");
    }
  }
);

export interface CancelSubscriptionRequest {
  subscription_id: string;
  cancel_at_period_end?: boolean;
}

export interface CancelSubscriptionResponse {
  subscription: Subscription;
}

export const cancelSubscription = api(
  { expose: true, method: "POST", path: "/subscription/:subscription_id/cancel" },
  async (req: CancelSubscriptionRequest): Promise<CancelSubscriptionResponse> => {
    try {
      const subscription = await subscriptionDB.queryRow<Subscription>`
        SELECT * FROM subscriptions WHERE id = ${req.subscription_id} LIMIT 1
      `;

      if (!subscription) throw APIError.notFound("Subscription not found");

      const stripeSubscription = await stripe.subscriptions.update(
        subscription.stripe_subscription_id,
        {
          cancel_at_period_end: req.cancel_at_period_end !== false,
        }
      );

      const updated = await subscriptionDB.queryRow<Subscription>`
        UPDATE subscriptions 
        SET cancel_at_period_end = ${stripeSubscription.cancel_at_period_end},
            canceled_at = ${stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000).toISOString() : null},
            updated_at = NOW()
        WHERE id = ${req.subscription_id}
        RETURNING *
      `;

      if (!updated) throw APIError.internal("Failed to update subscription");

      safeLog.info("Subscription cancelled", {
        subscriptionId: subscription.id,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      });

      return { subscription: updated };
    } catch (error: any) {
      safeLog.error("Error cancelling subscription", { error: error.message });
      throw APIError.internal("Failed to cancel subscription");
    }
  }
);

export interface ListSubscriptionsRequest {
  customer_email?: string;
  status?: string;
}

export interface ListSubscriptionsResponse {
  subscriptions: Subscription[];
}

export const listSubscriptions = api(
  { expose: true, method: "GET", path: "/subscription/list" },
  async (req: ListSubscriptionsRequest): Promise<ListSubscriptionsResponse> => {
    try {
      let query = 'SELECT * FROM subscriptions WHERE 1=1';
      const params: any[] = [];

      if (req.customer_email) {
        params.push(req.customer_email);
        query += ` AND customer_email = $${params.length}`;
      }

      if (req.status) {
        params.push(req.status);
        query += ` AND status = $${params.length}`;
      }

      query += ' ORDER BY created_at DESC';

      const subscriptions = await subscriptionDB.rawQueryAll<Subscription>(query, ...params);

      return { subscriptions };
    } catch (error: any) {
      safeLog.error("Error listing subscriptions", { error: error.message });
      throw APIError.internal("Failed to list subscriptions");
    }
  }
);

export interface GetSubscriptionRequest {
  id: string;
}

export interface GetSubscriptionResponse {
  subscription: Subscription;
}

export const getSubscription = api(
  { expose: true, method: "GET", path: "/subscription/:id" },
  async (req: GetSubscriptionRequest): Promise<GetSubscriptionResponse> => {
    try {
      const subscription = await subscriptionDB.queryRow<Subscription>`
        SELECT * FROM subscriptions WHERE id = ${req.id} LIMIT 1
      `;

      if (!subscription) throw APIError.notFound("Subscription not found");

      return { subscription };
    } catch (error: any) {
      safeLog.error("Error getting subscription", { error: error.message });
      throw APIError.internal("Failed to get subscription");
    }
  }
);
