import { api } from "encore.dev/api";
import { PromoConfig, getConfig, updateConfig } from "./config";

// Gets the promotion config.
export const getPromo = api<void, PromoConfig>(
  { auth: true, expose: true, method: "GET", path: "/admin/config/promo" },
  async () => {
    return await getConfig<PromoConfig>('promo.json', { active: false, discount_percent: 0, expires: '', label: '' });
  }
);

// Updates the promotion config.
export const updatePromo = api<PromoConfig, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/admin/config/promo" },
  async (config) => {
    await updateConfig('promo.json', config);
    return { success: true };
  }
);
