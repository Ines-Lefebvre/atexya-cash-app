import { api } from "encore.dev/api";
import { BrokersConfig, getConfig, updateConfig } from "./config";

// Gets the brokers config.
export const getBrokers = api<void, BrokersConfig>(
  { auth: true, expose: true, method: "GET", path: "/admin/config/brokers" },
  async () => {
    return await getConfig<BrokersConfig>('brokers.json', { brokers: [] });
  }
);

// Updates the brokers config.
export const updateBrokers = api<BrokersConfig, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/admin/config/brokers" },
  async (config) => {
    await updateConfig('brokers.json', config);
    return { success: true };
  }
);
