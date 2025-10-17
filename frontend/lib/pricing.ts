export interface PricingConfig {
  standard_base: number;
  premium_base: number;
  monthly_surcharge_percent: number;
}

export interface ComputePricingParams {
  plan: 'standard' | 'premium';
  billingCycle: 'annual' | 'monthly';
  headcount: number;
  pricing?: {
    standard_ttc: number;
    premium_ttc: number;
  };
}

export interface PricingResult {
  priceEUR: number;
  amount_cents: number;
}

const DEFAULT_PRICING: PricingConfig = {
  standard_base: 500,
  premium_base: 650,
  monthly_surcharge_percent: 20,
};

export function computePricing(params: ComputePricingParams): PricingResult {
  const { plan, billingCycle, headcount, pricing } = params;

  if (!Number.isInteger(headcount) || headcount <= 0) {
    throw new Error('Invalid headcount: must be a positive integer');
  }

  const basePrice = pricing
    ? plan === 'premium'
      ? pricing.premium_ttc
      : pricing.standard_ttc
    : plan === 'premium'
    ? DEFAULT_PRICING.premium_base
    : DEFAULT_PRICING.standard_base;

  let priceEUR: number;
  if (billingCycle === 'monthly') {
    const monthlySurcharge = 1 + DEFAULT_PRICING.monthly_surcharge_percent / 100;
    priceEUR = Math.round((basePrice * monthlySurcharge) / 12);
  } else {
    priceEUR = basePrice;
  }

  const amount_cents = Math.round(priceEUR * 100);

  return {
    priceEUR,
    amount_cents,
  };
}
