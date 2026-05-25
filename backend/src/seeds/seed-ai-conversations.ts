import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';

const logger = new Logger('Seed:AiConversations');

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Data                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

interface SeedMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: { publicationId: number; title: string; chunkIndex: number; similarity: number }[];
}

interface SeedConversation {
  userEmail: string;
  title: string;
  pinned?: boolean;
  messages: SeedMessage[];
}

const CONVERSATIONS: SeedConversation[] = [

  /* ── Thomas Martin — Dev ───────────────────────────────────────────────── */
  {
    userEmail: 'thomas.martin@imknow.com',
    title: 'NumPy vs Pandas : différences clés',
    pinned: true,
    messages: [
      { role: 'user', content: 'Quelle est la différence entre NumPy et Pandas ?' },
      {
        role: 'assistant',
        content: `NumPy et Pandas sont deux bibliothèques Python complémentaires qui servent des usages différents.

**NumPy** est orienté calcul numérique pur :
- Fournit le type ndarray (tableau multidimensionnel) très performant
- Optimisé pour les opérations matricielles et vectorielles
- Base de quasiment tout l'écosystème scientifique Python (SciPy, scikit-learn, TensorFlow)
- Idéal pour les calculs sur des données homogènes (tous float, tous int...)

**Pandas** est orienté manipulation de données tabulaires :
- Fournit DataFrame (tableau 2D avec labels) et Series (colonne indexée)
- Supporte des données hétérogènes (colonnes de types différents)
- Offre des fonctions de groupby, merge, pivot, resample très puissantes
- Conçu pour nettoyer, transformer et explorer des jeux de données

En pratique : on charge les données brutes avec Pandas, on les nettoie, puis on extrait des tableaux NumPy pour les passer aux algorithmes de machine learning.`,
        sources: [
          { publicationId: 1, title: 'Introduction à Python pour la Data Science', chunkIndex: 2, similarity: 0.87 },
          { publicationId: 1, title: 'Introduction à Python pour la Data Science', chunkIndex: 4, similarity: 0.79 },
        ],
      },
      { role: 'user', content: 'Quand est-ce qu\'on préfère NumPy à Pandas ?' },
      {
        role: 'assistant',
        content: `On préfère NumPy à Pandas dans ces cas :

1. **Performances pures** : NumPy est plus rapide sur les opérations vectorielles car il évite la surcharge des index et des métadonnées de Pandas.

2. **Données homogènes** : Si toutes vos données sont du même type (ex : une matrice de pixels, des vecteurs d'embeddings), NumPy est plus efficace.

3. **Interopérabilité avec les librairies ML** : scikit-learn, PyTorch, TensorFlow attendent des arrays NumPy, pas des DataFrames.

4. **Algèbre linéaire** : Pour les produits matriciels (np.dot), les décompositions (np.linalg.svd), NumPy est nettement plus adapté.

5. **Mémoire** : Un ndarray NumPy consomme moins de mémoire qu'un DataFrame Pandas équivalent.

**Règle pratique** : Pandas pour la préparation des données, NumPy pour le calcul intensif.`,
        sources: [
          { publicationId: 1, title: 'Introduction à Python pour la Data Science', chunkIndex: 3, similarity: 0.83 },
        ],
      },
    ],
  },

  {
    userEmail: 'thomas.martin@imknow.com',
    title: 'Sécuriser une API REST NestJS',
    messages: [
      { role: 'user', content: 'Comment sécuriser une API REST avec NestJS ?' },
      {
        role: 'assistant',
        content: `Voici les pratiques essentielles pour sécuriser une API REST avec NestJS :

**1. Authentification JWT**
- Utiliser @nestjs/jwt pour générer et valider des tokens
- Stocker les tokens côté client (localStorage ou httpOnly cookie)
- Mettre en place un refresh token rotatif

**2. Guards et Roles**
- AuthGuard pour vérifier la validité du JWT sur chaque route protégée
- RolesGuard + décorateur @Roles() pour le contrôle d'accès basé sur les rôles (RBAC)

**3. Validation des données**
- ValidationPipe global avec whitelist: true et forbidNonWhitelisted: true
- Utiliser class-validator + class-transformer sur tous les DTOs

**4. Protection contre les attaques courantes**
- Helmet pour les en-têtes de sécurité HTTP
- Rate limiting avec @nestjs/throttler
- CORS configuré explicitement (ne pas laisser * en production)

**5. Gestion des sessions**
- Invalider les tokens à la déconnexion (stocker les sessions révoquées en DB ou Redis)
- Expiration courte pour les access tokens (15 min), longue pour les refresh (7 jours)

**6. Variables d'environnement**
- Ne jamais hardcoder les secrets, utiliser @nestjs/config avec validation Joi`,
        sources: [
          { publicationId: 5, title: 'Sécurité des API REST : Guide complet OWASP', chunkIndex: 0, similarity: 0.91 },
          { publicationId: 5, title: 'Sécurité des API REST : Guide complet OWASP', chunkIndex: 2, similarity: 0.84 },
        ],
      },
      { role: 'user', content: 'Qu\'est-ce que le rate limiting et pourquoi c\'est important ?' },
      {
        role: 'assistant',
        content: `Le **rate limiting** (limitation de débit) consiste à restreindre le nombre de requêtes qu'un client peut envoyer à votre API dans une fenêtre de temps donnée.

**Pourquoi c'est essentiel :**

- **Protection contre le brute force** : un attaquant qui essaie des milliers de mots de passe est bloqué après N tentatives
- **Protection contre les attaques DDoS** : limite l'impact d'un volume anormal de requêtes
- **Équité des ressources** : empêche un client abusif de monopoliser le serveur
- **Protection contre le scraping** : rend le vol de données massif difficile

**Avec NestJS (@nestjs/throttler) :**
\`\`\`typescript
ThrottlerModule.forRoot([{
  ttl: 60000,  // fenêtre de 1 minute
  limit: 100,  // 100 requêtes max par fenêtre
}])
\`\`\`

**Bonnes pratiques :**
- Appliquer des limites différentes selon les routes (login = 5/min, API publique = 100/min)
- Retourner un header \`Retry-After\` pour indiquer quand réessayer
- En production, utiliser un store Redis pour les environnements multi-instances`,
        sources: [
          { publicationId: 5, title: 'Sécurité des API REST : Guide complet OWASP', chunkIndex: 1, similarity: 0.88 },
        ],
      },
    ],
  },

  /* ── Lucas Bernard — DevOps ────────────────────────────────────────────── */
  {
    userEmail: 'lucas.bernard@imknow.com',
    title: 'CI/CD avec GitHub Actions',
    pinned: true,
    messages: [
      { role: 'user', content: 'Comment mettre en place un pipeline CI/CD avec GitHub Actions pour un projet NestJS ?' },
      {
        role: 'assistant',
        content: `Voici un pipeline CI/CD complet pour NestJS avec GitHub Actions :

**Structure recommandée :**

\`\`\`yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: echo "Deploy step here"
\`\`\`

**Points clés :**
- Utiliser \`npm ci\` (pas \`npm install\`) pour un install déterministe
- Mettre en cache node_modules avec \`cache: 'npm'\`
- Séparer les jobs test et deploy
- Ne déployer que sur la branche main`,
        sources: [
          { publicationId: 7, title: 'CI/CD avec GitHub Actions pour projets NestJS', chunkIndex: 0, similarity: 0.93 },
          { publicationId: 7, title: 'CI/CD avec GitHub Actions pour projets NestJS', chunkIndex: 1, similarity: 0.88 },
        ],
      },
      { role: 'user', content: 'Comment gérer les secrets dans GitHub Actions ?' },
      {
        role: 'assistant',
        content: `La gestion des secrets dans GitHub Actions suit des règles strictes :

**1. GitHub Secrets (méthode recommandée)**
- Aller dans Settings > Secrets and variables > Actions
- Créer les secrets : DATABASE_URL, JWT_SECRET, API_KEY...
- Les utiliser dans le workflow : ` + '`$' + '{{ secrets.DATABASE_URL }}`' + `

**2. Environnements avec protection**
\`\`\`yaml
jobs:
  deploy:
    environment: production  # Nécessite une approbation manuelle
    steps:
      - run: echo $` + '{{ secrets.PROD_DATABASE_URL }}' + `
\`\`\`

**3. Bonnes pratiques :**
- Ne jamais logger les secrets (\`echo $SECRET\` est dangereux)
- Utiliser des environnements séparés (staging/production) avec des secrets différents
- Rotation régulière des secrets
- Utiliser OIDC pour les clouds (AWS, GCP) plutôt que des clés statiques

**4. Pour les variables non-sensibles :**
\`\`\`yaml
env:
  NODE_ENV: production
  APP_PORT: 3000
\`\`\`

**⚠️ À ne jamais faire :**
- Commiter un fichier .env en dur
- Afficher les secrets dans les logs
- Utiliser des secrets de prod en CI`,
        sources: [
          { publicationId: 7, title: 'CI/CD avec GitHub Actions pour projets NestJS', chunkIndex: 2, similarity: 0.86 },
        ],
      },
    ],
  },

  {
    userEmail: 'lucas.bernard@imknow.com',
    title: 'Redis en production — patterns de cache',
    messages: [
      { role: 'user', content: 'Quels sont les principaux patterns de cache avec Redis ?' },
      {
        role: 'assistant',
        content: `Redis offre plusieurs patterns de cache selon le cas d'usage :

**1. Cache-Aside (Lazy Loading)** — le plus courant
\`\`\`
1. L'app cherche dans Redis
2. Si absent (cache miss) → lit la DB, écrit dans Redis, retourne
3. Si présent (cache hit) → retourne directement
\`\`\`
✅ Simple, données toujours fraîches à la demande
❌ Première requête lente (cold start)

**2. Write-Through**
- Chaque écriture en DB est aussi écrite dans Redis simultanément
- Cache toujours synchronisé
- Idéal quand les lectures sont très fréquentes après les écritures

**3. Write-Behind (Write-Back)**
- Écriture dans Redis immédiate, puis DB asynchronement
- Très performant en écriture
- Risque de perte de données si Redis tombe avant la persistence

**4. Read-Through**
- Redis se charge lui-même de peupler le cache depuis la DB
- L'app n'interroge que Redis

**Paramètres TTL essentiels :**
- Sessions utilisateur : 24h
- Données de profil : 1h
- Résultats de requêtes lourdes : 5-15 min
- Rate limiting : 1 min

**Invalidation du cache :**
- Par TTL (expiration automatique)
- Par tag (invalider un groupe de clés liées)
- Event-driven (invalider lors d'un changement en DB)`,
        sources: [
          { publicationId: 6, title: 'Redis en production : patterns et bonnes pratiques', chunkIndex: 0, similarity: 0.92 },
          { publicationId: 6, title: 'Redis en production : patterns et bonnes pratiques', chunkIndex: 2, similarity: 0.85 },
        ],
      },
    ],
  },

  /* ── Alexandre Petit — Frontend Dev ────────────────────────────────────── */
  {
    userEmail: 'alexandre.petit@imknow.com',
    title: 'Migration vers Next.js 14 App Router',
    pinned: true,
    messages: [
      { role: 'user', content: 'Quelles sont les étapes pour migrer de Next.js Pages Router vers App Router ?' },
      {
        role: 'assistant',
        content: `La migration vers l'App Router de Next.js 14 se fait idéalement de manière **incrémentale** :

**Phase 1 : Préparation**
- Mettre à jour Next.js vers 14+ (\`npm install next@latest\`)
- Les deux routers coexistent : \`/pages\` et \`/app\` peuvent fonctionner en parallèle
- Commencer par les pages les moins complexes

**Phase 2 : Nouvelle structure**
\`\`\`
app/
  layout.tsx        ← RootLayout (remplace _app.tsx)
  page.tsx          ← Page principale
  loading.tsx       ← Skeleton automatique (Suspense)
  error.tsx         ← Error boundary automatique
  not-found.tsx     ← 404 automatique
\`\`\`

**Phase 3 : Concepts clés à maîtriser**
- **Server Components** (défaut) : rendu côté serveur, accès DB direct, pas de hooks
- **Client Components** : ajouter \`'use client'\` en haut du fichier pour les hooks/events
- **Server Actions** : remplacent les API routes pour les mutations de formulaire

**Phase 4 : Pièges courants**
- \`useState\`, \`useEffect\`, \`onClick\` → uniquement dans Client Components
- \`getServerSideProps\` / \`getStaticProps\` → remplacés par \`fetch()\` direct dans le composant
- Les layouts ne se remontent pas entre les navigations (performance++)

**Ordre de migration recommandé :** pages statiques → pages avec fetch → pages avec état complexe`,
        sources: [
          { publicationId: 3, title: 'Migration vers Next.js 14 App Router', chunkIndex: 0, similarity: 0.94 },
          { publicationId: 3, title: 'Migration vers Next.js 14 App Router', chunkIndex: 1, similarity: 0.89 },
        ],
      },
      { role: 'user', content: 'C\'est quoi la différence entre Server Component et Client Component ?' },
      {
        role: 'assistant',
        content: `C'est **la distinction fondamentale** de l'App Router :

**Server Components (défaut — pas de \`'use client'\`)**
- Rendu uniquement sur le serveur
- Peuvent lire des données directement (DB, filesystem, secrets)
- N'envoient que du HTML au client → bundle JS réduit
- ❌ Pas de useState, useEffect, event handlers, browser APIs

\`\`\`tsx
// Server Component — peut faire du fetch direct
async function ProductList() {
  const products = await db.query('SELECT * FROM products');
  return <ul>{products.map(p => <li>{p.name}</li>)}</ul>;
}
\`\`\`

**Client Components (\`'use client'\` en tête de fichier)**
- Rendu côté client (et hydration)
- Supportent useState, useEffect, onClick, etc.
- Ont accès au DOM et aux APIs du navigateur
- ❌ Ne peuvent pas lire la DB directement

\`\`\`tsx
'use client';
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
\`\`\`

**Règle d'or :** commencer par Server Components, passer en Client uniquement quand nécessaire (interactivité, hooks). Les Server Components peuvent importer des Client Components, mais pas l'inverse pour les données serveur.`,
        sources: [
          { publicationId: 3, title: 'Migration vers Next.js 14 App Router', chunkIndex: 2, similarity: 0.91 },
        ],
      },
    ],
  },

  {
    userEmail: 'alexandre.petit@imknow.com',
    title: 'Vue.js 3 Composition API',
    messages: [
      { role: 'user', content: 'Quelles sont les principales différences entre Options API et Composition API dans Vue 3 ?' },
      {
        role: 'assistant',
        content: `La Composition API est la grande nouveauté de Vue 3. Voici les différences clés :

**Options API (Vue 2 style, toujours supporté)**
\`\`\`js
export default {
  data() { return { count: 0 } },
  methods: { increment() { this.count++ } },
  computed: { double() { return this.count * 2 } },
  mounted() { console.log('mounted') }
}
\`\`\`
✅ Familier, structuré, bien adapté aux petits composants
❌ Logique liée à une même fonctionnalité dispersée dans data/methods/computed

**Composition API (Vue 3)**
\`\`\`js
import { ref, computed, onMounted } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const double = computed(() => count.value * 2)
    const increment = () => count.value++
    onMounted(() => console.log('mounted'))
    return { count, double, increment }
  }
}
\`\`\`
✅ Logique regroupée par fonctionnalité (composables réutilisables)
✅ Meilleure TypeScript inference
✅ Tree-shaking plus efficace
❌ Courbe d'apprentissage plus haute

**Conseil :** Pour les nouveaux projets Vue 3, utiliser la **\`<script setup>\`** syntax qui simplifie encore la Composition API.`,
        sources: [
          { publicationId: 16, title: 'Vue.js 3 Composition API : guide pratique', chunkIndex: 0, similarity: 0.90 },
        ],
      },
    ],
  },

  /* ── Marie Dupont — RH ──────────────────────────────────────────────────── */
  {
    userEmail: 'marie.dupont@imknow.com',
    title: 'Gestion des entretiens annuels',
    messages: [
      { role: 'user', content: 'Quelles sont les meilleures pratiques pour les entretiens annuels de performance ?' },
      {
        role: 'assistant',
        content: `Les entretiens annuels efficaces reposent sur quelques principes clés :

**Avant l'entretien**
- Envoyer un questionnaire d'auto-évaluation 1 semaine avant (l'employé prépare : réussites, difficultés, objectifs)
- Le manager prépare des exemples concrets et factuels (éviter les jugements généraux)
- Relire les objectifs fixés l'année précédente

**Pendant l'entretien**
- Commencer par l'auto-évaluation de l'employé (80/20 : laissez-le parler)
- Utiliser le modèle **SBI** pour le feedback : Situation → Comportement → Impact
- Distinguer performance passée et développement futur
- Fixer des objectifs **SMART** pour l'année suivante
- Aborder la question de carrière et des aspirations

**Erreurs à éviter**
- L'effet de récence (juger sur les 2 derniers mois seulement)
- La comparaison entre collègues
- Lier systématiquement l'entretien à la rémunération (bloque le dialogue honnête)
- Surprises : tout problème majeur doit avoir été adressé en continu

**Suivi post-entretien**
- Rédiger un compte-rendu signé par les deux parties
- Planifier des points de suivi trimestriels sur les objectifs
- Documenter dans le SIRH`,
        sources: [
          { publicationId: 8, title: 'Gestion de la performance et entretiens annuels', chunkIndex: 0, similarity: 0.89 },
          { publicationId: 8, title: 'Gestion de la performance et entretiens annuels', chunkIndex: 1, similarity: 0.82 },
        ],
      },
      { role: 'user', content: 'Comment aborder les sujets de rémunération lors des entretiens ?' },
      {
        role: 'assistant',
        content: `La rémunération est un sujet délicat à dissocier de l'entretien de performance :

**Recommandation principale : deux réunions distinctes**
- Entretien de performance : focus sur les accomplissements, le développement, les objectifs
- Entretien de rémunération (séparé, 2-4 semaines après) : focus sur la révision salariale

Cette séparation évite que l'employé "joue la comédie" pendant l'évaluation pour obtenir une augmentation plutôt que d'être honnête sur ses difficultés.

**Si la rémunération est abordée dans le même entretien :**
- Traiter les deux parties clairement dans l'ordre : évaluation PUIS rémunération
- Expliquer les critères de révision salariale en toute transparence (grilles, budgets)
- Ne jamais promettre ce qu'on ne peut pas tenir

**Cadre légal (France) :**
- Obligation de négociation annuelle (NAO) dans les entreprises +50 salariés
- Interdiction de discrimination salariale (genre, origine, etc.)
- Les augmentations doivent être documentées et justifiées

**Message clé pour l'employé :**
"Votre performance cette année a été X. La politique salariale de l'entreprise permet une révision de Y%. Nous vous confirmerons par écrit sous 2 semaines."`,
        sources: [
          { publicationId: 8, title: 'Gestion de la performance et entretiens annuels', chunkIndex: 2, similarity: 0.85 },
        ],
      },
    ],
  },

  /* ── Emma Moreau — Marketing ────────────────────────────────────────────── */
  {
    userEmail: 'emma.moreau@imknow.com',
    title: 'SEO Technique 2024 — Core Web Vitals',
    pinned: true,
    messages: [
      { role: 'user', content: 'Qu\'est-ce que les Core Web Vitals et pourquoi sont-ils importants pour le SEO ?' },
      {
        role: 'assistant',
        content: `Les **Core Web Vitals** sont des métriques Google qui mesurent l'expérience utilisateur réelle d'une page. Ils font partie des signaux de classement depuis 2021.

**Les 3 métriques principales :**

**1. LCP — Largest Contentful Paint** (chargement)
- Mesure le temps d'affichage du plus grand élément visible
- Cible : < 2,5 secondes ✅ | 2,5-4s ⚠️ | > 4s ❌
- Causes fréquentes de mauvais score : images non optimisées, serveur lent, CSS render-blocking

**2. INP — Interaction to Next Paint** (interactivité, remplace FID en 2024)
- Mesure la latence de toutes les interactions utilisateur (clics, touches clavier)
- Cible : < 200ms ✅ | 200-500ms ⚠️ | > 500ms ❌
- Causes : JavaScript long à exécuter, main thread bloqué

**3. CLS — Cumulative Layout Shift** (stabilité visuelle)
- Mesure les décalages de mise en page inattendus pendant le chargement
- Cible : < 0,1 ✅ | 0,1-0,25 ⚠️ | > 0,25 ❌
- Causes : images sans dimensions définies, publicités dynamiques, fonts web

**Outils de mesure :**
- Google Search Console (données terrain réelles)
- PageSpeed Insights
- Chrome DevTools > Lighthouse

**Impact SEO :** Google utilise ces métriques comme signal de classement "Page Experience". Un bon score ne garantit pas la 1ère place, mais un mauvais score peut nuire à des pages par ailleurs bien optimisées.`,
        sources: [
          { publicationId: 9, title: 'SEO Technique 2024 : Core Web Vitals et performance', chunkIndex: 0, similarity: 0.93 },
          { publicationId: 9, title: 'SEO Technique 2024 : Core Web Vitals et performance', chunkIndex: 1, similarity: 0.87 },
        ],
      },
    ],
  },

  /* ── Julien Leroy — Dev ─────────────────────────────────────────────────── */
  {
    userEmail: 'julien.leroy@imknow.com',
    title: 'Clean Architecture — principes fondamentaux',
    messages: [
      { role: 'user', content: 'Quels sont les principes de la Clean Architecture ?' },
      {
        role: 'assistant',
        content: `La **Clean Architecture** (Robert C. Martin) organise le code en couches concentriques avec une règle fondamentale : **les dépendances ne pointent que vers l'intérieur**.

**Les 4 couches (de l'intérieur vers l'extérieur) :**

**1. Entities (cœur)**
- Règles métier de l'entreprise (indépendantes de l'application)
- Ex : un Order doit avoir au moins 1 produit
- Aucune dépendance externe

**2. Use Cases (Application)**
- Règles métier spécifiques à l'application
- Orchestrent le flux de données entre entities
- Ex : CreateOrderUseCase, CancelOrderUseCase
- Dépendent uniquement des Entities

**3. Interface Adapters**
- Convertissent les données entre Use Cases et le monde extérieur
- Controllers, Presenters, Gateways
- Ex : transformer un HTTP request en paramètres de Use Case

**4. Frameworks & Drivers (périmètre)**
- Détails : base de données, framework web, UI
- Ex : Express, PostgreSQL, React
- Tout ce qui est "remplaçable"

**Principe d'inversion de dépendance :**
La couche Use Case définit une interface (IUserRepository), et la couche infrastructure l'implémente (PostgresUserRepository). Le Use Case ne connaît pas PostgreSQL.

**Bénéfices :**
- Testabilité : tester les use cases sans DB ni HTTP
- Maintenabilité : changer de framework sans toucher la logique
- Indépendance : déployer en API, CLI ou desktop sans changer le cœur`,
        sources: [
          { publicationId: 4, title: 'Clean Architecture : principes et implémentation', chunkIndex: 0, similarity: 0.95 },
          { publicationId: 4, title: 'Clean Architecture : principes et implémentation', chunkIndex: 1, similarity: 0.88 },
        ],
      },
      { role: 'user', content: 'Comment implémenter la Clean Architecture avec NestJS ?' },
      {
        role: 'assistant',
        content: `NestJS se prête très bien à la Clean Architecture grâce à son système de modules et son injection de dépendances.

**Structure de dossiers recommandée :**
\`\`\`
src/
  order/                          ← Module
    domain/
      entities/order.entity.ts    ← Entities (cœur)
      interfaces/
        order-repository.interface.ts  ← Contrat
    application/
      use-cases/
        create-order.use-case.ts  ← Use Cases
    infrastructure/
      repositories/
        order.repository.ts       ← Implémentation TypeORM
      controllers/
        order.controller.ts       ← Interface Adapter
    order.module.ts
\`\`\`

**Inversion de dépendance avec NestJS :**
\`\`\`typescript
// 1. Interface (domain)
export const ORDER_REPOSITORY = 'ORDER_REPOSITORY';
export interface IOrderRepository {
  save(order: Order): Promise<Order>;
  findById(id: number): Promise<Order | null>;
}

// 2. Use Case injecte l'interface
@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
  ) {}
}

// 3. Module lie l'interface à l'implémentation
providers: [
  { provide: ORDER_REPOSITORY, useClass: TypeOrmOrderRepository },
  CreateOrderUseCase,
]
\`\`\`

**Avantage pour les tests :**
Dans les tests unitaires, remplacer \`TypeOrmOrderRepository\` par un mock sans toucher au Use Case.`,
        sources: [
          { publicationId: 4, title: 'Clean Architecture : principes et implémentation', chunkIndex: 2, similarity: 0.90 },
        ],
      },
    ],
  },

  /* ── Léa Dubois — sécurité ──────────────────────────────────────────────── */
  {
    userEmail: 'lea.dubois@imknow.com',
    title: 'OWASP Top 10 — Injections SQL',
    messages: [
      { role: 'user', content: 'Comment se protéger contre les injections SQL ?' },
      {
        role: 'assistant',
        content: `L'injection SQL reste l'une des vulnérabilités les plus critiques (OWASP Top 10 #3). Voici comment s'en protéger :

**Défense principale : les requêtes paramétrées**

❌ Vulnérable :
\`\`\`sql
SELECT * FROM users WHERE email = '` + "' + userInput + '" + `'
-- Attaque : email = "'; DROP TABLE users; --"
\`\`\`

✅ Sécurisé :
\`\`\`sql
SELECT * FROM users WHERE email = $1
-- Paramètre passé séparément, jamais interpolé dans la requête
\`\`\`

**Avec un ORM (TypeORM, Prisma) :**
Les ORM utilisent automatiquement les requêtes paramétrées. Attention aux requêtes brutes (\`createQueryBuilder\`, \`query()\`) qui peuvent réintroduire la vulnérabilité si mal utilisées.

**Défenses complémentaires :**
1. **Principe du moindre privilège** : le compte DB de l'app ne doit pas avoir DROP, CREATE, GRANT
2. **Validation des entrées** : whitelist des caractères autorisés (ex : email ne peut contenir que @, lettres, chiffres)
3. **WAF (Web Application Firewall)** : détecter les patterns d'injection
4. **Gestion d'erreurs** : ne jamais exposer les messages d'erreur SQL en production

**Vérification rapide :** Dans votre code, chercher tous les endroits où des variables utilisateur sont concaténées dans des chaînes SQL. Chaque occurrence est un risque potentiel.`,
        sources: [
          { publicationId: 17, title: 'OWASP Top 10 : Guide de sécurité pour développeurs', chunkIndex: 1, similarity: 0.92 },
        ],
      },
    ],
  },

  /* ── Nicolas Mercier ────────────────────────────────────────────────────── */
  {
    userEmail: 'nicolas.mercier@imknow.com',
    title: 'Machine Learning en production',
    messages: [
      { role: 'user', content: 'Quels sont les défis du déploiement de modèles ML en production ?' },
      {
        role: 'assistant',
        content: `Passer un modèle ML du notebook à la production est un défi souvent sous-estimé. Les principaux obstacles :

**1. Data drift (dérive des données)**
- Les données réelles évoluent par rapport aux données d'entraînement
- Un modèle précis à 95% en dev peut tomber à 70% en prod après 6 mois
- Solution : monitoring continu des distributions de features + alertes de dérive

**2. Serving et latence**
- Un modèle XGBoost ou deep learning peut être trop lent pour une API temps réel
- Solutions : quantization, model pruning, ONNX runtime, batching des requêtes

**3. Reproductibilité**
- "Ça marche sur ma machine" : versions de bibliothèques, données d'entraînement non versionnées
- Solution : MLflow ou DVC pour versionner modèles et données, Docker pour l'environnement

**4. Feature engineering en production**
- Le preprocessing fait en notebook doit être identique en production
- Solution : encapsuler le pipeline avec sklearn.Pipeline et sérialiser l'ensemble

**5. Monitoring**
- En prod, on ne connaît pas toujours le label réel immédiatement
- Surveiller : distribution des prédictions, latence, taux d'erreur, feature importance

**Stack MLOps recommandée :**
- Experiment tracking : MLflow
- Feature store : Feast ou Tecton
- Serving : FastAPI + BentoML ou Seldon
- Monitoring : Evidently AI`,
        sources: [
          { publicationId: 30, title: 'Machine Learning en production : MLOps et bonnes pratiques', chunkIndex: 0, similarity: 0.91 },
          { publicationId: 30, title: 'Machine Learning en production : MLOps et bonnes pratiques', chunkIndex: 1, similarity: 0.84 },
        ],
      },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Seed function                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

export async function seedAiConversations(
  context: INestApplicationContext,
  emailToUser: Record<string, User>,
) {
  const dataSource = context.get(DataSource);
  let total = 0;

  for (const conv of CONVERSATIONS) {
    const user = emailToUser[conv.userEmail];
    if (!user) {
      logger.warn(`⚠️  User not found: ${conv.userEmail}`);
      continue;
    }

    // Check if this conversation already exists (idempotent seed)
    const existing = await dataSource.query(
      `SELECT id FROM ai_conversations WHERE "userId" = $1 AND title = $2 LIMIT 1`,
      [user.id, conv.title],
    );
    if (existing.length > 0) continue;

    // Insert conversation
    const [created] = await dataSource.query(
      `INSERT INTO ai_conversations (title, pinned, "userId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING id`,
      [conv.title, conv.pinned ?? false, user.id],
    );
    const conversationId = created.id;

    // Insert messages
    for (const msg of conv.messages) {
      await dataSource.query(
        `INSERT INTO ai_conversation_messages ("conversationId", role, content, sources, "isError", "createdAt")
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          conversationId,
          msg.role,
          msg.content,
          msg.sources ? JSON.stringify(msg.sources) : null,
          false,
        ],
      );
    }

    total++;
  }

  return { total };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Standalone runner                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

async function run() {
  const context = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const userRepo = context.get<Repository<User>>(getRepositoryToken(User));
  const users = await userRepo.find();
  const emailToUser: Record<string, User> = {};
  for (const u of users) emailToUser[u.email] = u;

  const { total } = await seedAiConversations(context, emailToUser);

  logger.log(`✅ ${total} conversations IA créées`);
  CONVERSATIONS.forEach((c) => {
    const user = emailToUser[c.userEmail];
    if (user) logger.log(`   💬 [${user.firstName}] ${c.title} (${c.messages.length} messages)`);
  });

  await context.close();
}

// Run standalone if called directly
if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
