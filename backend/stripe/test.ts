import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import log from "encore.dev/log";
import Stripe from "stripe";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");

interface TestStripeKeyResponse {
  valid: boolean;
  message: string;
  accountId?: string;
  accountName?: string;
  mode?: string;
}

export const testStripeKey = api<void, TestStripeKeyResponse>(
  { expose: true, method: "GET", path: "/stripe/test-key" },
  async () => {
    try {
      const key = STRIPE_SECRET_KEY();
      
      if (!key || key.trim() === "") {
        return {
          valid: false,
          message: "Clé Stripe non définie"
        };
      }

      const stripe = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
      
      const account = await stripe.accounts.retrieve();
      
      log.info("Stripe API key test successful", {
        accountId: account.id,
        mode: key.startsWith('sk_test_') ? 'test' : 'live'
      });

      return {
        valid: true,
        message: "Clé Stripe valide",
        accountId: account.id,
        accountName: account.business_profile?.name || account.email || "Non disponible",
        mode: key.startsWith('sk_test_') ? 'test' : 'live'
      };

    } catch (error: any) {
      log.error("Stripe API key test failed", { error: error.message });
      
      return {
        valid: false,
        message: `Clé Stripe invalide: ${error.message}`
      };
    }
  }
);
