import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = secret("STRIPE_WEBHOOK_SECRET");
const FRONTEND_URL = secret("FRONTEND_URL"); 

interface CreateCheckoutRequest {
  amount: number; // in cents
  metadata: {
    cgv_accepted: boolean;
    cgv_version: string;
    broker_code?: string;
    commission: number;
    siren: string;
    garantie: number;
    type: string;
    customer_name: string;
    customer_email: string;
    customer_phone?: string;
  };
}

interface CreateCheckoutResponse {
  checkout_url: string;
  session_id: string;
}

// Crée une session de paiement Stripe
export const createCheckoutSession = api<CreateCheckoutRequest, CreateCheckoutResponse>(
  { expose: true, method: "POST", path: "/stripe/checkout" },
  async (params) => {
    try {
      const stripeKey = STRIPE_SECRET_KEY();
      const frontendUrl = FRONTEND_URL();
      
      log.info("Creating Stripe checkout session", { 
        amount: params.amount,
        siren: params.metadata.siren,
        type: params.metadata.type,
        hasStripeKey: !!stripeKey,
        hasFrontendUrl: !!frontendUrl
      });
      
      // Vérification des secrets
      if (!stripeKey || stripeKey.trim() === "") {
        log.error("STRIPE_SECRET_KEY is not configured.");
        throw APIError.internal("Configuration de paiement manquante. Veuillez contacter le support.");
      }
      
      if (!frontendUrl || frontendUrl.trim() === "") {
        log.error("FRONTEND_URL is not configured.");
        throw APIError.internal("Configuration de l'application manquante. Veuillez contacter le support.");
      }

      // Validation des paramètres
      if (!params.amount || params.amount <= 0) {
        throw APIError.invalidArgument("Le montant doit être supérieur à 0");
      }

      if (!params.metadata.siren || !/^\d{9}$/.test(params.metadata.siren)) {
        throw APIError.invalidArgument("SIREN invalide");
      }

      if (!params.metadata.customer_name || !params.metadata.customer_email) {
        throw APIError.invalidArgument("Nom et email client requis");
      }

      // Import dynamique de Stripe avec meilleure gestion d'erreur
      let stripe;
      try {
        const Stripe = (await import("stripe")).default;
        stripe = new Stripe(stripeKey, {
          apiVersion: "2024-06-20",
          typescript: true,
        });
        log.info("Stripe library imported successfully");
      } catch (importError: any) {
        log.error("Failed to import Stripe library", { error: importError.message });
        throw APIError.internal("Service de paiement temporairement indisponible. Veuillez réessayer plus tard.");
      }

      // Construction des URLs de succès et d'annulation
      const baseUrl = frontendUrl.endsWith('/') ? frontendUrl.slice(0, -1) : frontendUrl;
      const successUrl = `${baseUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/page6`;

      log.info("Stripe URLs configured", { successUrl, cancelUrl });

      // Calcul de la commission courtier
      const brokerCommission = params.metadata.broker_code ? 
        Math.round(params.amount * (params.metadata.commission / 100)) : 0;

      // Création de la session Stripe
      const sessionParams: any = {
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Atexya Assurance - Garantie ${params.metadata.type}`,
                description: `Contrat d'assurance RC Pro pour SIREN ${params.metadata.siren} - Garantie de ${params.metadata.garantie.toLocaleString()}€`,
              },
              unit_amount: params.amount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          cgv_accepted: String(params.metadata.cgv_accepted),
          cgv_version: params.metadata.cgv_version,
          broker_code: params.metadata.broker_code || '',
          commission_percent: String(params.metadata.commission),
          commission_amount: String(brokerCommission),
          siren: params.metadata.siren,
          garantie: String(params.metadata.garantie),
          type: params.metadata.type,
          customer_name: params.metadata.customer_name,
          customer_email: params.metadata.customer_email,
          customer_phone: params.metadata.customer_phone || '',
          contract_start_date: new Date().toISOString().split('T')[0],
        },
        customer_email: params.metadata.customer_email,
        success_url: successUrl,
        cancel_url: cancelUrl,
        billing_address_collection: 'required',
        phone_number_collection: {
          enabled: true,
        },
        submit_type: 'pay',
        payment_intent_data: {
          description: `Assurance Atexya RC Pro - SIREN ${params.metadata.siren}`,
          metadata: {
            siren: params.metadata.siren,
            type: params.metadata.type,
            garantie: String(params.metadata.garantie),
            broker_code: params.metadata.broker_code || '',
            commission_amount: String(brokerCommission),
          }
        },
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: `Contrat d'assurance RC Pro ${params.metadata.type} - SIREN ${params.metadata.siren}`,
            metadata: {
              siren: params.metadata.siren,
              type: params.metadata.type,
              garantie: String(params.metadata.garantie),
              broker_code: params.metadata.broker_code || '',
            },
            footer: "Atexya - Assurance responsabilité civile professionnelle",
          }
        }
      };

      log.info("Creating Stripe session with params", { 
        amount: sessionParams.line_items[0].price_data.unit_amount,
        currency: sessionParams.line_items[0].price_data.currency,
        mode: sessionParams.mode,
        broker_commission
      });

      const session = await stripe.checkout.sessions.create(sessionParams);

      if (!session.url) {
        log.error("Stripe session created but no URL returned", { sessionId: session.id });
        throw APIError.internal("Impossible de créer la session de paiement. Veuillez réessayer.");
      }

      log.info("Stripe checkout session created successfully", { 
        sessionId: session.id,
        url: session.url.substring(0, 50) + "...",
        amount: params.amount,
        brokerCommission
      });

      return { 
        checkout_url: session.url,
        session_id: session.id 
      };
      
    } catch (error: any) {
      log.error("Error creating Stripe checkout session", { 
        error: error.message,
        type: error.type,
        code: error.code,
        decline_code: error.decline_code,
        stack: error.stack
      });
      
      // Gestion des différents types d'erreurs Stripe
      if (error.type === 'StripeCardError') {
        throw APIError.invalidArgument("Erreur de carte bancaire: " + error.message);
      } else if (error.type === 'StripeRateLimitError') {
        throw APIError.resourceExhausted("Trop de requêtes. Veuillez patienter et réessayer.");
      } else if (error.type === 'StripeInvalidRequestError') {
        throw APIError.invalidArgument("Requête invalide: " + error.message);
      } else if (error.type === 'StripeAPIError') {
        throw APIError.internal("Erreur du service de paiement. Veuillez réessayer.");
      } else if (error.type === 'StripeConnectionError') {
        throw APIError.unavailable("Problème de connexion au service de paiement. Veuillez réessayer.");
      } else if (error.type === 'StripeAuthenticationError') {
        log.error("Stripe authentication failed - check API key");
        throw APIError.internal("Configuration de paiement incorrecte. Veuillez contacter le support.");
      } else {
        // Autres erreurs (incluant les APIError qu'on a throw nous-mêmes)
        throw error instanceof APIError ? error : APIError.internal("Erreur inconnue lors de la création de la session de paiement: " + error.message);
      }
    }
  }
);

interface VerifySessionRequest {
  session_id: string;
}

interface VerifySessionResponse {
  payment_status: string;
  customer_email?: string;
  amount_total?: number;
  metadata?: Record<string, string>;
  invoice_id?: string;
  invoice_url?: string;
}

// Vérifie le statut d'une session de paiement
export const verifySession = api<VerifySessionRequest, VerifySessionResponse>(
  { expose: true, method: "POST", path: "/stripe/verify" },
  async (params) => {
    try {
      const stripeKey = STRIPE_SECRET_KEY();
      
      if (!stripeKey || stripeKey.trim() === "") {
        throw APIError.internal("Configuration de paiement manquante.");
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-06-20",
        typescript: true,
      });

      const session = await stripe.checkout.sessions.retrieve(params.session_id, {
        expand: ['invoice']
      });

      let invoiceId = undefined;
      let invoiceUrl = undefined;

      if (session.invoice && typeof session.invoice === 'object') {
        invoiceId = session.invoice.id;
        invoiceUrl = session.invoice.hosted_invoice_url;
      }

      return {
        payment_status: session.payment_status || 'unknown',
        customer_email: session.customer_details?.email,
        amount_total: session.amount_total || undefined,
        metadata: session.metadata || undefined,
        invoice_id: invoiceId,
        invoice_url: invoiceUrl
      };

    } catch (error: any) {
      log.error("Error verifying Stripe session", { 
        error: error.message,
        session_id: params.session_id
      });
      
      throw APIError.internal("Impossible de vérifier le statut du paiement.");
    }
  }
);

interface WebhookRequest {
  body: string;
  stripe_signature: string;
}

interface WebhookResponse {
  received: boolean;
}

// Gère les webhooks Stripe
export const handleWebhook = api<WebhookRequest, WebhookResponse>(
  { expose: true, method: "POST", path: "/stripe/webhook" },
  async (params) => {
    try {
      const stripeKey = STRIPE_SECRET_KEY();
      const webhookSecret = STRIPE_WEBHOOK_SECRET();
      
      if (!stripeKey || !webhookSecret) {
        log.error("Stripe secrets not configured for webhook");
        throw APIError.internal("Configuration webhook manquante.");
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-06-20",
        typescript: true,
      });

      let event;
      try {
        event = stripe.webhooks.constructEvent(
          params.body,
          params.stripe_signature,
          webhookSecret
        );
      } catch (err: any) {
        log.error("Webhook signature verification failed", { error: err.message });
        throw APIError.invalidArgument("Signature webhook invalide");
      }

      log.info("Webhook received", { 
        type: event.type,
        id: event.id,
        created: event.created
      });

      // Traitement selon le type d'événement
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(event.data.object as any);
          break;
          
        case 'payment_intent.succeeded':
          await handlePaymentSucceeded(event.data.object as any);
          break;
          
        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object as any);
          break;
          
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object as any);
          break;
          
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object as any);
          break;
          
        case 'charge.dispute.created':
          await handleChargeDispute(event.data.object as any);
          break;
          
        case 'customer.subscription.deleted':
          await handleSubscriptionCancelled(event.data.object as any);
          break;

        default:
          log.info("Unhandled webhook event type", { type: event.type });
      }

      return { received: true };

    } catch (error: any) {
      log.error("Error handling webhook", { 
        error: error.message,
        stack: error.stack
      });
      
      if (error instanceof APIError) {
        throw error;
      }
      
      throw APIError.internal("Erreur lors du traitement du webhook");
    }
  }
);

// Gestionnaires d'événements webhook
async function handleCheckoutCompleted(session: any) {
  log.info("Checkout session completed", { 
    sessionId: session.id,
    customerId: session.customer,
    amount: session.amount_total,
    metadata: session.metadata
  });

  // Envoyer email de confirmation
  // Créer le contrat d'assurance
  // Notifier le courtier si applicable
  
  if (session.metadata?.broker_code) {
    const commissionAmount = parseInt(session.metadata.commission_amount || '0');
    log.info("Commission courtier à traiter", {
      brokerCode: session.metadata.broker_code,
      commission: commissionAmount,
      siren: session.metadata.siren
    });
    
    // TODO: Traiter la commission courtier
    // await processBrokerCommission(session.metadata.broker_code, commissionAmount, session.metadata);
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  log.info("Payment succeeded", { 
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    metadata: paymentIntent.metadata
  });

  // Mettre à jour le statut du contrat
  // Envoyer les documents finaux
}

async function handlePaymentFailed(paymentIntent: any) {
  log.error("Payment failed", { 
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    lastPaymentError: paymentIntent.last_payment_error,
    metadata: paymentIntent.metadata
  });

  // Notifier l'équipe
  // Envoyer email d'échec au client
  // Proposer solutions alternatives
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  log.info("Invoice payment succeeded", { 
    invoiceId: invoice.id,
    amount: invoice.amount_paid,
    customerEmail: invoice.customer_email
  });

  // Marquer la facture comme payée
  // Activer le contrat
}

async function handleInvoicePaymentFailed(invoice: any) {
  log.error("Invoice payment failed", { 
    invoiceId: invoice.id,
    amount: invoice.amount_due,
    customerEmail: invoice.customer_email
  });

  // Notifier l'équipe
  // Relancer le client
}

async function handleChargeDispute(dispute: any) {
  log.error("Charge dispute created", { 
    disputeId: dispute.id,
    amount: dispute.amount,
    reason: dispute.reason,
    chargeId: dispute.charge
  });

  // Notifier l'équipe immédiatement
  // Rassembler les preuves
  // Préparer la réponse à la dispute
}

async function handleSubscriptionCancelled(subscription: any) {
  log.info("Subscription cancelled", { 
    subscriptionId: subscription.id,
    customerId: subscription.customer
  });

  // Traiter l'annulation
  // Calculer les remboursements proportionnels si applicable
}
