import Stripe from "stripe";
import { secret } from "encore.dev/config";

const STRIPE_SECRET_KEY = secret("STRIPE_SECRET_KEY");

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = STRIPE_SECRET_KEY();
    if (!secretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }
    stripeInstance = new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeInstance;
}

export function getFrontendUrl(): string {
  return (
    process.env.FRONTEND_URL ||
    process.env.FRONT_URL ||
    "https://atexya-cash-app-d2vtgnc82vjvosnddaqg.lp.dev"
  );
}
