# Stripe SaaS Subscription Billing Setup

Complete Stripe subscription billing system with tax handling, invoicing, and global payment methods.

## Features Implemented

### 1. Subscription Plans Management
- **Database**: Full schema for plans, prices, subscriptions, usage, and invoices
- **CRUD Operations**: Create and manage subscription plans and prices
- **Multiple Billing Intervals**: Support for monthly, yearly, weekly, and daily billing
- **Trial Periods**: Optional trial period configuration per price

**Endpoints**:
- `POST /subscription/plans` - Create subscription plan (admin only)
- `POST /subscription/prices` - Create price for a plan (admin only)
- `GET /subscription/plans` - List all active plans with prices
- `GET /subscription/plans/:id` - Get specific plan details

### 2. Subscription Management
- **Create Subscriptions**: Checkout session creation with Stripe
- **Cancel Subscriptions**: Support for immediate or end-of-period cancellation
- **List & Query**: Filter subscriptions by email or status
- **Status Tracking**: All Stripe subscription statuses supported

**Endpoints**:
- `POST /subscription/create` - Create subscription checkout session
- `POST /subscription/:subscription_id/cancel` - Cancel subscription
- `GET /subscription/list` - List subscriptions (filterable)
- `GET /subscription/:id` - Get subscription details

### 3. Customer Portal
- **Self-Service Management**: Stripe Customer Portal integration
- **Payment Method Updates**: Dedicated endpoint for payment method changes
- **Subscription Modifications**: Customers can upgrade/downgrade via portal

**Endpoints**:
- `POST /subscription/portal` - Create customer portal session
- `POST /subscription/update-payment` - Update payment method session

### 4. Tax Handling
- **Stripe Tax Integration**: Automatic tax calculation enabled
- **Tax ID Collection**: Collects and validates customer tax IDs
- **Global Tax Compliance**: Handles VAT, GST, and other tax requirements
- **Tax on Invoices**: All invoices include calculated tax amounts

### 5. Invoicing
- **Automatic Generation**: Invoices created automatically for all charges
- **PDF Downloads**: Invoice PDFs available via Stripe
- **Email Delivery**: Send invoices to customers
- **Invoice Tracking**: Complete invoice history with payment status

**Endpoints**:
- `GET /subscription/invoices` - List invoices (filterable)
- `GET /subscription/invoices/:id` - Get invoice details
- `GET /subscription/invoices/:id/download` - Download invoice PDF
- `POST /subscription/invoices/:id/send` - Send invoice email

### 6. Global Payment Methods
**Supported Payment Methods**:
- Credit/Debit Cards (Visa, Mastercard, Amex, etc.)
- SEPA Direct Debit
- Stripe Link
- PayPal
- Bancontact (Belgium)
- iDEAL (Netherlands)
- Giropay (Germany)
- Sofort (Europe)

### 7. Usage-Based Billing
- **Metered Billing**: Support for metered subscription items
- **Usage Recording**: Track usage with increment or set actions
- **Usage Queries**: View usage history by date range
- **Idempotency**: Prevents duplicate usage records

**Endpoints**:
- `POST /subscription/:subscription_id/usage` - Record usage
- `GET /subscription/:subscription_id/usage` - Get usage history

### 8. Webhook Handlers
**Subscription Events**:
- `customer.subscription.created` - Track new subscriptions
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Handle cancellations
- `customer.subscription.trial_will_end` - Trial ending notifications

**Invoice Events**:
- `invoice.created` - Create invoice record
- `invoice.finalized` - Update with PDF URL
- `invoice.paid` - Mark as paid
- `invoice.payment_failed` - Handle payment failures

**Tax Events**:
- `customer.tax_id.created` - Track tax ID creation
- `customer.tax_id.updated` - Update tax information

**Endpoint**:
- `POST /subscription/webhooks` - Stripe webhook handler

## Frontend Components

### 1. SubscriptionPlans
Displays available subscription plans with:
- Monthly/Annual toggle
- Feature lists
- Pricing display
- Subscribe buttons
- Trial period badges

**Route**: `/subscription/plans`

### 2. SubscriptionManagement
Customer subscription dashboard with:
- Active subscriptions list
- Subscription details (status, period, trial)
- Cancel subscription option
- Customer portal access
- Invoice history with download links

**Route**: `/subscription/manage?email={customer_email}`

### 3. SubscriptionSuccess
Success page after subscription creation:
- Confirmation message
- Links to dashboard and subscription management

**Route**: `/subscription/success?session_id={CHECKOUT_SESSION_ID}`

## Database Schema

### Tables
1. **subscription_plans** - Product definitions
2. **subscription_prices** - Pricing options per plan
3. **subscriptions** - Active customer subscriptions
4. **subscription_usage** - Usage records for metered billing
5. **invoices** - Invoice history and PDFs

### Indexes
- Customer email and ID lookups
- Subscription status filtering
- Invoice queries by customer/subscription

## Configuration Required

### Stripe Secrets
Set these in your Leap Settings:
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret

### Stripe Dashboard Setup
1. Enable Stripe Tax in your dashboard
2. Configure Customer Portal settings
3. Add webhook endpoint: `{API_URL}/subscription/webhooks`
4. Select all subscription and invoice events

## Example Usage

### Create a Subscription Plan
```typescript
// Admin creates a plan
await backend.subscription.createPlan({
  name: "Pro Plan",
  description: "Full access to all features",
  features: ["Unlimited users", "Priority support", "Advanced analytics"],
  metadata: { tier: "pro" }
});

// Admin creates prices
await backend.subscription.createPrice({
  plan_id: "prod_xxx",
  currency: "eur",
  amount: 2900, // €29.00
  billing_interval: "month",
  trial_period_days: 14
});

await backend.subscription.createPrice({
  plan_id: "prod_xxx",
  currency: "eur",
  amount: 29000, // €290.00 (save ~16%)
  billing_interval: "year"
});
```

### Subscribe a Customer
```typescript
const session = await backend.subscription.createSubscription({
  customer_email: "customer@example.com",
  customer_name: "Jane Doe",
  price_id: "price_xxx",
  success_url: "https://example.com/success",
  cancel_url: "https://example.com/pricing",
  trial_period_days: 14,
  metadata: { source: "website" }
});

// Redirect to Stripe Checkout
window.location.href = session.sessionUrl;
```

### Record Usage (Metered Billing)
```typescript
await backend.subscription.recordUsage({
  subscription_id: "sub_xxx",
  quantity: 100,
  action: "increment",
  idempotency_key: "unique_key_123"
});
```

### Access Customer Portal
```typescript
const portal = await backend.subscription.createPortalSession({
  customer_email: "customer@example.com",
  return_url: window.location.href
});

window.location.href = portal.url;
```

## Features Summary

✅ Subscription plans and pricing management  
✅ Multiple billing intervals (month, year, week, day)  
✅ Trial periods support  
✅ Customer self-service portal  
✅ Usage-based/metered billing  
✅ Automatic tax calculation (Stripe Tax)  
✅ Tax ID collection and validation  
✅ Global payment methods (8+ methods)  
✅ Automatic invoice generation  
✅ Invoice PDF downloads  
✅ Comprehensive webhook handling  
✅ Subscription lifecycle management  
✅ Payment method updates  
✅ Promotional codes support  
✅ Idempotency for all operations  

## Next Steps

1. Configure Stripe secrets in Settings
2. Set up Stripe Tax in your dashboard
3. Create your first subscription plan via admin endpoints
4. Configure Customer Portal in Stripe dashboard
5. Set up webhook endpoint in Stripe
6. Test with Stripe test mode cards
7. Enable production mode when ready
