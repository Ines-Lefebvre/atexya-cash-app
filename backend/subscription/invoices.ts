import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import Stripe from "stripe";
import { subscriptionDB } from "./db";
import { safeLog, hashValue } from "../utils/safeLog";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");
const stripe = new Stripe(STRIPE_SECRET_KEY(), { apiVersion: "2025-02-24.acacia" });

export interface Invoice {
  id: string;
  stripe_invoice_id: string;
  stripe_customer_id: string;
  subscription_id?: string;
  customer_email: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  invoice_pdf?: string;
  hosted_invoice_url?: string;
  tax_amount: number;
  period_start?: string;
  period_end?: string;
  metadata: Record<string, any>;
  created_at: string;
  paid_at?: string;
}

export interface ListInvoicesRequest {
  customer_email?: string;
  subscription_id?: string;
  status?: string;
}

export interface ListInvoicesResponse {
  invoices: Invoice[];
}

export const listInvoices = api(
  { expose: true, method: "GET", path: "/subscription/invoices" },
  async (req: ListInvoicesRequest): Promise<ListInvoicesResponse> => {
    try {
      let query = 'SELECT * FROM invoices WHERE 1=1';
      const params: any[] = [];

      if (req.customer_email) {
        params.push(req.customer_email);
        query += ` AND customer_email = $${params.length}`;
      }

      if (req.subscription_id) {
        params.push(req.subscription_id);
        query += ` AND subscription_id = $${params.length}`;
      }

      if (req.status) {
        params.push(req.status);
        query += ` AND status = $${params.length}`;
      }

      query += ' ORDER BY created_at DESC';

      const invoices = await subscriptionDB.rawQueryAll<Invoice>(query, ...params);

      return { invoices };
    } catch (error: any) {
      safeLog.error("Error listing invoices", { error: error.message });
      throw APIError.internal("Failed to list invoices");
    }
  }
);

export interface GetInvoiceRequest {
  id: string;
}

export interface GetInvoiceResponse {
  invoice: Invoice;
}

export const getInvoice = api(
  { expose: true, method: "GET", path: "/subscription/invoices/:id" },
  async (req: GetInvoiceRequest): Promise<GetInvoiceResponse> => {
    try {
      const invoice = await subscriptionDB.queryRow<Invoice>`
        SELECT * FROM invoices WHERE id = ${req.id} LIMIT 1
      `;

      if (!invoice) throw APIError.notFound("Invoice not found");

      return { invoice };
    } catch (error: any) {
      safeLog.error("Error getting invoice", { error: error.message });
      throw APIError.internal("Failed to get invoice");
    }
  }
);

export interface DownloadInvoiceRequest {
  id: string;
}

export interface DownloadInvoiceResponse {
  pdf_url: string;
}

export const downloadInvoice = api(
  { expose: true, method: "GET", path: "/subscription/invoices/:id/download" },
  async (req: DownloadInvoiceRequest): Promise<DownloadInvoiceResponse> => {
    try {
      const invoice = await subscriptionDB.queryRow<Invoice>`
        SELECT * FROM invoices WHERE id = ${req.id} LIMIT 1
      `;

      if (!invoice) throw APIError.notFound("Invoice not found");

      if (invoice.invoice_pdf) {
        return { pdf_url: invoice.invoice_pdf };
      }

      const stripeInvoice = await stripe.invoices.retrieve(invoice.stripe_invoice_id);

      if (stripeInvoice.invoice_pdf) {
        await subscriptionDB.exec`
          UPDATE invoices 
          SET invoice_pdf = ${stripeInvoice.invoice_pdf}
          WHERE id = ${req.id}
        `;

        return { pdf_url: stripeInvoice.invoice_pdf };
      }

      throw APIError.notFound("Invoice PDF not available");
    } catch (error: any) {
      safeLog.error("Error downloading invoice", { error: error.message });
      throw APIError.internal("Failed to download invoice");
    }
  }
);

export interface SendInvoiceRequest {
  id: string;
}

export interface SendInvoiceResponse {
  sent: boolean;
}

export const sendInvoice = api(
  { expose: true, method: "POST", path: "/subscription/invoices/:id/send" },
  async (req: SendInvoiceRequest): Promise<SendInvoiceResponse> => {
    try {
      const invoice = await subscriptionDB.queryRow<Invoice>`
        SELECT * FROM invoices WHERE id = ${req.id} LIMIT 1
      `;

      if (!invoice) throw APIError.notFound("Invoice not found");

      await stripe.invoices.sendInvoice(invoice.stripe_invoice_id);

      safeLog.info("Invoice sent", {
        invoiceId: invoice.id,
        customerEmail: hashValue(invoice.customer_email),
      });

      return { sent: true };
    } catch (error: any) {
      safeLog.error("Error sending invoice", { error: error.message });
      throw APIError.internal("Failed to send invoice");
    }
  }
);
