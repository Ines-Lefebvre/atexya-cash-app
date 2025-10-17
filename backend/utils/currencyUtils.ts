export function eurosToCents(euros: number): number {
  if (typeof euros !== 'number' || !isFinite(euros)) {
    throw new Error('Invalid euros value: must be a finite number');
  }
  return Math.round(euros * 100);
}

export function centsToEuros(cents: number): number {
  if (!Number.isInteger(cents)) {
    throw new Error('Invalid cents value: must be an integer');
  }
  return cents / 100;
}

export function normalizeCurrency(currency?: string): string {
  if (!currency) {
    return 'eur';
  }
  return currency.toLowerCase();
}
