import { api } from "encore.dev/api";
import { LinksConfig, getConfig, updateConfig } from "./config";

// Gets the links config.
export const getLinks = api<void, LinksConfig>(
  { auth: true, expose: true, method: "GET", path: "/admin/config/links" },
  async () => {
    return await getConfig<LinksConfig>('links.json', { header_urls: [], footer_urls: [], orias: '' });
  }
);

// Updates the links config.
export const updateLinks = api<LinksConfig, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/admin/config/links" },
  async (config) => {
    await updateConfig('links.json', config);
    return { success: true };
  }
);
