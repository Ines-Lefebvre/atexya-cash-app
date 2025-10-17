import { api, APIError, Header } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import Stripe from "stripe";
import { subscriptionDB } from "./db";
import { safeLog } from "../utils/safeLog";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = secret("STRIPE_WEBHOOK_SECRET");
const stripe = new Stripe(STRIPE_SECRET_KEY(), { apiVersion: "2025-02-24.acacia" });

interface WebhookRequest {
  signature: Header<"stripe-signature">;
  body: string;
}

interface WebhookResponse {
  received: boolean;
}

export const handleSubscriptionWebhook = api(
  { expose: true, method: "POST", path: "/subscription/webhooks" },
  async (params: WebhookRequest): Promise<WebhookResponse> => {
    try {
      const signature = params.signature;
      const body = params.body;

      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET());
      } catch (err: any) {
        log.error("Webhook signature verification failed", { error: err.message });
        throw APIError.invalidArgument("Invalid webhook signature");
      }

      log.info("Subscription webhook event received", { type: event.type, id: event.id });

      switch (event.type) {
        case 'customer.subscription.created':
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.trial_will_end':
          await handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.created':
          await handleInvoiceCreated(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.finalized':
          await handleInvoiceFinalized(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.paid':
          await handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'customer.tax_id.created':
        case 'customer.tax_id.updated':
          await handleTaxIdUpdate(event.data.object as Stripe.TaxId);
          break;

        default:
          log.info("Unhandled webhook event type", { type: event.type });
      }

      return { received: true };
    } catch (error: any) {
      log.error("Error processing webhook", { error: error.message });
      throw APIError.internal("Failed to process webhook");
    }
  }
);

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const customer = await stripe.customers.retrieve(subscription.customer as string);
    const customerEmail = (customer as Stripe.Customer).email;

    if (!customerEmail) {
      log.warn("No customer email for subscription", { subscriptionId: subscription.id });
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    if (!priceId) {
      log.warn("No price ID in subscription", { subscriptionId: subscription.id });
      return;
    }

    const price = await subscriptionDB.queryRow<any>`
      SELECT * FROM subscription_prices WHERE stripe_price_id = ${priceId} LIMIT 1
    `;

    if (!price) {
      log.warn("Price not found in database", { priceId });
      return;
    }

    await subscriptionDB.exec`
      INSERT INTO subscriptions (
        id, stripe_subscription_id, stripe_customer_id, customer_email,
        plan_id, price_id, status, current_period_start, current_period_end,
        cancel_at_period_end, trial_start, trial_end, metadata
      ) VALUES (
        ${subscription.id},
        ${subscription.id},
        ${subscription.customer as string},
        ${customerEmail},
        ${price.plan_id},
        ${price.id},
        ${subscription.status},
        ${new Date(subscription.current_period_start * 1000).toISOString()},
        ${new Date(subscription.current_period_end * 1000).toISOString()},
        ${subscription.cancel_at_period_end},
        ${subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null},
        ${subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null},
        ${JSON.stringify(subscription.metadata || {})}
      )
      ON CONFLICT (stripe_subscription_id) DO UPDATE SET
        status = EXCLUDED.status,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        updated_at = NOW()
    `;

    safeLog.info("Subscription created", { subscriptionId: subscription.id });
  } catch (error: any) {
    log.error("Error handling subscription created", { error: error.message });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    await subscriptionDB.exec`
      UPDATE subscriptions SET
        status = ${subscription.status},
        current_period_start = ${new Date(subscription.current_period_start * 1000).toISOString()},
        current_period_end = ${new Date(subscription.current_period_end * 1000).toISOString()},
        cancel_at_period_end = ${subscription.cancel_at_period_end},
        canceled_at = ${subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null},
        updated_at = NOW()
      WHERE stripe_subscription_id = ${subscription.id}
    `;

    safeLog.info("Subscription updated", { subscriptionId: subscription.id, status: subscription.status });
  } catch (error: any) {
    log.error("Error handling subscription updated", { error: error.message });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    await subscriptionDB.exec`
      UPDATE subscriptions SET
        status = 'canceled',
        canceled_at = ${new Date().toISOString()},
        updated_at = NOW()
      WHERE stripe_subscription_id = ${subscription.id}
    `;

    safeLog.info("Subscription deleted", { subscriptionId: subscription.id });
  } catch (error: any) {
    log.error("Error handling subscription deleted", { error: error.message });
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  try {
    safeLog.info("Trial will end soon", { 
      subscriptionId: subscription.id,
      trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null
    });
  } catch (error: any) {
    log.error("Error handling trial will end", { error: error.message });
  }
}

async function handleInvoiceCreated(invoice: Stripe.Invoice) {
  try {
    const customer = await stripe.customers.retrieve(invoice.customer as string);
    const customerEmail = (customer as Stripe.Customer).email;

    if (!customerEmail) {
      log.warn("No customer email for invoice", { invoiceId: invoice.id });
      return;
    }

    const subscription = await subscriptionDB.queryRow<any>`
      SELECT id FROM subscriptions WHERE stripe_subscription_id = ${invoice.subscription as string} LIMIT 1
    `;

    await subscriptionDB.exec`
      INSERT INTO invoices (
        id, stripe_invoice_id, stripe_customer_id, subscription_id,
        customer_email, amount_due, amount_paid, currency, status,
        hosted_invoice_url, tax_amount, period_start, period_end, metadata
      ) VALUES (
        ${invoice.id},
        ${invoice.id},
        ${invoice.customer as string},
        ${subscription?.id || null},
        ${customerEmail},
        ${invoice.amount_due},
        ${invoice.amount_paid || 0},
        ${invoice.currency},
        ${invoice.status || 'draft'},
        ${invoice.hosted_invoice_url || null},
        ${invoice.tax || 0},
        ${invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null},
        ${invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null},
        ${JSON.stringify(invoice.metadata || {})}
      )
      ON CONFLICT (stripe_invoice_id) DO UPDATE SET
        amount_due = EXCLUDED.amount_due,
        amount_paid = EXCLUDED.amount_paid,
        status = EXCLUDED.status,
        tax_amount = EXCLUDED.tax_amount
    `;

    safeLog.info("Invoice created", { invoiceId: invoice.id });
  } catch (error: any) {
    log.error("Error handling invoice created", { error: error.message });
  }
}

async function handleInvoiceFinalized(invoice: Stripe.Invoice) {
  try {
    await subscriptionDB.exec`
      UPDATE invoices SET
        status = ${invoice.status || 'open'},
        invoice_pdf = ${invoice.invoice_pdf || null},
        hosted_invoice_url = ${invoice.hosted_invoice_url || null}
      WHERE stripe_invoice_id = ${invoice.id}
    `;

    safeLog.info("Invoice finalized", { invoiceId: invoice.id });
  } catch (error: any) {
    log.error("Error handling invoice finalized", { error: error.message });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    await subscriptionDB.exec`
      UPDATE invoices SET
        status = 'paid',
        amount_paid = ${invoice.amount_paid},
        paid_at = ${new Date().toISOString()},
        invoice_pdf = ${invoice.invoice_pdf || null}
      WHERE stripe_invoice_id = ${invoice.id}
    `;

    safeLog.info("Invoice paid", { invoiceId: invoice.id, amount: invoice.amount_paid });
  } catch (error: any) {
    log.error("Error handling invoice paid", { error: error.message });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    await subscriptionDB.exec`
      UPDATE invoices SET
        status = 'open'
      WHERE stripe_invoice_id = ${invoice.id}
    `;

    safeLog.warn("Invoice payment failed", { invoiceId: invoice.id, amount: invoice.amount_due });
  } catch (error: any) {
    log.error("Error handling invoice payment failed", { error: error.message });
  }
}

async function handleTaxIdUpdate(taxId: Stripe.TaxId) {
  try {
    safeLog.info("Customer tax ID updated", {
      customerId: taxId.customer as string,
      type: taxId.type,
      value: taxId.value,
    });
  } catch (error: any) {
    log.error("Error handling tax ID update", { error: error.message });
  }
}
