/**
 * Script de purge RGPD pour les contrats non signés
 * 
 * Ce fichier contient la logique de purge automatique des contrats non signés
 * après 2 mois, conformément au RGPD (Article 5(1)(e) - Limitation de conservation)
 * 
 * IMPORTANT: Pour activer ce cron job automatique, configurez-le dans votre
 * plateforme d'hébergement pour s'exécuter tous les jours à 2h du matin.
 * 
 * Vous pouvez aussi l'appeler manuellement via l'API : POST /atexya/purge-old-contracts
 */

import { api } from "encore.dev/api";
import { contractsDB } from "./contracts";
import { safeLog } from "../utils/safeLog";

interface PurgeResponse {
  deleted: number;
  cutoffDate: string;
}

/**
 * Purge les contrats non signés de plus de 2 mois (RGPD)
 * 
 * Supprime automatiquement les contrats avec statut pending, failed ou cancelled
 * créés il y a plus de 2 mois, conformément aux exigences RGPD.
 * 
 * Peut être appelé manuellement ou via un cron job externe.
 */
export const purgeOldContracts = api<void, PurgeResponse>(
  { expose: false, method: "POST", path: "/purge-old-contracts", auth: true },
  async (): Promise<PurgeResponse> => {
    try {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const cutoffDate = twoMonthsAgo.toISOString();

      // Compter les contrats à supprimer
      const countResult = await contractsDB.rawQueryRow<{ count: number }>(
        `SELECT COUNT(*) as count FROM contracts 
         WHERE payment_status IN ('pending', 'failed', 'cancelled') 
         AND created_at < $1`,
        cutoffDate
      );

      const contractsToDelete = countResult?.count || 0;

      if (contractsToDelete === 0) {
        safeLog.info("No old unsigned contracts to purge");
        return { deleted: 0, cutoffDate };
      }

      // Supprimer les contrats
      await contractsDB.rawExec(
        `DELETE FROM contracts 
         WHERE payment_status IN ('pending', 'failed', 'cancelled') 
         AND created_at < $1`,
        cutoffDate
      );

      safeLog.info("Purged old unsigned contracts (RGPD compliance)", {
        deleted: contractsToDelete,
        cutoffDate
      });

      return { deleted: contractsToDelete, cutoffDate };
    } catch (error: any) {
      safeLog.error("Error purging old contracts", { error: error.message });
      throw error;
    }
  }
);

/**
 * CONFIGURATION CRON JOB
 * 
 * Pour planifier l'exécution automatique quotidienne, ajoutez un cron job
 * dans votre système d'hébergement :
 * 
 * Fréquence : Tous les jours à 2h00
 * Commande : curl -X POST https://your-api-url/atexya/purge-old-contracts \
 *            -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
 * 
 * Alternativement, utilisez un service comme :
 * - GitHub Actions avec scheduled workflow
 * - AWS EventBridge
 * - Google Cloud Scheduler
 * - Vercel Cron Jobs
 * 
 * Exemple GitHub Actions (.github/workflows/purge-contracts.yml) :
 * 
 * name: RGPD Contract Purge
 * on:
 *   schedule:
 *     - cron: '0 2 * * *'  # Tous les jours à 2h UTC
 * jobs:
 *   purge:
 *     runs-on: ubuntu-latest
 *     steps:
 *       - name: Call purge endpoint
 *         run: |
 *           curl -X POST ${{ secrets.API_URL }}/atexya/purge-old-contracts \
 *             -H "Cookie: atexya_admin_session=${{ secrets.ADMIN_SESSION }}"
 */
