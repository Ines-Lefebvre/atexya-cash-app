import { api, APIError, Header } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import Stripe from "stripe";
import { atexya } from "~encore/clients";

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

// Gère les webhooks Stripe
export const handleWebhook = api<WebhookRequest, WebhookResponse>(
  { expose: true, method: "POST", path: "/stripe/webhooks" },
  async (params) => {
    try {
      const signature = params.signature;
      const body = params.body;

      // Vérifier la signature du webhook
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(
          body,
          signature,
          STRIPE_WEBHOOK_SECRET()
        );
      } catch (err: any) {
        log.error("Webhook signature verification failed", { error: err.message });
        throw APIError.invalidArgument("Invalid webhook signature");
      }

      log.info("Webhook event received", { type: event.type, id: event.id });

      // Traiter les différents types d'événements
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case 'payment_intent.payment_failed':
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        default:
          log.info("Unhandled webhook event type", { type: event.type });
      }

      return { received: true };

    } catch (error: any) {
      log.error("Error processing webhook", { error: error.message });
      throw APIError.internal("Erreur lors du traitement du webhook");
    }
  }
);

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    log.info("Processing checkout session completed", { sessionId: session.id });

    const metadata = session.metadata || {};
    const contractId = metadata.contract_id;

    if (!contractId) {
      log.warn("No contract ID in session metadata", { sessionId: session.id });
      return;
    }

    // Mettre à jour le statut du contrat
    await atexya.updateContractStatus({
      contract_id: contractId,
      payment_status: 'paid',
      metadata: {
        stripe_session_id: session.id,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string || undefined,
        payment_type: metadata.payment_type,
        amount_paid: session.amount_total ? session.amount_total / 100 : 0
      }
    });

    // Envoyer notification de succès
    if (session.customer_details?.email) {
      await atexya.notifyPaymentSuccess({
        contract_id: contractId,
        customer_email: session.customer_details.email,
        customer_name: session.customer_details.name || metadata.company_name || '',
        amount: session.amount_total || 0,
        invoice_url: session.invoice ? `https://dashboard.stripe.com/invoices/${session.invoice}` : undefined
      });
    }

    // Notifier commission courtier si applicable
    if (metadata.broker_code) {
      const commissionAmount = Math.round((session.amount_total || 0) * 0.15); // 15% de commission
      await atexya.notifyBrokerCommission({
        broker_code: metadata.broker_code,
        contract_id: contractId,
        commission_amount: commissionAmount,
        company_name: metadata.company_name || '',
        siren: metadata.siren || ''
      });
    }

    log.info("Checkout session completed processed successfully", { 
      sessionId: session.id, 
      contractId 
    });

  } catch (error: any) {
    log.error("Error processing checkout session completed", { 
      error: error.message, 
      sessionId: session.id 
    });
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    log.info("Processing invoice payment succeeded", { invoiceId: invoice.id });

    const subscription = invoice.subscription;
    if (!subscription) return;

    const subscriptionObj = await stripe.subscriptions.retrieve(subscription as string);
    const metadata = subscriptionObj.metadata || {};
    const contractId = metadata.contract_id;

    if (!contractId) {
      log.warn("No contract ID in subscription metadata", { subscriptionId: subscription });
      return;
    }

    // Pour les paiements récurrents, on peut logger ou envoyer des notifications
    log.info("Monthly payment succeeded", {
      contractId,
      invoiceId: invoice.id,
      amount: invoice.amount_paid / 100
    });

    // Optionnel : envoyer une notification de renouvellement
    if (invoice.customer_email) {
      // Ici on pourrait ajouter une notification spécifique pour les renouvellements
    }

  } catch (error: any) {
    log.error("Error processing invoice payment succeeded", { 
      error: error.message, 
      invoiceId: invoice.id 
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    log.info("Processing invoice payment failed", { invoiceId: invoice.id });

    const subscription = invoice.subscription;
    if (!subscription) return;

    const subscriptionObj = await stripe.subscriptions.retrieve(subscription as string);
    const metadata = subscriptionObj.metadata || {};
    const contractId = metadata.contract_id;

    if (!contractId) {
      log.warn("No contract ID in subscription metadata", { subscriptionId: subscription });
      return;
    }

    // Notifier l'échec de paiement
    if (invoice.customer_email) {
      await atexya.notifyPaymentFailed({
        contract_id: contractId,
        customer_email: invoice.customer_email,
        customer_name: metadata.company_name || '',
        amount: invoice.amount_due,
        error_message: "Le paiement de votre abonnement mensuel a échoué"
      });
    }

    log.warn("Monthly payment failed", {
      contractId,
      invoiceId: invoice.id,
      amount: invoice.amount_due / 100
    });

  } catch (error: any) {
    log.error("Error processing invoice payment failed", { 
      error: error.message, 
      invoiceId: invoice.id 
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    log.info("Processing subscription deleted", { subscriptionId: subscription.id });

    const metadata = subscription.metadata || {};
    const contractId = metadata.contract_id;

    if (!contractId) {
      log.warn("No contract ID in subscription metadata", { subscriptionId: subscription.id });
      return;
    }

    // Mettre à jour le statut du contrat
    await atexya.updateContractStatus({
      contract_id: contractId,
      payment_status: 'cancelled',
      metadata: {
        cancellation_date: new Date().toISOString(),
        cancellation_reason: 'subscription_deleted'
      }
    });

    log.info("Subscription cancellation processed", {
      contractId,
      subscriptionId: subscription.id
    });

  } catch (error: any) {
    log.error("Error processing subscription deleted", { 
      error: error.message, 
      subscriptionId: subscription.id 
    });
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    log.info("Processing payment intent failed", { paymentIntentId: paymentIntent.id });

    const metadata = paymentIntent.metadata || {};
    const contractId = metadata.contract_id;

    if (!contractId) {
      log.warn("No contract ID in payment intent metadata", { paymentIntentId: paymentIntent.id });
      return;
    }

    // Mettre à jour le statut du contrat
    await atexya.updateContractStatus({
      contract_id: contractId,
      payment_status: 'failed',
      metadata: {
        payment_failure_reason: paymentIntent.last_payment_error?.message || 'Unknown error',
        failed_at: new Date().toISOString()
      }
    });

    log.warn("Payment intent failed processed", {
      contractId,
      paymentIntentId: paymentIntent.id,
      error: paymentIntent.last_payment_error?.message
    });

  } catch (error: any) {
    log.error("Error processing payment intent failed", { 
      error: error.message, 
      paymentIntentId: paymentIntent.id 
    });
  }
}
