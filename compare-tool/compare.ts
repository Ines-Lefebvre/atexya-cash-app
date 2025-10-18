import { createHash } from 'crypto';
import { readdir, readFile, writeFile, stat, rm } from 'fs/promises';
import { join, relative } from 'path';
import simpleGit from 'simple-git';

const GITHUB_URL = 'https://github.com/Ines-Lefebvre/atexya-cash-app';
const TEMP_DIR = '/tmp/github-clone';
const LEAP_DIR = '/';
const OUTPUT_JSON = '/comparison-result.json';
const OUTPUT_MD = '/compare-report.md';

const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  'dist',
  '.next',
  'build',
  '.encore',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  '.DS_Store',
  'compare-tool',
  'compare-repos.sh',
  'comparison-result.json',
  'compare-report.md'
];

interface FileInfo {
  size: number;
  hash: string | null;
}

interface ComparisonResult {
  comparison_date: string;
  github_repo: string;
  statistics: {
    total_files_leap: number;
    total_files_github: number;
    total_unique_files: number;
    identical_files: number;
    modified_files: number;
    missing_in_leap: number;
    missing_in_github: number;
    divergence_rate: number;
  };
  identical: Array<{ file: string; size: number; hash: string }>;
  modified: Array<{ file: string; leap: FileInfo; github: FileInfo }>;
  missing_in_leap: Array<{ file: string; size: number; hash: string | null }>;
  missing_in_github: Array<{ file: string; size: number; hash: string | null }>;
}

async function computeMD5(filepath: string): Promise<string | null> {
  try {
    const content = await readFile(filepath);
    return createHash('md5').update(content).digest('hex');
  } catch {
    return null;
  }
}

async function getFileInfo(filepath: string): Promise<FileInfo> {
  try {
    const stats = await stat(filepath);
    const hash = await computeMD5(filepath);
    return { size: stats.size, hash };
  } catch {
    return { size: 0, hash: null };
  }
}

function shouldExclude(path: string): boolean {
  return EXCLUDE_PATTERNS.some(pattern => path.includes(pattern));
}

async function getAllFiles(dir: string, baseDir: string = dir): Promise<string[]> {
  const files: string[] = [];
  
  async function walk(currentDir: string) {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        const relativePath = relative(baseDir, fullPath);
        
        if (shouldExclude(relativePath)) continue;
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          files.push(relativePath);
        }
      }
    } catch (err) {
      console.error(`Error reading directory ${currentDir}:`, err);
    }
  }
  
  await walk(dir);
  return files.sort();
}

async function main() {
  console.log('🔄 Cloning GitHub repository...');
  
  try {
    await rm(TEMP_DIR, { recursive: true, force: true });
  } catch {}
  
  const git = simpleGit();
  await git.clone(GITHUB_URL, TEMP_DIR, ['--depth', '1']);
  
  console.log('📂 Analyzing Leap environment...');
  const leapFiles = new Set(await getAllFiles(LEAP_DIR));
  
  console.log('📂 Analyzing GitHub repository...');
  const githubFiles = new Set(await getAllFiles(TEMP_DIR));
  
  console.log('🔍 Computing file hashes and comparing...');
  
  const identical: ComparisonResult['identical'] = [];
  const modified: ComparisonResult['modified'] = [];
  const missing_in_leap: ComparisonResult['missing_in_leap'] = [];
  const missing_in_github: ComparisonResult['missing_in_github'] = [];
  
  const commonFiles = new Set([...leapFiles].filter(f => githubFiles.has(f)));
  
  let processed = 0;
  const total = leapFiles.size + githubFiles.size;
  
  for (const filepath of commonFiles) {
    const leapPath = join(LEAP_DIR, filepath);
    const githubPath = join(TEMP_DIR, filepath);
    
    const leapInfo = await getFileInfo(leapPath);
    const githubInfo = await getFileInfo(githubPath);
    
    if (leapInfo.hash === githubInfo.hash && leapInfo.hash !== null) {
      identical.push({ file: filepath, size: leapInfo.size, hash: leapInfo.hash });
    } else {
      modified.push({ file: filepath, leap: leapInfo, github: githubInfo });
    }
    
    processed++;
    if (processed % 10 === 0) {
      process.stdout.write(`\r   Processed ${processed}/${total} files...`);
    }
  }
  
  for (const filepath of [...githubFiles].filter(f => !leapFiles.has(f)).sort()) {
    const githubPath = join(TEMP_DIR, filepath);
    const info = await getFileInfo(githubPath);
    missing_in_leap.push({ file: filepath, size: info.size, hash: info.hash });
  }
  
  for (const filepath of [...leapFiles].filter(f => !githubFiles.has(f)).sort()) {
    const leapPath = join(LEAP_DIR, filepath);
    const info = await getFileInfo(leapPath);
    missing_in_github.push({ file: filepath, size: info.size, hash: info.hash });
  }
  
  console.log('\n');
  
  const totalUniqueFiles = new Set([...leapFiles, ...githubFiles]).size;
  const divergenceRate = totalUniqueFiles === 0 ? 0 : 
    ((modified.length + missing_in_leap.length + missing_in_github.length) / totalUniqueFiles) * 100;
  
  const result: ComparisonResult = {
    comparison_date: new Date().toISOString().split('T')[0],
    github_repo: GITHUB_URL,
    statistics: {
      total_files_leap: leapFiles.size,
      total_files_github: githubFiles.size,
      total_unique_files: totalUniqueFiles,
      identical_files: identical.length,
      modified_files: modified.length,
      missing_in_leap: missing_in_leap.length,
      missing_in_github: missing_in_github.length,
      divergence_rate: Math.round(divergenceRate * 100) / 100
    },
    identical,
    modified,
    missing_in_leap,
    missing_in_github
  };
  
  console.log('💾 Generating JSON report...');
  await writeFile(OUTPUT_JSON, JSON.stringify(result, null, 2));
  
  console.log('📝 Generating markdown report...');
  let markdown = `# Comparaison Leap ↔️ GitHub

**Date:** ${result.comparison_date}  
**Dépôt GitHub:** ${GITHUB_URL}

## 📊 Statistiques globales

| Métrique | Valeur |
|----------|--------|
| Fichiers dans Leap | ${result.statistics.total_files_leap} |
| Fichiers dans GitHub | ${result.statistics.total_files_github} |
| Fichiers uniques totaux | ${result.statistics.total_unique_files} |
| Fichiers identiques | ${result.statistics.identical_files} |
| Fichiers modifiés | ${result.statistics.modified_files} |
| Fichiers manquants dans Leap | ${result.statistics.missing_in_leap} |
| Fichiers manquants dans GitHub | ${result.statistics.missing_in_github} |
| **Taux de divergence** | **${result.statistics.divergence_rate}%** |

`;

  if (modified.length > 0) {
    markdown += '\n## 🔄 Fichiers modifiés\n\n';
    const displayLimit = 50;
    for (const item of modified.slice(0, displayLimit)) {
      markdown += `### \`${item.file}\`\n`;
      markdown += `- **Leap:** ${item.leap.size} bytes, hash: \`${item.leap.hash || 'N/A'}\`\n`;
      markdown += `- **GitHub:** ${item.github.size} bytes, hash: \`${item.github.hash || 'N/A'}\`\n\n`;
    }
    if (modified.length > displayLimit) {
      markdown += `*...et ${modified.length - displayLimit} autres fichiers modifiés*\n\n`;
    }
  }

  if (missing_in_leap.length > 0) {
    markdown += '\n## ⬇️ Fichiers manquants dans Leap (présents dans GitHub)\n\n';
    const displayLimit = 50;
    for (const item of missing_in_leap.slice(0, displayLimit)) {
      markdown += `- \`${item.file}\` (${item.size} bytes)\n`;
    }
    if (missing_in_leap.length > displayLimit) {
      markdown += `\n*...et ${missing_in_leap.length - displayLimit} autres fichiers*\n`;
    }
  }

  if (missing_in_github.length > 0) {
    markdown += '\n## ⬆️ Fichiers manquants dans GitHub (présents dans Leap)\n\n';
    const displayLimit = 50;
    for (const item of missing_in_github.slice(0, displayLimit)) {
      markdown += `- \`${item.file}\` (${item.size} bytes)\n`;
    }
    if (missing_in_github.length > displayLimit) {
      markdown += `\n*...et ${missing_in_github.length - displayLimit} autres fichiers*\n`;
    }
  }

  markdown += '\n## 💡 Recommandations\n\n';
  
  const { divergence_rate } = result.statistics;
  if (divergence_rate === 0) {
    markdown += '✅ Les environnements sont **parfaitement synchronisés**.\n';
  } else if (divergence_rate < 5) {
    markdown += '✅ Divergence minime. Synchronisation recommandée pour les fichiers modifiés.\n';
  } else if (divergence_rate < 20) {
    markdown += '⚠️ Divergence modérée. Révision et synchronisation recommandées.\n';
  } else {
    markdown += '🚨 Divergence importante. Synchronisation complète nécessaire.\n';
  }

  if (missing_in_leap.length > 0) {
    markdown += `\n- **${missing_in_leap.length} fichiers** doivent être ajoutés à Leap depuis GitHub\n`;
  }
  if (missing_in_github.length > 0) {
    markdown += `- **${missing_in_github.length} fichiers** doivent être poussés vers GitHub depuis Leap\n`;
  }
  if (modified.length > 0) {
    markdown += `- **${modified.length} fichiers** ont des différences à résoudre\n`;
  }

  markdown += '\n## 📄 Fichiers pour détails complets\n\n';
  markdown += '- `comparison-result.json` - Rapport détaillé en JSON avec tous les hashes\n';
  markdown += '- `compare-report.md` - Ce rapport résumé lisible\n';

  await writeFile(OUTPUT_MD, markdown);
  
  console.log(`✅ Comparison complete:`);
  console.log(`   ${identical.length} identical files`);
  console.log(`   ${modified.length} modified files`);
  console.log(`   ${missing_in_leap.length} missing in Leap`);
  console.log(`   ${missing_in_github.length} missing in GitHub`);
  console.log(`📊 Divergence rate: ${divergence_rate.toFixed(2)}%`);
  console.log(`\n✅ Reports generated:`);
  console.log(`   - ${OUTPUT_JSON} (detailed JSON)`);
  console.log(`   - ${OUTPUT_MD} (readable summary)`);
  
  await rm(TEMP_DIR, { recursive: true, force: true });
}

main().catch(console.error);
