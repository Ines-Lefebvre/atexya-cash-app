import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import Stripe from "stripe";
import { subscriptionDB } from "./db";
import { safeLog } from "../utils/safeLog";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");
const stripe = new Stripe(STRIPE_SECRET_KEY(), { apiVersion: "2025-02-24.acacia" });

export interface RecordUsageRequest {
  subscription_id: string;
  quantity: number;
  timestamp?: string;
  action?: 'increment' | 'set';
  idempotency_key?: string;
}

export interface RecordUsageResponse {
  usage_record_id: string;
  quantity: number;
  timestamp: string;
}

export const recordUsage = api(
  { expose: true, method: "POST", path: "/subscription/:subscription_id/usage" },
  async (req: RecordUsageRequest): Promise<RecordUsageResponse> => {
    try {
      const subscription = await subscriptionDB.queryRow<any>`
        SELECT * FROM subscriptions WHERE id = ${req.subscription_id} LIMIT 1
      `;

      if (!subscription) throw APIError.notFound("Subscription not found");

      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );

      const meteredItems = stripeSubscription.items.data.filter(
        (item) => item.price.recurring?.usage_type === 'metered'
      );

      if (meteredItems.length === 0) {
        throw APIError.invalidArgument("Subscription has no metered items");
      }

      const subscriptionItemId = meteredItems[0].id;

      const usageRecord = await stripe.subscriptionItems.createUsageRecord(
        subscriptionItemId,
        {
          quantity: req.quantity,
          timestamp: req.timestamp ? Math.floor(new Date(req.timestamp).getTime() / 1000) : 'now',
          action: req.action || 'increment',
        },
        {
          idempotencyKey: req.idempotency_key || `usage_${req.subscription_id}_${Date.now()}`,
        }
      );

      await subscriptionDB.exec`
        INSERT INTO subscription_usage (
          subscription_id, stripe_subscription_item_id, quantity, timestamp, metadata
        ) VALUES (
          ${req.subscription_id},
          ${subscriptionItemId},
          ${req.quantity},
          ${new Date(usageRecord.timestamp * 1000).toISOString()},
          ${JSON.stringify({ action: req.action || 'increment' })}
        )
      `;

      safeLog.info("Usage recorded", {
        subscriptionId: req.subscription_id,
        quantity: req.quantity,
        action: req.action || 'increment',
      });

      return {
        usage_record_id: usageRecord.id,
        quantity: usageRecord.quantity,
        timestamp: new Date(usageRecord.timestamp * 1000).toISOString(),
      };
    } catch (error: any) {
      safeLog.error("Error recording usage", { error: error.message });
      throw APIError.internal("Failed to record usage");
    }
  }
);

export interface GetUsageRequest {
  subscription_id: string;
  start_date?: string;
  end_date?: string;
}

export interface GetUsageResponse {
  total_usage: number;
  usage_records: Array<{
    quantity: number;
    timestamp: string;
    metadata: Record<string, any>;
  }>;
}

export const getUsage = api(
  { expose: true, method: "GET", path: "/subscription/:subscription_id/usage" },
  async (req: GetUsageRequest): Promise<GetUsageResponse> => {
    try {
      let query = 'SELECT quantity, timestamp, metadata FROM subscription_usage WHERE subscription_id = $1';
      const params: any[] = [req.subscription_id];

      if (req.start_date) {
        params.push(req.start_date);
        query += ` AND timestamp >= $${params.length}`;
      }

      if (req.end_date) {
        params.push(req.end_date);
        query += ` AND timestamp <= $${params.length}`;
      }

      query += ' ORDER BY timestamp DESC';

      const records = await subscriptionDB.rawQueryAll<any>(query, ...params);

      const totalUsage = records.reduce((sum, record) => sum + Number(record.quantity), 0);

      return {
        total_usage: totalUsage,
        usage_records: records.map((r) => ({
          quantity: Number(r.quantity),
          timestamp: r.timestamp,
          metadata: r.metadata,
        })),
      };
    } catch (error: any) {
      safeLog.error("Error getting usage", { error: error.message });
      throw APIError.internal("Failed to get usage");
    }
  }
);
