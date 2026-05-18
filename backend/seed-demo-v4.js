/**
 * Seed v4 — ImKnow
 * Interactions sociales riches : commentaires threadés, likes commentaires,
 * mentions, réponses, bookmarks, follows, messages chat, blocages utilisateurs.
 *
 * Usage : node seed-demo-v4.js
 * Prérequis : backend sur http://localhost:3000
 * Idempotent : vérifie l'existence avant chaque insertion.
 * Recommandé : exécuter après seed-demo-v3.js (les articles et signalements s'y trouvent).
 */

const axios  = require('axios');
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const BASE = 'http://localhost:3000';
const DB_CONFIG = { host: 'localhost', port: 5432, user: 'postgres', password: 'postgres', database: 'pfe_db' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function login(email, password) {
  const res = await axios.post(`${BASE}/api/users/auth/login`, { email, password });
  return res.data.accessToken || res.data.access_token || res.data.token;
}

async function ensureUser(db, { firstName, lastName, email, password, role = 'EMPLOYEE', department, bio, country = 'France', city }) {
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(password, 10);
    await db.query(
      `INSERT INTO users ("firstName","lastName",email,password,role,status,"isEmailActive","isGoogleAccount","emailNotificationsEnabled","pushNotificationsEnabled","isOnline",department,bio,country,city)
       VALUES ($1,$2,$3,$4,$5,'actif',true,false,true,true,false,$6,$7,$8,$9)`,
      [firstName, lastName, email, hash, role, department || null, bio || null, country, city || null]
    );
  } else {
    await db.query(
      `UPDATE users SET department = COALESCE(NULLIF(department,''), $1), bio = COALESCE(NULLIF(bio,''), $2) WHERE email = $3`,
      [department || null, bio || null, email]
    );
  }
  const token = await login(email, password);
  const row = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  return { token, id: row.rows[0].id };
}

function api(token) {
  return axios.create({ baseURL: BASE, headers: { Authorization: `Bearer ${token}` }, validateStatus: () => true });
}

// Crée un commentaire si absent (dédupliqué sur authorId + articleId + 80 premiers chars)
async function getOrCreateComment(db, apiClient, { articleId, content, parentId, mentionedUserIds, authorId }) {
  const prefix = content.substring(0, 80).replace(/%/g, '\\%').replace(/_/g, '\\_');
  const existing = await db.query(
    `SELECT id FROM comments WHERE "authorId" = $1 AND "articleId" = $2 AND content LIKE $3 AND "deletedAt" IS NULL LIMIT 1`,
    [authorId, articleId, prefix + '%']
  );
  if (existing.rows.length > 0) return { id: existing.rows[0].id, created: false };

  const body = { articleId, content };
  if (parentId)            body.parentId          = parentId;
  if (mentionedUserIds?.length) body.mentionedUserIds = mentionedUserIds;

  const res = await apiClient.post('/api/comments', body);
  if (res.status >= 400) {
    console.log(`     ⚠️  Commentaire (${res.status}): ${JSON.stringify(res.data).substring(0, 100)}`);
    return null;
  }
  return { id: res.data.id, created: true };
}

// ─── Utilisateurs ─────────────────────────────────────────────────────────────

const EMPLOYEES = [
  { firstName: 'Marie',     lastName: 'Dupont',   email: 'marie.dupont@imknow.com',     password: 'Employee@1234', department: 'RH',            bio: 'Responsable RH avec 8 ans d\'expérience.' },
  { firstName: 'Thomas',    lastName: 'Martin',   email: 'thomas.martin@imknow.com',    password: 'Employee@1234', department: 'Développement', bio: 'Développeur fullstack passionné par React et Node.js.' },
  { firstName: 'Sophie',    lastName: 'Laurent',  email: 'sophie.laurent@imknow.com',   password: 'Employee@1234', department: 'Design',        bio: 'Designer UX/UI centrée sur l\'utilisateur.' },
  { firstName: 'Lucas',     lastName: 'Bernard',  email: 'lucas.bernard@imknow.com',    password: 'Employee@1234', department: 'DevOps',        bio: 'Ingénieur DevOps spécialisé cloud AWS.' },
  { firstName: 'Emma',      lastName: 'Moreau',   email: 'emma.moreau@imknow.com',      password: 'Employee@1234', department: 'Marketing',     bio: 'Responsable marketing digital et growth hacking.' },
  { firstName: 'Alexandre', lastName: 'Petit',    email: 'alexandre.petit@imknow.com',  password: 'Employee@1234', department: 'Développement', bio: 'Développeur frontend spécialisé TypeScript.' },
  { firstName: 'Camille',   lastName: 'Rousseau', email: 'camille.rousseau@imknow.com', password: 'Employee@1234', department: 'Finance',       bio: 'Responsable financière, gestion budgétaire.' },
  { firstName: 'Julien',    lastName: 'Leroy',    email: 'julien.leroy@imknow.com',     password: 'Employee@1234', department: 'Développement', bio: 'Architecte logiciel, 12 ans d\'expérience.' },
  { firstName: 'Léa',       lastName: 'Dubois',   email: 'lea.dubois@imknow.com',       password: 'Employee@1234', department: 'Juridique',     bio: 'Juriste spécialisée RGPD et droit du numérique.' },
];

// ─── Articles principaux (idempotents) ────────────────────────────────────────
// Contenu minimal — si v3 a déjà tout créé, ces entrées sont simplement ignorées.

const ARTICLES_MAIN = [
  { authorEmail: 'thomas.martin@imknow.com',    categoryName: 'Développement', status: 'published', title: 'Guide complet React 18 : nouveautés et bonnes pratiques',                tagNames: ['#React', '#Frontend', '#Best Practices'],    viewsCount: 342, content: `React 18 a introduit des changements majeurs.\n\n## Concurrent Mode\n\nLe mode concurrent permet à React de préparer plusieurs versions du UI.\n\n## useTransition\n\`\`\`jsx\nconst [isPending, startTransition] = useTransition();\nstartTransition(() => setSearchQuery(input));\n\`\`\`\n\n## Automatic Batching\n\nToutes les mises à jour d'état sont regroupées automatiquement en React 18.` },
  { authorEmail: 'alexandre.petit@imknow.com',  categoryName: 'Développement', status: 'published', title: 'TypeScript avancé : types génériques et patterns de conception',          tagNames: ['#TypeScript', '#Best Practices', '#Frontend'], viewsCount: 287, content: `TypeScript offre un système de types puissant.\n\n## Conditional Types\n\`\`\`typescript\ntype Flatten<T> = T extends Array<infer Item> ? Item : T;\n\`\`\`\n\n## Mapped Types\n\`\`\`typescript\ntype Readonly<T> = { readonly [P in keyof T]: T[P] };\n\`\`\`\n\n## Type Guards\n\`\`\`typescript\nfunction isUser(v: unknown): v is User { return typeof v === 'object' && v !== null && 'email' in v; }\n\`\`\`` },
  { authorEmail: 'julien.leroy@imknow.com',     categoryName: 'Développement', status: 'published', title: 'Architecture microservices : retour d\'expérience après 2 ans',           tagNames: ['#Architecture', '#Backend', '#Best Practices'], viewsCount: 519, content: `Deux ans de migration microservices : les leçons.\n\n## Découpage par domaine\n- Service Utilisateurs\n- Service Contenu\n- Service Notification\n\n## Communication asynchrone\nRabbitMQ pour réduire le couplage.\n\n## Difficultés\n### Transactions distribuées\nSolution : Saga pattern.\n\n## Recommandations\n1. Monolithe modulaire d'abord\n2. Observabilité dès le début\n3. Contrats OpenAPI clairs` },
  { authorEmail: 'lucas.bernard@imknow.com',    categoryName: 'Développement', status: 'published', title: 'Sécurité des API REST : guide complet 2024',                              tagNames: ['#Security', '#Backend', '#Best Practices'],  viewsCount: 398, content: `La sécurité des API est souvent négligée.\n\n## JWT\n\`\`\`typescript\nconst token = jwt.sign({ userId }, SECRET, { expiresIn: '1h' });\n\`\`\`\n\n## Rate Limiting\n\`\`\`typescript\napp.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));\n\`\`\`\n\n## CORS\n\`\`\`typescript\napp.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));\n\`\`\`\n\nToujours utiliser des requêtes paramétrées contre l'injection SQL.` },
  { authorEmail: 'lucas.bernard@imknow.com',    categoryName: 'Développement', status: 'published', title: 'PostgreSQL : optimisation avancée des requêtes',                          tagNames: ['#Database', '#Performance', '#Backend'],      viewsCount: 312, content: `## EXPLAIN ANALYZE\n\`\`\`sql\nEXPLAIN (ANALYZE, BUFFERS) SELECT a.title FROM articles a WHERE a.status = 'published';\n\`\`\`\n\n## Index partiels\n\`\`\`sql\nCREATE INDEX idx_published ON articles (created_at DESC) WHERE status = 'published';\n\`\`\`\n\n## Maintenance\n\`\`\`sql\nVACUUM ANALYZE articles;\nSELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;\n\`\`\`` },
  { authorEmail: 'thomas.martin@imknow.com',    categoryName: 'Développement', status: 'published', title: 'Performance JavaScript : les optimisations qui font vraiment la différence', tagNames: ['#Performance', '#Frontend'],                 viewsCount: 401, content: `## Code Splitting\n\`\`\`jsx\nconst Heavy = React.lazy(() => import('./Heavy'));\n\`\`\`\n\n## useMemo\n\`\`\`jsx\nconst sorted = useMemo(() => items.sort((a,b) => b.views - a.views), [items]);\n\`\`\`\n\n## react-window\n\`\`\`jsx\nimport { FixedSizeList } from 'react-window';\n<FixedSizeList height={600} itemCount={1000} itemSize={80}>{Row}</FixedSizeList>\n\`\`\`` },
  { authorEmail: 'lea.dubois@imknow.com',       categoryName: 'Juridique',     status: 'published', title: 'RGPD en 2024 : guide pratique pour les équipes techniques',                tagNames: ['#Security', '#Guide'],                        viewsCount: 223, content: `## Licéité du traitement\n- Consentement explicite\n- Exécution d'un contrat\n- Intérêt légitime\n\n## Privacy by Design\n\`\`\`typescript\ninterface UserLog { userId: string; action: string; hashedIp?: string; }\n\`\`\`\n\n## Chiffrement\n- Au repos : AES-256\n- En transit : TLS 1.3\n\n## Sanctions\n- 2% du CA ou 10M€\n- 4% du CA ou 20M€ pour les infractions graves` },
  { authorEmail: 'julien.leroy@imknow.com',     categoryName: 'Développement', status: 'published', title: 'Intelligence Artificielle en entreprise : par où commencer ?',             tagNames: ['#Architecture', '#Backend', '#Nouveau'],      viewsCount: 478, content: `## Niveaux de maturité IA\n- Niveau 1 : ChatGPT ponctuel\n- Niveau 2 : APIs IA dans vos produits\n- Niveau 3 : pipelines ML en prod\n\n## Intégration Anthropic\n\`\`\`typescript\nimport Anthropic from '@anthropic-ai/sdk';\nconst client = new Anthropic();\nconst msg = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: 'Résume :' }] });\n\`\`\`\n\n## RAG : vos données internes\n1. Vectoriser (pgvector)\n2. Recherche sémantique\n3. Contexte au LLM` },
  { authorEmail: 'lucas.bernard@imknow.com',    categoryName: 'Développement', status: 'published', title: 'Docker et Kubernetes : déployer ses applications en production',            tagNames: ['#DevOps', '#Best Practices'],                  viewsCount: 356, content: `## Multi-stage Dockerfile\n\`\`\`dockerfile\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nFROM node:20-alpine\nCOPY --from=builder /app/dist ./dist\nCMD ["node","dist/main.js"]\n\`\`\`\n\n## Deployment K8s\n\`\`\`yaml\nreadinessProbe:\n  httpGet: { path: /health, port: 3000 }\n  initialDelaySeconds: 30\n\`\`\`` },
  { authorEmail: 'marie.dupont@imknow.com',     categoryName: 'RH',            status: 'published', title: 'Onboarding réussi : le guide complet pour les équipes RH',                 tagNames: ['#Guide', '#Important'],                       viewsCount: 265, content: `## Le modèle des 4C\n1. **Conformité** — règles et processus\n2. **Clarification** — rôles et attentes\n3. **Culture** — valeurs d'entreprise\n4. **Connexion** — relations professionnelles\n\n## Le buddy system\nAttribuer un mentor réduit le temps d'adaptation de 50%.\n\n## Checklist J1\n- Poste de travail configuré\n- Accès aux outils\n- Déjeuner avec l'équipe` },
  { authorEmail: 'sophie.laurent@imknow.com',   categoryName: 'Design',        status: 'published', title: 'Construire un Design System scalable : guide pratique',                    tagNames: ['#UI/UX', '#Design', '#Tutoriel'],              viewsCount: 172, content: `## Pourquoi un Design System ?\nUn Design System unique source of truth réduit le temps de développement de 40%.\n\n## Tokens de design\n\`\`\`css\n:root { --color-primary: #00926B; --spacing-md: 16px; --radius-lg: 12px; }\n\`\`\`\n\n## Composants atomiques\nBoutons → Inputs → Cards → Modals\n\n## Documentation Storybook\n\`\`\`jsx\nexport const Primary = { args: { label: 'Enregistrer', variant: 'primary' } };\n\`\`\`` },
  { authorEmail: 'marie.dupont@imknow.com',     categoryName: 'RH',            status: 'published', title: 'Recruter les meilleurs talents tech : stratégies pour 2024',               tagNames: ['#Guide', '#Important'],                       viewsCount: 203, content: `## Ce que les devs recherchent\n1. Projets techniques intéressants\n2. Stack moderne\n3. Autonomie\n4. Salaire compétitif\n5. Télétravail\n\n## Le processus qui marche\n- Take-home project payé (3h max)\n- Entretien conversationnel\n- Rencontre avec l'équipe\n\n## Ce qui fait fuir\n- Tests de 8h non rémunérés\n- 6 rounds d'entretiens` },
  { authorEmail: 'emma.moreau@imknow.com',      categoryName: 'Marketing',     status: 'published', title: 'Stratégie content marketing B2B : guide complet 2024',                    tagNames: ['#Guide', '#Nouveau'],                         viewsCount: 189, content: `## Pourquoi le content marketing B2B ?\nLe contenu de qualité génère 3x plus de leads que la pub payante à coût égal.\n\n## Le funnel de contenu\n- TOFU : articles de blog, guides\n- MOFU : cas clients, webinaires\n- BOFU : démos, comparatifs\n\n## Mesurer l'impact\n- Taux d'engagement\n- Leads générés\n- Pipeline influencé` },
];

// ─── Commentaires threadés ─────────────────────────────────────────────────────
// Structure : { articleTitle, threads: [{ authorEmail, content, mentions[], likers[], replies[] }] }
// mentions = emails des utilisateurs mentionnés (résolus en IDs au runtime)
// likers   = emails des utilisateurs qui likent ce commentaire
// replies  = mêmes champs que le commentaire parent (sauf replies imbriquées)

const COMMENT_THREADS = [
  {
    articleTitle: 'Guide complet React 18 : nouveautés et bonnes pratiques',
    threads: [
      {
        authorEmail: 'alexandre.petit@imknow.com',
        content: 'Excellent article Thomas ! Le useTransition est vraiment un game changer pour les tableaux de bord avec beaucoup de données. On a implémenté ça sur notre app interne et la fluidité est incomparable.',
        mentions: [],
        likers: ['sophie.laurent@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com'],
        replies: [
          {
            authorEmail: 'thomas.martin@imknow.com',
            content: 'Merci Alexandre ! Tu peux partager un chiffre sur l\'amélioration perçue ? Un avant/après sur les métriques de performance ?',
            mentions: ['alexandre.petit@imknow.com'],
            likers: ['julien.leroy@imknow.com', 'lucas.bernard@imknow.com'],
          },
          {
            authorEmail: 'julien.leroy@imknow.com',
            content: 'Attention tout de même avec le mode concurrent sur des apps existantes — j\'ai eu des effets de bord inattendus avec useEffect qui se déclenchait deux fois en dev mode (StrictMode). Bien lire la doc sur le comportement en strict mode.',
            mentions: [],
            likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com'],
          },
          {
            authorEmail: 'alexandre.petit@imknow.com',
            content: '@Julien bonne précision ! On a eu exactement ce problème avec nos useEffect qui faisaient des appels API. La solution : vérifier si le composant est toujours monté avec un flag ou utiliser AbortController.',
            mentions: ['julien.leroy@imknow.com'],
            likers: ['thomas.martin@imknow.com', 'sophie.laurent@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'sophie.laurent@imknow.com',
        content: 'Très clair et bien structuré Thomas. Est-ce que tu pourrais ajouter un exemple concret qui combine React Query et Suspense ? Ça manque souvent dans les tutoriels et ce serait très utile pour les équipes qui démarrent.',
        mentions: ['thomas.martin@imknow.com'],
        likers: ['emma.moreau@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          {
            authorEmail: 'thomas.martin@imknow.com',
            content: 'Bonne idée ! J\'ai gardé l\'article sur React pur pour que ce soit accessible à tous, mais je vais écrire un article de suivi spécifiquement sur React Query v5 + Suspense + Next.js App Router. Ça mérite son propre article.',
            mentions: [],
            likers: ['sophie.laurent@imknow.com', 'alexandre.petit@imknow.com'],
          },
          {
            authorEmail: 'lucas.bernard@imknow.com',
            content: 'En attendant l\'article dédié, la doc officielle de React Query v5 sur le Suspense est vraiment bien faite. La migration depuis v4 est aussi très documentée.',
            mentions: [],
            likers: ['thomas.martin@imknow.com', 'sophie.laurent@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'marie.dupont@imknow.com',
        content: 'Merci pour cet article ! Même si je ne suis pas développeuse, ça m\'aide vraiment à comprendre pourquoi l\'équipe tech parle de "re-render" et de "performance" dans les plannings. Je vais partager avec notre PO.',
        mentions: [],
        likers: ['emma.moreau@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          {
            authorEmail: 'thomas.martin@imknow.com',
            content: 'C\'est exactement l\'objectif Marie ! Je voulais que cet article soit lisible par tout le monde, pas seulement les développeurs. Content que ça aide à aligner les équipes.',
            mentions: ['marie.dupont@imknow.com'],
            likers: ['marie.dupont@imknow.com', 'emma.moreau@imknow.com'],
          },
        ],
      },
    ],
  },

  {
    articleTitle: 'TypeScript avancé : types génériques et patterns de conception',
    threads: [
      {
        authorEmail: 'julien.leroy@imknow.com',
        content: 'Article de référence Alexandre ! Les conditional types sont souvent mal compris. Une précision importante : `infer` fonctionne uniquement dans la position `extends` d\'un conditional type, pas dans les mapped types.',
        mentions: ['alexandre.petit@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'sophie.laurent@imknow.com'],
        replies: [
          {
            authorEmail: 'alexandre.petit@imknow.com',
            content: 'Excellent ajout Julien ! J\'aurais dû mentionner ça. Les limites de `infer` et de la récursivité dans les types sont des pièges classiques. Je vais mettre à jour l\'article avec un exemple.',
            mentions: ['julien.leroy@imknow.com'],
            likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'],
          },
          {
            authorEmail: 'thomas.martin@imknow.com',
            content: 'Pour les types récursifs, TypeScript impose une limite de profondeur (par défaut ~100). Bon à savoir pour les structures d\'arbre très profondes.',
            mentions: [],
            likers: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'lucas.bernard@imknow.com',
        content: 'Très bon article ! Une question pratique : vous recommandez d\'activer `strict: true` dès le début d\'un projet, mais comment gérer la migration d\'un projet existant qui a des centaines d\'erreurs TypeScript latentes ?',
        mentions: [],
        likers: ['alexandre.petit@imknow.com', 'emma.moreau@imknow.com'],
        replies: [
          {
            authorEmail: 'alexandre.petit@imknow.com',
            content: 'Excellente question ! La stratégie recommandée : activer les options strictes une par une. Commencer par `noImplicitAny`, puis `strictNullChecks`, puis `strictFunctionTypes`. Chaque étape avec son lot de corrections.',
            mentions: ['lucas.bernard@imknow.com'],
            likers: ['lucas.bernard@imknow.com', 'julien.leroy@imknow.com', 'thomas.martin@imknow.com'],
          },
          {
            authorEmail: 'julien.leroy@imknow.com',
            content: 'On a utilisé `ts-migrate` de Airbnb pour la migration automatique d\'un gros projet. Ça génère des `@ts-expect-error` partout mais au moins le projet compile, et on peut les traiter progressivement.',
            mentions: [],
            likers: ['lucas.bernard@imknow.com', 'alexandre.petit@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'emma.moreau@imknow.com',
        content: 'Je vais partager cet article avec notre équipe design system. Les template literal types pour les design tokens, ça m\'a ouvert les yeux sur ce qu\'on peut faire !',
        mentions: [],
        likers: ['sophie.laurent@imknow.com', 'alexandre.petit@imknow.com'],
        replies: [
          {
            authorEmail: 'sophie.laurent@imknow.com',
            content: 'Exactement Emma ! On a utilisé les template literal types pour typer nos tokens de couleur et d\'espacement. L\'autocomplétion dans VS Code devient incroyable — impossible de se tromper de token.',
            mentions: ['emma.moreau@imknow.com'],
            likers: ['emma.moreau@imknow.com', 'alexandre.petit@imknow.com', 'thomas.martin@imknow.com'],
          },
        ],
      },
    ],
  },

  {
    articleTitle: 'Architecture microservices : retour d\'expérience après 2 ans',
    threads: [
      {
        authorEmail: 'lucas.bernard@imknow.com',
        content: 'Le Saga pattern est effectivement la solution pour les transactions distribuées mais la complexité de la compensation est souvent sous-estimée. Vous avez utilisé quelle implémentation ? Choreography ou Orchestration ?',
        mentions: ['julien.leroy@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com'],
        replies: [
          {
            authorEmail: 'julien.leroy@imknow.com',
            content: 'On a commencé avec la choreography (events), mais on a migré vers l\'orchestration (saga orchestrator) après 6 mois. L\'orchestration est plus facile à déboguer — vous voyez l\'état de chaque saga en un seul endroit.',
            mentions: ['lucas.bernard@imknow.com'],
            likers: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'alexandre.petit@imknow.com'],
          },
          {
            authorEmail: 'thomas.martin@imknow.com',
            content: 'NestJS Saga avec `@nestjs/cqrs` est vraiment bien pensé pour l\'orchestration. On l\'utilise pour notre workflow de publication d\'articles et c\'est très lisible.',
            mentions: [],
            likers: ['julien.leroy@imknow.com', 'lucas.bernard@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'emma.moreau@imknow.com',
        content: 'Article très instructif même pour une non-technique ! J\'ai enfin compris pourquoi les déploiements prenaient autant de temps dans notre ancien système. La partie sur l\'observabilité m\'a particulièrement intéressée.',
        mentions: [],
        likers: ['marie.dupont@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          {
            authorEmail: 'julien.leroy@imknow.com',
            content: 'Contente que ça aide Emma ! L\'observabilité est souvent la partie la plus négligée et pourtant c\'est elle qui vous sauve à 3h du matin quand quelque chose ne va pas en prod.',
            mentions: ['emma.moreau@imknow.com'],
            likers: ['emma.moreau@imknow.com', 'lucas.bernard@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'alexandre.petit@imknow.com',
        content: 'Question pratique : combien de temps la migration complète a-t-elle pris et combien étiez-vous dans l\'équipe ? On réfléchit à la même chose et j\'essaie d\'estimer la charge.',
        mentions: ['julien.leroy@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          {
            authorEmail: 'julien.leroy@imknow.com',
            content: '18 mois avec une équipe de 8 développeurs en migration incrémentale service par service. Règle d\'or : ne jamais tout migrer d\'un coup. Chaque service migré doit coexister avec le monolithe pendant au moins un sprint.',
            mentions: ['alexandre.petit@imknow.com'],
            likers: ['alexandre.petit@imknow.com', 'thomas.martin@imknow.com', 'lucas.bernard@imknow.com'],
          },
          {
            authorEmail: 'lucas.bernard@imknow.com',
            content: 'À noter aussi : prévoyez 20% de temps supplémentaire pour les tests d\'intégration entre services. C\'est toujours là que les surprises arrivent.',
            mentions: [],
            likers: ['julien.leroy@imknow.com', 'alexandre.petit@imknow.com'],
          },
        ],
      },
    ],
  },

  {
    articleTitle: 'Sécurité des API REST : guide complet 2024',
    threads: [
      {
        authorEmail: 'julien.leroy@imknow.com',
        content: 'J\'ajouterais absolument une section sur la validation de l\'algorithme JWT. Beaucoup d\'équipes oublient de vérifier l\'algorithme de signature côté serveur et sont vulnérables à l\'attaque "alg: none" — un vrai classique des CTF.',
        mentions: ['lucas.bernard@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lea.dubois@imknow.com'],
        replies: [
          {
            authorEmail: 'lucas.bernard@imknow.com',
            content: 'Très bon point Julien ! J\'ai ajouté une note dans l\'article. En NestJS, `@nestjs/jwt` gère ça correctement si vous spécifiez l\'algorithme dans la config — mais c\'est une option qu\'on oublie souvent.',
            mentions: ['julien.leroy@imknow.com'],
            likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'],
          },
          {
            authorEmail: 'thomas.martin@imknow.com',
            content: 'On a eu un audit sécu la semaine dernière et ce point était dans leur rapport. Je vais partager cet article avec toute l\'équipe — c\'est exactement la synthèse dont on avait besoin.',
            mentions: [],
            likers: ['lucas.bernard@imknow.com', 'julien.leroy@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'lea.dubois@imknow.com',
        content: 'Excellente ressource Lucas. En complément côté RGPD : toutes ces mesures de sécurité (chiffrement, logs, contrôle d\'accès) doivent être documentées dans le registre des traitements. C\'est une obligation légale souvent oubliée.',
        mentions: [],
        likers: ['marie.dupont@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          {
            authorEmail: 'lucas.bernard@imknow.com',
            content: 'Merci Léa ! Je ne savais pas pour l\'obligation de documentation dans le registre. Tu peux nous faire un article sur la mise en conformité RGPD des équipes techniques ?',
            mentions: ['lea.dubois@imknow.com'],
            likers: ['marie.dupont@imknow.com', 'thomas.martin@imknow.com'],
          },
          {
            authorEmail: 'lea.dubois@imknow.com',
            content: 'Je prépare justement quelque chose ! L\'article RGPD que j\'ai publié est un début mais je veux faire un guide plus pratique orienté "équipe dev". Je vise la semaine prochaine.',
            mentions: [],
            likers: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'marie.dupont@imknow.com'],
          },
        ],
      },
    ],
  },

  {
    articleTitle: 'PostgreSQL : optimisation avancée des requêtes',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: 'Les index partiels ont changé la vie sur notre projet ! On a réduit la taille de nos index de 60% en indexant seulement les articles publiés. Et les requêtes listant les articles publiés sont passées de 180ms à 12ms.',
        mentions: [],
        likers: ['lucas.bernard@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com'],
        replies: [
          {
            authorEmail: 'lucas.bernard@imknow.com',
            content: 'Ces chiffres font rêver Thomas ! Vous utilisez pg_stat_statements pour monitorer les requêtes lentes en permanence ? C\'est notre première config sur tout nouveau projet PostgreSQL.',
            mentions: ['thomas.martin@imknow.com'],
            likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com'],
          },
          {
            authorEmail: 'thomas.martin@imknow.com',
            content: 'Oui absolument ! Et on a configuré `log_min_duration_statement = 100` pour logger automatiquement toutes les requêtes qui dépassent 100ms. Ça attrape les problèmes avant qu\'ils ne deviennent critiques.',
            mentions: ['lucas.bernard@imknow.com'],
            likers: ['lucas.bernard@imknow.com', 'julien.leroy@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'alexandre.petit@imknow.com',
        content: 'Question : pour des volumes importants (>10M lignes), vous recommandez le partitioning natif PostgreSQL ou le sharding via Citus ? Je dois prendre une décision d\'architecture pour un nouveau projet.',
        mentions: ['lucas.bernard@imknow.com', 'julien.leroy@imknow.com'],
        likers: ['thomas.martin@imknow.com'],
        replies: [
          {
            authorEmail: 'julien.leroy@imknow.com',
            content: 'Pour 10M lignes, le partitioning natif PostgreSQL est largement suffisant. Le sharding (Citus, Vitess) n\'est nécessaire qu\'au-delà de 100-200M lignes ou pour des besoins en écriture massifs en parallèle.',
            mentions: ['alexandre.petit@imknow.com'],
            likers: ['alexandre.petit@imknow.com', 'thomas.martin@imknow.com', 'lucas.bernard@imknow.com'],
          },
          {
            authorEmail: 'lucas.bernard@imknow.com',
            content: 'D\'accord avec Julien. Et si vous partez sur le partitioning, faites-le dès le début — migrer une table existante de 10M lignes vers le partitioning en production sans downtime est un cauchemar.',
            mentions: ['julien.leroy@imknow.com'],
            likers: ['julien.leroy@imknow.com', 'alexandre.petit@imknow.com'],
          },
        ],
      },
    ],
  },

  {
    articleTitle: 'RGPD en 2024 : guide pratique pour les équipes techniques',
    threads: [
      {
        authorEmail: 'lucas.bernard@imknow.com',
        content: 'Point crucial souvent raté : le soft delete (is_deleted: true) ne satisfait pas le droit à l\'effacement RGPD. On a dû refactoriser tout notre système de suppression suite à un audit externe. Les données doivent être vraiment anonymisées ou supprimées.',
        mentions: ['lea.dubois@imknow.com'],
        likers: ['marie.dupont@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          {
            authorEmail: 'lea.dubois@imknow.com',
            content: 'Exact Lucas. La CNIL précise que le droit à l\'effacement implique soit la suppression physique, soit une anonymisation irréversible. Le soft delete ne suffit que si les données anonymisées ne permettent plus d\'identifier la personne directement ou indirectement.',
            mentions: ['lucas.bernard@imknow.com'],
            likers: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'marie.dupont@imknow.com'],
          },
          {
            authorEmail: 'thomas.martin@imknow.com',
            content: 'Pour ImKnow, on a implémenté un job de purge qui remplace les données personnelles par des hashes dans les tables d\'audit après 30 jours d\'une demande d\'effacement. Ça satisfait le RGPD tout en gardant l\'intégrité référentielle.',
            mentions: [],
            likers: ['lea.dubois@imknow.com', 'lucas.bernard@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'marie.dupont@imknow.com',
        content: 'Léa, tu avais mentionné une formation RGPD pour les développeurs. Tu as fixé une date ? Le CODIR est très favorable et je peux bloquer une salle de conf pour 15 personnes.',
        mentions: ['lea.dubois@imknow.com'],
        likers: ['emma.moreau@imknow.com', 'thomas.martin@imknow.com'],
        replies: [
          {
            authorEmail: 'lea.dubois@imknow.com',
            content: 'Oui Marie ! Je visais le vendredi 23 après-midi, 14h-17h. Programme : principes fondamentaux (1h), ateliers pratiques sur du code réel (1h30), Q&A (30min). Je vous envoie une invitation formelle cette semaine.',
            mentions: ['marie.dupont@imknow.com'],
            likers: ['marie.dupont@imknow.com', 'thomas.martin@imknow.com', 'lucas.bernard@imknow.com'],
          },
          {
            authorEmail: 'thomas.martin@imknow.com',
            content: 'Je bloque déjà le créneau. Est-ce qu\'on peut inviter les PMs aussi ? Ils prennent des décisions produit qui ont des implications RGPD sans toujours le réaliser.',
            mentions: ['lea.dubois@imknow.com'],
            likers: ['lea.dubois@imknow.com', 'marie.dupont@imknow.com'],
          },
        ],
      },
    ],
  },

  {
    articleTitle: 'Intelligence Artificielle en entreprise : par où commencer ?',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: 'L\'intégration d\'Anthropic Claude pour la recherche sémantique dans ImKnow a changé la donne. Avec pgvector pour les embeddings et Claude pour la génération de réponses, on a vu le taux de satisfaction des recherches passer de 61% à 89%.',
        mentions: ['julien.leroy@imknow.com'],
        likers: ['emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          {
            authorEmail: 'emma.moreau@imknow.com',
            content: 'Ces chiffres sont impressionnants Thomas ! Combien coûte l\'API Anthropic par mois approximativement pour un usage interne comme ImKnow ?',
            mentions: ['thomas.martin@imknow.com'],
            likers: ['camille.rousseau@imknow.com', 'julien.leroy@imknow.com'],
          },
          {
            authorEmail: 'julien.leroy@imknow.com',
            content: '@Emma pour ImKnow on est autour de 150-200€/mois avec les embeddings inclus. En utilisant le cache de prompt pour les systèmes prompts répétitifs, on a réduit les coûts de 40%.',
            mentions: ['emma.moreau@imknow.com'],
            likers: ['emma.moreau@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com'],
          },
          {
            authorEmail: 'lucas.bernard@imknow.com',
            content: 'Notre politique chez nous : données clients → Ollama local (zéro coût, zéro fuite), données non sensibles → Claude API. L\'hybride permet de maîtriser les coûts tout en ayant la qualité des LLMs commerciaux là où ça compte.',
            mentions: [],
            likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'sophie.laurent@imknow.com',
        content: 'Julien, pour la partie RAG vous pourriez documenter comment vous avez configuré pgvector sur ImKnow ? Le choix du modèle d\'embedding, la dimension des vecteurs, les paramètres HNSW... J\'essaie d\'implémenter la même chose pour nos guidelines design.',
        mentions: ['julien.leroy@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com'],
        replies: [
          {
            authorEmail: 'julien.leroy@imknow.com',
            content: 'Je vais écrire un article dédié ! En attendant : on utilise `text-embedding-3-small` d\'OpenAI (1536 dimensions), index HNSW avec m=16 et ef_construction=64. Pour la similarité cosinus, `<=>` dans pgvector. Recherche en moins de 10ms sur 50k vecteurs.',
            mentions: ['sophie.laurent@imknow.com'],
            likers: ['sophie.laurent@imknow.com', 'thomas.martin@imknow.com', 'lucas.bernard@imknow.com'],
          },
        ],
      },
    ],
  },

  {
    articleTitle: 'Docker et Kubernetes : déployer ses applications en production',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: 'Excellent tutoriel Lucas ! Le multi-stage build est vraiment essentiel — notre image NestJS est passée de 1.2GB à 182MB. Le secret : ne copier que le `dist/` et `node_modules` de production dans l\'étape finale.',
        mentions: [],
        likers: ['julien.leroy@imknow.com', 'alexandre.petit@imknow.com', 'emma.moreau@imknow.com'],
        replies: [
          {
            authorEmail: 'julien.leroy@imknow.com',
            content: 'Pour aller encore plus loin : utiliser `node:20-alpine` comme base réduit encore l\'image. Et activer le build cache npm avec `--mount=type=cache,target=/root/.npm` dans le RUN npm ci. On est passé à 95MB et les rebuilds sont instantanés.',
            mentions: [],
            likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'alexandre.petit@imknow.com'],
          },
          {
            authorEmail: 'lucas.bernard@imknow.com',
            content: 'Merci pour le tip sur le mount cache Julien ! Je vais mettre à jour le Dockerfile de l\'article. Ça change vraiment la vie pour les CI/CD où chaque seconde compte.',
            mentions: ['julien.leroy@imknow.com'],
            likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'alexandre.petit@imknow.com',
        content: 'Vous utilisez Helm pour gérer vos charts Kubernetes ? Ça simplifie vraiment la gestion des environnements (dev/staging/prod) et les mises à jour. On a aussi opté pour Helmfile pour orchestrer plusieurs charts.',
        mentions: ['lucas.bernard@imknow.com'],
        likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'],
        replies: [
          {
            authorEmail: 'lucas.bernard@imknow.com',
            content: 'Helm absolument ! On a créé notre chart interne avec des valeurs par défaut sécurisées (resources limits, security context, network policies). Chaque nouveau service hérite de ces bonnes pratiques sans effort.',
            mentions: ['alexandre.petit@imknow.com'],
            likers: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com'],
          },
          {
            authorEmail: 'julien.leroy@imknow.com',
            content: 'Helmfile est un excellent choix pour l\'orchestration. En complément, ArgoCD pour le GitOps — chaque merge sur main déclenche automatiquement un sync Kubernetes. Déploiement continu sans kubectl en prod.',
            mentions: [],
            likers: ['lucas.bernard@imknow.com', 'alexandre.petit@imknow.com'],
          },
        ],
      },
    ],
  },

  {
    articleTitle: 'Onboarding réussi : le guide complet pour les équipes RH',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: 'En tant que nouvel arrivant il y a 7 mois, je confirme que le buddy system est ce qui m\'a le plus aidé. Mon binôme m\'a fait gagner des semaines d\'intégration — connaissance du contexte, des personnes, des processus implicites.',
        mentions: [],
        likers: ['marie.dupont@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com'],
        replies: [
          {
            authorEmail: 'marie.dupont@imknow.com',
            content: 'Merci Thomas, ce témoignage est précieux ! Est-ce qu\'il y a des aspects de ton onboarding qu\'on aurait pu améliorer ? J\'essaie de perfectionner le processus pour les prochains arrivants.',
            mentions: ['thomas.martin@imknow.com'],
            likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com'],
          },
          {
            authorEmail: 'thomas.martin@imknow.com',
            content: 'Une chose : les accès aux différents outils et environnements mettent souvent une semaine à arriver. Si on pouvait préparer tout ça avant J1, les nouveaux seraient productifs dès le premier jour.',
            mentions: ['marie.dupont@imknow.com'],
            likers: ['marie.dupont@imknow.com', 'julien.leroy@imknow.com'],
          },
          {
            authorEmail: 'emma.moreau@imknow.com',
            content: 'On a le même problème côté Marketing. J\'ai créé un ticket Jira template "Onboarding checklist" qu\'on attribue à l\'IT 2 semaines avant l\'arrivée. Ça aide mais ce n\'est pas parfait.',
            mentions: [],
            likers: ['marie.dupont@imknow.com', 'thomas.martin@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'julien.leroy@imknow.com',
        content: 'Je propose d\'ajouter un 5ème C au modèle : **Contribution**. Donner aux nouveaux une première mission à impact visible dans les 30 premiers jours booste significativement leur motivation et leur sentiment d\'appartenance.',
        mentions: ['marie.dupont@imknow.com'],
        likers: ['marie.dupont@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          {
            authorEmail: 'marie.dupont@imknow.com',
            content: 'J\'adore ce 5ème C Julien ! Il complète vraiment le modèle. Je vais l\'intégrer dans la prochaine version de notre guide onboarding. Tu me permets de te citer ?',
            mentions: ['julien.leroy@imknow.com'],
            likers: ['julien.leroy@imknow.com', 'emma.moreau@imknow.com'],
          },
          {
            authorEmail: 'sophie.laurent@imknow.com',
            content: 'Très bonne idée ! Côté design, on assigne aux nouveaux une mini refonte d\'un composant existant comme première mission. Ils apprennent le design system, contribuent au produit, et ont quelque chose à montrer dès la fin de la semaine 2.',
            mentions: [],
            likers: ['julien.leroy@imknow.com', 'marie.dupont@imknow.com'],
          },
        ],
      },
    ],
  },

  {
    articleTitle: 'Construire un Design System scalable : guide pratique',
    threads: [
      {
        authorEmail: 'alexandre.petit@imknow.com',
        content: 'Sophie, on a lu cet article en équipe et on a décidé d\'adopter cette approche pour ImKnow. La partie sur les tokens de design est particulièrement pertinente — on va migrer nos variables CSS éparpillées vers un système centralisé.',
        mentions: ['sophie.laurent@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'julien.leroy@imknow.com'],
        replies: [
          {
            authorEmail: 'sophie.laurent@imknow.com',
            content: 'Super nouvelle Alexandre ! Pour la migration, je vous conseille de commencer par les couleurs et l\'espacement — ce sont les tokens les plus utilisés et leur standardisation aura le plus d\'impact immédiat.',
            mentions: ['alexandre.petit@imknow.com'],
            likers: ['alexandre.petit@imknow.com', 'thomas.martin@imknow.com'],
          },
          {
            authorEmail: 'thomas.martin@imknow.com',
            content: 'On utilise Style Dictionary de Amazon pour transformer les tokens en variables CSS, SCSS, et même en constants TypeScript pour Tailwind. Un seul fichier JSON de source de vérité pour toutes les plateformes.',
            mentions: [],
            likers: ['sophie.laurent@imknow.com', 'alexandre.petit@imknow.com'],
          },
        ],
      },
      {
        authorEmail: 'emma.moreau@imknow.com',
        content: 'En tant que non-designer, cet article m\'a aidée à comprendre pourquoi on ne peut pas juste "changer la couleur du bouton" en 5 minutes. Le design system c\'est l\'équivalent de l\'architecture technique pour le design.',
        mentions: [],
        likers: ['sophie.laurent@imknow.com', 'marie.dupont@imknow.com'],
        replies: [
          {
            authorEmail: 'sophie.laurent@imknow.com',
            content: 'L\'analogie est parfaite Emma ! Et comme l\'architecture technique, un bon design system doit être maintenu et évoluer avec le produit. C\'est un investissement, pas une dépense.',
            mentions: ['emma.moreau@imknow.com'],
            likers: ['emma.moreau@imknow.com', 'thomas.martin@imknow.com'],
          },
        ],
      },
    ],
  },
];

// ─── Follows supplémentaires (v4) ─────────────────────────────────────────────

const FOLLOWS = [
  // Existants v2/v3 (idempotents)
  ['thomas.martin@imknow.com',    'julien.leroy@imknow.com'],
  ['thomas.martin@imknow.com',    'alexandre.petit@imknow.com'],
  ['thomas.martin@imknow.com',    'lucas.bernard@imknow.com'],
  ['alexandre.petit@imknow.com',  'thomas.martin@imknow.com'],
  ['alexandre.petit@imknow.com',  'julien.leroy@imknow.com'],
  ['alexandre.petit@imknow.com',  'sophie.laurent@imknow.com'],
  ['sophie.laurent@imknow.com',   'emma.moreau@imknow.com'],
  ['sophie.laurent@imknow.com',   'thomas.martin@imknow.com'],
  ['emma.moreau@imknow.com',      'marie.dupont@imknow.com'],
  ['emma.moreau@imknow.com',      'sophie.laurent@imknow.com'],
  ['julien.leroy@imknow.com',     'thomas.martin@imknow.com'],
  ['julien.leroy@imknow.com',     'lucas.bernard@imknow.com'],
  ['lucas.bernard@imknow.com',    'julien.leroy@imknow.com'],
  ['lucas.bernard@imknow.com',    'thomas.martin@imknow.com'],
  ['marie.dupont@imknow.com',     'emma.moreau@imknow.com'],
  ['marie.dupont@imknow.com',     'camille.rousseau@imknow.com'],
  ['lea.dubois@imknow.com',       'marie.dupont@imknow.com'],
  ['camille.rousseau@imknow.com', 'marie.dupont@imknow.com'],
  ['camille.rousseau@imknow.com', 'julien.leroy@imknow.com'],
  // Nouveaux v4 — réseau enrichi
  ['marie.dupont@imknow.com',     'thomas.martin@imknow.com'],
  ['marie.dupont@imknow.com',     'julien.leroy@imknow.com'],
  ['marie.dupont@imknow.com',     'lea.dubois@imknow.com'],
  ['emma.moreau@imknow.com',      'julien.leroy@imknow.com'],
  ['emma.moreau@imknow.com',      'lucas.bernard@imknow.com'],
  ['emma.moreau@imknow.com',      'alexandre.petit@imknow.com'],
  ['lea.dubois@imknow.com',       'thomas.martin@imknow.com'],
  ['lea.dubois@imknow.com',       'julien.leroy@imknow.com'],
  ['lea.dubois@imknow.com',       'lucas.bernard@imknow.com'],
  ['camille.rousseau@imknow.com', 'thomas.martin@imknow.com'],
  ['camille.rousseau@imknow.com', 'lucas.bernard@imknow.com'],
  ['camille.rousseau@imknow.com', 'alexandre.petit@imknow.com'],
  ['sophie.laurent@imknow.com',   'julien.leroy@imknow.com'],
  ['sophie.laurent@imknow.com',   'lucas.bernard@imknow.com'],
  ['sophie.laurent@imknow.com',   'alexandre.petit@imknow.com'],
  ['sophie.laurent@imknow.com',   'lea.dubois@imknow.com'],
  ['lucas.bernard@imknow.com',    'marie.dupont@imknow.com'],
  ['lucas.bernard@imknow.com',    'emma.moreau@imknow.com'],
  ['lucas.bernard@imknow.com',    'sophie.laurent@imknow.com'],
  ['thomas.martin@imknow.com',    'sophie.laurent@imknow.com'],
  ['thomas.martin@imknow.com',    'camille.rousseau@imknow.com'],
  ['julien.leroy@imknow.com',     'marie.dupont@imknow.com'],
  ['julien.leroy@imknow.com',     'emma.moreau@imknow.com'],
  ['julien.leroy@imknow.com',     'sophie.laurent@imknow.com'],
  ['alexandre.petit@imknow.com',  'camille.rousseau@imknow.com'],
  ['alexandre.petit@imknow.com',  'lea.dubois@imknow.com'],
];

// ─── Likes d'articles (v4 — enrichis) ────────────────────────────────────────

const ARTICLE_LIKES = [
  { articleTitle: 'Guide complet React 18 : nouveautés et bonnes pratiques',                likers: ['alexandre.petit@imknow.com', 'sophie.laurent@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com'] },
  { articleTitle: 'TypeScript avancé : types génériques et patterns de conception',          likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'marie.dupont@imknow.com', 'sophie.laurent@imknow.com', 'emma.moreau@imknow.com'] },
  { articleTitle: 'Architecture microservices : retour d\'expérience après 2 ans',           likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'alexandre.petit@imknow.com', 'emma.moreau@imknow.com', 'camille.rousseau@imknow.com', 'sophie.laurent@imknow.com'] },
  { articleTitle: 'Sécurité des API REST : guide complet 2024',                              likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lea.dubois@imknow.com', 'marie.dupont@imknow.com'] },
  { articleTitle: 'PostgreSQL : optimisation avancée des requêtes',                          likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com'] },
  { articleTitle: 'Performance JavaScript : les optimisations qui font vraiment la différence', likers: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'sophie.laurent@imknow.com', 'lucas.bernard@imknow.com'] },
  { articleTitle: 'RGPD en 2024 : guide pratique pour les équipes techniques',               likers: ['lucas.bernard@imknow.com', 'marie.dupont@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com', 'julien.leroy@imknow.com'] },
  { articleTitle: 'Intelligence Artificielle en entreprise : par où commencer ?',            likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'lucas.bernard@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com', 'alexandre.petit@imknow.com'] },
  { articleTitle: 'Docker et Kubernetes : déployer ses applications en production',           likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'alexandre.petit@imknow.com', 'emma.moreau@imknow.com', 'lucas.bernard@imknow.com'] },
  { articleTitle: 'Onboarding réussi : le guide complet pour les équipes RH',                likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'julien.leroy@imknow.com', 'sophie.laurent@imknow.com', 'camille.rousseau@imknow.com', 'lea.dubois@imknow.com'] },
  { articleTitle: 'Construire un Design System scalable : guide pratique',                   likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'marie.dupont@imknow.com'] },
  { articleTitle: 'Recruter les meilleurs talents tech : stratégies pour 2024',              likers: ['marie.dupont@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com'] },
  { articleTitle: 'Stratégie content marketing B2B : guide complet 2024',                   likers: ['marie.dupont@imknow.com', 'julien.leroy@imknow.com', 'sophie.laurent@imknow.com', 'camille.rousseau@imknow.com'] },
];

// ─── Bookmarks (v4 — enrichis) ────────────────────────────────────────────────

const BOOKMARKS = [
  { articleTitle: 'Guide complet React 18 : nouveautés et bonnes pratiques',                users: ['julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'sophie.laurent@imknow.com', 'emma.moreau@imknow.com'] },
  { articleTitle: 'TypeScript avancé : types génériques et patterns de conception',          users: ['julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'marie.dupont@imknow.com'] },
  { articleTitle: 'Architecture microservices : retour d\'expérience après 2 ans',           users: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com', 'emma.moreau@imknow.com'] },
  { articleTitle: 'Sécurité des API REST : guide complet 2024',                              users: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com', 'lea.dubois@imknow.com', 'alexandre.petit@imknow.com'] },
  { articleTitle: 'PostgreSQL : optimisation avancée des requêtes',                          users: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'alexandre.petit@imknow.com'] },
  { articleTitle: 'RGPD en 2024 : guide pratique pour les équipes techniques',               users: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com'] },
  { articleTitle: 'Intelligence Artificielle en entreprise : par où commencer ?',            users: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com'] },
  { articleTitle: 'Docker et Kubernetes : déployer ses applications en production',           users: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com'] },
  { articleTitle: 'Onboarding réussi : le guide complet pour les équipes RH',                users: ['julien.leroy@imknow.com', 'camille.rousseau@imknow.com', 'emma.moreau@imknow.com', 'lea.dubois@imknow.com'] },
  { articleTitle: 'Construire un Design System scalable : guide pratique',                   users: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'emma.moreau@imknow.com'] },
  { articleTitle: 'Performance JavaScript : les optimisations qui font vraiment la différence', users: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'sophie.laurent@imknow.com'] },
  { articleTitle: 'Recruter les meilleurs talents tech : stratégies pour 2024',              users: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'lea.dubois@imknow.com'] },
];

// ─── Conversations de chat (v4 — nouvelles + extended) ───────────────────────

const CONVERSATIONS = [
  {
    pair: ['marie.dupont@imknow.com', 'julien.leroy@imknow.com'],
    messages: [
      { from: 'marie.dupont@imknow.com',  text: 'Julien, merci pour le commentaire sur le modèle des 4C + ton idée du 5ème C. Tu as des études ou des sources que je pourrais citer dans notre prochain rapport RH ?' },
      { from: 'julien.leroy@imknow.com',  text: 'Avec plaisir Marie ! L\'idée vient de Google "Project Aristotle" sur les équipes performantes. Ils ont identifié que la contribution visible rapide est clé pour l\'engagement des nouveaux.' },
      { from: 'marie.dupont@imknow.com',  text: 'Parfait ! Je vais le référencer. Tu penses qu\'on pourrait co-écrire un article sur les bonnes pratiques d\'intégration des développeurs spécifiquement ?' },
      { from: 'julien.leroy@imknow.com',  text: 'Excellente idée ! Un croisement RH + Tech manque vraiment sur la plateforme. Je peux apporter la perspective dev, tu apportes la méthode RH. On vise quand ?' },
      { from: 'marie.dupont@imknow.com',  text: 'Je suis dispo la semaine prochaine pour un premier cadrage. 1h max pour définir le plan.' },
      { from: 'julien.leroy@imknow.com',  text: 'Noté, je bloque mardi matin. On part sur quoi comme angle ? "Les 30 premiers jours d\'un développeur" ?' },
      { from: 'marie.dupont@imknow.com',  text: 'J\'aimais bien "Intégration tech : ce que RH et développeurs doivent savoir l\'un de l\'autre". Plus collaboratif comme titre.' },
      { from: 'julien.leroy@imknow.com',  text: 'J\'adore ! On brise les silos dans l\'article même. C\'est exactement l\'esprit ImKnow. Mardi 9h ?' },
      { from: 'marie.dupont@imknow.com',  text: 'Parfait pour moi. Je prépare un brief avec les points qu\'on veut couvrir. À mardi !' },
    ],
  },
  {
    pair: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com'],
    messages: [
      { from: 'emma.moreau@imknow.com',  text: 'Thomas ! On utilise Claude pour générer nos newsletters internes depuis 2 semaines. 4h économisées par semaine, qualité vraiment bonne. Tu peux me conseiller des prompts pour améliorer encore ?' },
      { from: 'thomas.martin@imknow.com', text: 'Super Emma ! Pour les newsletters, la clé c\'est le contexte dans le system prompt : ton de voix, audience cible, longueur souhaitée. Et utiliser le prompt caching pour le system prompt fixe — ça réduit les coûts de moitié.' },
      { from: 'emma.moreau@imknow.com',  text: 'Le prompt caching c\'est quoi exactement ? Je pensais que c\'était juste dans l\'API avancée.' },
      { from: 'thomas.martin@imknow.com', text: 'Anthropic l\'a rendu accessible dans l\'API standard ! Tu marques certains blocs avec `cache_control: { type: "ephemeral" }` et le premier call est normal, les suivants coûtent 10x moins.' },
      { from: 'emma.moreau@imknow.com',  text: 'Incroyable, je ne savais pas ! Et pour l\'analyse des articles ImKnow, tu as un workflow automatisé pour extraire les insights clés ?' },
      { from: 'thomas.martin@imknow.com', text: 'Oui, on a un job hebdomadaire qui récupère les articles les plus lus, les envoie à Claude avec un prompt d\'analyse, et génère un résumé des tendances. Je peux te partager le code si tu veux.' },
      { from: 'emma.moreau@imknow.com',  text: 'Ce serait génial ! Et tu penses que je pourrais l\'adapter pour analyser les retours de nos clients sur nos campagnes ?' },
      { from: 'thomas.martin@imknow.com', text: 'Absolument. Claude est très bon pour l\'analyse de sentiment et l\'extraction de thèmes. Je t\'envoie le code cette semaine avec des commentaires pour l\'adapter.' },
      { from: 'emma.moreau@imknow.com',  text: 'Merci Thomas, tu me sauves ! Je vais en faire un article sur ImKnow une fois qu\'on aura des résultats.' },
      { from: 'thomas.martin@imknow.com', text: 'Parfait ! Et tu mettras mon nom en co-auteur ? 😄 Je plaisante — mais sérieusement, les articles concrets avec des cas d\'usage réels sont les plus utiles sur la plateforme.' },
    ],
  },
  {
    pair: ['lea.dubois@imknow.com', 'lucas.bernard@imknow.com'],
    messages: [
      { from: 'lucas.bernard@imknow.com', text: 'Léa, j\'ai une question urgente. On veut déployer une fonctionnalité de recommandations IA mais ça implique de traiter les préférences de lecture des utilisateurs. On est RGPD compliant ?' },
      { from: 'lea.dubois@imknow.com',    text: 'Bonne question Lucas ! Les données de comportement de lecture sont des données personnelles. La base légale dépend de votre cas : consentement si c\'est optionnel, intérêt légitime si c\'est core à votre service.' },
      { from: 'lucas.bernard@imknow.com', text: 'On pense le proposer opt-in. Qu\'est-ce qu\'on doit documenter exactement ?' },
      { from: 'lea.dubois@imknow.com',    text: 'Trois choses : 1) mise à jour du registre des traitements, 2) mention dans la politique de confidentialité (finalité, durée de conservation, tiers impliqués), 3) mécanisme de retrait du consentement accessible.' },
      { from: 'lucas.bernard@imknow.com', text: 'Pour la durée de conservation des préférences, on peut garder ça aussi longtemps que le compte est actif ?' },
      { from: 'lea.dubois@imknow.com',    text: 'Oui, avec suppression à la clôture du compte. Et prévoir un export dans le cadre du droit à la portabilité. Le tout doit être dans votre politique de confidentialité.' },
      { from: 'lucas.bernard@imknow.com', text: 'On a un DPO ? J\'ai l\'impression qu\'on n\'en a pas officiellement nommé.' },
      { from: 'lea.dubois@imknow.com',    text: 'Pas encore de DPO nommé formellement. Je joue ce rôle officieusement mais on devrait régulariser ça. Je vais soulever le point en CODIR. En attendant, je te prépare un template de mise à jour de registre.' },
      { from: 'lucas.bernard@imknow.com', text: 'Merci Léa, tu es indispensable ! Je commence le dev avec un flag feature et on validera la conformité avant le roll-out.' },
      { from: 'lea.dubois@imknow.com',    text: 'Parfait comme approche. Tiens-moi informée quand c\'est prêt pour validation finale.' },
    ],
  },
  {
    pair: ['camille.rousseau@imknow.com', 'alexandre.petit@imknow.com'],
    messages: [
      { from: 'camille.rousseau@imknow.com', text: 'Alexandre, on doit préparer le budget tech pour l\'année prochaine. Tu peux m\'estimer les coûts infrastructure pour scaler ImKnow à 3x les utilisateurs actuels ?' },
      { from: 'alexandre.petit@imknow.com',  text: 'Bonjour Camille ! Je travaille dessus avec Lucas. Nos premières estimations : AWS +40% (mise à l\'échelle auto K8s), APIs IA +150% (plus de contenu généré), monitoring +20%. Au total environ +60% du budget actuel.' },
      { from: 'camille.rousseau@imknow.com', text: '60% c\'est significatif. Est-ce qu\'il y a des optimisations possibles pour réduire ça ?' },
      { from: 'alexandre.petit@imknow.com',  text: 'Oui plusieurs : reserved instances AWS (-30% vs on-demand), cache Redis pour réduire les calls DB (-15% RDS), Cloudflare pour le CDN (images servies depuis le edge, -25% bande passante). Ça nous amènerait à +35-40% net.' },
      { from: 'camille.rousseau@imknow.com', text: 'Ces optimisations, c\'est réaliste de les implémenter en combien de temps ?' },
      { from: 'alexandre.petit@imknow.com',  text: 'Le Cloudflare c\'est 1 semaine. Le Redis cache 2-3 semaines. Les reserved instances c\'est un achat annuel donc à faire maintenant pour profiter des prix. Je prépare un plan détaillé ?' },
      { from: 'camille.rousseau@imknow.com', text: 'Oui, avec les ROI de chaque optimisation. Le board veut voir la rentabilité des investissements tech.' },
      { from: 'alexandre.petit@imknow.com',  text: 'Je vous prépare un document avec : coût initial, économie mensuelle, ROI à 12 mois, et risque de chaque option. Pour la semaine prochaine ?' },
      { from: 'camille.rousseau@imknow.com', text: 'Parfait ! Le board se réunit vendredi prochain, j\'ai besoin de ça pour jeudi midi au plus tard.' },
      { from: 'alexandre.petit@imknow.com',  text: 'Noté, je priorise ça. Je te tiens au courant si j\'ai des questions sur les hypothèses financières.' },
    ],
  },
  {
    pair: ['sophie.laurent@imknow.com', 'marie.dupont@imknow.com'],
    messages: [
      { from: 'sophie.laurent@imknow.com', text: 'Marie, je travaille sur les maquettes du nouveau profil utilisateur. Pour la section "compétences" des employés, vous avez une taxonomie officielle RH ou on peut créer des tags libres ?' },
      { from: 'marie.dupont@imknow.com',   text: 'Bonne question ! On n\'a pas de taxonomie officielle actuellement. On utilise les intitulés de poste et les départements. Tu penses à quoi comme système de compétences ?' },
      { from: 'sophie.laurent@imknow.com', text: 'Je pensais à un système hybride : tags prédéfinis par département (TypeScript, React pour Développement) + tags libres pour les compétences transverses (Management, Formation, RGPD...). Validé par le manager.' },
      { from: 'marie.dupont@imknow.com',   text: 'J\'aime beaucoup l\'idée ! La validation par le manager est clé pour éviter les auto-déclarations de compétences non vérifiées. On pourrait aussi avoir des niveaux : débutant / intermédiaire / expert.' },
      { from: 'sophie.laurent@imknow.com', text: 'Exactement ! Et pour l\'affichage sur le profil public, on ne montrerait que les compétences validées. Ça crédibilise vraiment les profils.' },
      { from: 'marie.dupont@imknow.com',   text: 'Pour le RH, ça nous donnerait aussi une cartographie des compétences de l\'entreprise en temps réel — super utile pour les plans de formation et la mobilité interne.' },
      { from: 'sophie.laurent@imknow.com', text: 'Parfaitement aligné avec ce qu\'on peut faire côté produit. Je vais prototyper ça dans Figma cette semaine. Tu peux me faire valider par quelques managers pour le concept ?' },
      { from: 'marie.dupont@imknow.com',   text: 'Je vous organise un test utilisateur rapide avec 3 managers jeudi ? 30 minutes chacun, on teste les maquettes.' },
      { from: 'sophie.laurent@imknow.com', text: 'Idéal ! Je prépare un prototype cliquable Figma d\'ici mercredi soir. Je vous envoie le lien.' },
      { from: 'marie.dupont@imknow.com',   text: 'Super ! Et si ça passe le test, on le propose en priorité pour le prochain sprint ?' },
      { from: 'sophie.laurent@imknow.com', text: 'Absolument. Je suis très enthousiaste sur ce projet — c\'est exactement le genre de feature qui différencie ImKnow des plateformes génériques.' },
    ],
  },
  {
    pair: ['julien.leroy@imknow.com', 'emma.moreau@imknow.com'],
    messages: [
      { from: 'emma.moreau@imknow.com',  text: 'Julien, je dois pitcher ImKnow à notre nouveau DG la semaine prochaine. Tu peux m\'aider à traduire les bénéfices techniques en valeur business ?' },
      { from: 'julien.leroy@imknow.com', text: 'Avec plaisir Emma ! Les DG sont sensibles au ROI et à la réduction de risque. Pour ImKnow : temps de recherche d\'info -40%, onboarding des nouveaux -3 semaines, duplication de travail identifiable.' },
      { from: 'emma.moreau@imknow.com',  text: 'Tu as des chiffres mesurés ou ce sont des estimations ?' },
      { from: 'julien.leroy@imknow.com', text: 'Estimations basées sur des études sectorielles (McKinsey 2023 sur les knowledge workers). Mais on peut mesurer nos propres KPIs si on définit un baseline avant et après l\'adoption.' },
      { from: 'emma.moreau@imknow.com',  text: 'Bonne idée ! On pourrait faire une enquête auprès des employés avant le pitch pour avoir nos propres données.' },
      { from: 'julien.leroy@imknow.com', text: '3 questions max : temps moyen par semaine à chercher de l\'information, % de fois où ils ne trouvent pas ce qu\'ils cherchent, frustration liée à la connaissance non documentée (1-10).' },
      { from: 'emma.moreau@imknow.com',  text: 'Je lance ça demain sur Teams. On aura les résultats avant vendredi. Pour le pitch lui-même, tu aurais une démo live ou des screenshots ?' },
      { from: 'julien.leroy@imknow.com', text: 'Je te prépare un compte demo avec des données réalistes. Une démo live est toujours plus convaincante qu\'un PowerPoint.' },
      { from: 'emma.moreau@imknow.com',  text: 'Parfait ! Et si le DG pose des questions techniques auxquelles je ne sais pas répondre, tu serais disponible pour rejoindre le call ?' },
      { from: 'julien.leroy@imknow.com', text: 'Bien sûr, bloque-moi sur le calendrier. Je préfère être là pour garantir des réponses précises sur l\'architecture et la sécurité.' },
    ],
  },
];

// ─── Blocages utilisateurs ────────────────────────────────────────────────────
// Scénarios réalistes basés sur les signalements et conflits identifiés

const USER_BLOCKS = [
  {
    blockerEmail: 'lea.dubois@imknow.com',
    blockedEmail: 'alexandre.petit@imknow.com',
    // Léa bloque Alexandre suite aux messages de spam répétés (signalé en v3)
  },
  {
    blockerEmail: 'camille.rousseau@imknow.com',
    blockedEmail: 'lucas.bernard@imknow.com',
    // Camille bloque Lucas après le signalement de harcèlement (Thomas→Lucas en v3)
  },
  {
    blockerEmail: 'thomas.martin@imknow.com',
    blockedEmail: 'alexandre.petit@imknow.com',
    // Thomas bloque Alexandre suite à un conflit dans les commentaires
  },
];

// ─── Script principal ──────────────────────────────────────────────────────────

async function main() {
  try {
    await axios.get(`${BASE}/api/articles`, { timeout: 3000, validateStatus: () => true });
    console.log(`✅ Backend accessible sur ${BASE}\n`);
  } catch {
    console.error(`❌ Backend inaccessible sur ${BASE}. Lancez le backend d'abord.`);
    process.exit(1);
  }

  const db = new Client(DB_CONFIG);
  await db.connect();

  const tokens     = {};
  const userIds    = {};
  const articleIds = {};

  try {
    // ── 1. Authentification ───────────────────────────────────────────────────
    console.log('🔑 Authentification des utilisateurs...');
    const { token: adminToken, id: adminId } = await ensureUser(db, {
      firstName: 'Admin', lastName: 'ImKnow', email: 'admin@imknow.com', password: 'Admin@1234', role: 'ADMIN',
    });
    tokens['admin@imknow.com'] = adminToken;
    userIds['admin@imknow.com'] = adminId;
    await db.query(`UPDATE users SET role = 'ADMIN' WHERE email = 'admin@imknow.com'`);

    for (const emp of EMPLOYEES) {
      const { token, id } = await ensureUser(db, emp);
      tokens[emp.email] = token;
      userIds[emp.email] = id;
      console.log(`   ✅ ${emp.firstName} ${emp.lastName} (id=${id})`);
    }

    // ── 2. Catégories & tags ──────────────────────────────────────────────────
    console.log('\n📂 Catégories et tags...');
    const catRows = await db.query('SELECT id, name FROM categories');
    const categoryIds = {};
    catRows.rows.forEach(r => { categoryIds[r.name] = r.id; });

    const tagRows = await db.query('SELECT id, name FROM tags');
    const tagIds = {};
    tagRows.rows.forEach(r => { tagIds[r.name] = r.id; });

    const existingArticles = await db.query('SELECT id, title FROM articles');
    existingArticles.rows.forEach(r => { articleIds[r.title] = r.id; });
    console.log(`   ✅ ${Object.keys(categoryIds).length} catégories, ${Object.keys(tagIds).length} tags, ${Object.keys(articleIds).length} articles existants`);

    // ── 3. Articles principaux (idempotents) ──────────────────────────────────
    console.log('\n📄 Articles principaux...');
    for (const article of ARTICLES_MAIN) {
      if (articleIds[article.title]) {
        console.log(`   ⏭️  "${article.title.substring(0, 60)}" existe déjà`);
        continue;
      }
      const token = tokens[article.authorEmail];
      const catId = categoryIds[article.categoryName];
      const tIds  = (article.tagNames || []).map(n => tagIds[n]).filter(Boolean);
      const res = await api(token).post('/api/articles', {
        title: article.title, content: article.content, status: article.status, categoryId: catId, tagIds: tIds,
      });
      if (res.status >= 400) { console.log(`   ❌ "${article.title.substring(0,40)}" : ${JSON.stringify(res.data).substring(0,100)}`); continue; }
      articleIds[article.title] = res.data.id;
      if (article.viewsCount > 0) await db.query('UPDATE articles SET "viewsCount" = $1 WHERE id = $2', [article.viewsCount, res.data.id]);
      console.log(`   ✅ [${article.status.toUpperCase()}] "${article.title.substring(0, 60)}" (id=${res.data.id})`);
    }

    // ── 4. Follows ────────────────────────────────────────────────────────────
    console.log('\n👤 Follows...');
    let followCount = 0;
    for (const [followerEmail, followingEmail] of FOLLOWS) {
      const followerToken = tokens[followerEmail];
      const followingId   = userIds[followingEmail];
      if (!followerToken || !followingId) continue;
      const res = await api(followerToken).post(`/api/follow/${followingId}`);
      if (res.status < 400 && res.data?.isFollowing) followCount++;
    }
    console.log(`   ✅ ${followCount} follows actifs`);

    // ── 5. Likes d'articles ───────────────────────────────────────────────────
    console.log('\n❤️  Likes articles...');
    let likeCount = 0;
    for (const { articleTitle, likers } of ARTICLE_LIKES) {
      const articleId = articleIds[articleTitle];
      if (!articleId) continue;
      for (const email of likers) {
        const token = tokens[email];
        if (!token) continue;
        const res = await api(token).post(`/api/articles/${articleId}/like`);
        if (res.status < 400 && res.data?.article?.isLiked) likeCount++;
      }
    }
    console.log(`   ✅ ${likeCount} likes actifs`);

    // ── 6. Bookmarks ──────────────────────────────────────────────────────────
    console.log('\n🔖 Bookmarks...');
    let bookmarkCount = 0;
    for (const { articleTitle, users } of BOOKMARKS) {
      const articleId = articleIds[articleTitle];
      if (!articleId) continue;
      for (const email of users) {
        const token = tokens[email];
        if (!token) continue;
        const res = await api(token).post(`/api/articles/${articleId}/bookmark`);
        if (res.status < 400 && res.data?.article?.isBookmarked) bookmarkCount++;
      }
    }
    console.log(`   ✅ ${bookmarkCount} bookmarks actifs`);

    // ── 7. Commentaires threadés avec réponses, mentions et likes ─────────────
    console.log('\n💬 Commentaires, réponses, mentions et likes...');
    let commentCount = 0;
    let replyCount   = 0;
    let commentLikeCount = 0;
    let mentionCount = 0;

    for (const group of COMMENT_THREADS) {
      const articleId = articleIds[group.articleTitle];
      if (!articleId) {
        console.log(`   ⚠️  Article introuvable : "${group.articleTitle.substring(0, 50)}"`);
        continue;
      }

      for (const thread of group.threads) {
        const authorId  = userIds[thread.authorEmail];
        const authorToken = tokens[thread.authorEmail];
        if (!authorId || !authorToken) continue;

        // Mentions résolues en IDs
        const mentionedIds = (thread.mentions || []).map(e => userIds[e]).filter(Boolean);
        if (mentionedIds.length > 0) mentionCount += mentionedIds.length;

        // Créer le commentaire principal (dédupliqué)
        const result = await getOrCreateComment(db, api(authorToken), {
          articleId, content: thread.content, parentId: null,
          mentionedUserIds: mentionedIds, authorId,
        });
        if (!result) continue;
        if (result.created) commentCount++;

        // Likes sur le commentaire principal (seulement si fraîchement créé)
        if (result.created) {
          for (const likerEmail of (thread.likers || [])) {
            const likerToken = tokens[likerEmail];
            if (!likerToken || likerEmail === thread.authorEmail) continue;
            const likeRes = await api(likerToken).post(`/api/comments/${result.id}/like`);
            if (likeRes.status < 400) commentLikeCount++;
          }
        }

        // Réponses
        for (const reply of (thread.replies || [])) {
          const replyAuthorId    = userIds[reply.authorEmail];
          const replyAuthorToken = tokens[reply.authorEmail];
          if (!replyAuthorId || !replyAuthorToken) continue;

          const replyMentionedIds = (reply.mentions || []).map(e => userIds[e]).filter(Boolean);
          if (replyMentionedIds.length > 0) mentionCount += replyMentionedIds.length;

          const replyResult = await getOrCreateComment(db, api(replyAuthorToken), {
            articleId, content: reply.content, parentId: result.id,
            mentionedUserIds: replyMentionedIds, authorId: replyAuthorId,
          });
          if (!replyResult) continue;
          if (replyResult.created) replyCount++;

          // Likes sur la réponse
          if (replyResult.created) {
            for (const likerEmail of (reply.likers || [])) {
              const likerToken = tokens[likerEmail];
              if (!likerToken || likerEmail === reply.authorEmail) continue;
              const likeRes = await api(likerToken).post(`/api/comments/${replyResult.id}/like`);
              if (likeRes.status < 400) commentLikeCount++;
            }
          }
        }
      }
    }

    console.log(`   ✅ ${commentCount} commentaires principaux créés`);
    console.log(`   ✅ ${replyCount} réponses créées`);
    console.log(`   ✅ ${commentLikeCount} likes de commentaires`);
    console.log(`   ✅ ${mentionCount} mentions`);

    // ── 8. Messages de chat ───────────────────────────────────────────────────
    console.log('\n💌 Messages de chat...');
    let msgCount = 0;

    for (const conv of CONVERSATIONS) {
      const [email1, email2] = conv.pair;
      const id1 = userIds[email1];
      const id2 = userIds[email2];
      if (!id1 || !id2) continue;

      const convId = [id1, id2].sort((a, b) => a - b).join('-');
      const existingMsgs = await db.query('SELECT content FROM chat_messages WHERE "conversationId" = $1', [convId]);
      const existingTexts = new Set(existingMsgs.rows.map(r => r.content.substring(0, 60)));

      for (const msg of conv.messages) {
        const senderEmail   = msg.from;
        const receiverEmail = senderEmail === email1 ? email2 : email1;
        const senderToken   = tokens[senderEmail];
        const receiverId    = userIds[receiverEmail];
        if (!senderToken || !receiverId) continue;

        const textKey = msg.text.substring(0, 60);
        if (existingTexts.has(textKey)) continue;

        const res = await api(senderToken).post(`/api/chat/messages/${receiverId}`, {
          content: msg.text, type: 'text',
        });
        if (res.status < 400) { msgCount++; existingTexts.add(textKey); }
      }
    }
    console.log(`   ✅ ${msgCount} messages créés`);

    // ── 9. Blocages utilisateurs ──────────────────────────────────────────────
    console.log('\n🚫 Blocages utilisateurs...');
    let blockCount = 0;

    for (const { blockerEmail, blockedEmail } of USER_BLOCKS) {
      const blockerToken = tokens[blockerEmail];
      const blockedId    = userIds[blockedEmail];
      if (!blockerToken || !blockedId) continue;

      const res = await api(blockerToken).post(`/api/chat/block/${blockedId}`);
      if (res.status < 400) {
        blockCount++;
        console.log(`   ✅ ${blockerEmail} a bloqué ${blockedEmail}`);
      } else {
        console.log(`   ⚠️  Blocage ${blockerEmail}→${blockedEmail} (${res.status}): ${JSON.stringify(res.data).substring(0, 60)}`);
      }
    }
    console.log(`   ✅ ${blockCount} blocages actifs`);

    // ── Résumé ────────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(65));
    console.log('🎉 Seed v4 terminé avec succès !');
    console.log('═'.repeat(65));

    const counts = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM articles WHERE status = \'published\''),
      db.query('SELECT COUNT(*) FROM articles WHERE status = \'rejected\''),
      db.query('SELECT COUNT(*) FROM comments WHERE "deletedAt" IS NULL'),
      db.query('SELECT COUNT(*) FROM comments WHERE "parentId" IS NOT NULL AND "deletedAt" IS NULL'),
      db.query('SELECT COUNT(*) FROM comment_likes'),
      db.query('SELECT COUNT(*) FROM comment_mentions'),
      db.query('SELECT COUNT(*) FROM follows'),
      db.query('SELECT COUNT(*) FROM article_likes'),
      db.query('SELECT COUNT(*) FROM article_bookmarks'),
      db.query('SELECT COUNT(*) FROM article_reports'),
      db.query('SELECT COUNT(*) FROM user_reports'),
      db.query('SELECT COUNT(*) FROM chat_messages'),
      db.query('SELECT COUNT(*) FROM user_blocks'),
    ]);

    const stats = [
      ['Utilisateurs',                  counts[0].rows[0].count],
      ['Articles publiés',              counts[1].rows[0].count],
      ['Articles rejetés',              counts[2].rows[0].count],
      ['Commentaires (total)',          counts[3].rows[0].count],
      ['  ↳ Réponses (parentId set)',  counts[4].rows[0].count],
      ['Likes commentaires',           counts[5].rows[0].count],
      ['Mentions dans commentaires',   counts[6].rows[0].count],
      ['Follows',                      counts[7].rows[0].count],
      ['Likes articles',               counts[8].rows[0].count],
      ['Bookmarks',                    counts[9].rows[0].count],
      ['Signalements articles',        counts[10].rows[0].count],
      ['Signalements utilisateurs',    counts[11].rows[0].count],
      ['Messages chat',                counts[12].rows[0].count],
      ['Blocages utilisateurs',        counts[13].rows[0].count],
    ];

    console.log('\n📊 État de la base de données :');
    stats.forEach(([label, count]) => console.log(`   ${label.padEnd(30)} : ${count}`));

    console.log('\n🔑 Comptes :');
    console.log('   admin@imknow.com     / Admin@1234');
    console.log('   [prenom.nom]@imknow.com / Employee@1234');

  } catch (err) {
    console.error('\n❌ Erreur fatale :', err.message);
    if (err.response) console.error('   Response:', JSON.stringify(err.response.data).substring(0, 200));
    console.error(err.stack);
    process.exit(1);
  } finally {
    await db.end();
    console.log('\n✅ Connexion DB fermée');
  }
}

main();
