# 🔍 Comparaison Leap ↔️ GitHub

Outil d'audit et de comparaison entre l'environnement Leap et le dépôt GitHub source.

## 🎯 Objectif

Analyser les différences entre Leap et GitHub sans modifier aucun fichier. Génère des rapports détaillés et un plan de synchronisation sécurisé si nécessaire.

## 🚀 Utilisation

### Exécution Directe

```bash
# Depuis la racine du projet
python3 audit/comparison/compare.py
```

### Exécution avec Permissions

```bash
# Rendre le script exécutable
chmod +x audit/comparison/compare.py

# Exécuter
./audit/comparison/compare.py
```

## 📊 Rapports Générés

### 1. `comparison-result.json`
Rapport technique détaillé contenant:
- Statistiques complètes
- Liste de tous les fichiers identiques avec hash MD5
- Liste de tous les fichiers modifiés avec hash des deux côtés
- Liste des fichiers manquants dans chaque environnement

**Format:**
```json
{
  "comparison_date": "2025-10-18T14:30:00",
  "github_repo": "https://github.com/Ines-Lefebvre/atexya-cash-app",
  "statistics": {
    "total_files_leap": 97,
    "total_files_github": 102,
    "identical_files": 85,
    "modified_files": 8,
    "missing_in_leap": 9,
    "missing_in_github": 4,
    "divergence_rate": 16.83
  },
  "identical": [...],
  "modified": [...],
  "missing_in_leap": [...],
  "missing_in_github": [...]
}
```

### 2. `compare-report.md`
Rapport lisible en Markdown avec:
- Tableau de statistiques globales
- Statut de synchronisation (✅/⚠️/🚨)
- Liste détaillée des fichiers modifiés
- Fichiers manquants groupés par dossier
- Recommandations d'action

### 3. `sync-plan.md` (si divergence ≥ 20%)
Plan de synchronisation sécurisé incluant:
- Avertissements de sécurité
- Identification des fichiers critiques
- Procédure étape par étape
- Checklist de validation
- Plan de rollback

## 🔍 Fichiers Exclus

Le script exclut automatiquement:
- `node_modules/`, `.git/`, `dist/`, `.next/`, `build/`
- `.encore/`, `__pycache__/`, `.venv/`, `venv/`
- Fichiers d'environnement: `.env*`
- Fichiers de lock: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- Fichiers système: `.DS_Store`, `*.log`
- Dossier d'audit lui-même

## 📈 Interprétation du Taux de Divergence

| Taux | Statut | Action |
|------|--------|--------|
| **0%** | ✅ Parfait | Aucune action requise |
| **< 5%** | ✅ Minime | Synchronisation simple |
| **5-20%** | ⚠️ Modéré | Révision recommandée |
| **≥ 20%** | 🚨 Élevé | Plan de synchro obligatoire |

## 🛠️ Fonctionnement

1. **Clone** le dépôt GitHub dans `/tmp/github-clone`
2. **Scanne** récursivement tous les fichiers (Leap + GitHub)
3. **Calcule** le hash MD5 de chaque fichier
4. **Compare** et classe les fichiers:
   - `identical`: Hash identique
   - `modified`: Présent des deux côtés, hash différent
   - `missing_in_leap`: Uniquement dans GitHub
   - `missing_in_github`: Uniquement dans Leap
5. **Génère** les rapports dans `/audit/comparison/`
6. **Nettoie** les fichiers temporaires

## 🔐 Sécurité

### Fichiers Critiques

Le script identifie automatiquement les fichiers critiques:
- `migrations/` - Migrations de base de données
- `.env*` - Variables d'environnement
- `secrets/` - Fichiers de secrets
- `package.json` - Dépendances
- `encore.service.ts` - Configuration services

Ces fichiers nécessitent une révision manuelle complète avant toute modification.

### Analyse Non-Destructive

⚠️ **IMPORTANT:** Ce script est en **lecture seule**. Il ne modifie JAMAIS aucun fichier.

Toutes les opérations sont des analyses statiques:
- Lecture des fichiers pour calcul de hash
- Aucune écriture en dehors de `/audit/comparison/`
- Pas d'exécution de build ou de tests
- Pas de suppression de fichiers

## 📋 Exemple de Sortie

```
======================================================================
  COMPARAISON LEAP ↔️ GITHUB
======================================================================

[14:30:15] 🔄 Clonage du dépôt GitHub...
[14:30:18] ✅ Dépôt cloné dans /tmp/github-clone
[14:30:18] 📂 Analyse de l'environnement Leap...
[14:30:19]    Trouvé 97 fichiers dans Leap
[14:30:19] 📂 Analyse du dépôt GitHub...
[14:30:19]    Trouvé 102 fichiers dans GitHub
[14:30:19] 🔍 Comparaison des fichiers...
[14:30:19]    92 fichiers communs à comparer
[14:30:21]    10 fichiers uniquement dans GitHub
[14:30:21]    5 fichiers uniquement dans Leap
[14:30:21] 💾 Génération du rapport JSON...
[14:30:21] ✅ Rapport JSON sauvegardé: /audit/comparison/comparison-result.json
[14:30:21] 📝 Génération du rapport Markdown...
[14:30:22] ✅ Rapport Markdown sauvegardé: /audit/comparison/compare-report.md
[14:30:22] 🧹 Nettoyage des fichiers temporaires...
[14:30:22] ✅ Nettoyage terminé

======================================================================
  RÉSUMÉ DE LA COMPARAISON
======================================================================
✅ Fichiers identiques:         85
🔄 Fichiers modifiés:            7
⬇️  Manquants dans Leap:         10
⬆️  Manquants dans GitHub:        5
======================================================================
🎯 Taux de divergence:        17.82%
======================================================================

📁 Rapports générés dans: /audit/comparison/
   - comparison-result.json
   - compare-report.md

✅ Analyse terminée avec succès!
```

## 🔧 Dépendances

Le script utilise uniquement des bibliothèques Python standard:
- `os`, `sys`, `json` - Gestion fichiers
- `hashlib` - Calcul MD5
- `subprocess` - Exécution git
- `pathlib` - Manipulation chemins
- `datetime` - Horodatage

**Aucune installation pip requise.**

Dépendances système:
- `python3` (≥ 3.8)
- `git` (pour cloner le dépôt)

## 📞 Résolution de Problèmes

### Erreur: "git command not found"
```bash
# Installer git
apt-get install git  # Debian/Ubuntu
brew install git     # macOS
```

### Erreur: Permission denied
```bash
# Donner les permissions d'exécution
chmod +x audit/comparison/compare.py
```

### Le script s'arrête pendant le clonage
```bash
# Vérifier la connexion réseau
ping github.com

# Cloner manuellement pour tester
git clone --depth 1 https://github.com/Ines-Lefebvre/atexya-cash-app /tmp/test-clone
```

### Hash MD5 null pour certains fichiers
Cela peut arriver si:
- Le fichier est un lien symbolique
- Permissions de lecture insuffisantes
- Fichier corrompu

Vérifier dans `comparison-result.json` les fichiers concernés.

## 🔄 Workflow Recommandé

1. **Exécuter l'analyse:**
   ```bash
   python3 audit/comparison/compare.py
   ```

2. **Consulter le rapport:**
   ```bash
   cat audit/comparison/compare-report.md
   ```

3. **Si divergence < 20%:**
   - Réviser les fichiers modifiés manuellement
   - Synchroniser au cas par cas

4. **Si divergence ≥ 20%:**
   - Consulter `sync-plan.md`
   - Créer une sauvegarde complète
   - Suivre le plan étape par étape
   - Valider avec tests et build

5. **Ré-exécuter l'analyse:**
   ```bash
   python3 audit/comparison/compare.py
   ```
   Vérifier que `divergence_rate < 5%`

## 📚 Documentation Complémentaire

- `/COMPARISON_INSTRUCTIONS.md` - Instructions générales
- `/LEAP_INVENTORY.md` - Inventaire des fichiers Leap
- `/compare-repos.sh` - Alternative en Bash
- `/compare-tool/compare.ts` - Alternative en TypeScript

---

**Version:** 1.0.0  
**Date:** 2025-10-18  
**Dépôt:** https://github.com/Ines-Lefebvre/atexya-cash-app
