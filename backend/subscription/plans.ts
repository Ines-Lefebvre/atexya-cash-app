import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import Stripe from "stripe";
import { subscriptionDB } from "./db";
import { safeLog } from "../utils/safeLog";
import { getAuthData } from "~encore/auth";
import type { AdminAuthData } from "../admin/auth";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");
const stripe = new Stripe(STRIPE_SECRET_KEY(), { apiVersion: "2025-02-24.acacia" });

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  stripe_product_id: string;
  is_active: boolean;
  features: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPrice {
  id: string;
  plan_id: string;
  stripe_price_id: string;
  currency: string;
  amount: number;
  billing_interval: string;
  billing_interval_count: number;
  usage_type: string;
  is_active: boolean;
  trial_period_days?: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreatePlanRequest {
  name: string;
  description?: string;
  features?: string[];
  metadata?: Record<string, any>;
}

export interface CreatePlanResponse {
  plan: SubscriptionPlan;
}

export const createPlan = api(
  { expose: true, method: "POST", path: "/subscription/plans", auth: true },
  async (req: CreatePlanRequest): Promise<CreatePlanResponse> => {
    const authData = getAuthData()! as AdminAuthData;
    if (!authData || authData.userID !== 'admin') {
      throw APIError.permissionDenied("Admin access required");
    }

    try {
      const product = await stripe.products.create({
        name: req.name,
        description: req.description,
        metadata: req.metadata || {},
      });

      const plan = await subscriptionDB.queryRow<SubscriptionPlan>`
        INSERT INTO subscription_plans (
          id, name, description, stripe_product_id, is_active, features, metadata
        ) VALUES (
          ${product.id},
          ${req.name},
          ${req.description || null},
          ${product.id},
          ${true},
          ${JSON.stringify(req.features || [])},
          ${JSON.stringify(req.metadata || {})}
        )
        RETURNING *
      `;

      if (!plan) throw APIError.internal("Failed to create plan");

      safeLog.info("Subscription plan created", { planId: plan.id, name: plan.name });

      return { plan };
    } catch (error: any) {
      safeLog.error("Error creating subscription plan", { error: error.message });
      throw APIError.internal("Failed to create subscription plan");
    }
  }
);

export interface CreatePriceRequest {
  plan_id: string;
  currency: string;
  amount: number;
  billing_interval: "month" | "year" | "week" | "day";
  billing_interval_count?: number;
  usage_type?: "licensed" | "metered";
  trial_period_days?: number;
  metadata?: Record<string, any>;
}

export interface CreatePriceResponse {
  price: SubscriptionPrice;
}

export const createPrice = api(
  { expose: true, method: "POST", path: "/subscription/prices", auth: true },
  async (req: CreatePriceRequest): Promise<CreatePriceResponse> => {
    const authData = getAuthData()! as AdminAuthData;
    if (!authData || authData.userID !== 'admin') {
      throw APIError.permissionDenied("Admin access required");
    }

    try {
      const plan = await subscriptionDB.queryRow<SubscriptionPlan>`
        SELECT * FROM subscription_plans WHERE id = ${req.plan_id} LIMIT 1
      `;

      if (!plan) throw APIError.notFound("Plan not found");

      const priceParams: Stripe.PriceCreateParams = {
        product: plan.stripe_product_id,
        currency: req.currency.toLowerCase(),
        unit_amount: req.amount,
        recurring: {
          interval: req.billing_interval,
          interval_count: req.billing_interval_count || 1,
          trial_period_days: req.trial_period_days,
        },
        metadata: req.metadata || {},
      };

      if (req.usage_type === 'metered') {
        priceParams.recurring!.usage_type = 'metered';
      }

      const stripePrice = await stripe.prices.create(priceParams);

      const price = await subscriptionDB.queryRow<SubscriptionPrice>`
        INSERT INTO subscription_prices (
          id, plan_id, stripe_price_id, currency, amount, 
          billing_interval, billing_interval_count, usage_type, 
          is_active, trial_period_days, metadata
        ) VALUES (
          ${stripePrice.id},
          ${req.plan_id},
          ${stripePrice.id},
          ${req.currency.toLowerCase()},
          ${req.amount},
          ${req.billing_interval},
          ${req.billing_interval_count || 1},
          ${req.usage_type || 'licensed'},
          ${true},
          ${req.trial_period_days || null},
          ${JSON.stringify(req.metadata || {})}
        )
        RETURNING *
      `;

      if (!price) throw APIError.internal("Failed to create price");

      safeLog.info("Subscription price created", { priceId: price.id, planId: plan.id });

      return { price };
    } catch (error: any) {
      safeLog.error("Error creating subscription price", { error: error.message });
      throw APIError.internal("Failed to create subscription price");
    }
  }
);

export interface ListPlansResponse {
  plans: (SubscriptionPlan & { prices: SubscriptionPrice[] })[];
}

export const listPlans = api(
  { expose: true, method: "GET", path: "/subscription/plans" },
  async (): Promise<ListPlansResponse> => {
    try {
      const plans = await subscriptionDB.queryAll<SubscriptionPlan>`
        SELECT * FROM subscription_plans WHERE is_active = true ORDER BY created_at DESC
      `;

      const plansWithPrices = await Promise.all(
        plans.map(async (plan) => {
          const prices = await subscriptionDB.queryAll<SubscriptionPrice>`
            SELECT * FROM subscription_prices 
            WHERE plan_id = ${plan.id} AND is_active = true 
            ORDER BY amount ASC
          `;
          return { ...plan, prices };
        })
      );

      return { plans: plansWithPrices };
    } catch (error: any) {
      safeLog.error("Error listing subscription plans", { error: error.message });
      throw APIError.internal("Failed to list subscription plans");
    }
  }
);

export interface GetPlanRequest {
  id: string;
}

export interface GetPlanResponse {
  plan: SubscriptionPlan & { prices: SubscriptionPrice[] };
}

export const getPlan = api(
  { expose: true, method: "GET", path: "/subscription/plans/:id" },
  async (req: GetPlanRequest): Promise<GetPlanResponse> => {
    try {
      const plan = await subscriptionDB.queryRow<SubscriptionPlan>`
        SELECT * FROM subscription_plans WHERE id = ${req.id} LIMIT 1
      `;

      if (!plan) throw APIError.notFound("Plan not found");

      const prices = await subscriptionDB.queryAll<SubscriptionPrice>`
        SELECT * FROM subscription_prices 
        WHERE plan_id = ${plan.id} AND is_active = true 
        ORDER BY amount ASC
      `;

      return { plan: { ...plan, prices } };
    } catch (error: any) {
      safeLog.error("Error getting subscription plan", { error: error.message });
      throw APIError.internal("Failed to get subscription plan");
    }
  }
);
