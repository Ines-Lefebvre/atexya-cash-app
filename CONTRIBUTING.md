# Guide de Contribution - Atexya Cash

Merci de votre intérêt pour contribuer au projet Atexya Cash ! Ce guide vous aidera à comprendre l'architecture et les bonnes pratiques.

## 🏗 Architecture

### Backend (Encore.ts)

```
backend/
├── admin/              # Service d'administration
│   ├── auth.ts        # Authentification admin
│   ├── config.ts      # Gestion centralisée des configs
│   ├── pricing.ts     # Configuration des tarifs
│   ├── promo.ts       # Gestion des promotions
│   ├── cgv.ts         # Upload/gestion des CGV
│   └── encore.service.ts
└── atexya/            # Service principal métier
    ├── contracts.ts   # CRUD contrats
    ├── pricing.ts     # Calculs tarifaires
    ├── pappers.ts     # API Pappers
    ├── brokers.ts     # Validation courtiers
    ├── contact.ts     # Formulaire de contact
    ├── notifications.ts # Système de notifications
    └── encore.service.ts
```

### Frontend (React + TypeScript)

```
frontend/
├── pages/             # Pages principales
│   ├── Page1Identification.tsx
│   ├── Page2Etablissements.tsx
│   ├── Page3Antecedents.tsx
│   ├── Page4Garantie.tsx
│   ├── Page5Calcul.tsx
│   ├── Page6Offre.tsx
│   ├── AdminLogin.tsx
│   ├── AdminDashboard.tsx
│   └── ...
├── components/        # Composants réutilisables
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── ...
└── App.tsx           # Point d'entrée
```

## 🛠 Environnement de développement

### Prérequis

- Node.js 18+
- Encore CLI : `curl -L https://encore.dev/install.sh | bash`
- Git

### Installation locale

```bash
# Cloner le projet
git clone <repository>
cd atexya-cash

# Installer Encore CLI si pas fait
encore version

# Lancer en développement
encore run
```

L'application sera disponible sur :
- Frontend : http://localhost:4000
- API : http://localhost:4000/api
- Encore Dev Dashboard : http://localhost:9400

## 📝 Standards de code

### TypeScript

- **Types stricts** : Toujours typer les interfaces
- **Pas de `any`** : Utiliser des types précis
- **Interfaces pour les APIs** : Définir request/response
- **Validation** : Valider toutes les entrées

```typescript
// ✅ Bon
interface CreateContractRequest {
  siren: string;
  customer_email: string;
  premium_ttc: number;
}

// ❌ Mauvais
function createContract(data: any) { ... }
```

### Encore.ts Backend

- **Un endpoint par fichier** avec noms explicites
- **Gestion d'erreur** avec `APIError`
- **Logs structurés** avec contexte
- **Validation** des paramètres d'entrée

```typescript
// ✅ Structure d'endpoint
export const createContract = api<CreateContractRequest, CreateContractResponse>(
  { expose: true, method: "POST", path: "/contracts/create" },
  async (params) => {
    try {
      // Validation
      if (!params.siren || params.siren.length !== 9) {
        throw APIError.invalidArgument("SIREN invalide");
      }
      
      // Logique métier
      const result = await processContract(params);
      
      // Log de succès
      log.info("Contract created", { contractId: result.id });
      
      return result;
    } catch (error) {
      log.error("Error creating contract", { error, params });
      throw APIError.internal("Impossible de créer le contrat");
    }
  }
);
```

### React Frontend

- **Composants fonctionnels** avec hooks
- **Props typées** avec interfaces
- **État local minimal** (AppState global)
- **Gestion d'erreur** avec toast
- **Accessibilité** avec aria-labels

```typescript
// ✅ Structure de composant
interface Props {
  appState: AppState;
  setAppState: (state: AppState) => void;
}

export default function MyComponent({ appState, setAppState }: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handleSubmit = async () => {
    try {
      setLoading(true);
      await backend.myService.myEndpoint(data);
      toast({ title: "Succès" });
    } catch (error) {
      toast({ title: "Erreur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
}
```

## 🎨 Design System

### Couleurs Atexya

```css
--color-atexya-dark: #0f2f47    /* Bleu foncé principal */
--color-atexya-gold: #c19a5f    /* Or/bronze accent */
```

### Composants UI

- **shadcn/ui** pour les composants de base
- **Tailwind CSS** pour le styling
- **Lucide React** pour les icônes
- **Police Astaneh** pour les titres
- **Open Sans** pour le texte

### Responsive Design

- **Mobile first** : Design adaptatif
- **Points de rupture** : sm, md, lg, xl
- **Touch friendly** : Boutons 44px minimum

## 🧪 Tests

### Tests backend

```bash
# Tests d'API
encore test ./backend/...

# Test d'un endpoint spécifique
curl -X POST http://localhost:4000/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{"effectif_global": 50, "ctn": "C", ...}'
```

### Tests frontend

```bash
# Tests unitaires
npm test

# Tests e2e manuels
# 1. Parcours complet de souscription
# 2. Interface admin
# 3. Calculs tarifaires
```

## 🔍 Debug

### Backend

```typescript
// Logs structurés
log.info("Processing request", { 
  siren: params.siren, 
  effectif: params.effectif_global 
});

// Endpoint de debug
export const debugPricing = api<DebugRequest, DebugResponse>(
  { expose: true, method: "POST", path: "/pricing/debug" },
  async (params) => {
    // Retour détaillé des calculs
  }
);
```

### Frontend

```typescript
// Console.error dans les catch
catch (error) {
  console.error('Erreur API:', error);
  toast({ title: "Erreur", variant: "destructive" });
}
```

## 📦 Nouvelles fonctionnalités

### Workflow

1. **Issue** : Créer une issue décrivant la fonctionnalité
2. **Branch** : `git checkout -b feature/nom-fonctionnalite`
3. **Développement** : Suivre les standards ci-dessus
4. **Tests** : Tester manuellement la fonctionnalité
5. **Pull Request** : Description claire + screenshots
6. **Review** : Code review par l'équipe
7. **Merge** : Après validation

### Checklist PR

- [ ] Code suit les standards TypeScript
- [ ] Endpoints backend documentés
- [ ] Gestion d'erreur implémentée
- [ ] Interface responsive
- [ ] Logs appropriés
- [ ] Testé manuellement
- [ ] Documentation mise à jour

## 🐛 Correction de bugs

### Priorités

1. **Critique** : Empêche la souscription
2. **Haute** : Impacte l'expérience utilisateur
3. **Moyenne** : Problème cosmétique/performance
4. **Basse** : Amélioration nice-to-have

### Process

1. **Reproduction** : Étapes pour reproduire
2. **Diagnostic** : Logs, erreurs, contexte
3. **Fix** : Correction minimale et sûre
4. **Test** : Vérifier la correction
5. **Régression** : S'assurer de ne rien casser

## 📚 Resources

### Documentation

- [Encore.ts Docs](https://encore.dev/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

### APIs Externes

- [Pappers API](https://www.pappers.fr/api/documentation)

## 🤝 Communication

### Commits

```bash
# Format : type(scope): description
git commit -m "feat(pricing): add promotion calculation"
git commit -m "fix(admin): resolve login session issue"
git commit -m "docs(readme): update deployment guide"
```

### Types de commits

- `feat`: Nouvelle fonctionnalité
- `fix`: Correction de bug
- `docs`: Documentation
- `style`: Formatting, missing semi colons, etc
- `refactor`: Refactoring de code
- `test`: Ajout de tests
- `chore`: Maintenance

## 🎯 Roadmap

### Version actuelle
- ✅ Parcours de souscription complet
- ✅ Interface d'administration
- ✅ Calculs tarifaires avancés
- ✅ Intégration Pappers

### Prochaines versions
- 🔄 Système de paiement en ligne
- 🔄 Emails automatiques
- 🔄 Export PDF des contrats
- 🔄 API pour courtiers
- 🔄 Application mobile

Merci de contribuer à Atexya Cash ! 🚀
