import { api } from "encore.dev/api";
import { PricingConfig, getConfig, updateConfig } from "./config";

// Gets the pricing config.
export const getPricing = api<void, PricingConfig>(
  { auth: true, expose: true, method: "GET", path: "/admin/config/pricing" },
  async () => {
    const defaultConfig: PricingConfig = {
      pivot_headcount: 70,
      slope: 0.5,
      min_ttc_standard: {
        5000: 300, 10000: 350, 15000: 400, 20000: 450, 30000: 550,
        50000: 650, 75000: 800, 100000: 950
      },
      min_ttc_premium: null
    };
    return await getConfig<PricingConfig>('pricing.json', defaultConfig);
  }
);

// Updates the pricing config.
export const updatePricing = api<PricingConfig, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/admin/config/pricing" },
  async (config) => {
    await updateConfig('pricing.json', config);
    return { success: true };
  }
);
