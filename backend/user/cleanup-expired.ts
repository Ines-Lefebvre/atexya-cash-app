import { CronJob } from "encore.dev/cron";
import { api } from "encore.dev/api";
import log from "encore.dev/log";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const contractsDB = SQLDatabase.named("contracts");

export const cleanupExpired = api(
  { expose: false, method: "POST", path: "/user/cleanup-expired" },
  async (): Promise<void> => {
  try {
    log.info("Starting cleanup of expired deletion requests");

    const expiredRequests = await contractsDB.queryAll<{
      id: string;
      customer_email: string;
    }>`
      SELECT id, customer_email
      FROM deletion_requests
      WHERE status = 'pending' 
        AND expires_at < CURRENT_TIMESTAMP
    `;

    if (expiredRequests.length === 0) {
      log.info("No expired deletion requests to clean up");
      return;
    }

    log.info(`Found ${expiredRequests.length} expired deletion requests`);

    for (const request of expiredRequests) {
      await contractsDB.exec`
        UPDATE deletion_requests
        SET status = 'expired'
        WHERE id = ${request.id}
      `;

      await contractsDB.exec`
        INSERT INTO deletion_audit (
          deletion_request_id, customer_email, action, data_type,
          records_deleted, executed_by, success, metadata
        ) VALUES (
          ${request.id}, ${request.customer_email}, 'REQUEST_EXPIRED', 'deletion_request',
          0, 'system', true, ${JSON.stringify({ reason: "automatic_cleanup" })}
        )
      `;

      log.info("Marked deletion request as expired", {
        request_id: request.id,
        email: request.customer_email
      });
    }

    log.info("Completed cleanup of expired deletion requests", {
      cleaned: expiredRequests.length
    });

  } catch (error: any) {
    log.error("Error cleaning up expired deletion requests", {
      error: error.message
    });
    throw error;
  }
});

export const cleanupExpiredDeletionRequests = new CronJob(
  "cleanup-expired-deletion-requests",
  {
    title: "Cleanup Expired Deletion Requests",
    schedule: "0 2 * * *",
    endpoint: cleanupExpired,
  }
);
