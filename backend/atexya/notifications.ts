import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";

interface SendEmailNotificationRequest {
  to: string;
  subject: string;
  template: 'payment_success' | 'payment_failed' | 'contract_created' | 'broker_commission' | 'dispute_created';
  data: Record<string, any>;
}

// Envoie une notification email
export const sendEmailNotification = api<SendEmailNotificationRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/notifications/send-email" },
  async (params) => {
    try {
      // TODO: Intégrer avec un service d'email (SendGrid, Mailgun, etc.)
      
      log.info("Email notification sent", {
        to: params.to,
        subject: params.subject,
        template: params.template,
        data: params.data
      });

      // Simuler l'envoi d'email pour l'instant
      console.log(`EMAIL TO: ${params.to}`);
      console.log(`SUBJECT: ${params.subject}`);
      console.log(`TEMPLATE: ${params.template}`);
      console.log(`DATA:`, JSON.stringify(params.data, null, 2));

      return { success: true };

    } catch (error: any) {
      log.error("Error sending email notification", { 
        error: error.message,
        to: params.to,
        template: params.template
      });
      throw APIError.internal("Impossible d'envoyer l'email");
    }
  }
);

interface SendSlackNotificationRequest {
  channel: string;
  message: string;
  urgent?: boolean;
  data?: Record<string, any>;
}

// Envoie une notification Slack
export const sendSlackNotification = api<SendSlackNotificationRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/notifications/send-slack" },
  async (params) => {
    try {
      // TODO: Intégrer avec Slack webhook
      
      log.info("Slack notification sent", {
        channel: params.channel,
        message: params.message,
        urgent: params.urgent,
        data: params.data
      });

      // Simuler l'envoi Slack pour l'instant
      console.log(`SLACK CHANNEL: ${params.channel}`);
      console.log(`MESSAGE: ${params.message}`);
      if (params.urgent) console.log("🚨 URGENT NOTIFICATION 🚨");
      if (params.data) console.log(`DATA:`, JSON.stringify(params.data, null, 2));

      return { success: true };

    } catch (error: any) {
      log.error("Error sending Slack notification", { 
        error: error.message,
        channel: params.channel
      });
      throw APIError.internal("Impossible d'envoyer la notification Slack");
    }
  }
);

interface NotifyPaymentSuccessRequest {
  contract_id: string;
  customer_email: string;
  customer_name: string;
  amount: number;
  invoice_url?: string;
}

// Notifie un paiement réussi
export const notifyPaymentSuccess = api<NotifyPaymentSuccessRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/notifications/payment-success" },
  async (params) => {
    try {
      // Email au client
      await sendEmailNotification({
        to: params.customer_email,
        subject: "Confirmation de paiement - Atexya Assurance",
        template: 'payment_success',
        data: {
          customerName: params.customer_name,
          contractId: params.contract_id,
          amount: params.amount,
          invoiceUrl: params.invoice_url
        }
      });

      // Notification interne
      await sendSlackNotification({
        channel: "#payments",
        message: `✅ Paiement réussi: ${params.customer_name} - ${params.amount / 100}€`,
        data: {
          contractId: params.contract_id,
          customerEmail: params.customer_email,
          amount: params.amount
        }
      });

      return { success: true };

    } catch (error: any) {
      log.error("Error sending payment success notifications", { 
        error: error.message,
        contractId: params.contract_id
      });
      throw APIError.internal("Impossible d'envoyer les notifications");
    }
  }
);

interface NotifyPaymentFailedRequest {
  contract_id: string;
  customer_email: string;
  customer_name: string;
  amount: number;
  error_message?: string;
}

// Notifie un échec de paiement
export const notifyPaymentFailed = api<NotifyPaymentFailedRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/notifications/payment-failed" },
  async (params) => {
    try {
      // Email au client
      await sendEmailNotification({
        to: params.customer_email,
        subject: "Problème avec votre paiement - Atexya Assurance",
        template: 'payment_failed',
        data: {
          customerName: params.customer_name,
          contractId: params.contract_id,
          amount: params.amount,
          errorMessage: params.error_message
        }
      });

      // Notification interne urgente
      await sendSlackNotification({
        channel: "#payments",
        message: `❌ Échec de paiement: ${params.customer_name} - ${params.amount / 100}€`,
        urgent: true,
        data: {
          contractId: params.contract_id,
          customerEmail: params.customer_email,
          amount: params.amount,
          errorMessage: params.error_message
        }
      });

      return { success: true };

    } catch (error: any) {
      log.error("Error sending payment failed notifications", { 
        error: error.message,
        contractId: params.contract_id
      });
      throw APIError.internal("Impossible d'envoyer les notifications");
    }
  }
);

interface NotifyBrokerCommissionRequest {
  broker_code: string;
  contract_id: string;
  commission_amount: number;
  company_name: string;
  siren: string;
}

// Notifie une commission courtier
export const notifyBrokerCommission = api<NotifyBrokerCommissionRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/notifications/broker-commission" },
  async (params) => {
    try {
      // Notification interne
      await sendSlackNotification({
        channel: "#commissions",
        message: `💰 Commission courtier: ${params.broker_code} - ${params.commission_amount / 100}€`,
        data: {
          brokerCode: params.broker_code,
          contractId: params.contract_id,
          commissionAmount: params.commission_amount,
          companyName: params.company_name,
          siren: params.siren
        }
      });

      // TODO: Email au courtier avec résumé mensuel

      return { success: true };

    } catch (error: any) {
      log.error("Error sending broker commission notification", { 
        error: error.message,
        brokerCode: params.broker_code
      });
      throw APIError.internal("Impossible d'envoyer la notification");
    }
  }
);

interface NotifyDisputeRequest {
  dispute_id: string;
  amount: number;
  reason: string;
  contract_id?: string;
}

// Notifie une dispute
export const notifyDispute = api<NotifyDisputeRequest, { success: boolean }>(
  { expose: true, method: "POST", path: "/notifications/dispute" },
  async (params) => {
    try {
      // Notification interne urgente
      await sendSlackNotification({
        channel: "#disputes",
        message: `🚨 DISPUTE: ${params.amount / 100}€ - Raison: ${params.reason}`,
        urgent: true,
        data: {
          disputeId: params.dispute_id,
          amount: params.amount,
          reason: params.reason,
          contractId: params.contract_id
        }
      });

      return { success: true };

    } catch (error: any) {
      log.error("Error sending dispute notification", { 
        error: error.message,
        disputeId: params.dispute_id
      });
      throw APIError.internal("Impossible d'envoyer la notification");
    }
  }
);
