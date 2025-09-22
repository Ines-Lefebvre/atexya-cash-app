# Atexya Cash - Application d'Assurance Responsabilité Civile Professionnelle

Une application complète pour la souscription d'assurance responsabilité civile professionnelle, développée avec Encore.ts et React.

## 🚀 Fonctionnalités

### Frontend
- **Parcours de souscription complet** : Identification, établissements, antécédents, garanties, calcul et offre
- **Interface responsive** avec Tailwind CSS et shadcn/ui
- **Intégration API Pappers** pour la récupération automatique des données d'entreprise
- **Calcul de tarifs en temps réel** avec support des promotions
- **Gestion des courtiers** avec codes de parrainage
- **Interface d'administration** complète

### Backend
- **Architecture microservices** avec Encore.ts
- **Base de données PostgreSQL** pour les contrats et configurations
- **Stockage objet** pour les documents (CGV, etc.)
- **API REST** complète avec validation TypeScript
- **Système d'authentification admin** sécurisé
- **Intégration Pappers API** avec mode dégradé

## 🛠 Technologies

- **Backend** : Encore.ts, TypeScript, PostgreSQL
- **Frontend** : React, TypeScript, Tailwind CSS, shadcn/ui
- **APIs externes** : Pappers (données d'entreprise)
- **Déploiement** : Leap (plateforme Encore)

## 📋 Configuration requise

### Secrets à configurer dans l'interface Leap

Allez dans l'onglet "Infrastructure" > "Secrets" et ajoutez :

#### Authentification Admin (obligatoire)
```
ADMIN_USER=admin
ADMIN_PASSWORD=motdepasse_securise
JWT_SECRET=cle_secrete_jwt_complexe
```

#### APIs externes (optionnel)
```
PAPPERS_API_KEY=votre_cle_api_pappers
```

> **Note** : Si `PAPPERS_API_KEY` n'est pas configuré, l'application fonctionne en mode dégradé avec saisie manuelle des données d'entreprise.

## 🚀 Déploiement

1. **Cloner le repository**
```bash
git clone <repository-url>
cd atexya-cash-app
```

2. **Déployer sur Leap**
   - Connectez votre repository GitHub à Leap
   - Le déploiement se fait automatiquement

3. **Configurer les secrets**
   - Allez dans l'onglet "Infrastructure" de votre projet Leap
   - Ajoutez les secrets listés ci-dessus

4. **Accéder à l'application**
   - Frontend : URL principale de votre application
   - Admin : `https://votre-app.com/admin`

## 📚 Structure du projet

```
├── backend/
│   ├── admin/                 # Service d'administration
│   │   ├── auth.ts           # Authentification admin
│   │   ├── config.ts         # Gestion des configurations
│   │   ├── pricing.ts        # Configuration des tarifs
│   │   ├── promo.ts          # Gestion des promotions
│   │   └── ...
│   └── atexya/               # Service principal
│       ├── contracts.ts      # Gestion des contrats
│       ├── pricing.ts        # Calcul des tarifs
│       ├── pappers.ts        # Intégration Pappers
│       └── ...
├── frontend/
│   ├── pages/                # Pages de l'application
│   ├── components/           # Composants réutilisables
│   └── ...
└── README.md
```

## 🔧 Fonctionnalités détaillées

### Calcul des tarifs
- **Effectif corrigé** : +10% + 1 pour variation
- **Pivot de scaling** : Réduction pour les gros effectifs
- **Taux CTN** : Selon le secteur d'activité
- **Antécédents** : Majoration x2 si sinistres
- **Planchers minimum** : Par niveau de garantie
- **Offre Premium** : +20% garantie, +10% prix

### Gestion des contrats
- Création automatique en base
- Suivi du statut de paiement
- Calcul des commissions courtiers
- Export et rapports

### Administration
- Dashboard complet
- Configuration des tarifs et promotions
- Gestion des courtiers
- Upload des CGV
- Visualisation des contrats

## 🔒 Sécurité

- Authentification admin par cookie HTTP-only
- Validation complète côté backend
- Chiffrement des sessions
- Protection CSRF
- Validation des données d'entrée

## 📊 APIs disponibles

### Service Atexya
- `POST /pricing/calculate` - Calcul des tarifs
- `POST /contracts/create` - Création de contrat
- `POST /contracts/list` - Liste des contrats
- `POST /pappers/company` - Recherche d'entreprise

### Service Admin (authentifié)
- `GET/POST /admin/config/pricing` - Configuration tarifaire
- `GET/POST /admin/config/promo` - Gestion promotions
- `GET/POST /admin/config/cgv` - Gestion CGV

## 🐛 Debug et logs

- Endpoint de debug : `POST /pricing/debug` pour analyser les calculs
- Logs complets dans l'onglet "Logs" de Leap
- Mode dégradé automatique en cas d'erreur API

## 📈 Améliorations futures

- [ ] Intégration système de paiement
- [ ] Automatisation des emails
- [ ] Export des contrats en PDF
- [ ] Dashboard analytique avancé
- [ ] API pour courtiers
- [ ] Application mobile

## 🤝 Support

Pour toute question ou problème :
- Vérifiez les logs dans l'interface Leap
- Consultez la documentation Encore.ts
- Contactez l'équipe de développement

## 📝 License

Propriétaire - Atexya
