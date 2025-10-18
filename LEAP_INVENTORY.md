# Inventaire des fichiers Leap

**Date:** 2025-10-18  
**Environnement:** Leap (proj_d2vtgnc82vjvosnddaqg)  
**Dépôt source:** https://github.com/Ines-Lefebvre/atexya-cash-app

## 📊 Statistiques

- **Total fichiers backend:** 59
- **Total fichiers frontend:** 30
- **Documentation:** 5
- **Scripts de comparaison:** 3
- **Total:** 97 fichiers

## 📂 Arborescence complète

### 🔧 Backend (59 fichiers)

#### Service Admin (10 fichiers)
- `backend/admin/auth.ts`
- `backend/admin/brokers.ts`
- `backend/admin/cgv.ts`
- `backend/admin/config.ts`
- `backend/admin/deletion-requests.ts`
- `backend/admin/encore.service.ts`
- `backend/admin/links.ts`
- `backend/admin/pricing.ts`
- `backend/admin/promo.ts`
- `backend/admin/transactions.ts`

#### Service Atexya (21 fichiers)
- `backend/atexya/brokers.ts`
- `backend/atexya/contact.ts`
- `backend/atexya/contracts.ts`
- `backend/atexya/encore.service.ts`
- `backend/atexya/encryption.ts`
- `backend/atexya/invoicing.ts`
- `backend/atexya/notifications.ts`
- `backend/atexya/pappers.ts`
- `backend/atexya/pricing-debug.ts`
- `backend/atexya/pricing-explanation.ts`
- `backend/atexya/pricing.test.ts`
- `backend/atexya/pricing.ts`
- `backend/atexya/purge-contracts.ts`
- `backend/atexya/stripe.ts`
- `backend/atexya/validation.ts`
- `backend/atexya/migrations/1_create_contracts_table.up.sql`
- `backend/atexya/migrations/2_add_idempotency_key.up.sql`
- `backend/atexya/migrations/3_encrypt_sensitive_data.up.sql`
- `backend/atexya/migrations/4_create_deletion_audit_table.up.sql`
- `backend/atexya/migrations/5_create_user_consent_table.up.sql`
- `backend/atexya/migrations/6_add_headcount_and_amount_fields.up.sql`

#### Service Checkout (2 fichiers)
- `backend/checkout/create-session.ts`
- `backend/checkout/encore.service.ts`

#### Service Stripe (8 fichiers)
- `backend/stripe/client.ts`
- `backend/stripe/encore.service.ts`
- `backend/stripe/stripe.test.ts`
- `backend/stripe/stripe.ts`
- `backend/stripe/test.ts`
- `backend/stripe/webhooks.ts`
- `backend/stripe/migrations/1_create_stripe_sessions_table.up.sql`
- `backend/stripe/migrations/2_add_idempotency_key.up.sql`

#### Service Subscription (8 fichiers)
- `backend/subscription/db.ts`
- `backend/subscription/encore.service.ts`
- `backend/subscription/invoices.ts`
- `backend/subscription/plans.ts`
- `backend/subscription/portal.ts`
- `backend/subscription/subscriptions.ts`
- `backend/subscription/usage.ts`
- `backend/subscription/webhooks.ts`
- `backend/subscription/migrations/1_create_subscription_tables.up.sql`

#### Service User (5 fichiers)
- `backend/user/cancel-deletion.ts`
- `backend/user/cleanup-expired.ts`
- `backend/user/consent.ts`
- `backend/user/delete.ts`
- `backend/user/encore.service.ts`

#### Utilitaires (4 fichiers)
- `backend/utils/currencyUtils.test.ts`
- `backend/utils/currencyUtils.ts`
- `backend/utils/safeLog.ts`
- `backend/utils/stripeHelpers.ts`

### 🎨 Frontend (30 fichiers)

#### Racine
- `frontend/App.tsx`
- `frontend/README.md`
- `frontend/index.css`

#### Components (8 fichiers)
- `frontend/components/ContactModal.tsx`
- `frontend/components/CookieConsentBanner.tsx`
- `frontend/components/CookiePolicyModal.tsx`
- `frontend/components/Footer.tsx`
- `frontend/components/Header.tsx`
- `frontend/components/LegalModal.tsx`
- `frontend/components/PaymentConfirmationModal.tsx`
- `frontend/components/PaymentOptions.tsx`

#### Contexts (1 fichier)
- `frontend/contexts/CookieConsentContext.tsx`

#### Hooks (1 fichier)
- `frontend/hooks/useAnalytics.ts`

#### Lib (3 fichiers)
- `frontend/lib/pricing.ts`
- `frontend/lib/__tests__/pricing-detailed.test.ts`
- `frontend/lib/__tests__/pricing.test.ts`

#### Pages (13 fichiers)
- `frontend/pages/AdminDashboard.tsx`
- `frontend/pages/AdminLogin.tsx`
- `frontend/pages/CheckoutCancel.tsx`
- `frontend/pages/CheckoutSuccess.tsx`
- `frontend/pages/DataDeletion.tsx`
- `frontend/pages/FicheContact.tsx`
- `frontend/pages/Page1Identification.tsx`
- `frontend/pages/Page2Etablissements.tsx`
- `frontend/pages/Page3Antecedents.tsx`
- `frontend/pages/Page4Garantie.tsx`
- `frontend/pages/Page5Calcul.tsx`
- `frontend/pages/Page6Offre.tsx`
- `frontend/pages/PaymentSuccess.tsx`
- `frontend/pages/PricingDebug.tsx`
- `frontend/pages/SubscriptionManagement.tsx`
- `frontend/pages/SubscriptionPlans.tsx`
- `frontend/pages/SubscriptionSuccess.tsx`

#### Public (1 fichier)
- `frontend/public/robots.txt`

### 📚 Documentation (5 fichiers)
- `CONTRIBUTING.md`
- `DEPLOYMENT.md`
- `PRIVACY.md`
- `README.md`
- `SUBSCRIPTION_SETUP.md`

### 🔧 Outils de comparaison (3 fichiers)
- `compare-repos.sh` - Script Bash pour comparaison
- `compare-tool/package.json` - Configuration npm
- `compare-tool/compare.ts` - Script TypeScript pour comparaison

## 🔍 Analyse par type de fichier

### TypeScript/TSX (73 fichiers)
- **Backend services:** 45 fichiers `.ts`
- **Frontend components/pages:** 22 fichiers `.tsx`
- **Tests:** 4 fichiers `.test.ts`
- **Scripts outils:** 2 fichiers `.ts`

### SQL Migrations (9 fichiers)
- **Atexya:** 6 migrations
- **Stripe:** 2 migrations
- **Subscription:** 1 migration

### Documentation Markdown (5 fichiers)
- Guides d'utilisation et déploiement

### Configuration (3 fichiers)
- `frontend/index.css`
- `frontend/public/robots.txt`
- `compare-tool/package.json`

## 📋 Services Backend (Encore.ts)

L'application utilise 6 services backend principaux :

1. **Admin** - Gestion administrative (auth, brokers, pricing, etc.)
2. **Atexya** - Logique métier principale (contracts, pricing, validations)
3. **Checkout** - Création de sessions de paiement
4. **Stripe** - Intégration paiements Stripe
5. **Subscription** - Gestion des abonnements
6. **User** - Gestion utilisateurs (consentement, suppression)

## 🗄️ Base de données

3 bases de données avec migrations :
- **Atexya DB** - 6 migrations (contracts, audit, consent, etc.)
- **Stripe DB** - 2 migrations (sessions, idempotency)
- **Subscription DB** - 1 migration (tables abonnements)

## 🧪 Tests

4 fichiers de tests identifiés :
- `backend/atexya/pricing.test.ts`
- `backend/stripe/stripe.test.ts`
- `backend/utils/currencyUtils.test.ts`
- `frontend/lib/__tests__/pricing.test.ts`
- `frontend/lib/__tests__/pricing-detailed.test.ts`

## 📊 Répartition du code

```
Backend:  61%  (59 fichiers)
Frontend: 31%  (30 fichiers)
Docs:      5%  (5 fichiers)
Tools:     3%  (3 fichiers)
```

## 🔐 Sécurité et Conformité

Fichiers liés à la sécurité/conformité :
- `backend/atexya/encryption.ts` - Chiffrement données
- `backend/user/delete.ts` - Suppression données RGPD
- `backend/user/consent.ts` - Gestion consentements
- `PRIVACY.md` - Politique de confidentialité
- Migrations audit et consent

## 🚀 Prochaines étapes

Pour effectuer une comparaison complète avec GitHub :

1. **Exécuter localement** le script de comparaison :
   ```bash
   ./compare-repos.sh
   ```
   ou
   ```bash
   cd compare-tool && npm install && npm run compare
   ```

2. **Analyser les rapports** générés :
   - `comparison-result.json` - Détails techniques
   - `compare-report.md` - Résumé lisible

3. **Synchroniser** selon les recommandations du rapport

---

*Cet inventaire a été généré automatiquement le 2025-10-18*
