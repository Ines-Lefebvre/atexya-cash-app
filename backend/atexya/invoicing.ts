import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");

interface GenerateInvoiceRequest {
  contract_id: string;
  customer_email: string;
  customer_name: string;
  company_name: string;
  siren: string;
  items: Array<{
    description: string;
    quantity: number;
    unit_amount: number; // en centimes
  }>;
  due_date?: string;
  metadata?: Record<string, string>;
}

interface GenerateInvoiceResponse {
  invoice_id: string;
  invoice_url: string;
  invoice_pdf: string;
  amount_due: number;
}

// Génère une facture Stripe
export const generateInvoice = api<GenerateInvoiceRequest, GenerateInvoiceResponse>(
  { expose: true, method: "POST", path: "/invoicing/generate" },
  async (params) => {
    try {
      const stripeKey = STRIPE_SECRET_KEY();
      
      if (!stripeKey || stripeKey.trim() === "") {
        throw APIError.internal("Configuration Stripe manquante.");
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-04-10",
        typescript: true,
      });

      // Créer ou récupérer le client
      let customer;
      const existingCustomers = await stripe.customers.list({
        email: params.customer_email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: params.customer_email,
          name: params.customer_name,
          metadata: {
            contract_id: params.contract_id,
            siren: params.siren,
            company_name: params.company_name
          }
        });
      }

      // Créer les items de facturation
      const invoiceItems = [];
      for (const item of params.items) {
        const invoiceItem = await stripe.invoiceItems.create({
          customer: customer.id,
          description: item.description,
          quantity: item.quantity,
          unit_amount: item.unit_amount,
          currency: 'eur',
        });
        invoiceItems.push(invoiceItem);
      }

      // Créer la facture
      const dueDate = params.due_date ? 
        Math.floor(new Date(params.due_date).getTime() / 1000) : 
        Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000); // 30 jours

      const invoice = await stripe.invoices.create({
        customer: customer.id,
        due_date: dueDate,
        collection_method: 'send_invoice',
        days_until_due: 30,
        metadata: {
          contract_id: params.contract_id,
          siren: params.siren,
          company_name: params.company_name,
          ...params.metadata
        },
        footer: "Atexya - Assurance responsabilité civile professionnelle\nMerci pour votre confiance.",
        custom_fields: [
          {
            name: "SIREN",
            value: params.siren
          },
          {
            name: "Contrat",
            value: params.contract_id
          }
        ]
      });

      // Finaliser la facture pour la rendre envoyable
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id);

      // Envoyer la facture par email
      await stripe.invoices.sendInvoice(finalizedInvoice.id);

      log.info("Invoice generated and sent successfully", {
        invoiceId: finalizedInvoice.id,
        customerId: customer.id,
        contractId: params.contract_id,
        amount: finalizedInvoice.amount_due
      });

      return {
        invoice_id: finalizedInvoice.id,
        invoice_url: finalizedInvoice.hosted_invoice_url || '',
        invoice_pdf: finalizedInvoice.invoice_pdf || '',
        amount_due: finalizedInvoice.amount_due
      };

    } catch (error: any) {
      log.error("Error generating invoice", { 
        error: error.message,
        contractId: params.contract_id
      });
      throw APIError.internal("Impossible de générer la facture: " + error.message);
    }
  }
);

interface SendInvoiceReminderRequest {
  invoice_id: string;
}

// Envoie un rappel de facture
export const sendInvoiceReminder = api<SendInvoiceReminderRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/invoicing/send-reminder" },
  async (params) => {
    try {
      const stripeKey = STRIPE_SECRET_KEY();
      
      if (!stripeKey || stripeKey.trim() === "") {
        throw APIError.internal("Configuration Stripe manquante.");
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-04-10",
        typescript: true,
      });

      await stripe.invoices.sendInvoice(params.invoice_id);

      log.info("Invoice reminder sent successfully", {
        invoiceId: params.invoice_id
      });

      return { success: true };

    } catch (error: any) {
      log.error("Error sending invoice reminder", { 
        error: error.message,
        invoiceId: params.invoice_id
      });
      throw APIError.internal("Impossible d'envoyer le rappel: " + error.message);
    }
  }
);

interface MarkInvoicePaidRequest {
  invoice_id: string;
  payment_method?: string;
  notes?: string;
}

// Marque une facture comme payée manuellement
export const markInvoicePaid = api<MarkInvoicePaidRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/invoicing/mark-paid" },
  async (params) => {
    try {
      const stripeKey = STRIPE_SECRET_KEY();
      
      if (!stripeKey || stripeKey.trim() === "") {
        throw APIError.internal("Configuration Stripe manquante.");
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-04-10",
        typescript: true,
      });

      await stripe.invoices.pay(params.invoice_id, {
        paid_out_of_band: true,
      });

      log.info("Invoice marked as paid", {
        invoiceId: params.invoice_id,
        paymentMethod: params.payment_method,
        notes: params.notes
      });

      return { success: true };

    } catch (error: any) {
      log.error("Error marking invoice as paid", { 
        error: error.message,
        invoiceId: params.invoice_id
      });
      throw APIError.internal("Impossible de marquer la facture comme payée: " + error.message);
    }
  }
);

interface VoidInvoiceRequest {
  invoice_id: string;
  reason?: string;
}

// Annule une facture
export const voidInvoice = api<VoidInvoiceRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/invoicing/void" },
  async (params) => {
    try {
      const stripeKey = STRIPE_SECRET_KEY();
      
      if (!stripeKey || stripeKey.trim() === "") {
        throw APIError.internal("Configuration Stripe manquante.");
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-04-10",
        typescript: true,
      });

      await stripe.invoices.voidInvoice(params.invoice_id);

      log.info("Invoice voided", {
        invoiceId: params.invoice_id,
        reason: params.reason
      });

      return { success: true };

    } catch (error: any) {
      log.error("Error voiding invoice", { 
        error: error.message,
        invoiceId: params.invoice_id
      });
      throw APIError.internal("Impossible d'annuler la facture: " + error.message);
    }
  }
);

interface GetInvoiceRequest {
  invoice_id: string;
}

interface GetInvoiceResponse {
  id: string;
  status: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  customer_email: string;
  due_date: number;
  created: number;
  metadata: Record<string, string>;
  hosted_invoice_url: string;
  invoice_pdf: string;
}

// Récupère les détails d'une facture
export const getInvoice = api<GetInvoiceRequest, GetInvoiceResponse>(
  { expose: true, method: "POST", path: "/invoicing/get" },
  async (params) => {
    try {
      const stripeKey = STRIPE_SECRET_KEY();
      
      if (!stripeKey || stripeKey.trim() === "") {
        throw APIError.internal("Configuration Stripe manquante.");
      }

      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2024-04-10",
        typescript: true,
      });

      const invoice = await stripe.invoices.retrieve(params.invoice_id);

      return {
        id: invoice.id,
        status: invoice.status || 'unknown',
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        currency: invoice.currency,
        customer_email: invoice.customer_email || '',
        due_date: invoice.due_date || 0,
        created: invoice.created,
        metadata: invoice.metadata,
        hosted_invoice_url: invoice.hosted_invoice_url || '',
        invoice_pdf: invoice.invoice_pdf || ''
      };

    } catch (error: any) {
      log.error("Error getting invoice", { 
        error: error.message,
        invoiceId: params.invoice_id
      });
      throw APIError.internal("Impossible de récupérer la facture: " + error.message);
    }
  }
);
