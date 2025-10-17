import { api, APIError } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { safeLog, hashValue } from "../utils/safeLog";

const PAPPERS_API_KEY = secret("PAPPERS_API_KEY");

interface PappersCompanyRequest {
  siren: string;
}

interface PappersAddress {
  ligne_1?: string;
  ligne_2?: string;
  code_postal?: string;
  ville?: string;
}

interface PappersEtablissement {
  siret: string;
  denomination_usuelle?: string;
  nom?: string;
  adresse?: PappersAddress;
  effectif?: number;
  tranche_effectif?: string;
}

interface PappersCompanyData {
  denomination?: string;
  raison_sociale?: string;
  siege?: PappersAddress;
  code_naf?: string;
  libelle_code_naf?: string;
  forme_juridique?: string;
  etablissements?: PappersEtablissement[];
}

interface CompanyInfo {
  denomination: string;
  adresse: string;
  code_postal: string;
  ville: string;
  code_naf: string;
  forme_juridique: string;
}

interface Etablissement {
  siret: string;
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  salaries: number;
}

export function parseHeadcountLabel(label: string): number | null {
  if (!label || typeof label !== 'string') return null;
  
  const trimmed = label.trim();
  if (!trimmed) return null;
  
  const num = Number(trimmed);
  if (Number.isInteger(num) && num >= 0) return num;
  
  const rangeMatch = trimmed.match(/^(\d+)\s*(?:à|-|–)\s*(\d+)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    return Math.floor((min + max) / 2);
  }
  
  const plusMatch = trimmed.match(/^(\d+)\+?$/);
  if (plusMatch) {
    return parseInt(plusMatch[1], 10);
  }
  
  return null;
}

interface PappersResponse {
  company_data: CompanyInfo;
  etablissements: Etablissement[];
  api_failed: boolean;
}

// Recherche les informations d'une entreprise via son SIREN
export const searchCompany = api<PappersCompanyRequest, PappersResponse>(
  { expose: true, method: "POST", path: "/pappers/company" },
  async (params) => {
    try {
      const apiKey = PAPPERS_API_KEY();
      
      safeLog.info("Searching company with SIREN", { sirenHash: hashValue(params.siren), hasApiKey: !!apiKey });
      
      // Si pas de clé API, on force le mode dégradé
      if (!apiKey || apiKey.trim() === "") {
        safeLog.warn("PAPPERS_API_KEY secret is not set. Falling back to degraded mode.");
        return {
          company_data: { 
            denomination: "Société SIREN " + params.siren, 
            adresse: "Adresse non disponible", 
            code_postal: "00000", 
            ville: "Ville non disponible", 
            code_naf: "0000Z", 
            forme_juridique: "Non disponible" 
          },
          etablissements: [{
            siret: params.siren + "00019",
            nom: "Établissement principal",
            adresse: "Adresse non disponible",
            code_postal: "00000",
            ville: "Ville non disponible",
            salaries: 25
          }],
          api_failed: true,
        };
      }

      // Validation du SIREN
      if (!/^\d{9}$/.test(params.siren)) {
        safeLog.error("Invalid SIREN format", { sirenHash: hashValue(params.siren) });
        throw APIError.invalidArgument("Le SIREN doit contenir exactement 9 chiffres");
      }

      // URL corrigée - utilisation de l'endpoint principal
      const companyUrl = `https://api.pappers.fr/v2/entreprise?siren=${params.siren}&api_token=${apiKey}`;
      
      safeLog.info("Calling Pappers API", { url: companyUrl.replace(apiKey, 'HIDDEN') });

      // Appel principal pour récupérer les données de l'entreprise
      const companyResponse = await fetch(companyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Atexya/1.0'
        }
      });

      safeLog.info("Pappers API response received", { 
        status: companyResponse.status, 
        statusText: companyResponse.statusText,
        headers: Object.fromEntries(companyResponse.headers.entries())
      });

      if (!companyResponse.ok) {
        const errorText = await companyResponse.text();
        safeLog.error("Pappers company API request failed", { 
          status: companyResponse.status, 
          statusText: companyResponse.statusText,
          body: errorText,
          siren: params.siren
        });
        
        // Mode dégradé en cas d'erreur API
        return {
          company_data: { 
            denomination: "Société SIREN " + params.siren, 
            adresse: "Veuillez saisir l'adresse", 
            code_postal: "", 
            ville: "", 
            code_naf: "", 
            forme_juridique: "" 
          },
          etablissements: [],
          api_failed: true,
        };
      }

      const responseText = await companyResponse.text();
      safeLog.info("Pappers API response body", { body: responseText.substring(0, 500) + "..." });

      let companyData: PappersCompanyData;
      try {
        companyData = JSON.parse(responseText);
      } catch (parseError) {
        safeLog.error("Failed to parse Pappers response", { error: parseError, body: responseText });
        throw new Error("Invalid JSON response from Pappers API");
      }

      if (!companyData) {
        safeLog.error("Pappers API returned empty data for company.");
        return {
          company_data: { 
            denomination: "Société SIREN " + params.siren, 
            adresse: "Données non disponibles", 
            code_postal: "", 
            ville: "", 
            code_naf: "", 
            forme_juridique: "" 
          },
          etablissements: [],
          api_failed: true,
        };
      }

      safeLog.info("Pappers company data received", { 
        hasEtablissements: !!companyData.etablissements && companyData.etablissements.length > 0
      });

      // Si pas d'établissements dans la réponse principale, essayer l'endpoint établissements
      let etablissements: PappersEtablissement[] = companyData.etablissements || [];
      if (etablissements.length === 0) {
        try {
          const etablissementsUrl = `https://api.pappers.fr/v2/etablissements?siren=${params.siren}&api_token=${apiKey}`;
          safeLog.info("Fetching etablissements separately", { url: etablissementsUrl.replace(apiKey, 'HIDDEN') });
          
          const etablissementsResponse = await fetch(etablissementsUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Atexya/1.0'
            }
          });
          
          if (etablissementsResponse.ok) {
            const etablissementsText = await etablissementsResponse.text();
            const etablissementsData = JSON.parse(etablissementsText);
            etablissements = etablissementsData?.resultats || [];
            safeLog.info("Etablissements fetched separately", { count: etablissements.length });
          } else {
            safeLog.warn("Pappers etablissements API request failed", { 
              status: etablissementsResponse.status 
            });
          }
        } catch (err: any) {
          safeLog.warn("Error fetching etablissements, continuing with company data only", { error: err.message });
        }
      }

      // Formatage des données pour le frontend
      const company_info: CompanyInfo = {
        denomination: companyData.denomination || companyData.raison_sociale || "Société " + params.siren,
        adresse: companyData.siege?.ligne_1 || "",
        code_postal: companyData.siege?.code_postal || "",
        ville: companyData.siege?.ville || "",
        code_naf: companyData.code_naf || "",
        forme_juridique: companyData.forme_juridique || ""
      };

      const formatted_etablissements: Etablissement[] = etablissements.map(etab => {
        let salariesCount = 0;
        if (typeof etab.effectif === 'number' && Number.isInteger(etab.effectif) && etab.effectif > 0) {
          salariesCount = etab.effectif;
        } else if (etab.tranche_effectif) {
          const parsed = parseHeadcountLabel(etab.tranche_effectif);
          salariesCount = parsed !== null ? parsed : 0;
        }
        
        return {
          siret: etab.siret,
          nom: etab.denomination_usuelle || etab.nom || company_info.denomination,
          adresse: etab.adresse?.ligne_1 || company_info.adresse,
          code_postal: etab.adresse?.code_postal || company_info.code_postal,
          ville: etab.adresse?.ville || company_info.ville,
          salaries: salariesCount
        };
      });

      safeLog.info("Company search completed successfully", { 
        etablissements_count: formatted_etablissements.length
      });

      return {
        company_data: company_info,
        etablissements: formatted_etablissements,
        api_failed: false
      };

    } catch (error: any) {
      safeLog.error("Error in searchCompany endpoint", { 
        error: error.message, 
        stack: error.stack,
        sirenHash: hashValue(params.siren)
      });
      
      // Mode dégradé complet en cas d'exception
      return {
        company_data: {
          denomination: "Société SIREN " + params.siren,
          adresse: "Veuillez saisir manuellement",
          code_postal: "",
          ville: "",
          code_naf: "",
          forme_juridique: ""
        },
        etablissements: [],
        api_failed: true
      };
    }
  }
);
