import { api } from "encore.dev/api";
import { admin } from "~encore/clients";
import log from "encore.dev/log";

interface PricingRequest {
  effectif_global: number;
  ctn: string;
  antecedents: {
    ip2: number;
    ip3: number;
    ip4: number;
    deces: number;
  };
  choix_garantie: number;
  broker_code?: string;
}

interface PricingResponse {
  standard_ttc: number;
  premium_ttc: number;
  promo_active: boolean;
  promo_expires?: string;
  promo_label?: string;
  ht: number;
  taxes: number;
  // Ajout de détails de calcul pour transparence
  calculation_details?: {
    effectif_corrige: number;
    effectif_scaled: number;
    taux_ctn: number;
    prime_brute_ht: number;
    prime_brute_ttc: number;
    plancher_applique: number;
    antecedents_multiplier: number;
  };
}

// Calcule les tarifs d'assurance
export const calculatePricing = api<PricingRequest, PricingResponse>(
  { expose: true, method: "POST", path: "/pricing/calculate" },
  async (params) => {
    try {
      // Get pricing and promo config from admin service with fallback
      let pricingConfig;
      let promoConfig;
      
      try {
        [pricingConfig, promoConfig] = await Promise.all([
          admin.getPricing(),
          admin.getPromo()
        ]);
      } catch (adminError) {
        log.warn("Failed to get admin config, using defaults", { error: adminError });
        
        // Fallback configuration
        pricingConfig = {
          pivot_headcount: 70,
          slope: 0.5,
          min_ttc_standard: {
            5000: 300, 10000: 350, 15000: 400, 20000: 450, 30000: 550,
            50000: 650, 75000: 800, 100000: 950
          },
          min_ttc_premium: null
        };
        
        promoConfig = {
          active: false,
          discount_percent: 0,
          expires: '',
          label: ''
        };
      }

      const { effectif_global, ctn, antecedents, choix_garantie } = params;

      log.info("Calcul pricing", { 
        effectif_global, 
        ctn, 
        choix_garantie, 
        antecedents 
      });

      // Default CTN rates (pour 1000)
      const tauxCtn: Record<string, number> = {
        'A': 0.29,
        'C': 0.49,
        'D': 0.39,
        'E': 0.35,
        'F': 0.40,
        'G': 0.11,
        'H': 0.11,
        'I': 0.40
      };

      // 1. Calculate effective headcount
      const N_corr = Math.floor(effectif_global * 1.10 + 1);
      log.info("Effectif corrigé", { effectif_global, N_corr });

      // 2. Apply pivot scaling
      const N_scaled = Math.min(N_corr, pricingConfig.pivot_headcount) + 
                      pricingConfig.slope * Math.max(N_corr - pricingConfig.pivot_headcount, 0);
      log.info("Effectif scalé", { N_corr, N_scaled, pivot: pricingConfig.pivot_headcount, slope: pricingConfig.slope });
      
      // 3. Get CTN probability
      const prob = (tauxCtn[ctn] || 0) / 1000;
      log.info("Probabilité CTN", { ctn, taux: tauxCtn[ctn], prob });
      
      // 4. Check for antecedents
      const hasAntecedents = antecedents.ip2 > 0 || antecedents.ip3 > 0 || 
                            antecedents.ip4 > 0 || antecedents.deces > 0;
      const antecedentsMultiplier = hasAntecedents ? 2 : 1;
      log.info("Antécédents", { hasAntecedents, multiplier: antecedentsMultiplier });

      // 5. Standard calculation
      let prime_brute_standard_ht = N_scaled * prob * choix_garantie;
      if (hasAntecedents) {
        prime_brute_standard_ht *= 2;
      }
      
      log.info("Prime brute standard", { 
        calcul: `${N_scaled} * ${prob} * ${choix_garantie} * ${antecedentsMultiplier}`,
        prime_brute_standard_ht 
      });
      
      const prime_brute_standard_ttc = prime_brute_standard_ht * 1.09;
      const plancher_standard = pricingConfig.min_ttc_standard[choix_garantie] || 300;
      let standard_ttc = Math.max(prime_brute_standard_ttc, plancher_standard);
      
      log.info("Standard TTC", { 
        prime_brute_ttc: prime_brute_standard_ttc, 
        plancher_standard, 
        standard_ttc 
      });
      
      if (standard_ttc <= 0) standard_ttc = 300;

      // 6. Premium calculation - nouvelles règles
      // Garantie augmentée de 20% (au lieu de 50%), sans limite de 200k€
      const garantie_premium = choix_garantie * 1.20;
      
      // Prime calculée sur la garantie premium
      let prime_brute_premium_ht = N_scaled * prob * garantie_premium;
      if (hasAntecedents) {
        prime_brute_premium_ht *= 2;
      }
      
      const prime_brute_premium_ttc = prime_brute_premium_ht * 1.09;
      
      // Le plancher premium reste à 20% de plus que le standard
      const plancher_premium = plancher_standard * 1.2;
      
      // Appliquer le plancher
      let base_premium_ttc = Math.max(prime_brute_premium_ttc, plancher_premium);
      
      // Majoration de 10% sur le prix final (après plancher)
      let premium_ttc = base_premium_ttc * 1.10;
      
      log.info("Prime premium calculée", { 
        garantie_premium,
        calcul: `${N_scaled} * ${prob} * ${garantie_premium} * ${antecedentsMultiplier}`,
        prime_brute_premium_ht,
        prime_brute_premium_ttc,
        plancher_premium,
        base_premium_ttc,
        premium_ttc_final: premium_ttc
      });
      
      // 7. Apply promotion if active
      if (promoConfig.active) {
        const old_premium = premium_ttc;
        premium_ttc *= (1 - promoConfig.discount_percent / 100);
        log.info("Promotion appliquée", { old_premium, new_premium: premium_ttc, discount: promoConfig.discount_percent });
      }
      
      if (premium_ttc <= 0) premium_ttc = standard_ttc * 1.2;

      const ht = standard_ttc / 1.09;
      const taxes = standard_ttc - ht;

      const result = {
        standard_ttc: Math.round(standard_ttc * 100) / 100,
        premium_ttc: Math.round(premium_ttc * 100) / 100,
        promo_active: promoConfig.active,
        promo_expires: promoConfig.expires,
        promo_label: promoConfig.label,
        ht: Math.round(ht * 100) / 100,
        taxes: Math.round(taxes * 100) / 100,
        calculation_details: {
          effectif_corrige: N_corr,
          effectif_scaled: Math.round(N_scaled * 100) / 100,
          taux_ctn: prob,
          prime_brute_ht: Math.round(prime_brute_standard_ht * 100) / 100,
          prime_brute_ttc: Math.round(prime_brute_standard_ttc * 100) / 100,
          plancher_applique: plancher_standard,
          antecedents_multiplier: antecedentsMultiplier
        }
      };

      log.info("Résultat final du calcul", result);
      return result;

    } catch (error) {
      log.error("Error calculating pricing", { error });
      
      // Fallback calculation
      const standard_ttc = 500;
      const premium_ttc = 650;
      const ht = standard_ttc / 1.09;
      const taxes = standard_ttc - ht;

      return {
        standard_ttc,
        premium_ttc,
        promo_active: false,
        ht: Math.round(ht * 100) / 100,
        taxes: Math.round(taxes * 100) / 100
      };
    }
  }
);
