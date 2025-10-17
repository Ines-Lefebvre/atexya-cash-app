import { describe, test, expect } from 'vitest';
import { computePricing } from '../pricing';

describe('computePricing - detailed test suite', () => {
  const mockPricing = {
    standard_ttc: 500,
    premium_ttc: 650,
  };

  const headcounts = [10, 50, 100];
  const plans: Array<'standard' | 'premium'> = ['standard', 'premium'];
  const cycles: Array<'annual' | 'monthly'> = ['annual', 'monthly'];

  describe('Annual billing', () => {
    plans.forEach((plan) => {
      describe(`${plan} plan`, () => {
        headcounts.forEach((headcount) => {
          test(`headcount ${headcount}`, () => {
            const result = computePricing({
              plan,
              billingCycle: 'annual',
              headcount,
              pricing: mockPricing,
            });

            const expectedPrice = plan === 'premium' ? 650 : 500;
            expect(result.priceEUR).toBe(expectedPrice);
            expect(result.amount_cents).toBe(expectedPrice * 100);
          });
        });
      });
    });
  });

  describe('Monthly billing', () => {
    plans.forEach((plan) => {
      describe(`${plan} plan`, () => {
        headcounts.forEach((headcount) => {
          test(`headcount ${headcount}`, () => {
            const result = computePricing({
              plan,
              billingCycle: 'monthly',
              headcount,
              pricing: mockPricing,
            });

            const basePrice = plan === 'premium' ? 650 : 500;
            const expectedPrice = Math.round((basePrice * 1.20) / 12);
            expect(result.priceEUR).toBe(expectedPrice);
            expect(result.amount_cents).toBe(expectedPrice * 100);
          });
        });
      });
    });
  });

  describe('Edge cases', () => {
    test('throws on invalid headcount', () => {
      expect(() =>
        computePricing({
          plan: 'standard',
          billingCycle: 'annual',
          headcount: 0,
          pricing: mockPricing,
        })
      ).toThrow('Invalid headcount');

      expect(() =>
        computePricing({
          plan: 'standard',
          billingCycle: 'annual',
          headcount: -1,
          pricing: mockPricing,
        })
      ).toThrow('Invalid headcount');

      expect(() =>
        computePricing({
          plan: 'standard',
          billingCycle: 'annual',
          headcount: 1.5,
          pricing: mockPricing,
        })
      ).toThrow('Invalid headcount');
    });

    test('uses default pricing when not provided', () => {
      const result = computePricing({
        plan: 'standard',
        billingCycle: 'annual',
        headcount: 10,
      });

      expect(result.priceEUR).toBe(500);
      expect(result.amount_cents).toBe(50000);
    });
  });

  describe('Comprehensive matrix', () => {
    const testCases = [
      { plan: 'standard' as const, cycle: 'annual' as const, headcount: 10, expected: { priceEUR: 500, amount_cents: 50000 } },
      { plan: 'standard' as const, cycle: 'annual' as const, headcount: 50, expected: { priceEUR: 500, amount_cents: 50000 } },
      { plan: 'standard' as const, cycle: 'annual' as const, headcount: 100, expected: { priceEUR: 500, amount_cents: 50000 } },
      { plan: 'premium' as const, cycle: 'annual' as const, headcount: 10, expected: { priceEUR: 650, amount_cents: 65000 } },
      { plan: 'premium' as const, cycle: 'annual' as const, headcount: 50, expected: { priceEUR: 650, amount_cents: 65000 } },
      { plan: 'premium' as const, cycle: 'annual' as const, headcount: 100, expected: { priceEUR: 650, amount_cents: 65000 } },
      { plan: 'standard' as const, cycle: 'monthly' as const, headcount: 10, expected: { priceEUR: 50, amount_cents: 5000 } },
      { plan: 'standard' as const, cycle: 'monthly' as const, headcount: 50, expected: { priceEUR: 50, amount_cents: 5000 } },
      { plan: 'standard' as const, cycle: 'monthly' as const, headcount: 100, expected: { priceEUR: 50, amount_cents: 5000 } },
      { plan: 'premium' as const, cycle: 'monthly' as const, headcount: 10, expected: { priceEUR: 65, amount_cents: 6500 } },
      { plan: 'premium' as const, cycle: 'monthly' as const, headcount: 50, expected: { priceEUR: 65, amount_cents: 6500 } },
      { plan: 'premium' as const, cycle: 'monthly' as const, headcount: 100, expected: { priceEUR: 65, amount_cents: 6500 } },
    ];

    testCases.forEach(({ plan, cycle, headcount, expected }) => {
      test(`${plan} ${cycle} ${headcount} employees`, () => {
        const result = computePricing({
          plan,
          billingCycle: cycle,
          headcount,
          pricing: mockPricing,
        });

        expect(result.priceEUR).toBe(expected.priceEUR);
        expect(result.amount_cents).toBe(expected.amount_cents);
      });
    });
  });
});
