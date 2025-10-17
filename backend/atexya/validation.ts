export interface CreateContractInput {
  siren: string;
  company_name: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  contract_type: 'standard' | 'premium';
  garantie_amount: number;
  premium_ttc: number;
  premium_ht: number;
  taxes: number;
  payment_type?: 'annual' | 'monthly';
  broker_code?: string;
  broker_commission_percent?: number;
  cgv_version: string;
  metadata?: Record<string, any>;
  idempotency_key: string;
  headcount: number;
  amount_cents: number;
  currency?: string;
}

export function validateCreateContractInput(params: any): { valid: true; data: CreateContractInput } | { valid: false; error: string } {
  const errors: string[] = [];

  if (typeof params.siren !== 'string') {
    errors.push('siren: must be a string');
  } else if (params.siren.trim().length !== 9) {
    errors.push('siren: SIREN must be exactly 9 characters');
  }

  if (typeof params.company_name !== 'string' || params.company_name.trim().length === 0) {
    errors.push('company_name: Company name is required');
  }

  if (typeof params.customer_email !== 'string') {
    errors.push('customer_email: must be a string');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.customer_email.trim())) {
    errors.push('customer_email: Invalid email address');
  }

  if (typeof params.customer_name !== 'string' || params.customer_name.trim().length < 2) {
    errors.push('customer_name: Customer name must be at least 2 characters');
  }

  if (!['standard', 'premium'].includes(params.contract_type)) {
    errors.push('contract_type: Contract type must be either "standard" or "premium"');
  }

  if (typeof params.garantie_amount !== 'number' || params.garantie_amount <= 0) {
    errors.push('garantie_amount: Garantie amount must be positive');
  }

  if (typeof params.premium_ttc !== 'number' || params.premium_ttc <= 0) {
    errors.push('premium_ttc: Premium TTC must be positive');
  }

  if (typeof params.premium_ht !== 'number' || params.premium_ht <= 0) {
    errors.push('premium_ht: Premium HT must be positive');
  }

  if (typeof params.taxes !== 'number' || params.taxes < 0) {
    errors.push('taxes: Taxes must be non-negative');
  }

  if (params.payment_type && !['annual', 'monthly'].includes(params.payment_type)) {
    errors.push('payment_type: Payment type must be either "annual" or "monthly"');
  }

  if (params.broker_commission_percent !== undefined && (typeof params.broker_commission_percent !== 'number' || params.broker_commission_percent < 0 || params.broker_commission_percent > 100)) {
    errors.push('broker_commission_percent: must be a number between 0 and 100');
  }

  if (typeof params.cgv_version !== 'string' || params.cgv_version.trim().length === 0) {
    errors.push('cgv_version: CGV version is required');
  }

  if (typeof params.idempotency_key !== 'string' || params.idempotency_key.trim().length === 0) {
    errors.push('idempotency_key: Idempotency key is required');
  }

  if (!Number.isInteger(params.headcount) || params.headcount <= 0) {
    errors.push('headcount: Headcount must be a positive integer');
  }

  if (!Number.isInteger(params.amount_cents) || params.amount_cents <= 0) {
    errors.push('amount_cents: Amount in cents must be a positive integer');
  }

  if (errors.length > 0) {
    return { valid: false, error: errors.join(', ') };
  }

  return {
    valid: true,
    data: {
      siren: params.siren.trim(),
      company_name: params.company_name.trim(),
      customer_email: params.customer_email.trim(),
      customer_name: params.customer_name.trim(),
      customer_phone: params.customer_phone ? params.customer_phone.trim() : undefined,
      contract_type: params.contract_type,
      garantie_amount: params.garantie_amount,
      premium_ttc: params.premium_ttc,
      premium_ht: params.premium_ht,
      taxes: params.taxes,
      payment_type: params.payment_type,
      broker_code: params.broker_code ? params.broker_code.trim() : undefined,
      broker_commission_percent: params.broker_commission_percent,
      cgv_version: params.cgv_version.trim(),
      metadata: params.metadata,
      idempotency_key: params.idempotency_key.trim(),
      headcount: params.headcount,
      amount_cents: params.amount_cents,
      currency: params.currency ? params.currency.trim().toLowerCase() : 'eur',
    },
  };
}
