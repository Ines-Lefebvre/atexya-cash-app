// EXPLICATION DU CALCUL DES TARIFS ATEXYA
// =====================================

/*
ÉTAPES DU CALCUL :

1. CORRECTION DE L'EFFECTIF
   - N_corr = Math.floor(effectif_global * 1.10 + 1)
   - Exemple : 50 salariés → N_corr = Math.floor(50 * 1.10 + 1) = 56

2. EFFECTIF AJUSTÉ (PIVOT)
   - pivot_headcount par défaut = 70
   - slope par défaut = 0.5
   - N_scaled = Math.min(N_corr, pivot_headcount) + slope * Math.max(N_corr - pivot_headcount, 0)
   - Si N_corr ≤ 70 : N_scaled = N_corr
   - Si N_corr > 70 : N_scaled = 70 + 0.5 * (N_corr - 70)

3. PROBABILITÉ SELON LE CTN
   - Taux CTN par défaut (pour 1000) :
     * CTN A: 0.29‰
     * CTN C: 0.49‰
     * CTN D: 0.39‰
     * CTN E: 0.35‰
     * CTN F: 0.40‰
     * CTN G: 0.11‰
     * CTN H: 0.11‰
     * CTN I: 0.40‰
   - prob = (tauxCtn[ctn] || 0) / 1000

4. CALCUL PRIME BRUTE STANDARD
   - prime_brute_standard_ht = N_scaled * prob * choix_garantie
   - Si antécédents (IP2, IP3, IP4, décès > 0) : multiplier par 2
   - prime_brute_standard_ttc = prime_brute_standard_ht * 1.09 (9% de taxes)

5. APPLICATION DU PLANCHER
   - Planchers minimum TTC par garantie :
     * 5000€: 300€
     * 10000€: 350€
     * 15000€: 400€
     * 20000€: 450€
     * 30000€: 550€
     * 50000€: 650€
     * 75000€: 800€
     * 100000€: 950€
   - standard_ttc = Math.max(prime_brute_standard_ttc, plancher_standard)

6. CALCUL PREMIUM (NOUVELLES RÈGLES)
   - garantie_premium = choix_garantie * 1.20 (20% au lieu de 50%)
   - prime_brute_premium_ht = N_scaled * prob * garantie_premium
   - Si antécédents : multiplier par 2
   - prime_brute_premium_ttc = prime_brute_premium_ht * 1.09
   - plancher_premium = plancher_standard * 1.2
   - base_premium_ttc = Math.max(prime_brute_premium_ttc, plancher_premium)
   - premium_ttc = base_premium_ttc * 1.10 (majoration de 10%)

7. PROMOTION
   - Si promotion active : premium_ttc *= (1 - discount_percent / 100)

EXEMPLE CONCRET :
================
Effectif: 50 salariés
CTN: C (0.49‰)
Garantie: 50000€
Pas d'antécédents

1. N_corr = Math.floor(50 * 1.10 + 1) = 56
2. N_scaled = 56 (car < 70)
3. prob = 0.49 / 1000 = 0.00049
4. prime_brute_ht = 56 * 0.00049 * 50000 = 1372€
5. prime_brute_ttc = 1372 * 1.09 = 1495.48€
6. plancher = 650€ (pour garantie 50000€)
7. standard_ttc = Math.max(1495.48, 650) = 1495.48€

Pour le premium (nouvelles règles) :
- garantie_premium = 50000 * 1.20 = 60000€
- prime_brute_premium_ht = 56 * 0.00049 * 60000 = 1646.4€
- prime_brute_premium_ttc = 1646.4 * 1.09 = 1794.576€
- plancher_premium = 650 * 1.2 = 780€
- base_premium_ttc = Math.max(1794.576, 780) = 1794.576€
- premium_ttc = 1794.576 * 1.10 = 1974.03€

NOUVELLES GARANTIES PREMIUM :
============================
Garantie Standard → Garantie Premium (+20%)
5000€ → 6000€
10000€ → 12000€
15000€ → 18000€
20000€ → 24000€
25000€ → 30000€
30000€ → 36000€
35000€ → 42000€
40000€ → 48000€
45000€ → 54000€
50000€ → 60000€

CHANGEMENTS DANS LE CALCUL PREMIUM :
===================================
1. Augmentation de garantie : 20% (au lieu de 50% précédemment)
2. Pas de limite de 200k€
3. Majoration de prix : +10% sur le prix final (après plancher)
4. Les promotions s'appliquent toujours après le calcul de base

POINTS D'ATTENTION :
===================
1. Le calcul reste basé sur le même modèle actuariel
2. Les taux CTN et les planchers ne changent pas
3. La formule de base reste N_scaled * prob * garantie
4. Seule la logique premium change
5. Les promotions continuent de s'appliquer normalement
*/

export {};
