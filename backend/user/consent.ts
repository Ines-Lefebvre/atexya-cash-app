import { api, APIError } from "encore.dev/api";
import log from "encore.dev/log";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const contractsDB = SQLDatabase.named("contracts");

interface SaveConsentPreferencesRequest {
  analytics: boolean;
  marketing: boolean;
  user_identifier?: string;
}

interface SaveConsentPreferencesResponse {
  success: boolean;
  consent_id: number;
}

export const saveConsentPreferences = api<SaveConsentPreferencesRequest, SaveConsentPreferencesResponse>(
  { expose: true, method: "POST", path: "/user/consent" },
  async (params: SaveConsentPreferencesRequest) => {
    try {
      const { analytics, marketing, user_identifier } = params;

      const sessionId = generateSessionId();

      const result = await contractsDB.queryRow<{ id: number }>`
        INSERT INTO user_consent (
          user_identifier, session_id, analytics_consent, marketing_consent,
          consent_date, updated_at
        ) VALUES (
          ${user_identifier || null}, ${sessionId}, ${analytics}, ${marketing},
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id
      `;

      if (!result) {
        throw APIError.internal("Impossible d'enregistrer le consentement");
      }

      log.info("User consent saved", {
        consent_id: result.id,
        analytics,
        marketing,
        user_identifier
      });

      return {
        success: true,
        consent_id: result.id
      };

    } catch (error: any) {
      log.error("Error saving consent preferences", { error: error.message });
      throw APIError.internal("Impossible d'enregistrer les préférences de consentement");
    }
  }
);

interface UpdateConsentPreferencesRequest {
  user_identifier: string;
  analytics: boolean;
  marketing: boolean;
}

interface UpdateConsentPreferencesResponse {
  success: boolean;
}

export const updateConsentPreferences = api<UpdateConsentPreferencesRequest, UpdateConsentPreferencesResponse>(
  { expose: true, method: "PUT", path: "/user/consent" },
  async (params: UpdateConsentPreferencesRequest) => {
    try {
      const { user_identifier, analytics, marketing } = params;

      await contractsDB.exec`
        UPDATE user_consent
        SET analytics_consent = ${analytics},
            marketing_consent = ${marketing},
            updated_at = CURRENT_TIMESTAMP
        WHERE user_identifier = ${user_identifier}
          AND id = (
            SELECT id FROM user_consent
            WHERE user_identifier = ${user_identifier}
            ORDER BY consent_date DESC
            LIMIT 1
          )
      `;

      log.info("User consent updated", {
        user_identifier,
        analytics,
        marketing
      });

      return { success: true };

    } catch (error: any) {
      log.error("Error updating consent preferences", { error: error.message });
      throw APIError.internal("Impossible de mettre à jour les préférences");
    }
  }
);

interface GetConsentPreferencesRequest {
  user_identifier: string;
}

interface GetConsentPreferencesResponse {
  analytics: boolean;
  marketing: boolean;
  consent_date: Date;
  updated_at: Date;
}

export const getConsentPreferences = api<GetConsentPreferencesRequest, GetConsentPreferencesResponse>(
  { expose: true, method: "GET", path: "/user/consent/:user_identifier" },
  async ({ user_identifier }: GetConsentPreferencesRequest) => {
    try {
      const consent = await contractsDB.queryRow<{
        analytics_consent: boolean;
        marketing_consent: boolean;
        consent_date: Date;
        updated_at: Date;
      }>`
        SELECT analytics_consent, marketing_consent, consent_date, updated_at
        FROM user_consent
        WHERE user_identifier = ${user_identifier}
        ORDER BY consent_date DESC
        LIMIT 1
      `;

      if (!consent) {
        throw APIError.notFound("Aucun consentement trouvé pour cet utilisateur");
      }

      return {
        analytics: consent.analytics_consent,
        marketing: consent.marketing_consent,
        consent_date: consent.consent_date,
        updated_at: consent.updated_at
      };

    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      log.error("Error getting consent preferences", { error: error.message });
      throw APIError.internal("Impossible de récupérer les préférences");
    }
  }
);

interface RevokeConsentRequest {
  user_identifier: string;
}

interface RevokeConsentResponse {
  success: boolean;
}

export const revokeConsent = api<RevokeConsentRequest, RevokeConsentResponse>(
  { expose: true, method: "DELETE", path: "/user/consent/:user_identifier" },
  async ({ user_identifier }: RevokeConsentRequest) => {
    try {
      await contractsDB.exec`
        UPDATE user_consent
        SET analytics_consent = false,
            marketing_consent = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_identifier = ${user_identifier}
          AND id = (
            SELECT id FROM user_consent
            WHERE user_identifier = ${user_identifier}
            ORDER BY consent_date DESC
            LIMIT 1
          )
      `;

      log.info("User consent revoked", { user_identifier });

      return { success: true };

    } catch (error: any) {
      log.error("Error revoking consent", { error: error.message });
      throw APIError.internal("Impossible de révoquer le consentement");
    }
  }
);

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
