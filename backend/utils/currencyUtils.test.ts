import { describe, test, expect } from 'vitest';
import { eurosToCents, centsToEuros, normalizeCurrency } from './currencyUtils';

describe('currencyUtils', () => {
  describe('eurosToCents', () => {
    test('converts euros to cents correctly', () => {
      expect(eurosToCents(100)).toBe(10000);
      expect(eurosToCents(1.50)).toBe(150);
      expect(eurosToCents(0.01)).toBe(1);
    });

    test('rounds to nearest cent', () => {
      expect(eurosToCents(1.234)).toBe(123);
      expect(eurosToCents(1.235)).toBe(124);
    });

    test('throws on invalid input', () => {
      expect(() => eurosToCents(NaN)).toThrow('Invalid euros value');
      expect(() => eurosToCents(Infinity)).toThrow('Invalid euros value');
    });
  });

  describe('centsToEuros', () => {
    test('converts cents to euros correctly', () => {
      expect(centsToEuros(10000)).toBe(100);
      expect(centsToEuros(150)).toBe(1.5);
      expect(centsToEuros(1)).toBe(0.01);
    });

    test('throws on non-integer input', () => {
      expect(() => centsToEuros(1.5)).toThrow('Invalid cents value');
    });
  });

  describe('normalizeCurrency', () => {
    test('normalizes currency to lowercase', () => {
      expect(normalizeCurrency('EUR')).toBe('eur');
      expect(normalizeCurrency('Eur')).toBe('eur');
      expect(normalizeCurrency('eur')).toBe('eur');
    });

    test('defaults to eur when undefined', () => {
      expect(normalizeCurrency()).toBe('eur');
      expect(normalizeCurrency(undefined)).toBe('eur');
    });
  });
});
