#!/usr/bin/env python3
"""
Comparaison Leap ↔️ GitHub
Compare l'environnement Leap avec le dépôt GitHub source
Génère des rapports détaillés sans modifier aucun fichier
"""

import os
import json
import hashlib
import subprocess
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Tuple

# Configuration
GITHUB_URL = "https://github.com/Ines-Lefebvre/atexya-cash-app"
TEMP_DIR = "/tmp/github-clone"
LEAP_DIR = "/"
OUTPUT_DIR = "/audit/comparison"
OUTPUT_JSON = f"{OUTPUT_DIR}/comparison-result.json"
OUTPUT_MD = f"{OUTPUT_DIR}/compare-report.md"
SYNC_PLAN = f"{OUTPUT_DIR}/sync-plan.md"

# Patterns à exclure
EXCLUDE_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    '.next',
    'build',
    '.encore',
    '__pycache__',
    '.venv',
    'venv',
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'bun.lockb',
    '.DS_Store',
    '.log',
    'compare-tool',
    'compare-repos.sh',
    'comparison-result.json',
    'compare-report.md',
    'sync-plan.md',
    'audit/comparison',
    '/tmp/',
]

def log(message: str):
    """Affiche un message avec horodatage"""
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

def should_exclude(path: str) -> bool:
    """Vérifie si un chemin doit être exclu"""
    path = path.lstrip('./')
    for pattern in EXCLUDE_PATTERNS:
        if pattern in path or path.startswith(pattern):
            return True
    # Exclure les fichiers cachés système
    parts = path.split('/')
    if any(part.startswith('.') and part not in ['.gitkeep', '.gitignore'] for part in parts):
        return True
    return False

def compute_md5(filepath: str) -> str | None:
    """Calcule le hash MD5 d'un fichier"""
    try:
        hash_md5 = hashlib.md5()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except Exception as e:
        log(f"⚠️  Erreur MD5 pour {filepath}: {e}")
        return None

def get_file_info(filepath: str) -> Dict:
    """Récupère les infos d'un fichier (taille, hash)"""
    try:
        size = os.path.getsize(filepath)
        file_hash = compute_md5(filepath)
        return {"size": size, "hash": file_hash}
    except Exception as e:
        log(f"⚠️  Erreur info pour {filepath}: {e}")
        return {"size": 0, "hash": None}

def get_all_files(directory: str) -> Set[str]:
    """Liste récursivement tous les fichiers non exclus"""
    files = set()
    
    for root, dirs, filenames in os.walk(directory):
        # Filtrer les dossiers à exclure
        dirs[:] = [d for d in dirs if not should_exclude(os.path.join(root, d))]
        
        for filename in filenames:
            filepath = os.path.join(root, filename)
            relative_path = os.path.relpath(filepath, directory)
            
            if not should_exclude(relative_path):
                files.add(relative_path)
    
    return files

def clone_github_repo() -> bool:
    """Clone le dépôt GitHub"""
    log("🔄 Clonage du dépôt GitHub...")
    
    # Nettoyer le dossier temporaire
    if os.path.exists(TEMP_DIR):
        subprocess.run(['rm', '-rf', TEMP_DIR], check=True)
    
    try:
        result = subprocess.run(
            ['git', 'clone', '--depth', '1', GITHUB_URL, TEMP_DIR],
            capture_output=True,
            text=True,
            check=True
        )
        log(f"✅ Dépôt cloné dans {TEMP_DIR}")
        return True
    except subprocess.CalledProcessError as e:
        log(f"❌ Erreur lors du clonage: {e.stderr}")
        return False

def analyze_files() -> Dict:
    """Analyse et compare tous les fichiers"""
    log("📂 Analyse de l'environnement Leap...")
    leap_files = get_all_files(LEAP_DIR)
    log(f"   Trouvé {len(leap_files)} fichiers dans Leap")
    
    log("📂 Analyse du dépôt GitHub...")
    github_files = get_all_files(TEMP_DIR)
    log(f"   Trouvé {len(github_files)} fichiers dans GitHub")
    
    log("🔍 Comparaison des fichiers...")
    
    identical = []
    modified = []
    missing_in_leap = []
    missing_in_github = []
    
    # Fichiers communs
    common_files = leap_files & github_files
    log(f"   {len(common_files)} fichiers communs à comparer")
    
    processed = 0
    for filepath in sorted(common_files):
        leap_path = os.path.join(LEAP_DIR, filepath)
        github_path = os.path.join(TEMP_DIR, filepath)
        
        leap_info = get_file_info(leap_path)
        github_info = get_file_info(github_path)
        
        if leap_info["hash"] == github_info["hash"] and leap_info["hash"] is not None:
            identical.append({
                "file": filepath,
                "size": leap_info["size"],
                "hash": leap_info["hash"]
            })
        else:
            modified.append({
                "file": filepath,
                "leap": leap_info,
                "github": github_info
            })
        
        processed += 1
        if processed % 20 == 0:
            print(f"\r   Progression: {processed}/{len(common_files)}", end='', flush=True)
    
    print()  # Nouvelle ligne après la progression
    
    # Fichiers uniquement dans GitHub
    only_github = sorted(github_files - leap_files)
    log(f"   {len(only_github)} fichiers uniquement dans GitHub")
    for filepath in only_github:
        github_path = os.path.join(TEMP_DIR, filepath)
        info = get_file_info(github_path)
        missing_in_leap.append({
            "file": filepath,
            "size": info["size"],
            "hash": info["hash"]
        })
    
    # Fichiers uniquement dans Leap
    only_leap = sorted(leap_files - github_files)
    log(f"   {len(only_leap)} fichiers uniquement dans Leap")
    for filepath in only_leap:
        leap_path = os.path.join(LEAP_DIR, filepath)
        info = get_file_info(leap_path)
        missing_in_github.append({
            "file": filepath,
            "size": info["size"],
            "hash": info["hash"]
        })
    
    return {
        "leap_files": leap_files,
        "github_files": github_files,
        "identical": identical,
        "modified": modified,
        "missing_in_leap": missing_in_leap,
        "missing_in_github": missing_in_github
    }

def generate_json_report(analysis: Dict) -> Dict:
    """Génère le rapport JSON détaillé"""
    log("💾 Génération du rapport JSON...")
    
    total_unique = len(analysis["leap_files"] | analysis["github_files"])
    divergent_count = len(analysis["modified"]) + len(analysis["missing_in_leap"]) + len(analysis["missing_in_github"])
    divergence_rate = (divergent_count / total_unique * 100) if total_unique > 0 else 0
    
    result = {
        "comparison_date": datetime.now().isoformat(),
        "github_repo": GITHUB_URL,
        "statistics": {
            "total_files_leap": len(analysis["leap_files"]),
            "total_files_github": len(analysis["github_files"]),
            "total_unique_files": total_unique,
            "identical_files": len(analysis["identical"]),
            "modified_files": len(analysis["modified"]),
            "missing_in_leap": len(analysis["missing_in_leap"]),
            "missing_in_github": len(analysis["missing_in_github"]),
            "divergence_rate": round(divergence_rate, 2)
        },
        "identical": analysis["identical"],
        "modified": analysis["modified"],
        "missing_in_leap": analysis["missing_in_leap"],
        "missing_in_github": analysis["missing_in_github"]
    }
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    log(f"✅ Rapport JSON sauvegardé: {OUTPUT_JSON}")
    return result

def generate_markdown_report(result: Dict):
    """Génère le rapport Markdown lisible"""
    log("📝 Génération du rapport Markdown...")
    
    stats = result["statistics"]
    
    md = f"""# Comparaison Leap ↔️ GitHub

**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Dépôt GitHub:** {GITHUB_URL}

## 📊 Statistiques Globales

| Métrique | Valeur |
|----------|--------|
| Fichiers dans Leap | {stats['total_files_leap']} |
| Fichiers dans GitHub | {stats['total_files_github']} |
| Fichiers uniques totaux | {stats['total_unique_files']} |
| ✅ Fichiers identiques | {stats['identical_files']} |
| 🔄 Fichiers modifiés | {stats['modified_files']} |
| ⬇️ Manquants dans Leap | {stats['missing_in_leap']} |
| ⬆️ Manquants dans GitHub | {stats['missing_in_github']} |
| **🎯 Taux de divergence** | **{stats['divergence_rate']}%** |

"""

    # Résumé de la divergence
    divergence = stats['divergence_rate']
    if divergence == 0:
        md += "### ✅ Statut: PARFAITEMENT SYNCHRONISÉ\n\n"
        md += "Les environnements Leap et GitHub sont identiques.\n\n"
    elif divergence < 5:
        md += "### ✅ Statut: DIVERGENCE MINIME\n\n"
        md += "Quelques différences mineures détectées. Synchronisation simple recommandée.\n\n"
    elif divergence < 20:
        md += "### ⚠️ Statut: DIVERGENCE MODÉRÉE\n\n"
        md += "Des différences significatives existent. Révision et synchronisation recommandées.\n\n"
    else:
        md += "### 🚨 Statut: DIVERGENCE IMPORTANTE\n\n"
        md += "Différences majeures détectées. Synchronisation complète nécessaire.\n\n"
        md += f"**⚠️ Un plan de synchronisation détaillé a été généré: `{SYNC_PLAN}`**\n\n"
    
    # Fichiers modifiés
    if result["modified"]:
        md += f"\n## 🔄 Fichiers Modifiés ({len(result['modified'])})\n\n"
        md += "Fichiers présents des deux côtés mais avec des différences de contenu.\n\n"
        
        for item in result["modified"][:30]:
            md += f"### `{item['file']}`\n\n"
            md += f"| Source | Taille | Hash MD5 |\n"
            md += f"|--------|--------|----------|\n"
            md += f"| Leap | {item['leap']['size']:,} bytes | `{item['leap']['hash'] or 'N/A'}` |\n"
            md += f"| GitHub | {item['github']['size']:,} bytes | `{item['github']['hash'] or 'N/A'}` |\n\n"
        
        if len(result["modified"]) > 30:
            md += f"*...et {len(result['modified']) - 30} autres fichiers modifiés (voir JSON pour la liste complète)*\n\n"
    
    # Fichiers manquants dans Leap
    if result["missing_in_leap"]:
        md += f"\n## ⬇️ Fichiers Manquants dans Leap ({len(result['missing_in_leap'])})\n\n"
        md += "Ces fichiers existent dans GitHub mais pas dans Leap. Ils doivent potentiellement être ajoutés.\n\n"
        
        # Grouper par dossier
        by_folder = {}
        for item in result["missing_in_leap"]:
            folder = os.path.dirname(item['file']) or 'racine'
            if folder not in by_folder:
                by_folder[folder] = []
            by_folder[folder].append(item)
        
        for folder in sorted(by_folder.keys()):
            md += f"### 📁 `{folder}/`\n\n"
            for item in by_folder[folder][:20]:
                md += f"- `{os.path.basename(item['file'])}` ({item['size']:,} bytes)\n"
            if len(by_folder[folder]) > 20:
                md += f"- *...et {len(by_folder[folder]) - 20} autres fichiers*\n"
            md += "\n"
    
    # Fichiers manquants dans GitHub
    if result["missing_in_github"]:
        md += f"\n## ⬆️ Fichiers Manquants dans GitHub ({len(result['missing_in_github'])})\n\n"
        md += "Ces fichiers existent dans Leap mais pas dans GitHub. Ils doivent potentiellement être poussés.\n\n"
        
        # Grouper par dossier
        by_folder = {}
        for item in result["missing_in_github"]:
            folder = os.path.dirname(item['file']) or 'racine'
            if folder not in by_folder:
                by_folder[folder] = []
            by_folder[folder].append(item)
        
        for folder in sorted(by_folder.keys()):
            md += f"### 📁 `{folder}/`\n\n"
            for item in by_folder[folder][:20]:
                md += f"- `{os.path.basename(item['file'])}` ({item['size']:,} bytes)\n"
            if len(by_folder[folder]) > 20:
                md += f"- *...et {len(by_folder[folder]) - 20} autres fichiers*\n"
            md += "\n"
    
    # Recommandations
    md += "\n## 💡 Recommandations\n\n"
    
    if divergence == 0:
        md += "✅ Aucune action requise. Les environnements sont synchronisés.\n\n"
    else:
        if result["missing_in_leap"]:
            md += f"1. **Récupérer {len(result['missing_in_leap'])} fichiers depuis GitHub**\n"
            md += f"   - Examiner chaque fichier pour comprendre son rôle\n"
            md += f"   - Ajouter les fichiers pertinents à Leap\n\n"
        
        if result["missing_in_github"]:
            md += f"2. **Pousser {len(result['missing_in_github'])} fichiers vers GitHub**\n"
            md += f"   - Vérifier que ces fichiers doivent être versionnés\n"
            md += f"   - Commit et push des fichiers pertinents\n\n"
        
        if result["modified"]:
            md += f"3. **Résoudre {len(result['modified'])} conflits de fichiers**\n"
            md += f"   - Comparer chaque fichier pour identifier les différences\n"
            md += f"   - Décider quelle version conserver (Leap, GitHub, ou fusion)\n"
            md += f"   - Synchroniser les versions finales\n\n"
        
        if divergence >= 20:
            md += f"\n⚠️ **IMPORTANT:** Vu le taux de divergence élevé ({divergence:.1f}%), consultez le plan de synchronisation détaillé.\n\n"
    
    # Fichiers de rapport
    md += "\n## 📄 Fichiers Générés\n\n"
    md += f"- **`{OUTPUT_JSON}`** - Rapport détaillé en JSON avec tous les hashes MD5\n"
    md += f"- **`{OUTPUT_MD}`** - Ce rapport résumé en Markdown\n"
    if divergence >= 20:
        md += f"- **`{SYNC_PLAN}`** - Plan de synchronisation sécurisé détaillé\n"
    md += "\n---\n\n"
    md += "*Rapport généré automatiquement par le système de comparaison Leap ↔️ GitHub*\n"
    
    with open(OUTPUT_MD, 'w', encoding='utf-8') as f:
        f.write(md)
    
    log(f"✅ Rapport Markdown sauvegardé: {OUTPUT_MD}")

def generate_sync_plan(result: Dict):
    """Génère un plan de synchronisation sécurisé si divergence > 20%"""
    divergence = result["statistics"]["divergence_rate"]
    
    if divergence < 20:
        return
    
    log("📋 Génération du plan de synchronisation sécurisé...")
    
    # Fichiers critiques à ne jamais écraser automatiquement
    critical_patterns = [
        'migrations/',
        '.env',
        'secrets',
        'config/production',
        'package.json',
        'encore.service.ts',
    ]
    
    def is_critical(filepath: str) -> bool:
        return any(pattern in filepath for pattern in critical_patterns)
    
    plan = f"""# Plan de Synchronisation Sécurisé Leap ↔️ GitHub

**Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  
**Taux de divergence:** {divergence:.2f}% (>20% = synchronisation manuelle requise)

## ⚠️ AVERTISSEMENT IMPORTANT

Ce plan est généré car le taux de divergence dépasse 20%. Une synchronisation automatique
pourrait causer des pertes de données ou des conflits majeurs.

**⛔ NE PAS exécuter de synchronisation automatique sans révision manuelle complète.**

## 📋 Étapes Recommandées

### Phase 1: Sauvegarde et Préparation

1. **Créer une sauvegarde complète de Leap**
   ```bash
   # Créer une archive de l'environnement actuel
   tar -czf leap-backup-{datetime.now().strftime('%Y%m%d-%H%M%S')}.tar.gz \\
     --exclude=node_modules --exclude=.git --exclude=dist \\
     /path/to/leap/
   ```

2. **Créer une branche de travail dans GitHub**
   ```bash
   git checkout -b sync-leap-{datetime.now().strftime('%Y%m%d')}
   ```

### Phase 2: Fichiers Critiques à Réviser Manuellement

"""
    
    # Lister les fichiers critiques modifiés
    critical_modified = [f for f in result["modified"] if is_critical(f["file"])]
    if critical_modified:
        plan += f"\n#### 🔴 Fichiers Critiques Modifiés ({len(critical_modified)})\n\n"
        plan += "**CES FICHIERS NÉCESSITENT UNE RÉVISION MANUELLE COMPLÈTE**\n\n"
        for item in critical_modified:
            plan += f"- [ ] `{item['file']}`\n"
            plan += f"      - Leap: {item['leap']['size']} bytes (hash: `{item['leap']['hash']}`)\n"
            plan += f"      - GitHub: {item['github']['size']} bytes (hash: `{item['github']['hash']}`)\n"
            plan += f"      - **Action:** Comparer ligne par ligne et fusionner manuellement\n\n"
    
    critical_missing_leap = [f for f in result["missing_in_leap"] if is_critical(f["file"])]
    if critical_missing_leap:
        plan += f"\n#### 🔴 Fichiers Critiques Manquants dans Leap ({len(critical_missing_leap)})\n\n"
        for item in critical_missing_leap:
            plan += f"- [ ] `{item['file']}`\n"
            plan += f"      - **Action:** Vérifier pourquoi ce fichier est absent et décider de l'ajouter\n\n"
    
    # Fichiers non-critiques
    non_critical_modified = [f for f in result["modified"] if not is_critical(f["file"])]
    if non_critical_modified:
        plan += f"\n### Phase 3: Fichiers Non-Critiques Modifiés ({len(non_critical_modified)})\n\n"
        plan += "Ces fichiers peuvent être synchronisés avec plus de liberté, mais vérifiez quand même.\n\n"
        
        # Grouper par type
        by_type = {}
        for item in non_critical_modified:
            ext = os.path.splitext(item['file'])[1] or 'sans_extension'
            if ext not in by_type:
                by_type[ext] = []
            by_type[ext].append(item)
        
        for ext, items in sorted(by_type.items()):
            plan += f"\n#### Fichiers `{ext}` ({len(items)})\n\n"
            for item in items[:10]:
                plan += f"- [ ] `{item['file']}`\n"
            if len(items) > 10:
                plan += f"- *...et {len(items) - 10} autres fichiers {ext}*\n"
            plan += "\n"
    
    # Fichiers à ajouter
    if result["missing_in_leap"]:
        non_critical_missing = [f for f in result["missing_in_leap"] if not is_critical(f["file"])]
        if non_critical_missing:
            plan += f"\n### Phase 4: Fichiers à Ajouter dans Leap ({len(non_critical_missing)})\n\n"
            for item in non_critical_missing[:20]:
                plan += f"- [ ] `{item['file']}` ({item['size']:,} bytes)\n"
            if len(non_critical_missing) > 20:
                plan += f"- *...et {len(non_critical_missing) - 20} autres fichiers*\n"
            plan += "\n"
    
    # Fichiers à pousser
    if result["missing_in_github"]:
        non_critical_extra = [f for f in result["missing_in_github"] if not is_critical(f["file"])]
        if non_critical_extra:
            plan += f"\n### Phase 5: Fichiers à Pousser vers GitHub ({len(non_critical_extra)})\n\n"
            for item in non_critical_extra[:20]:
                plan += f"- [ ] `{item['file']}` ({item['size']:,} bytes)\n"
            if len(non_critical_extra) > 20:
                plan += f"- *...et {len(non_critical_extra) - 20} autres fichiers*\n"
            plan += "\n"
    
    # Procédure de synchronisation
    plan += """
### Phase 6: Procédure de Synchronisation

1. **Pour chaque fichier modifié:**
   ```bash
   # Comparer visuellement
   diff /path/to/leap/fichier /path/to/github/fichier
   
   # Ou utiliser un outil de diff
   code --diff /path/to/leap/fichier /path/to/github/fichier
   ```

2. **Pour les fichiers à ajouter:**
   ```bash
   # Copier depuis GitHub vers Leap
   cp /path/to/github/fichier /path/to/leap/fichier
   ```

3. **Pour les fichiers à pousser:**
   ```bash
   # Copier depuis Leap vers GitHub
   cp /path/to/leap/fichier /path/to/github/fichier
   git add fichier
   git commit -m "Sync: Add fichier from Leap"
   ```

### Phase 7: Validation

1. **Exécuter les tests**
   ```bash
   npm test
   # ou
   npm run test:all
   ```

2. **Vérifier le build**
   ```bash
   npm run build
   ```

3. **Relancer la comparaison**
   ```bash
   python3 /audit/comparison/compare.py
   # Vérifier que divergence_rate < 5%
   ```

## ⚠️ Checklist de Sécurité

Avant de synchroniser, vérifiez:

- [ ] Sauvegarde complète créée
- [ ] Branche de travail créée dans Git
- [ ] Fichiers critiques identifiés et marqués
- [ ] Migrations de base de données vérifiées
- [ ] Variables d'environnement vérifiées
- [ ] Secrets et clés API vérifiés
- [ ] Tests unitaires prêts à être exécutés
- [ ] Plan de rollback préparé

## 🔄 Plan de Rollback

En cas de problème:

1. Restaurer depuis la sauvegarde:
   ```bash
   tar -xzf leap-backup-*.tar.gz -C /path/to/leap/
   ```

2. Annuler les commits Git:
   ```bash
   git reset --hard HEAD~N  # N = nombre de commits à annuler
   ```

3. Supprimer la branche de travail:
   ```bash
   git branch -D sync-leap-{datetime.now().strftime('%Y%m%d')}
   ```

---

**⚠️ RAPPEL:** Ce plan est indicatif. Adaptez-le à votre contexte spécifique.
**Ne synchronisez JAMAIS automatiquement avec un taux de divergence >20%.**

*Plan généré automatiquement le {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*
"""
    
    with open(SYNC_PLAN, 'w', encoding='utf-8') as f:
        f.write(plan)
    
    log(f"✅ Plan de synchronisation sauvegardé: {SYNC_PLAN}")

def cleanup():
    """Nettoie les fichiers temporaires"""
    log("🧹 Nettoyage des fichiers temporaires...")
    if os.path.exists(TEMP_DIR):
        subprocess.run(['rm', '-rf', TEMP_DIR], check=True)
    log("✅ Nettoyage terminé")

def main():
    """Fonction principale"""
    print("\n" + "="*70)
    print("  COMPARAISON LEAP ↔️ GITHUB")
    print("="*70 + "\n")
    
    try:
        # Créer le dossier de sortie
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # Cloner le dépôt
        if not clone_github_repo():
            log("❌ Impossible de continuer sans le dépôt GitHub")
            return 1
        
        # Analyser les fichiers
        analysis = analyze_files()
        
        # Générer les rapports
        result = generate_json_report(analysis)
        generate_markdown_report(result)
        
        # Générer le plan de synchro si nécessaire
        if result["statistics"]["divergence_rate"] >= 20:
            generate_sync_plan(result)
        
        # Nettoyer
        cleanup()
        
        # Résumé final
        print("\n" + "="*70)
        print("  RÉSUMÉ DE LA COMPARAISON")
        print("="*70)
        stats = result["statistics"]
        print(f"✅ Fichiers identiques:      {stats['identical_files']:>5}")
        print(f"🔄 Fichiers modifiés:        {stats['modified_files']:>5}")
        print(f"⬇️  Manquants dans Leap:     {stats['missing_in_leap']:>5}")
        print(f"⬆️  Manquants dans GitHub:   {stats['missing_in_github']:>5}")
        print(f"{'='*70}")
        print(f"🎯 Taux de divergence:       {stats['divergence_rate']:>5.2f}%")
        print("="*70)
        
        print(f"\n📁 Rapports générés dans: {OUTPUT_DIR}/")
        print(f"   - comparison-result.json")
        print(f"   - compare-report.md")
        if stats['divergence_rate'] >= 20:
            print(f"   - sync-plan.md (⚠️ divergence élevée)")
        
        print("\n✅ Analyse terminée avec succès!\n")
        return 0
        
    except Exception as e:
        log(f"❌ Erreur fatale: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
