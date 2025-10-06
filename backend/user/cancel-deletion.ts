import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { createHash } from "crypto";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const contractsDB = SQLDatabase.named("contracts");

interface CancelDeletionRequest {
  request_id: string;
  token: string;
}

interface CancelDeletionResponse {
  success: boolean;
  message: string;
}

export const cancelDeletion = api<CancelDeletionRequest, CancelDeletionResponse>(
  { expose: true, method: "POST", path: "/user/delete/cancel" },
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
      }>`
        SELECT id, customer_email, status
        FROM deletion_requests
        WHERE id = ${request_id} AND token_hash = ${tokenHash}
      `;

      if (!request) {
        throw APIError.notFound("Demande de suppression introuvable ou token invalide");
      }

      if (request.status === "confirmed") {
        throw APIError.invalidArgument("La suppression a déjà été effectuée et ne peut pas être annulée");
      }

      if (request.status === "cancelled") {
        throw APIError.invalidArgument("Cette demande a déjà été annulée");
      }

      if (request.status === "expired") {
        throw APIError.invalidArgument("Cette demande a expiré");
      }

      await contractsDB.exec`
        UPDATE deletion_requests
        SET status = 'cancelled'
        WHERE id = ${request_id}
      `;

      await contractsDB.exec`
        INSERT INTO deletion_audit (
          deletion_request_id, customer_email, action, data_type,
          records_deleted, executed_by, success
        ) VALUES (
          ${request_id}, ${request.customer_email}, 'REQUEST_CANCELLED', 'deletion_request',
          0, ${request.customer_email}, true
        )
      `;

      log.info("Deletion request cancelled", {
        request_id,
        email: request.customer_email
      });

      return {
        success: true,
        message: "La demande de suppression a été annulée avec succès"
      };

    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      log.error("Error cancelling deletion request", { error: error.message, request_id });
      throw APIError.internal("Impossible d'annuler la demande de suppression");
    }
  }
);
