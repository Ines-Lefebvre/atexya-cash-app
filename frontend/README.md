# Configuration des Secrets

Après le déploiement, vous devez configurer les secrets suivants dans l'interface d'administration de Leap :

## Secrets obligatoires

### Backend Admin
- `ADMIN_USER` : Nom d'utilisateur admin (ex: admin)
- `ADMIN_PASSWORD` : Mot de passe admin (ex: motdepasse123)
- `JWT_SECRET` : Clé secrète pour les sessions (ex: votre-cle-secrete-jwt-2024)

### APIs externes
- `PAPPERS_API_KEY` : Clé API Pappers (optionnel - si vide, mode dégradé activé)
- `STRIPE_SECRET_KEY` : Clé secrète Stripe (obligatoire pour les paiements)
- `STRIPE_WEBHOOK_SECRET` : Secret webhook Stripe (obligatoire pour les notifications)

### Configuration
- `FRONTEND_URL` : URL de votre frontend déployé (ex: https://votre-app.lp.dev)

## Comment configurer les secrets

1. Allez dans l'onglet "Infrastructure" de votre projet Leap
2. Dans la section "Secrets", ajoutez chaque secret avec sa valeur
3. Les secrets sont automatiquement disponibles dans l'application

## Accès à l'administration

Une fois les secrets configurés :
1. Accédez à `/admin` sur votre application
2. Connectez-vous avec `ADMIN_USER` et `ADMIN_PASSWORD`
3. Vous pouvez maintenant configurer les tarifs, promotions, gérer les contrats et paiements

## APIs externes

### Pappers
- Si `PAPPERS_API_KEY` n'est pas configuré, l'application fonctionne en mode dégradé
- Les utilisateurs devront saisir manuellement les informations de leur entreprise
- Format de la clé : Clé API fournie par Pappers (commence généralement par une chaîne alphanumérique)
- Endpoint utilisé : `https://api.pappers.fr/v2/entreprise`

### Stripe
- `STRIPE_SECRET_KEY` est obligatoire pour les paiements
- `STRIPE_WEBHOOK_SECRET` est obligatoire pour recevoir les notifications de paiement
- Format des clés : 
  - Secret key: `sk_test_` (test) ou `sk_live_` (production)
  - Webhook secret: `whsec_` suivi d'une chaîne de caractères
- Utilisez les clés de test pour les tests et les clés live pour la production
- Configurez aussi `FRONTEND_URL` pour les redirections après paiement
- **IMPORTANT**: La version API Stripe utilisée est `2024-06-20`

## Configuration Webhooks Stripe

1. Connectez-vous à votre compte Stripe
2. Allez dans "Développeurs" > "Webhooks"
3. Cliquez sur "Ajouter un endpoint"
4. URL du endpoint : `https://votre-app.lp.dev/stripe/webhook`
5. Sélectionnez les événements suivants :
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `charge.dispute.created`
6. Copiez le secret de signature et configurez-le comme `STRIPE_WEBHOOK_SECRET`

## Fonctionnalités de paiement

### Paiements uniques
- Création de sessions de paiement Stripe
- Gestion automatique des factures
- Calcul et gestion des commissions courtiers
- Redirections automatiques après paiement

### Webhooks
- Notification automatique des paiements réussis/échoués
- Mise à jour du statut des contrats
- Gestion des disputes et remboursements
- Notifications par email et Slack

### Gestion des contrats
- Création automatique des contrats en base
- Suivi du statut des paiements
- Historique complet des transactions
- Rapports de commissions pour les courtiers

### Administration
- Dashboard complet dans l'interface admin
- Gestion des remboursements
- Visualisation des transactions
- Export des factures et contrats

## Debugging

### Vérifier les logs
1. Allez dans l'onglet "Logs" de votre projet Leap
2. Filtrez par service (admin, atexya)
3. Recherchez les erreurs liées à Stripe ou aux webhooks

### Problèmes courants

#### Stripe
- Vérifiez que les clés sont correctes (test vs production)
- Vérifiez que votre compte Stripe est activé
- Assurez-vous que `FRONTEND_URL` est correct et accessible
- Testez les webhooks avec l'outil Stripe CLI
- **Version API**: Assurez-vous d'utiliser la version `2024-06-20`

#### Erreurs fréquentes
- **"Configuration de paiement manquante"**: Vérifiez que `STRIPE_SECRET_KEY` est configuré
- **"Configuration de l'application manquante"**: Vérifiez que `FRONTEND_URL` est configuré
- **"Service de paiement temporairement indisponible"**: Problème d'import de la librairie Stripe
- **"Signature webhook invalide"**: Vérifiez que `STRIPE_WEBHOOK_SECRET` est correct

#### Webhooks
- Vérifiez que le secret webhook est correct
- Vérifiez que l'endpoint `/stripe/webhook` est accessible
- Consultez les logs Stripe pour voir les tentatives de webhook

### Test des APIs
Vous pouvez tester les endpoints directement :
- Créer session : `POST /stripe/checkout` avec un payload valide
- Vérifier session : `POST /stripe/verify` avec un session_id
- Créer remboursement : `POST /stripe/refund` avec un payment_intent_id
- Lister transactions : `GET /stripe/transactions`

### Données de test Stripe
- Carte de test réussie : `4242 4242 4242 4242`
- Carte de test échouée : `4000 0000 0000 0002`
- Carte nécessitant 3D Secure : `4000 0025 0000 3155`

## Dépannage spécifique

### Si Stripe ne fonctionne pas :

1. **Vérifiez les secrets** :
   ```bash
   # Dans les logs, cherchez ces messages :
   "STRIPE_SECRET_KEY is not configured"
   "FRONTEND_URL is not configured"
   ```

2. **Vérifiez la version API** :
   - L'application utilise la version `2024-06-20`
   - Assurez-vous que votre compte Stripe supporte cette version

3. **Testez la création de session** :
   - Vérifiez que tous les champs requis sont présents
   - Vérifiez que les montants sont en centimes
   - Vérifiez que les métadonnées sont correctes

4. **Vérifiez les URLs de redirection** :
   - Success URL : `${FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`
   - Cancel URL : `${FRONTEND_URL}/page6`

5. **Logs utiles** :
   ```bash
   # Recherchez ces messages dans les logs :
   "Creating Stripe checkout session"
   "Stripe library imported successfully"
   "Stripe checkout session created successfully"
   ```
