import { api, APIError } from "encore.dev/api";
import { Header } from "encore.dev/api";
import log from "encore.dev/log";
import { randomBytes, createHash } from "crypto";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const contractsDB = SQLDatabase.named("contracts");
const stripeDB = SQLDatabase.named("stripe");

interface RequestDeletionRequest {
  email: string;
}

interface RequestDeletionResponse {
  request_id: string;
  message: string;
  expires_at: Date;
}

export const requestDeletion = api<RequestDeletionRequest, RequestDeletionResponse>(
  { expose: true, method: "POST", path: "/user/delete" },
  async (params: RequestDeletionRequest) => {
    const { email } = params;

    if (!email || !email.includes("@")) {
      throw APIError.invalidArgument("Email invalide");
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
      const existingContracts = await contractsDB.queryAll<{ count: number }>`
        SELECT COUNT(*) as count 
        FROM contracts 
        WHERE LOWER(customer_email) = ${normalizedEmail}
      `;

      if (existingContracts[0]?.count === 0) {
        throw APIError.notFound("Aucune donnée trouvée pour cet email");
      }

      const requestId = `del_${randomBytes(16).toString("hex")}`;
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const requestIp = "unknown";
      const userAgent = "unknown";

      await contractsDB.exec`
        INSERT INTO deletion_requests (
          id, customer_email, token_hash, request_ip, 
          request_user_agent, expires_at, status
        ) VALUES (
          ${requestId}, ${normalizedEmail}, ${tokenHash}, ${requestIp},
          ${userAgent}, ${expiresAt}, 'pending'
        )
      `;

      await logAudit({
        deletion_request_id: requestId,
        customer_email: normalizedEmail,
        action: "REQUEST_CREATED",
        data_type: "deletion_request",
        records_deleted: 0,
        executed_by: normalizedEmail,
        metadata: {
          ip: requestIp,
          user_agent: userAgent,
          expires_at: expiresAt.toISOString()
        }
      });

      const confirmationUrl = `${process.env.FRONTEND_URL || "https://atexya-cash-app-d2vtgnc82vjvosnddaqg.lp.dev"}/user/delete/confirm?token=${token}&request_id=${requestId}`;

      await sendDeletionConfirmationEmail({
        to: normalizedEmail,
        confirmationUrl,
        expiresAt
      });

      log.info("Deletion request created", {
        request_id: requestId,
        email: normalizedEmail,
        expires_at: expiresAt
      });

      return {
        request_id: requestId,
        message: "Un email de confirmation a été envoyé. Veuillez cliquer sur le lien pour confirmer la suppression de vos données.",
        expires_at: expiresAt
      };

    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      log.error("Error creating deletion request", { error: error.message, email: normalizedEmail });
      throw APIError.internal("Impossible de créer la demande de suppression");
    }
  }
);

interface ConfirmDeletionRequest {
  request_id: string;
  token: string;
}

interface ConfirmDeletionResponse {
  success: boolean;
  message: string;
  deleted_records: {
    contracts: number;
    stripe_sessions: number;
    deletion_requests: number;
  };
}

export const confirmDeletion = api<ConfirmDeletionRequest, ConfirmDeletionResponse>(
  { expose: true, method: "POST", path: "/user/delete/confirm" },
  async (params) => {
    const { request_id, token } = params;

    if (!request_id || !token) {
      throw APIError.invalidArgument("Paramètres manquants");
    }

    try {
      const tokenHash = createHash("sha256").update(token).digest("hex");

      const request = await contractsDB.queryRow<{
        id: string;
        customer_email: string;
        status: string;
        expires_at: Date;
      }>`
        SELECT id, customer_email, status, expires_at
        FROM deletion_requests
        WHERE id = ${request_id} AND token_hash = ${tokenHash}
      `;

      if (!request) {
        throw APIError.notFound("Demande de suppression introuvable ou token invalide");
      }

      if (request.status !== "pending") {
        throw APIError.invalidArgument(`Demande déjà ${request.status}`);
      }

      if (new Date() > new Date(request.expires_at)) {
        await contractsDB.exec`
          UPDATE deletion_requests
          SET status = 'expired'
          WHERE id = ${request_id}
        `;
        throw APIError.invalidArgument("La demande a expiré. Veuillez créer une nouvelle demande.");
      }

      await contractsDB.exec`
        UPDATE deletion_requests
        SET status = 'confirmed', confirmed_at = CURRENT_TIMESTAMP
        WHERE id = ${request_id}
      `;

      const deletedRecords = await performDataDeletion(request.customer_email, request_id);

      await logAudit({
        deletion_request_id: request_id,
        customer_email: request.customer_email,
        action: "DELETION_COMPLETED",
        data_type: "all",
        records_deleted: deletedRecords.contracts + deletedRecords.stripe_sessions,
        executed_by: request.customer_email,
        metadata: {
          deleted_records: deletedRecords
        }
      });

      log.info("User data deleted successfully", {
        request_id,
        email: request.customer_email,
        deleted_records: deletedRecords
      });

      return {
        success: true,
        message: "Vos données ont été supprimées avec succès conformément au RGPD.",
        deleted_records: deletedRecords
      };

    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      log.error("Error confirming deletion", { error: error.message, request_id });
      throw APIError.internal("Impossible de confirmer la suppression");
    }
  }
);

async function performDataDeletion(email: string, requestId: string): Promise<{
  contracts: number;
  stripe_sessions: number;
  deletion_requests: number;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  
  try {
    const contractsResult = await contractsDB.queryAll<{ count: number }>`
      SELECT COUNT(*) as count FROM contracts WHERE LOWER(customer_email) = ${normalizedEmail}
    `;
    const contractsCount = contractsResult[0]?.count || 0;

    await contractsDB.exec`
      DELETE FROM contracts WHERE LOWER(customer_email) = ${normalizedEmail}
    `;

    await logAudit({
      deletion_request_id: requestId,
      customer_email: normalizedEmail,
      action: "DELETE_CONTRACTS",
      data_type: "contracts",
      records_deleted: contractsCount,
      executed_by: normalizedEmail
    });

    const sessionsResult = await stripeDB.queryAll<{ count: number }>`
      SELECT COUNT(*) as count FROM stripe_sessions WHERE customer_id = ${normalizedEmail}
    `;
    const sessionsCount = sessionsResult[0]?.count || 0;

    await stripeDB.exec`
      DELETE FROM stripe_sessions WHERE customer_id = ${normalizedEmail}
    `;

    await logAudit({
      deletion_request_id: requestId,
      customer_email: normalizedEmail,
      action: "DELETE_STRIPE_SESSIONS",
      data_type: "stripe_sessions",
      records_deleted: sessionsCount,
      executed_by: normalizedEmail
    });

    const deletionRequestsResult = await contractsDB.queryAll<{ count: number }>`
      SELECT COUNT(*) as count FROM deletion_requests 
      WHERE LOWER(customer_email) = ${normalizedEmail} AND id != ${requestId}
    `;
    const deletionRequestsCount = deletionRequestsResult[0]?.count || 0;

    await contractsDB.exec`
      DELETE FROM deletion_requests 
      WHERE LOWER(customer_email) = ${normalizedEmail} AND id != ${requestId}
    `;

    await logAudit({
      deletion_request_id: requestId,
      customer_email: normalizedEmail,
      action: "DELETE_OLD_DELETION_REQUESTS",
      data_type: "deletion_requests",
      records_deleted: deletionRequestsCount,
      executed_by: normalizedEmail
    });

    return {
      contracts: contractsCount,
      stripe_sessions: sessionsCount,
      deletion_requests: deletionRequestsCount
    };

  } catch (error: any) {
    await logAudit({
      deletion_request_id: requestId,
      customer_email: normalizedEmail,
      action: "DELETION_FAILED",
      data_type: "all",
      records_deleted: 0,
      executed_by: normalizedEmail,
      success: false,
      error_message: error.message
    });

    throw error;
  }
}

interface AuditLogParams {
  deletion_request_id: string;
  customer_email: string;
  action: string;
  data_type: string;
  records_deleted: number;
  executed_by: string;
  success?: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
}

async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const {
      deletion_request_id,
      customer_email,
      action,
      data_type,
      records_deleted,
      executed_by,
      success = true,
      error_message = null,
      metadata = {}
    } = params;

    await contractsDB.exec`
      INSERT INTO deletion_audit (
        deletion_request_id, customer_email, action, data_type,
        records_deleted, executed_by, success, error_message, metadata
      ) VALUES (
        ${deletion_request_id}, ${customer_email}, ${action}, ${data_type},
        ${records_deleted}, ${executed_by}, ${success}, ${error_message}, ${JSON.stringify(metadata)}
      )
    `;

    log.info("Audit log created", {
      deletion_request_id,
      action,
      data_type,
      records_deleted,
      success
    });

  } catch (error: any) {
    log.error("Failed to create audit log", { error: error.message, params });
  }
}

interface SendDeletionConfirmationEmailParams {
  to: string;
  confirmationUrl: string;
  expiresAt: Date;
}

async function sendDeletionConfirmationEmail(params: SendDeletionConfirmationEmailParams): Promise<void> {
  const { to, confirmationUrl, expiresAt } = params;

  log.info("Sending deletion confirmation email", {
    to,
    confirmation_url: confirmationUrl,
    expires_at: expiresAt
  });

  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                   DEMANDE DE SUPPRESSION DE DONNÉES RGPD                   ║
╚════════════════════════════════════════════════════════════════════════════╝

Destinataire: ${to}

Bonjour,

Nous avons reçu une demande de suppression de vos données personnelles conformément 
à l'article 17 du RGPD (droit à l'effacement).

Pour confirmer cette demande, veuillez cliquer sur le lien ci-dessous :

${confirmationUrl}

⚠️  IMPORTANT :
- Ce lien est valide pendant 24 heures (expire le ${expiresAt.toLocaleString('fr-FR')})
- La suppression est irréversible
- Toutes vos données seront définitivement supprimées

Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.

Cordialement,
L'équipe Atexya

╔════════════════════════════════════════════════════════════════════════════╗
  `);
}
