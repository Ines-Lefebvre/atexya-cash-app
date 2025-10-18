# Instructions de Comparaison Leap ↔️ GitHub

## 📋 Vue d'ensemble

Ce document explique comment comparer l'environnement Leap avec le dépôt GitHub source pour identifier les différences entre les deux versions du code.

## 🛠️ Outils fournis

Deux scripts ont été créés pour effectuer cette comparaison :

### 1. Script Bash (`/compare-repos.sh`)
- Utilise git, Python 3, et les outils système
- Clone le repo GitHub, calcule les hash MD5, compare les fichiers
- Génère deux rapports : JSON et Markdown

### 2. Script TypeScript (`/compare-tool/compare.ts`)
- Version TypeScript moderne avec simple-git
- Même fonctionnalité que le script Bash
- Génère les mêmes rapports

## 🚀 Exécution locale (recommandé)

L'environnement Leap ne permet pas l'exécution directe de scripts shell ou Node.js. Pour effectuer la comparaison, suivez ces étapes :

### Option A : Utiliser le script Bash

```bash
# 1. Télécharger le script depuis Leap
# (Le script est disponible dans /compare-repos.sh)

# 2. Le rendre exécutable
chmod +x compare-repos.sh

# 3. Exécuter
./compare-repos.sh
```

### Option B : Utiliser le script TypeScript

```bash
# 1. Aller dans le dossier compare-tool
cd compare-tool

# 2. Installer les dépendances
npm install

# 3. Exécuter la comparaison
npm run compare
```

## 📊 Résultats générés

Après l'exécution, vous obtiendrez :

### 1. `/comparison-result.json`
Rapport détaillé en JSON contenant :
- **statistics** : Statistiques globales
  - `total_files_leap` : Nombre de fichiers dans Leap
  - `total_files_github` : Nombre de fichiers dans GitHub
  - `total_unique_files` : Nombre total de fichiers uniques
  - `identical_files` : Fichiers identiques
  - `modified_files` : Fichiers modifiés
  - `missing_in_leap` : Fichiers manquants dans Leap
  - `missing_in_github` : Fichiers manquants dans GitHub
  - `divergence_rate` : Taux de divergence en %

- **identical** : Liste des fichiers identiques avec hash MD5
- **modified** : Liste des fichiers modifiés avec les hashes des deux côtés
- **missing_in_leap** : Fichiers présents dans GitHub mais pas dans Leap
- **missing_in_github** : Fichiers présents dans Leap mais pas dans GitHub

### 2. `/compare-report.md`
Rapport lisible en Markdown avec :
- Tableau de statistiques
- Liste détaillée des fichiers modifiés
- Liste des fichiers manquants de chaque côté
- Recommandations basées sur le taux de divergence

## 📁 Fichiers Leap actuels

Voici un inventaire des fichiers présents dans l'environnement Leap actuel :

### Backend
```
backend/
├── admin/
│   ├── auth.ts
│   ├── brokers.ts
│   ├── cgv.ts
│   ├── config.ts
│   ├── deletion-requests.ts
│   ├── encore.service.ts
│   ├── links.ts
│   ├── pricing.ts
│   ├── promo.ts
│   └── transactions.ts
├── atexya/
│   ├── brokers.ts
│   ├── contact.ts
│   ├── contracts.ts
│   ├── encore.service.ts
│   ├── encryption.ts
│   ├── invoicing.ts
│   ├── migrations/
│   │   ├── 1_create_contracts_table.up.sql
│   │   ├── 2_add_idempotency_key.up.sql
│   │   ├── 3_encrypt_sensitive_data.up.sql
│   │   ├── 4_create_deletion_audit_table.up.sql
│   │   ├── 5_create_user_consent_table.up.sql
│   │   └── 6_add_headcount_and_amount_fields.up.sql
│   ├── notifications.ts
│   ├── pappers.ts
│   ├── pricing-debug.ts
│   ├── pricing-explanation.ts
│   ├── pricing.test.ts
│   ├── pricing.ts
│   ├── purge-contracts.ts
│   ├── stripe.ts
│   └── validation.ts
├── checkout/
│   ├── create-session.ts
│   └── encore.service.ts
├── stripe/
│   ├── client.ts
│   ├── encore.service.ts
│   ├── migrations/
│   │   ├── 1_create_stripe_sessions_table.up.sql
│   │   └── 2_add_idempotency_key.up.sql
│   ├── stripe.test.ts
│   ├── stripe.ts
│   ├── test.ts
│   └── webhooks.ts
├── subscription/
│   ├── db.ts
│   ├── encore.service.ts
│   ├── invoices.ts
│   ├── migrations/
│   │   └── 1_create_subscription_tables.up.sql
│   ├── plans.ts
│   ├── portal.ts
│   ├── subscriptions.ts
│   ├── usage.ts
│   └── webhooks.ts
├── user/
│   ├── cancel-deletion.ts
│   ├── cleanup-expired.ts
│   ├── consent.ts
│   ├── delete.ts
│   └── encore.service.ts
└── utils/
    ├── currencyUtils.test.ts
    ├── currencyUtils.ts
    ├── safeLog.ts
    └── stripeHelpers.ts
```

### Frontend
```
frontend/
├── App.tsx
├── README.md
├── components/
│   ├── ContactModal.tsx
│   ├── CookieConsentBanner.tsx
│   ├── CookiePolicyModal.tsx
│   ├── Footer.tsx
│   ├── Header.tsx
│   ├── LegalModal.tsx
│   ├── PaymentConfirmationModal.tsx
│   └── PaymentOptions.tsx
├── contexts/
│   └── CookieConsentContext.tsx
├── hooks/
│   └── useAnalytics.ts
├── index.css
├── lib/
│   ├── __tests__/
│   │   ├── pricing-detailed.test.ts
│   │   └── pricing.test.ts
│   └── pricing.ts
├── pages/
│   ├── AdminDashboard.tsx
│   ├── AdminLogin.tsx
│   ├── CheckoutCancel.tsx
│   ├── CheckoutSuccess.tsx
│   ├── DataDeletion.tsx
│   ├── FicheContact.tsx
│   ├── Page1Identification.tsx
│   ├── Page2Etablissements.tsx
│   ├── Page3Antecedents.tsx
│   ├── Page4Garantie.tsx
│   ├── Page5Calcul.tsx
│   ├── Page6Offre.tsx
│   ├── PaymentSuccess.tsx
│   ├── PricingDebug.tsx
│   ├── SubscriptionManagement.tsx
│   ├── SubscriptionPlans.tsx
│   └── SubscriptionSuccess.tsx
└── public/
    └── robots.txt
```

### Documentation
```
CONTRIBUTING.md
DEPLOYMENT.md
PRIVACY.md
README.md
SUBSCRIPTION_SETUP.md
```

## 🔍 Fichiers exclus de la comparaison

Les scripts excluent automatiquement :
- `node_modules/`
- `.git/`
- `dist/`, `build/`, `.next/`
- `.encore/`
- Fichiers de lock : `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- Fichiers système : `.DS_Store`, `*.log`
- Outils de comparaison : `compare-tool/`, `compare-repos.sh`, etc.

## 💡 Interprétation du taux de divergence

- **0%** : Environnements parfaitement synchronisés
- **< 5%** : Divergence minime, synchronisation simple recommandée
- **5-20%** : Divergence modérée, révision nécessaire
- **> 20%** : Divergence importante, synchronisation complète requise

## 🔐 Sécurité

Les scripts :
- Ne modifient aucun fichier source
- Clonent le repo dans `/tmp/` (nettoyé après)
- Calculent uniquement des hash MD5 pour comparaison
- N'exposent aucune donnée sensible dans les rapports

## 📞 Support

Pour toute question sur la comparaison ou les résultats :
1. Consultez d'abord les rapports générés
2. Vérifiez les fichiers listés dans les sections "modified" et "missing"
3. Analysez le taux de divergence pour prioriser les actions
