import { describe, it, expect } from 'vitest';
import { computePricing } from '../pricing';

describe('computePricing', () => {
  it('should calculate annual standard pricing correctly', () => {
    const result = computePricing({
      plan: 'standard',
      billingCycle: 'annual',
      headcount: 25,
      pricing: { standard_ttc: 500, premium_ttc: 650 }
    });

    expect(result.priceEUR).toBe(500);
    expect(result.amount_cents).toBe(50000);
  });

  it('should calculate annual premium pricing correctly', () => {
    const result = computePricing({
      plan: 'premium',
      billingCycle: 'annual',
      headcount: 25,
      pricing: { standard_ttc: 500, premium_ttc: 650 }
    });

    expect(result.priceEUR).toBe(650);
    expect(result.amount_cents).toBe(65000);
  });

  it('should calculate monthly standard pricing with 20% surcharge', () => {
    const result = computePricing({
      plan: 'standard',
      billingCycle: 'monthly',
      headcount: 25,
      pricing: { standard_ttc: 500, premium_ttc: 650 }
    });

    expect(result.priceEUR).toBe(50);
    expect(result.amount_cents).toBe(5000);
  });

  it('should calculate monthly premium pricing with 20% surcharge', () => {
    const result = computePricing({
      plan: 'premium',
      billingCycle: 'monthly',
      headcount: 25,
      pricing: { standard_ttc: 500, premium_ttc: 650 }
    });

    expect(result.priceEUR).toBe(65);
    expect(result.amount_cents).toBe(6500);
  });

  it('should use default pricing when pricing object is not provided', () => {
    const result = computePricing({
      plan: 'standard',
      billingCycle: 'annual',
      headcount: 25
    });

    expect(result.priceEUR).toBe(500);
    expect(result.amount_cents).toBe(50000);
  });

  it('should throw error for invalid headcount', () => {
    expect(() => {
      computePricing({
        plan: 'standard',
        billingCycle: 'annual',
        headcount: 0
      });
    }).toThrow('Invalid headcount: must be a positive integer');

    expect(() => {
      computePricing({
        plan: 'standard',
        billingCycle: 'annual',
        headcount: -5
      });
    }).toThrow('Invalid headcount: must be a positive integer');

    expect(() => {
      computePricing({
        plan: 'standard',
        billingCycle: 'annual',
        headcount: 25.5
      });
    }).toThrow('Invalid headcount: must be a positive integer');
  });
});
