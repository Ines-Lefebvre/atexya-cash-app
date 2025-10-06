# Politique de Confidentialité et Protection des Données (RGPD)

## 1. Données Collectées

### 1.1 Données Personnelles
- **Nom et prénom** du souscripteur
- **Adresse email** du souscripteur
- **Numéro de téléphone** (optionnel)
- **SIREN** de l'entreprise
- **Informations de paiement** (via Stripe - non stockées directement)

### 1.2 Données Techniques
- **Logs de connexion** (adresses IP hashées)
- **Sessions de paiement** (identifiants Stripe)
- **Identifiants de contrat**

## 2. Finalités du Traitement

Les données sont collectées pour :
- La souscription et gestion de contrats d'assurance
- Le traitement des paiements
- L'envoi de documents contractuels
- Le respect des obligations légales et réglementaires

## 3. Durée de Conservation des Données

### 3.1 Contrats Non Signés
- **Durée** : 2 mois maximum
- **Action** : Purge automatique quotidienne (à 2h du matin)
- **Critères** : Contrats avec statut `pending`, `failed`, ou `cancelled`
- **Conformité** : Article 5(1)(e) RGPD - Limitation de la conservation

### 3.2 Contrats Signés et Actifs
- **Durée** : Durée du contrat + 10 ans
- **Fondement** : Obligations légales (Code des assurances)
- **Après expiration** : Anonymisation des données personnelles

### 3.3 Logs et Données Techniques
- **Durée** : 12 mois maximum
- **Anonymisation** : Hachage SHA256 des données sensibles
- **Purge** : Automatique après expiration

### 3.4 Sessions de Paiement
- **Durée** : 90 jours après création
- **Action** : Purge automatique des sessions non abouties

## 4. Mesures de Sécurité

### 4.1 Chiffrement des Données
- **Méthode** : pgcrypto (PostgreSQL) avec AES-256
- **Champs chiffrés** :
  - `customer_email_encrypted`
  - `customer_name_encrypted`
  - `customer_phone_encrypted`
- **Clé** : Secret `ENCRYPTION_KEY` géré via Encore Secrets

### 4.2 Protection des Logs
- **Filtrage automatique** : Fonction `safeLog()`
- **Hachage SHA256** : Emails, noms, SIREN, téléphones
- **Patterns détectés** : 20+ champs sensibles automatiquement masqués

### 4.3 Authentification et Autorisation
- **Admin** : JWT HMAC HS256 (12h d'expiration)
- **Sessions** : Cookies HttpOnly, Secure, SameSite=Strict
- **API** : Vérification d'authentification sur toutes les routes sensibles

### 4.4 Protection des Fichiers
- **Upload CGV** : Validation PDF, limite 5MB, scan antivirus
- **Types MIME** : Vérification stricte
- **Magic bytes** : Validation de signature PDF

### 4.5 Idempotence
- **Clés uniques** : UUID pour chaque transaction
- **Protection** : Doublons, double-clic, retry
- **Contrainte** : UNIQUE SQL sur `idempotency_key`

## 5. Droits des Utilisateurs (RGPD)

### 5.1 Droit d'Accès (Article 15)
Les utilisateurs peuvent demander l'accès à leurs données personnelles.

**Contact** : privacy@atexya.com

### 5.2 Droit de Rectification (Article 16)
Les utilisateurs peuvent demander la correction de données inexactes.

### 5.3 Droit à l'Effacement (Article 17)
Les utilisateurs peuvent demander la suppression de leurs données :
- Avant signature du contrat : effacement immédiat
- Après signature : anonymisation après période légale

### 5.4 Droit d'Opposition (Article 21)
Les utilisateurs peuvent s'opposer au traitement de leurs données pour certaines finalités.

### 5.5 Droit à la Portabilité (Article 20)
Les utilisateurs peuvent obtenir leurs données dans un format structuré (JSON/CSV).

## 6. Transferts de Données

### 6.1 Sous-traitants
- **Stripe** (USA) : Traitement des paiements - Certifié EU-US Data Privacy Framework
- **Encore.cloud** : Hébergement backend - Données UE

### 6.2 Garanties
- Clauses contractuelles types (CCT) de la Commission européenne
- Chiffrement en transit (TLS 1.3)
- Chiffrement au repos (AES-256)

## 7. Violations de Données

### 7.1 Notification CNIL
En cas de violation : notification sous 72h à la CNIL.

### 7.2 Notification Utilisateurs
Si risque élevé : notification directe aux personnes concernées.

## 8. DPO (Délégué à la Protection des Données)

**Email** : dpo@atexya.com  
**Adresse** : [Adresse postale de l'entreprise]

## 9. Mise à Jour de la Politique

**Dernière mise à jour** : 2025-01-10  
**Version** : 1.0

Les modifications de cette politique seront communiquées par email aux utilisateurs actifs.

## 10. Base Légale du Traitement

- **Exécution du contrat** (Article 6(1)(b) RGPD)
- **Obligations légales** (Article 6(1)(c) RGPD)
- **Consentement** (Article 6(1)(a) RGPD) pour communications marketing

## 11. Audit et Conformité

### 11.1 Scripts de Purge
- **Fichier** : `backend/atexya/purge-contracts.ts`
- **Fréquence** : Quotidienne (2h00)
- **Logs** : Traçabilité complète

### 11.2 Chiffrement
- **Fichier** : `backend/atexya/encryption.ts`
- **Migration** : `backend/atexya/migrations/3_encrypt_sensitive_data.up.sql`

### 11.3 Logs Sécurisés
- **Fichier** : `backend/utils/safeLog.ts`
- **Hachage** : SHA256 pour toutes données PII

## 12. Contact

Pour toute question relative à la protection de vos données :

- **Email** : privacy@atexya.com
- **DPO** : dpo@atexya.com
- **Support** : support@atexya.com

---

*Ce document est conforme au Règlement Général sur la Protection des Données (RGPD) - Règlement (UE) 2016/679*
