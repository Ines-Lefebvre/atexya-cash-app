# Configuration des Secrets

Après le déploiement, vous devez configurer les secrets suivants dans l'interface d'administration de Leap :

## Secrets obligatoires

### Backend Admin
- `ADMIN_USER` : Nom d'utilisateur admin (ex: admin)
- `ADMIN_PASSWORD` : Mot de passe admin (ex: motdepasse123)
- `JWT_SECRET` : Clé secrète pour les sessions (ex: votre-cle-secrete-jwt-2024)

### Stripe (NOUVEAU)
- `STRIPE_SECRET_KEY` : Clé secrète Stripe (ex: sk_test_...)
- `STRIPE_PUBLISHABLE_KEY` : Clé publique Stripe (ex: pk_test_...)
- `STRIPE_WEBHOOK_SECRET` : Secret webhook Stripe (ex: whsec_...)

### APIs externes
- `PAPPERS_API_KEY` : Clé API Pappers (optionnel - si vide, mode dégradé activé)

## Comment configurer les secrets

1. Allez dans l'onglet "Infrastructure" de votre projet Leap
2. Dans la section "Secrets", ajoutez chaque secret avec sa valeur
3. Les secrets sont automatiquement disponibles dans l'application

## Configuration Stripe

### 1. Création du compte Stripe
1. Créez un compte sur [stripe.com](https://stripe.com)
2. Récupérez vos clés API dans le dashboard Stripe

### 2. Configuration des webhooks
1. Dans le dashboard Stripe, allez dans "Developers" > "Webhooks"
2. Créez un nouveau webhook endpoint
3. URL : `https://votre-app.com/stripe/webhooks`
4. Événements à écouter :
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `payment_intent.payment_failed`
5. Récupérez le secret du webhook (commence par `whsec_`)

### 3. Mode test vs production
- Utilisez les clés de test (sk_test_...) pour le développement
- Passez aux clés live (sk_live_...) pour la production
- Les webhooks doivent être configurés séparément pour test et live

## Accès à l'administration

Une fois les secrets configurés :
1. Accédez à `/admin` sur votre application
2. Connectez-vous avec `ADMIN_USER` et `ADMIN_PASSWORD`
3. Vous pouvez maintenant configurer les tarifs, promotions, et gérer les contrats

## Nouvelles fonctionnalités Stripe

### Paiements
- Support paiement annuel (une fois) et mensuel (abonnement)
- Paiement mensuel avec majoration de 20%
- Cartes bancaires et SEPA acceptés
- Facturation automatique

### Gestion des contrats
- Création automatique des contrats en base
- Mise à jour du statut après paiement
- Lien avec les sessions Stripe
- Historique complet des paiements

### Webhooks
- Traitement automatique des événements Stripe
- Notifications de succès/échec de paiement
- Gestion des annulations d'abonnement
- Notifications aux courtiers pour les commissions

## APIs externes

### Pappers
- Si `PAPPERS_API_KEY` n'est pas configuré, l'application fonctionne en mode dégradé
- Les utilisateurs devront saisir manuellement les informations de leur entreprise

### Stripe
- Les clés Stripe sont obligatoires pour le fonctionnement des paiements
- Le webhook secret est nécessaire pour la sécurité des webhooks

## Debugging

### Vérifier les logs
1. Allez dans l'onglet "Logs" de votre projet Leap
2. Filtrez par service (admin, atexya, stripe)
3. Recherchez les erreurs liées aux paiements

### Problèmes courants

#### Stripe
- Si les clés Stripe ne sont pas configurées, les paiements échoueront
- Vérifiez que les webhooks sont correctement configurés
- En cas de problème, consultez les logs Stripe dans leur dashboard

#### Contrats
- Les contrats sont créés avec le statut "pending" avant paiement
- Le statut passe à "paid" après confirmation via webhook
- Les commissions courtiers sont calculées automatiquement

### Test des paiements
Vous pouvez tester les paiements avec les cartes de test Stripe :
- Succès : 4242 4242 4242 4242
- Échec : 4000 0000 0000 0002
- 3D Secure : 4000 0027 6000 3184

## Variables d'environnement

Si nécessaire, vous pouvez aussi définir :
- `FRONTEND_URL` : URL du frontend pour les redirections Stripe (auto-détectée sinon)

## Sécurité

### Secrets en production
⚠️ **IMPORTANT** : En production, utilisez :
- **Clés Stripe live** (sk_live_... et pk_live_...)
- **Webhook secret live** différent du test
- **URLs HTTPS** obligatoires pour les webhooks en production

### Validation des webhooks
- Tous les webhooks Stripe sont validés avec la signature
- Les événements non authentifiés sont rejetés
- Tous les événements sont loggés pour audit

## Fonctionnalités futures

- Export des factures PDF
- Espace client pour gérer les abonnements
- Relances automatiques pour impayés
- Analytics avancées des paiements
