import { api } from "encore.dev/api";
import { CgvConfig, configBucket, getConfig, updateConfig } from "./config";

// Gets the CGV config.
export const getCgv = api<void, CgvConfig>(
  { auth: true, expose: true, method: "GET", path: "/admin/config/cgv" },
  async () => {
    return await getConfig<CgvConfig>('cgv.json', { version: 'YYYY-MM' });
  }
);

// Updates the CGV config.
export const updateCgv = api<CgvConfig, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/admin/config/cgv" },
  async (config) => {
    await updateConfig('cgv.json', config);
    return { success: true };
  }
);

interface UploadCgvRequest {
  // The file contents, base64-encoded.
  file: string;
}

// Uploads the CGV PDF.
export const uploadCgvPdf = api<UploadCgvRequest, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/admin/config/cgv/upload" },
  async (params) => {
    const buffer = Buffer.from(params.file, 'base64');
    await configBucket.upload('docs/cgv.pdf', buffer, { contentType: 'application/pdf' });
    return { success: true };
  }
);
