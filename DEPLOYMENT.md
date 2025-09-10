# Guide de Déploiement Atexya Cash

Ce guide vous accompagne dans le déploiement de l'application Atexya Cash sur la plateforme Leap.

## 🚀 Étapes de déploiement

### 1. Préparation du repository GitHub

```bash
# Cloner le projet
git clone <votre-repository>
cd atexya-cash

# Vérifier la structure
ls -la
# Vous devriez voir : backend/, frontend/, README.md, etc.
```

### 2. Connexion à Leap

1. Allez sur [leap.encore.dev](https://leap.encore.dev)
2. Connectez votre compte GitHub
3. Sélectionnez le repository `atexya-cash`
4. Leap détecte automatiquement l'application Encore.ts

### 3. Premier déploiement

Le déploiement se lance automatiquement. Vous pouvez suivre le progrès dans l'onglet "Deployments".

### 4. Configuration des secrets (CRITIQUE)

⚠️ **L'application ne fonctionnera pas sans ces secrets !**

Allez dans **Infrastructure > Secrets** et ajoutez :

#### Secrets obligatoires
```
ADMIN_USER=admin
ADMIN_PASSWORD=VotreMotDePasseSecurise123!
JWT_SECRET=votre-cle-jwt-super-secrete-et-longue-2024
```

#### Secrets optionnels
```
PAPPERS_API_KEY=votre-cle-api-pappers
```

### 5. Vérification du déploiement

1. **Frontend** : Testez l'URL principale
2. **Admin** : Allez sur `/admin` et connectez-vous
3. **APIs** : Vérifiez les logs dans l'onglet "Logs"

## 🔧 Configuration post-déploiement

### Accès à l'administration

1. Allez sur `https://votre-app.com/admin`
2. Connectez-vous avec `ADMIN_USER` / `ADMIN_PASSWORD`
3. Configurez :
   - **Promotions** : Activez/désactivez les offres spéciales
   - **Tarification** : Ajustez les paramètres de calcul
   - **CGV** : Uploadez le PDF des conditions générales

### Test complet du parcours

1. **Page 1** : Testez avec un SIREN réel (ex: 433671930)
2. **Page 2** : Vérifiez les établissements
3. **Page 3** : Testez les antécédents
4. **Page 4** : Sélectionnez une garantie
5. **Page 5** : Vérifiez le calcul
6. **Page 6** : Créez un contrat test

## 🐛 Dépannage

### Problèmes courants

#### 1. Erreur d'authentification admin
```
Symptôme : Impossible de se connecter à /admin
Solution : Vérifiez que ADMIN_USER, ADMIN_PASSWORD et JWT_SECRET sont configurés
```

#### 2. API Pappers en mode dégradé
```
Symptôme : Message "API indisponible, saisie manuelle"
Solution : Soit normal (pas de clé configurée), soit vérifiez PAPPERS_API_KEY
```

#### 3. Erreur de calcul des tarifs
```
Symptôme : Tarifs à 500€/650€ par défaut
Solution : Vérifiez les logs, probablement un problème de config admin
```

### Vérification des logs

1. Allez dans **Logs** dans l'interface Leap
2. Filtrez par service : `admin` ou `atexya`
3. Recherchez les erreurs en rouge

### Redéploiement

Si vous modifiez le code :
```bash
git add .
git commit -m "Update: description des changes"
git push origin main
```

Le redéploiement se lance automatiquement.

## 📊 Surveillance

### Métriques importantes

- **Logs d'erreur** : Surveillez les erreurs 500
- **Création de contrats** : Vérifiez les logs de création
- **API Pappers** : Surveillez les échecs d'API
- **Authentification admin** : Surveillez les tentatives de connexion

### Endpoints de santé

- `GET /` : Frontend principal
- `GET /admin` : Interface d'administration
- `POST /pricing/calculate` : Calcul des tarifs
- `POST /contracts/create` : Création de contrats

## 🔒 Sécurité

### Secrets en production

⚠️ **IMPORTANT** : En production, utilisez :
- **Mots de passe complexes** (20+ caractères)
- **JWT secrets longs** (32+ caractères aléatoires)
- **Clés API Pappers réelles** (pas de test)

### Accès admin

- L'interface admin est accessible uniquement avec les bons identifiants
- Les sessions expirent automatiquement
- Tous les appels admin sont loggés

## 📈 Mise à l'échelle

### Performance

L'application est optimisée pour :
- **10 000+ visites/jour**
- **1 000+ contrats/jour**
- **Calculs instantanés**

### Base de données

- **Auto-scaling** géré par Leap
- **Backups automatiques**
- **Réplication haute disponibilité**

## 🆘 Support

En cas de problème :

1. **Vérifiez les logs** dans l'interface Leap
2. **Testez les secrets** dans l'onglet Infrastructure
3. **Consultez ce guide** de dépannage
4. **Contactez l'équipe** de développement

## 📝 Checklist de déploiement

- [ ] Repository GitHub connecté
- [ ] Déploiement réussi (vert dans Leap)
- [ ] Secrets configurés (ADMIN_USER, ADMIN_PASSWORD, JWT_SECRET)
- [ ] Test de connexion admin réussi
- [ ] Test du parcours complet réussi
- [ ] CGV uploadées
- [ ] Configuration tarifaire vérifiée
- [ ] Pappers testé (ou mode dégradé OK)
- [ ] Logs sans erreur critique

## 🎉 Félicitations !

Votre application Atexya Cash est maintenant déployée et opérationnelle !

Les utilisateurs peuvent commencer à souscrire des contrats d'assurance en ligne.
