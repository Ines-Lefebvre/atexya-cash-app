import { describe, test, expect, beforeAll, vi } from "vitest";
import Stripe from "stripe";

type PaymentType = 'annual' | 'monthly';

function getSessionMode(paymentType: PaymentType): Stripe.Checkout.SessionCreateParams.Mode {
  return paymentType === 'monthly' ? 'subscription' : 'payment';
}

function getPaymentMethodTypes(sessionMode: Stripe.Checkout.SessionCreateParams.Mode): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  return sessionMode === 'subscription' ? ['card', 'sepa_debit'] : ['card'];
}

describe("Stripe Payment Session Tests", () => {
  test("annual payment should only accept card payment method", async () => {
    const paymentType: PaymentType = 'annual';
    const sessionMode = getSessionMode(paymentType);
    const paymentMethodTypes = getPaymentMethodTypes(sessionMode);

    expect(sessionMode).toBe('payment');
    expect(paymentMethodTypes).toEqual(['card']);
    expect(paymentMethodTypes).not.toContain('sepa_debit');
  });

  test("monthly payment should accept card and sepa_debit payment methods", async () => {
    const paymentType: PaymentType = 'monthly';
    const sessionMode = getSessionMode(paymentType);
    const paymentMethodTypes = getPaymentMethodTypes(sessionMode);

    expect(sessionMode).toBe('subscription');
    expect(paymentMethodTypes).toEqual(['card', 'sepa_debit']);
    expect(paymentMethodTypes).toContain('card');
    expect(paymentMethodTypes).toContain('sepa_debit');
  });

  test("payment mode should map correctly to session mode", async () => {
    const annualMode = getSessionMode('annual');
    const monthlyMode = getSessionMode('monthly');

    expect(annualMode).toBe('payment');
    expect(monthlyMode).toBe('subscription');
  });

  test("payment method types should be type-safe for Stripe API", async () => {
    const sessionMode: Stripe.Checkout.SessionCreateParams.Mode = 'payment';
    const paymentMethodTypes = getPaymentMethodTypes(sessionMode);

    const sessionParams: Partial<Stripe.Checkout.SessionCreateParams> = {
      mode: sessionMode,
      payment_method_types: paymentMethodTypes
    };

    expect(sessionParams.mode).toBe('payment');
    expect(sessionParams.payment_method_types).toEqual(['card']);
  });
});
