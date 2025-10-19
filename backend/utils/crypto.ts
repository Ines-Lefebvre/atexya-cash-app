import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Hash un mot de passe avec bcrypt
 * @param password - Le mot de passe en clair
 * @returns Le hash du mot de passe
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  
  const saltRounds = 12; // Cost factor (plus élevé = plus sécurisé mais plus lent)
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Vérifie un mot de passe contre son hash
 * @param password - Le mot de passe en clair à vérifier
 * @param hash - Le hash stocké en base de données
 * @returns true si le mot de passe correspond, false sinon
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Génère un token aléatoire sécurisé
 * @param length - Longueur du token en bytes (défaut: 32)
 * @returns Token hexadécimal
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash une donnée avec SHA-256
 * @param data - Les données à hasher
 * @returns Hash SHA-256 en hexadécimal
 */
export function sha256Hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
```

**Commit message :**
```
fix: update crypto.ts to use bcryptjs
```

**Commit !**

---

## ✅ CHECKLIST

Après avoir fait les 2 commits :

- [ ] backend/package.json modifié (bcryptjs au lieu de bcrypt)
- [ ] backend/utils/crypto.ts modifié (import bcryptjs)
- [ ] Les 2 commits faits
- [ ] Retour sur Leap
- [ ] Attendre la notification "New commit available"
- [ ] Cliquer sur "Pull"
- [ ] Attendre le build (2-3 min)
- [ ] Vérifier "Build finished without errors"

---

## 🚀 APRÈS LES COMMITS

**Leap va :**
1. ✅ Détecter les 2 commits
2. ✅ Vous proposer de Pull
3. ✅ Installer bcryptjs (au lieu de bcrypt)
4. ✅ Compiler sans erreur
5. ✅ Déployer automatiquement

---

## 💬 DITES-MOI

**Une fois les 2 fichiers modifiés et committed :**

- **"Commits faits ✅"** → Attendez la notification Leap
- **"Build en cours..."** → OK je surveille avec vous
- **"Build réussi !"** → 🎉 On vérifie le deploy
- **"Problème"** → Montrez-moi

---

## 📊 CE QUI CHANGE

**Avant (bcrypt - natif C++) :**
```
Build → Compile bcrypt → ❌ Erreur compilation
```

**Après (bcryptjs - JavaScript pur) :**
```
Build → Installe bcryptjs → ✅ Aucune compilation nécessaire → Success
