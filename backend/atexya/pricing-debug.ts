import { api } from "encore.dev/api";

interface PricingDebugRequest {
  effectif_global: number;
  ctn: string;
  antecedents: {
    ip2: number;
    ip3: number;
    ip4: number;
    deces: number;
  };
  choix_garantie: number;
}

interface PricingDebugResponse {
  etapes: {
    etape: string;
    description: string;
    calcul: string;
    resultat: number | string;
  }[];
  parametres_utilises: {
    pivot_headcount: number;
    slope: number;
    taux_ctn: number;
    taxes_percent: number;
    plancher_standard: number;
    plancher_premium: number;
  };
  tarifs_finaux: {
    standard_ttc: number;
    premium_ttc: number;
  };
}

// Endpoint de debug pour comprendre le calcul des tarifs
export const debugPricing = api<PricingDebugRequest, PricingDebugResponse>(
  { expose: true, method: "POST", path: "/pricing/debug" },
  async (params) => {
    const { effectif_global, ctn, antecedents, choix_garantie } = params;

    // Configuration par défaut (normalement récupérée depuis admin)
    const pivot_headcount = 70;
    const slope = 0.5;
    const taxes_percent = 9;
    
    const tauxCtn: Record<string, number> = {
      'A': 0.29, 'C': 0.49, 'D': 0.39, 'E': 0.35,
      'F': 0.40, 'G': 0.11, 'H': 0.11, 'I': 0.40
    };

    const planchers: Record<number, number> = {
      5000: 300, 10000: 350, 15000: 400, 20000: 450, 30000: 550,
      50000: 650, 75000: 800, 100000: 950
    };

    const etapes = [];
    
    // Étape 1: Correction effectif
    const N_corr = Math.floor(effectif_global * 1.10 + 1);
    etapes.push({
      etape: "1. Correction de l'effectif",
      description: "Ajout de 10% + 1 pour tenir compte des variations",
      calcul: `Math.floor(${effectif_global} × 1.10 + 1)`,
      resultat: N_corr
    });

    // Étape 2: Application du pivot
    const N_scaled = Math.min(N_corr, pivot_headcount) + slope * Math.max(N_corr - pivot_headcount, 0);
    const scalingExplanation = N_corr <= pivot_headcount 
      ? `${N_corr} (pas de scaling car ≤ ${pivot_headcount})`
      : `${pivot_headcount} + ${slope} × (${N_corr} - ${pivot_headcount})`;
    
    etapes.push({
      etape: "2. Application du pivot",
      description: "Scaling pour les grands effectifs",
      calcul: scalingExplanation,
      resultat: Math.round(N_scaled * 100) / 100
    });

    // Étape 3: Taux CTN
    const prob = (tauxCtn[ctn] || 0) / 1000;
    etapes.push({
      etape: "3. Taux de sinistralité CTN",
      description: "Probabilité de sinistre selon le secteur d'activité",
      calcul: `${tauxCtn[ctn] || 0}‰ = ${prob}`,
      resultat: prob
    });

    // Étape 4: Antécédents
    const hasAntecedents = antecedents.ip2 > 0 || antecedents.ip3 > 0 || antecedents.ip4 > 0 || antecedents.deces > 0;
    const multiplier = hasAntecedents ? 2 : 1;
    etapes.push({
      etape: "4. Coefficient antécédents",
      description: "Majoration en cas de sinistres antérieurs",
      calcul: hasAntecedents ? "×2 (antécédents détectés)" : "×1 (pas d'antécédents)",
      resultat: multiplier
    });

    // Étape 5: Prime brute standard
    let prime_brute_ht = N_scaled * prob * choix_garantie * multiplier;
    etapes.push({
      etape: "5. Prime brute HT standard",
      description: "Calcul de base de la prime",
      calcul: `${Math.round(N_scaled * 100) / 100} × ${prob} × ${choix_garantie} × ${multiplier}`,
      resultat: Math.round(prime_brute_ht * 100) / 100
    });

    // Étape 6: Ajout des taxes
    const prime_brute_ttc = prime_brute_ht * (1 + taxes_percent / 100);
    etapes.push({
      etape: "6. Ajout des taxes",
      description: "Application du taux de taxes",
      calcul: `${Math.round(prime_brute_ht * 100) / 100} × 1.0${taxes_percent}`,
      resultat: Math.round(prime_brute_ttc * 100) / 100
    });

    // Étape 7: Application du plancher
    const plancher_standard = planchers[choix_garantie] || 300;
    const standard_ttc = Math.max(prime_brute_ttc, plancher_standard);
    etapes.push({
      etape: "7. Application du plancher standard",
      description: "Garantie d'un minimum de prime",
      calcul: `Max(${Math.round(prime_brute_ttc * 100) / 100}, ${plancher_standard})`,
      resultat: Math.round(standard_ttc * 100) / 100
    });

    // Calcul premium - nouvelles règles
    const garantie_premium = choix_garantie * 1.20; // 20% au lieu de 50%
    const prime_premium_ht = N_scaled * prob * garantie_premium * multiplier;
    const prime_premium_ttc = prime_premium_ht * (1 + taxes_percent / 100);
    const plancher_premium = plancher_standard * 1.2;
    const base_premium_ttc = Math.max(prime_premium_ttc, plancher_premium);
    const premium_ttc = base_premium_ttc * 1.10; // Majoration de 10%

    etapes.push({
      etape: "8. Calcul premium (nouvelles règles)",
      description: "Garantie +20%, prix +10%",
      calcul: `Garantie: ${garantie_premium}€, Base: ${Math.round(base_premium_ttc * 100) / 100}€, Final (+10%): ${Math.round(premium_ttc * 100) / 100}€`,
      resultat: Math.round(premium_ttc * 100) / 100
    });

    return {
      etapes,
      parametres_utilises: {
        pivot_headcount,
        slope,
        taux_ctn: prob,
        taxes_percent,
        plancher_standard,
        plancher_premium
      },
      tarifs_finaux: {
        standard_ttc: Math.round(standard_ttc * 100) / 100,
        premium_ttc: Math.round(premium_ttc * 100) / 100
      }
    };
  }
);
