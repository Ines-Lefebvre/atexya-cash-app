#!/bin/bash
set -e

GITHUB_URL="https://github.com/Ines-Lefebvre/atexya-cash-app"
TEMP_DIR="/tmp/github-clone"
LEAP_DIR="/"
OUTPUT_JSON="/comparison-result.json"
OUTPUT_MD="/compare-report.md"

echo "🔄 Cloning GitHub repository..."
rm -rf "$TEMP_DIR"
git clone --depth 1 "$GITHUB_URL" "$TEMP_DIR" 2>/dev/null || {
  echo "❌ Failed to clone repository"
  exit 1
}

echo "📂 Analyzing Leap environment..."
cd "$LEAP_DIR"
find . -type f \
  ! -path "*/node_modules/*" \
  ! -path "*/.git/*" \
  ! -path "*/dist/*" \
  ! -path "*/.next/*" \
  ! -path "*/build/*" \
  ! -path "*/.encore/*" \
  ! -path "*/package-lock.json" \
  ! -path "*/yarn.lock" \
  ! -path "*/pnpm-lock.yaml" \
  ! -name ".DS_Store" \
  ! -name "*.log" \
  ! -name "compare-repos.sh" \
  ! -name "comparison-result.json" \
  ! -name "compare-report.md" \
  | sed 's|^\./||' | sort > /tmp/leap-files.txt

echo "📂 Analyzing GitHub repository..."
cd "$TEMP_DIR"
find . -type f \
  ! -path "*/node_modules/*" \
  ! -path "*/.git/*" \
  ! -path "*/dist/*" \
  ! -path "*/.next/*" \
  ! -path "*/build/*" \
  ! -path "*/.encore/*" \
  ! -path "*/package-lock.json" \
  ! -path "*/yarn.lock" \
  ! -path "*/pnpm-lock.yaml" \
  ! -name ".DS_Store" \
  ! -name "*.log" \
  | sed 's|^\./||' | sort > /tmp/github-files.txt

echo "🔍 Computing file hashes and comparing..."

# Create comparison script
cat > /tmp/compare.py << 'PYEOF'
import os
import hashlib
import json
from pathlib import Path

def compute_md5(filepath):
    """Compute MD5 hash of a file"""
    try:
        hash_md5 = hashlib.md5()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except:
        return None

def get_file_info(filepath):
    """Get file size and hash"""
    try:
        size = os.path.getsize(filepath)
        hash_val = compute_md5(filepath)
        return {"size": size, "hash": hash_val}
    except:
        return {"size": 0, "hash": None}

LEAP_DIR = "/"
GITHUB_DIR = "/tmp/github-clone"

# Read file lists
with open("/tmp/leap-files.txt") as f:
    leap_files = set(line.strip() for line in f if line.strip())

with open("/tmp/github-files.txt") as f:
    github_files = set(line.strip() for line in f if line.strip())

# Categorize files
identical = []
modified = []
missing_in_leap = []
missing_in_github = []

# Check files in both
common_files = leap_files & github_files
for filepath in sorted(common_files):
    leap_path = os.path.join(LEAP_DIR, filepath)
    github_path = os.path.join(GITHUB_DIR, filepath)
    
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

# Files only in GitHub
for filepath in sorted(github_files - leap_files):
    github_path = os.path.join(GITHUB_DIR, filepath)
    info = get_file_info(github_path)
    missing_in_leap.append({
        "file": filepath,
        "size": info["size"],
        "hash": info["hash"]
    })

# Files only in Leap
for filepath in sorted(leap_files - github_files):
    leap_path = os.path.join(LEAP_DIR, filepath)
    info = get_file_info(leap_path)
    missing_in_github.append({
        "file": filepath,
        "size": info["size"],
        "hash": info["hash"]
    })

# Compute statistics
total_files = len(leap_files | github_files)
divergence_rate = 0 if total_files == 0 else ((len(modified) + len(missing_in_leap) + len(missing_in_github)) / total_files) * 100

# Generate JSON report
result = {
    "comparison_date": "2025-10-18",
    "github_repo": "https://github.com/Ines-Lefebvre/atexya-cash-app",
    "statistics": {
        "total_files_leap": len(leap_files),
        "total_files_github": len(github_files),
        "total_unique_files": total_files,
        "identical_files": len(identical),
        "modified_files": len(modified),
        "missing_in_leap": len(missing_in_leap),
        "missing_in_github": len(missing_in_github),
        "divergence_rate": round(divergence_rate, 2)
    },
    "identical": identical,
    "modified": modified,
    "missing_in_leap": missing_in_leap,
    "missing_in_github": missing_in_github
}

with open("/comparison-result.json", "w") as f:
    json.dump(result, f, indent=2)

print(f"✅ Comparison complete: {len(identical)} identical, {len(modified)} modified, {len(missing_in_leap)} missing in Leap, {len(missing_in_github)} missing in GitHub")
print(f"📊 Divergence rate: {divergence_rate:.2f}%")
PYEOF

python3 /tmp/compare.py

echo "📝 Generating markdown report..."

# Generate markdown report
cat > "$OUTPUT_MD" << 'MDEOF'
# Comparaison Leap ↔️ GitHub

**Date:** 2025-10-18  
**Dépôt GitHub:** https://github.com/Ines-Lefebvre/atexya-cash-app

## 📊 Statistiques globales

MDEOF

python3 << 'PYEOF'
import json

with open("/comparison-result.json") as f:
    data = json.load(f)

stats = data["statistics"]

md_stats = f"""
| Métrique | Valeur |
|----------|--------|
| Fichiers dans Leap | {stats['total_files_leap']} |
| Fichiers dans GitHub | {stats['total_files_github']} |
| Fichiers uniques totaux | {stats['total_unique_files']} |
| Fichiers identiques | {stats['identical_files']} |
| Fichiers modifiés | {stats['modified_files']} |
| Fichiers manquants dans Leap | {stats['missing_in_leap']} |
| Fichiers manquants dans GitHub | {stats['missing_in_github']} |
| **Taux de divergence** | **{stats['divergence_rate']}%** |

"""

with open("/compare-report.md", "a") as f:
    f.write(md_stats)

# Add modified files section
if data["modified"]:
    f.write("\n## 🔄 Fichiers modifiés\n\n")
    for item in data["modified"][:50]:  # Limit to first 50
        f.write(f"### `{item['file']}`\n")
        f.write(f"- **Leap:** {item['leap']['size']} bytes, hash: `{item['leap']['hash']}`\n")
        f.write(f"- **GitHub:** {item['github']['size']} bytes, hash: `{item['github']['hash']}`\n\n")
    if len(data["modified"]) > 50:
        f.write(f"*...et {len(data['modified']) - 50} autres fichiers modifiés*\n\n")

# Add missing in Leap section
if data["missing_in_leap"]:
    f.write("\n## ⬇️ Fichiers manquants dans Leap (présents dans GitHub)\n\n")
    for item in data["missing_in_leap"][:50]:
        f.write(f"- `{item['file']}` ({item['size']} bytes)\n")
    if len(data["missing_in_leap"]) > 50:
        f.write(f"\n*...et {len(data['missing_in_leap']) - 50} autres fichiers*\n")

# Add missing in GitHub section
if data["missing_in_github"]:
    f.write("\n## ⬆️ Fichiers manquants dans GitHub (présents dans Leap)\n\n")
    for item in data["missing_in_github"][:50]:
        f.write(f"- `{item['file']}` ({item['size']} bytes)\n")
    if len(data["missing_in_github"]) > 50:
        f.write(f"\n*...et {len(data['missing_in_github']) - 50} autres fichiers*\n")

# Add recommendations
f.write("\n## 💡 Recommandations\n\n")

divergence = stats['divergence_rate']
if divergence == 0:
    f.write("✅ Les environnements sont **parfaitement synchronisés**.\n")
elif divergence < 5:
    f.write("✅ Divergence minime. Synchronisation recommandée pour les fichiers modifiés.\n")
elif divergence < 20:
    f.write("⚠️ Divergence modérée. Révision et synchronisation recommandées.\n")
else:
    f.write("🚨 Divergence importante. Synchronisation complète nécessaire.\n")

if data["missing_in_leap"]:
    f.write(f"\n- **{len(data['missing_in_leap'])} fichiers** doivent être ajoutés à Leap depuis GitHub\n")
if data["missing_in_github"]:
    f.write(f"- **{len(data['missing_in_github'])} fichiers** doivent être poussés vers GitHub depuis Leap\n")
if data["modified"]:
    f.write(f"- **{len(data['modified'])} fichiers** ont des différences à résoudre\n")

f.write("\n## 📄 Fichiers pour détails complets\n\n")
f.write("- `comparison-result.json` - Rapport détaillé en JSON avec tous les hashes\n")

PYEOF

echo "✅ Reports generated:"
echo "   - $OUTPUT_JSON (detailed JSON)"
echo "   - $OUTPUT_MD (readable summary)"

rm -rf "$TEMP_DIR"
