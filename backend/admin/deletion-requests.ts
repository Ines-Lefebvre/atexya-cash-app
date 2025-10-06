import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const contractsDB = SQLDatabase.named("contracts");

interface DeletionRequest {
  id: string;
  customer_email: string;
  request_ip: string;
  request_user_agent: string;
  status: string;
  requested_at: Date;
  confirmed_at: Date | null;
  expires_at: Date;
  metadata: any;
}

interface ListDeletionRequestsRequest {
  status?: string;
  email?: string;
  limit?: number;
  offset?: number;
}

interface ListDeletionRequestsResponse {
  requests: DeletionRequest[];
  total: number;
}

export const listDeletionRequests = api<ListDeletionRequestsRequest, ListDeletionRequestsResponse>(
  { 
    expose: true, 
    method: "GET", 
    path: "/admin/deletion-requests",
    auth: true
  },
  async (params) => {
    try {
      const { status, email, limit = 50, offset = 0 } = params;

      let whereClause = "";
      const conditions: string[] = [];
      
      if (status) {
        conditions.push(`status = '${status}'`);
      }
      
      if (email) {
        conditions.push(`LOWER(customer_email) LIKE '%${email.toLowerCase()}%'`);
      }
      
      if (conditions.length > 0) {
        whereClause = "WHERE " + conditions.join(" AND ");
      }

      const countQuery = `SELECT COUNT(*) as count FROM deletion_requests ${whereClause}`;
      const countResult = await contractsDB.rawQueryAll<{ count: number }>(countQuery);
      const total = countResult[0]?.count || 0;

      const query = `
        SELECT id, customer_email, request_ip, request_user_agent, status, 
               requested_at, confirmed_at, expires_at, metadata
        FROM deletion_requests
        ${whereClause}
        ORDER BY requested_at DESC
        LIMIT $1 OFFSET $2
      `;

      const requests = await contractsDB.rawQueryAll<DeletionRequest>(query, limit, offset);

      log.info("Listed deletion requests", {
        status,
        email,
        total,
        returned: requests.length
      });

      return {
        requests,
        total
      };

    } catch (error: any) {
      log.error("Error listing deletion requests", { error: error.message });
      throw APIError.internal("Impossible de récupérer les demandes de suppression");
    }
  }
);

interface DeletionAuditEntry {
  id: number;
  deletion_request_id: string;
  customer_email: string;
  action: string;
  data_type: string;
  records_deleted: number;
  executed_by: string;
  executed_at: Date;
  success: boolean;
  error_message: string | null;
  metadata: any;
}

interface GetDeletionAuditRequest {
  request_id: string;
}

interface GetDeletionAuditResponse {
  request: DeletionRequest | null;
  audit_entries: DeletionAuditEntry[];
}

export const getDeletionAudit = api<GetDeletionAuditRequest, GetDeletionAuditResponse>(
  { 
    expose: true, 
    method: "GET", 
    path: "/admin/deletion-requests/:request_id/audit",
    auth: true
  },
  async ({ request_id }) => {
    try {
      const request = await contractsDB.queryRow<DeletionRequest>`
        SELECT id, customer_email, request_ip, request_user_agent, status, 
               requested_at, confirmed_at, expires_at, metadata
        FROM deletion_requests
        WHERE id = ${request_id}
      `;

      if (!request) {
        throw APIError.notFound("Demande de suppression introuvable");
      }

      const auditEntries = await contractsDB.queryAll<DeletionAuditEntry>`
        SELECT id, deletion_request_id, customer_email, action, data_type,
               records_deleted, executed_by, executed_at, success, error_message, metadata
        FROM deletion_audit
        WHERE deletion_request_id = ${request_id}
        ORDER BY executed_at DESC
      `;

      log.info("Retrieved deletion audit", {
        request_id,
        audit_entries_count: auditEntries.length
      });

      return {
        request,
        audit_entries: auditEntries
      };

    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      log.error("Error retrieving deletion audit", { error: error.message, request_id });
      throw APIError.internal("Impossible de récupérer l'audit de suppression");
    }
  }
);

interface GetDeletionStatsResponse {
  total_requests: number;
  pending_requests: number;
  confirmed_requests: number;
  cancelled_requests: number;
  expired_requests: number;
  total_records_deleted: number;
  requests_by_status: Array<{ status: string; count: number }>;
  recent_requests: DeletionRequest[];
}

export const getDeletionStats = api<void, GetDeletionStatsResponse>(
  { 
    expose: true, 
    method: "GET", 
    path: "/admin/deletion-requests/stats",
    auth: true
  },
  async () => {
    try {
      const totalResult = await contractsDB.queryAll<{ count: number }>`
        SELECT COUNT(*) as count FROM deletion_requests
      `;
      const total_requests = totalResult[0]?.count || 0;

      const pendingResult = await contractsDB.queryAll<{ count: number }>`
        SELECT COUNT(*) as count FROM deletion_requests WHERE status = 'pending'
      `;
      const pending_requests = pendingResult[0]?.count || 0;

      const confirmedResult = await contractsDB.queryAll<{ count: number }>`
        SELECT COUNT(*) as count FROM deletion_requests WHERE status = 'confirmed'
      `;
      const confirmed_requests = confirmedResult[0]?.count || 0;

      const cancelledResult = await contractsDB.queryAll<{ count: number }>`
        SELECT COUNT(*) as count FROM deletion_requests WHERE status = 'cancelled'
      `;
      const cancelled_requests = cancelledResult[0]?.count || 0;

      const expiredResult = await contractsDB.queryAll<{ count: number }>`
        SELECT COUNT(*) as count FROM deletion_requests WHERE status = 'expired'
      `;
      const expired_requests = expiredResult[0]?.count || 0;

      const deletedRecordsResult = await contractsDB.queryAll<{ total: number }>`
        SELECT COALESCE(SUM(records_deleted), 0) as total 
        FROM deletion_audit 
        WHERE success = true
      `;
      const total_records_deleted = deletedRecordsResult[0]?.total || 0;

      const requestsByStatus = await contractsDB.queryAll<{ status: string; count: number }>`
        SELECT status, COUNT(*) as count 
        FROM deletion_requests 
        GROUP BY status
        ORDER BY count DESC
      `;

      const recentRequests = await contractsDB.queryAll<DeletionRequest>`
        SELECT id, customer_email, request_ip, request_user_agent, status, 
               requested_at, confirmed_at, expires_at, metadata
        FROM deletion_requests
        ORDER BY requested_at DESC
        LIMIT 10
      `;

      log.info("Retrieved deletion stats", {
        total_requests,
        pending_requests,
        confirmed_requests
      });

      return {
        total_requests,
        pending_requests,
        confirmed_requests,
        cancelled_requests,
        expired_requests,
        total_records_deleted,
        requests_by_status: requestsByStatus,
        recent_requests: recentRequests
      };

    } catch (error: any) {
      log.error("Error retrieving deletion stats", { error: error.message });
      throw APIError.internal("Impossible de récupérer les statistiques de suppression");
    }
  }
);
