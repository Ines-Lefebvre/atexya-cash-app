import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// Mock the ~encore/clients module before any imports
vi.mock('~encore/clients', () => ({
  admin: {
    getPricing: vi.fn(),
    getPromo: vi.fn(),
  },
}));

import { admin } from '~encore/clients';
import { calculatePricing } from './pricing';
import type { PricingConfig, PromoConfig } from '../admin/config';

const defaultPricingConfig: PricingConfig = {
  pivot_headcount: 70,
  slope: 0.5,
  min_ttc_standard: {
    5000: 300, 10000: 350, 15000: 400, 20000: 450, 30000: 550,
    50000: 650, 75000: 800, 100000: 950
  },
  min_ttc_premium: {
    5000: 360, 10000: 420, 15000: 480, 20000: 540, 30000: 660,
    50000: 780, 75000: 960, 100000: 1140
  }
};

const defaultPromoConfig: PromoConfig = {
  active: false,
  discount_percent: 0,
  expires: '',
  label: ''
};

const activePromoConfig: PromoConfig = {
  active: true,
  discount_percent: 15,
  expires: '2025-12-31',
  label: 'Offre Spéciale'
};

describe('calculatePricing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Setup default mocks for each test
    (admin.getPricing as Mock).mockResolvedValue(defaultPricingConfig);
    (admin.getPromo as Mock).mockResolvedValue(defaultPromoConfig);
  });

  it('should calculate standard and premium prices correctly without antecedents', async () => {
    const params = {
      effectif_global: 50,
      ctn: 'C',
      antecedents: { ip2: 0, ip3: 0, ip4: 0, deces: 0 },
      choix_garantie: 50000,
    };

    const result = await calculatePricing(params);

    expect(result.standard_ttc).toBeCloseTo(1495.48);
    expect(result.premium_ttc).toBeCloseTo(1974.03);
    expect(result.promo_active).toBe(false);
  });

  it('should double the price when antecedents are present', async () => {
    const params = {
      effectif_global: 50,
      ctn: 'C',
      antecedents: { ip2: 1, ip3: 0, ip4: 0, deces: 0 },
      choix_garantie: 50000,
    };

    const result = await calculatePricing(params);

    expect(result.standard_ttc).toBeCloseTo(2990.96);
    expect(result.premium_ttc).toBeCloseTo(3948.07);
  });

  it('should apply floor prices when calculated price is too low', async () => {
    const params = {
      effectif_global: 20,
      ctn: 'A',
      antecedents: { ip2: 0, ip3: 0, ip4: 0, deces: 0 },
      choix_garantie: 5000,
    };

    const result = await calculatePricing(params);

    expect(result.standard_ttc).toBe(300);
    expect(result.premium_ttc).toBe(360);
  });

  it('should apply promotion to premium price when active', async () => {
    (admin.getPromo as Mock).mockResolvedValue(activePromoConfig);

    const params = {
      effectif_global: 50,
      ctn: 'C',
      antecedents: { ip2: 0, ip3: 0, ip4: 0, deces: 0 },
      choix_garantie: 50000,
    };

    const result = await calculatePricing(params);

    expect(result.standard_ttc).toBeCloseTo(1495.48); // standard price is not affected
    expect(result.premium_ttc).toBeCloseTo(1677.93); // 1974.03 * 0.85
    expect(result.promo_active).toBe(true);
    expect(result.promo_label).toBe('Offre Spéciale');
  });

  it('should use fallback prices if admin config service fails', async () => {
    (admin.getPricing as Mock).mockRejectedValue(new Error('Admin service down'));

    const params = {
      effectif_global: 50,
      ctn: 'C',
      antecedents: { ip2: 0, ip3: 0, ip4: 0, deces: 0 },
      choix_garantie: 50000,
    };

    const result = await calculatePricing(params);

    expect(result.standard_ttc).toBe(500);
    expect(result.premium_ttc).toBe(650);
    expect(result.promo_active).toBe(false);
  });

  it('should handle large headcount with pivot scaling', async () => {
    const params = {
      effectif_global: 100,
      ctn: 'D',
      antecedents: { ip2: 0, ip3: 0, ip4: 0, deces: 0 },
      choix_garantie: 75000,
    };
    // N_corr = floor(100 * 1.1 + 1) = 111
    // N_scaled = 70 + 0.5 * (111 - 70) = 70 + 0.5 * 41 = 70 + 20.5 = 90.5
    // prob = 0.39 / 1000 = 0.00039
    // prime_brute_standard_ht = 90.5 * 0.00039 * 75000 = 2647.125
    // prime_brute_standard_ttc = 2647.125 * 1.09 = 2885.36625
    // plancher_standard = 800
    // standard_ttc = 2885.37

    const result = await calculatePricing(params);
    expect(result.standard_ttc).toBeCloseTo(2885.37);
  });
});
