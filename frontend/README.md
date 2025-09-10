# Configuration des Secrets

Après le déploiement, vous devez configurer les secrets suivants dans l'interface d'administration de Leap :

## Secrets obligatoires

### Backend Admin
- `ADMIN_USER` : Nom d'utilisateur admin (ex: admin)
- `ADMIN_PASSWORD` : Mot de passe admin (ex: motdepasse123)
- `JWT_SECRET` : Clé secrète pour les sessions (ex: votre-cle-secrete-jwt-2024)

### APIs externes
- `PAPPERS_API_KEY` : Clé API Pappers (optionnel - si vide, mode dégradé activé)

## Comment configurer les secrets

1. Allez dans l'onglet "Infrastructure" de votre projet Leap
2. Dans la section "Secrets", ajoutez chaque secret avec sa valeur
3. Les secrets sont automatiquement disponibles dans l'application

## Accès à l'administration

Une fois les secrets configurés :
1. Accédez à `/admin` sur votre application
2. Connectez-vous avec `ADMIN_USER` et `ADMIN_PASSWORD`
3. Vous pouvez maintenant configurer les tarifs, promotions, et gérer les contrats

## APIs externes

### Pappers
- Si `PAPPERS_API_KEY` n'est pas configuré, l'application fonctionne en mode dégradé
- Les utilisateurs devront saisir manuellement les informations de leur entreprise
- Format de la clé : Clé API fournie par Pappers (commence généralement par une chaîne alphanumérique)
- Endpoint utilisé : `https://api.pappers.fr/v2/entreprise`

## Fonctionnalités disponibles

### Création de contrats
- Création automatique des contrats en base
- Suivi du statut des contrats (en attente, payé, etc.)
- Historique complet des contrats
- Rapports de commissions pour les courtiers

### Administration
- Dashboard complet dans l'interface admin
- Gestion des configurations tarifaires
- Visualisation des contrats
- Debug des calculs de tarification

## Notes importantes

- **Le paiement Stripe a été désactivé** : Les contrats sont créés avec le statut "pending" et doivent être traités manuellement
- Les utilisateurs peuvent créer leur contrat et seront contactés pour finaliser le paiement
- Toutes les fonctionnalités de tarification et de création de contrats restent opérationnelles

## Debugging

### Vérifier les logs
1. Allez dans l'onglet "Logs" de votre projet Leap
2. Filtrez par service (admin, atexya)
3. Recherchez les erreurs liées aux contrats

### Problèmes courants

#### Pappers
- Si `PAPPERS_API_KEY` n'est pas configuré, l'application fonctionne en mode dégradé
- Les utilisateurs devront saisir manuellement les informations

#### Contrats
- Les contrats sont créés avec le statut "pending"
- Vous pouvez mettre à jour le statut manuellement via l'interface admin
- Les commissions courtiers sont calculées automatiquement

### Test des APIs
Vous pouvez tester les endpoints directement :
- Créer contrat : `POST /contracts/create` avec un payload valide
- Récupérer contrat : `POST /contracts/get` avec un contract_id
- Lister contrats : `POST /contracts/list`
- Calculer tarifs : `POST /pricing/calculate`

## Fonctionnalités futures

- Intégration d'un nouveau système de paiement
- Automatisation des emails de suivi
- Export des contrats et factures
- Amélioration du dashboard admin
