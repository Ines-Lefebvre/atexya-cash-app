import { api, APIError } from "encore.dev/api";
import { CgvConfig, configBucket, getConfig, updateConfig } from "./config";
import { safeLog } from "../utils/safeLog";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB in bytes
const ALLOWED_MIME_TYPE = 'application/pdf';

// Vérifie qu'un fichier est bien un PDF valide
const validatePdfSignature = (buffer: Buffer): boolean => {
  // Les fichiers PDF commencent toujours par %PDF-
  const pdfSignature = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]); // %PDF-
  
  if (buffer.length < 5) {
    return false;
  }
  
  return buffer.subarray(0, 5).equals(pdfSignature);
};

// Simple antivirus scan (vérifie les patterns malveillants basiques)
const scanForMaliciousPatterns = (buffer: Buffer): { safe: boolean; reason?: string } => {
  const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 10000));
  
  // Patterns malveillants connus dans les PDFs
  const maliciousPatterns = [
    '/JavaScript',
    '/JS',
    '/Launch',
    '/SubmitForm',
    '/ImportData',
    '/GoToE',
    '/GoToR',
    '/Sound',
    '/Movie',
    '/RichMedia',
    '/Flash',
    'eval(',
    'unescape(',
    '%u00'
  ];
  
  for (const pattern of maliciousPatterns) {
    if (content.includes(pattern)) {
      return { 
        safe: false, 
        reason: `Potentially malicious pattern detected: ${pattern}` 
      };
    }
  }
  
  // Vérifier la taille excessive d'objets (potentiellement des bombes zip)
  if (buffer.length > MAX_FILE_SIZE * 2) {
    return { 
      safe: false, 
      reason: 'File appears to be compressed excessively (potential zip bomb)' 
    };
  }
  
  return { safe: true };
};

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
  file: string;
}

// Uploads the CGV PDF (with security validation).
export const uploadCgvPdf = api<UploadCgvRequest, { success: boolean }>(
  { auth: true, expose: true, method: "POST", path: "/admin/config/cgv/upload" },
  async (params) => {
    try {
      // Décoder le fichier base64
      const buffer = Buffer.from(params.file, 'base64');
      
      // 1. Vérifier la taille du fichier
      if (buffer.length > MAX_FILE_SIZE) {
        safeLog.warn("CGV upload rejected: file too large", { 
          size: buffer.length,
          maxSize: MAX_FILE_SIZE 
        });
        throw APIError.invalidArgument(
          `Le fichier est trop volumineux. Taille maximale autorisée : ${MAX_FILE_SIZE / 1024 / 1024} MB`
        );
      }
      
      // 2. Vérifier la signature PDF (magic bytes)
      if (!validatePdfSignature(buffer)) {
        safeLog.warn("CGV upload rejected: invalid PDF signature");
        throw APIError.invalidArgument("Le fichier n'est pas un PDF valide");
      }
      
      // 3. Scanner pour des patterns malveillants
      const scanResult = scanForMaliciousPatterns(buffer);
      if (!scanResult.safe) {
        safeLog.error("CGV upload rejected: malicious content detected", { 
          reason: scanResult.reason 
        });
        throw APIError.invalidArgument(
          "Le fichier contient du contenu potentiellement malveillant et a été rejeté"
        );
      }
      
      // 4. Upload vers le bucket
      await configBucket.upload('docs/cgv.pdf', buffer, { 
        contentType: ALLOWED_MIME_TYPE 
      });
      
      safeLog.info("CGV PDF uploaded successfully", { 
        size: buffer.length 
      });
      
      return { success: true };
      
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      
      safeLog.error("Error uploading CGV PDF", { error: error.message });
      throw APIError.internal("Erreur lors de l'upload du fichier CGV");
    }
  }
);
