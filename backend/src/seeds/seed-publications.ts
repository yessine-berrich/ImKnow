import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Category } from '../category/entities/category.entity';
import { Tag } from '../tag/entities/tag.entity';
import { Publication } from '../publication/entities/publication.entity';
import { PublicationVersion } from '../publication/entities/publication-version.entity';
import { PublicationStatus } from 'utils/constants';
import { PublicationService } from '../publication/publication.service';
import { PublicationChunkService } from '../publication/publication-chunk.service';
import { SearchService } from '../search/search.service';
import { seedUsers } from './seed-users';
import { seedCategories } from './seed-categories';
import { seedTags } from './seed-tags';

const logger = new Logger('Seed:Publications');

interface ArticleData {
  authorEmail: string;
  categoryName: string;
  title: string;
  content: string;
  tagNames: string[];
  status: string;
  useFullService?: boolean;
  keepAsDraft?: boolean;
}

const ARTICLES: ArticleData[] = [
  // ── PUBLIÉS (originels) ──────────────────────────────────────────────
  { authorEmail: 'thomas.martin@imknow.com',    categoryName: 'Développement', title: 'Guide complet React 18 : nouveautés et bonnes pratiques',                tagNames: ['#React', '#Frontend', '#Best Practices'],    status: 'published', content: `React 18 a introduit des changements majeurs.\n\n## Concurrent Mode\n\nLe mode concurrent permet à React de préparer plusieurs versions du UI.\n\n## useTransition\n\`\`\`jsx\nconst [isPending, startTransition] = useTransition();\nstartTransition(() => setSearchQuery(input));\n\`\`\`\n\n## Automatic Batching\n\nToutes les mises à jour d'état sont regroupées automatiquement en React 18.` },
  { authorEmail: 'alexandre.petit@imknow.com',  categoryName: 'Développement', title: 'TypeScript avancé : types génériques et patterns de conception',          tagNames: ['#TypeScript', '#Best Practices', '#Frontend'], status: 'published', content: `TypeScript offre un système de types puissant.\n\n## Conditional Types\n\`\`\`typescript\ntype Flatten<T> = T extends Array<infer Item> ? Item : T;\n\`\`\`\n\n## Mapped Types\n\`\`\`typescript\ntype Readonly<T> = { readonly [P in keyof T]: T[P] };\n\`\`\`\n\n## Type Guards\n\`\`\`typescript\nfunction isUser(v: unknown): v is User { return typeof v === 'object' && v !== null && 'email' in v; }\n\`\`\`` },
  { authorEmail: 'julien.leroy@imknow.com',     categoryName: 'Développement', title: 'Architecture microservices : retour d\'expérience après 2 ans',           tagNames: ['#Architecture', '#Backend', '#Best Practices'], status: 'published', content: `Deux ans de migration microservices : les leçons.\n\n## Découpage par domaine\n- Service Utilisateurs\n- Service Contenu\n- Service Notification\n\n## Communication asynchrone\nRabbitMQ pour réduire le couplage.\n\n## Difficultés\n### Transactions distribuées\nSolution : Saga pattern.\n\n## Recommandations\n1. Monolithe modulaire d'abord\n2. Observabilité dès le début\n3. Contrats OpenAPI clairs` },
  { authorEmail: 'lucas.bernard@imknow.com',    categoryName: 'Développement', title: 'Sécurité des API REST : guide complet 2024',                              tagNames: ['#Security', '#Backend', '#Best Practices'],  status: 'published', content: `La sécurité des API est souvent négligée.\n\n## JWT\n\`\`\`typescript\nconst token = jwt.sign({ userId }, SECRET, { expiresIn: '1h' });\n\`\`\`\n\n## Rate Limiting\n\`\`\`typescript\napp.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));\n\`\`\`\n\n## CORS\n\`\`\`typescript\napp.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));\n\`\`\`\n\nToujours utiliser des requêtes paramétrées contre l'injection SQL.` },
  { authorEmail: 'lucas.bernard@imknow.com',    categoryName: 'Développement', title: 'PostgreSQL : optimisation avancée des requêtes',                          tagNames: ['#Database', '#Performance', '#Backend'],      status: 'published', content: `## EXPLAIN ANALYZE\n\`\`\`sql\nEXPLAIN (ANALYZE, BUFFERS) SELECT a.title FROM articles a WHERE a.status = 'published';\n\`\`\`\n\n## Index partiels\n\`\`\`sql\nCREATE INDEX idx_published ON articles (created_at DESC) WHERE status = 'published';\n\`\`\`\n\n## Maintenance\n\`\`\`sql\nVACUUM ANALYZE articles;\nSELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;\n\`\`\`` },
  { authorEmail: 'thomas.martin@imknow.com',    categoryName: 'Développement', title: 'Performance JavaScript : les optimisations qui font vraiment la différence', tagNames: ['#Performance', '#Frontend'],                 status: 'published', content: `## Code Splitting\n\`\`\`jsx\nconst Heavy = React.lazy(() => import('./Heavy'));\n\`\`\`\n\n## useMemo\n\`\`\`jsx\nconst sorted = useMemo(() => items.sort((a,b) => b.views - a.views), [items]);\n\`\`\`\n\n## react-window\n\`\`\`jsx\nimport { FixedSizeList } from 'react-window';\n<FixedSizeList height={600} itemCount={1000} itemSize={80}>{Row}</FixedSizeList>\n\`\`\`` },
  { authorEmail: 'lea.dubois@imknow.com',       categoryName: 'Juridique',     title: 'RGPD en 2024 : guide pratique pour les équipes techniques',                tagNames: ['#Security', '#Guide'],                        status: 'published', content: `## Licéité du traitement\n- Consentement explicite\n- Exécution d'un contrat\n- Intérêt légitime\n\n## Privacy by Design\n\`\`\`typescript\ninterface UserLog { userId: string; action: string; hashedIp?: string; }\n\`\`\`\n\n## Chiffrement\n- Au repos : AES-256\n- En transit : TLS 1.3\n\n## Sanctions\n- 2% du CA ou 10M€\n- 4% du CA ou 20M€ pour les infractions graves` },
  { authorEmail: 'julien.leroy@imknow.com',     categoryName: 'Développement', title: 'Intelligence Artificielle en entreprise : par où commencer ?',             tagNames: ['#Architecture', '#Backend', '#Nouveau'],      status: 'published', content: `## Niveaux de maturité IA\n- Niveau 1 : ChatGPT ponctuel\n- Niveau 2 : APIs IA dans vos produits\n- Niveau 3 : pipelines ML en prod\n\n## Intégration Anthropic\n\`\`\`typescript\nimport Anthropic from '@anthropic-ai/sdk';\nconst client = new Anthropic();\nconst msg = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: 'Résume :' }] });\n\`\`\`\n\n## RAG : vos données internes\n1. Vectoriser (pgvector)\n2. Recherche sémantique\n3. Contexte au LLM` },
  { authorEmail: 'lucas.bernard@imknow.com',    categoryName: 'Développement', title: 'Docker et Kubernetes : déployer ses applications en production',            tagNames: ['#DevOps', '#Best Practices'],                  status: 'published', content: `## Multi-stage Dockerfile\n\`\`\`dockerfile\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nFROM node:20-alpine\nCOPY --from=builder /app/dist ./dist\nCMD ["node","dist/main.js"]\n\`\`\`\n\n## Deployment K8s\n\`\`\`yaml\nreadinessProbe:\n  httpGet: { path: /health, port: 3000 }\n  initialDelaySeconds: 30\n\`\`\`` },
  { authorEmail: 'marie.dupont@imknow.com',     categoryName: 'RH',            title: 'Onboarding réussi : le guide complet pour les équipes RH',                 tagNames: ['#Guide', '#Important'],                       status: 'published', content: `## Le modèle des 4C\n1. **Conformité** — règles et processus\n2. **Clarification** — rôles et attentes\n3. **Culture** — valeurs d'entreprise\n4. **Connexion** — relations professionnelles\n\n## Le buddy system\nAttribuer un mentor réduit le temps d'adaptation de 50%.\n\n## Checklist J1\n- Poste de travail configuré\n- Accès aux outils\n- Déjeuner avec l'équipe` },
  { authorEmail: 'sophie.laurent@imknow.com',   categoryName: 'Design',        title: 'Construire un Design System scalable : guide pratique',                    tagNames: ['#UI/UX', '#Design', '#Tutoriel'],              status: 'published', content: `## Pourquoi un Design System ?\nUn Design System unique source of truth réduit le temps de développement de 40%.\n\n## Tokens de design\n\`\`\`css\n:root { --color-primary: #00926B; --spacing-md: 16px; --radius-lg: 12px; }\n\`\`\`\n\n## Composants atomiques\nBoutons → Inputs → Cards → Modals\n\n## Documentation Storybook\n\`\`\`jsx\nexport const Primary = { args: { label: 'Enregistrer', variant: 'primary' } };\n\`\`\`` },
  { authorEmail: 'marie.dupont@imknow.com',     categoryName: 'RH',            title: 'Recruter les meilleurs talents tech : stratégies pour 2024',               tagNames: ['#Guide', '#Important'],                       status: 'published', content: `## Ce que les devs recherchent\n1. Projets techniques intéressants\n2. Stack moderne\n3. Autonomie\n4. Salaire compétitif\n5. Télétravail\n\n## Le processus qui marche\n- Take-home project payé (3h max)\n- Entretien conversationnel\n- Rencontre avec l'équipe\n\n## Ce qui fait fuir\n- Tests de 8h non rémunérés\n- 6 rounds d'entretiens` },
  { authorEmail: 'emma.moreau@imknow.com',      categoryName: 'Marketing',     title: 'Stratégie content marketing B2B : guide complet 2024',                    tagNames: ['#Guide', '#Nouveau'],                         status: 'published', content: `## Pourquoi le content marketing B2B ?\nLe contenu de qualité génère 3x plus de leads que la pub payante à coût égal.\n\n## Le funnel de contenu\n- TOFU : articles de blog, guides\n- MOFU : cas clients, webinaires\n- BOFU : démos, comparatifs\n\n## Mesurer l'impact\n- Taux d'engagement\n- Leads générés\n- Pipeline influencé` },

  // ── NOUVEAUX PUBLIÉS ──────────────────────────────────────────────────
  { authorEmail: 'nicolas.mercier@imknow.com', categoryName: 'Développement', title: 'Clean Architecture : appliquer les principes de Bob Martin en NestJS', tagNames: ['#Architecture', '#Backend', '#CleanCode'], status: 'published', content: `## Les 4 couches de la Clean Architecture\n\n### Domaine (Entities)\nRègles métier pures, aucune dépendance externe.\n\n### Use Cases\nCas d'utilisation spécifiques à l'application.\n\n### Interface Adapters\nControllers, presenters, gateways.\n\n### Infrastructure\nDB, API, frameworks.\n\n## En NestJS\n\`\`\`typescript\n@Module({\n  providers: [\n    { provide: IUserRepository, useClass: UserRepository },\n    CreateUserUseCase,\n  ],\n})\nexport class UsersModule {}\n\`\`\`\n\nLe dependency inversion est natif avec le système de modules NestJS.` },
  { authorEmail: 'alexandre.petit@imknow.com', categoryName: 'Développement', title: 'GraphQL vs REST : comment choisir pour votre prochain projet', tagNames: ['#API', '#Backend', '#Architecture'], status: 'published', content: `## Quand choisir REST\n- API simples (CRUD)\n- Cache HTTP (GET)\n- Équipe débutante\n- Microservices\n\n## Quand choisir GraphQL\n- Dashboards complexes\n- Apps mobiles (bande passante)\n- APIs agrégatrices\n- Équipe maîtrisant le schema\n\n## Notre choix chez ImKnow\nREST pour les APIs publiques, GraphQL pour le frontend interne.\n\n\`\`\`graphql\ntype Query {\n  publication(id: ID!): Publication\n  search(query: String!): [Publication!]!\n}\n\`\`\`` },
  { authorEmail: 'clarisse.renaud@imknow.com', categoryName: 'Marketing', title: 'Tests A/B : méthodologie et pièges à éviter', tagNames: ['#Guide', '#Nouveau'], status: 'published', content: `## Les bases des tests A/B\n1. Définir une hypothèse claire\n2. Choisir une métrique primaire\n3. Calculer la taille d'échantillon\n4. Durée minimale : 7 jours\n\n## Pièges classiques\n- Arrêter trop tôt (peeking problem)\n- Trop de variations (multiple testing)\n- Segmenter après coup\n\n\`\`\`\n🚫 Mauvais : arrêter dès que p < 0.05\n✅ Bon : fixer une durée à l'avance\n\`\`\`` },
  { authorEmail: 'marie.dupont@imknow.com', categoryName: 'RH', title: 'Marque employeur : construire une image qui attire les talents', tagNames: ['#Guide', '#Important'], status: 'published', content: `## Les piliers de la marque employeur\n1. **Culture d'entreprise** — valeurs, mission, vision\n2. **Avantages** — télétravail, horaires flexibles, formation\n3. **Carrière** — perspectives d'évolution\n4. **RSE** — engagement social et environnemental\n\n## Canaux à activer\n- LinkedIn (contenu long)\n- Glassdoor (avis authentiques)\n- Blog technique (dev.to, Medium)\n- Meetups et conférences` },
  { authorEmail: 'thomas.martin@imknow.com', categoryName: 'Développement', title: 'Design Patterns en JavaScript : du classique au moderne', tagNames: ['#JavaScript', '#Frontend', '#Best Practices'], status: 'published', content: `## Patterns classiques\n\n### Singleton\n\`\`\`typescript\nclass Database {\n  private static instance: Database;\n  static getInstance() { return this.instance ??= new Database(); }\n}\n\`\`\`\n\n### Observer\n\`\`\`typescript\nclass EventBus {\n  private listeners = new Map<string, Function[]>();\n  on(event: string, fn: Function) { this.listeners.get(event)?.push(fn) ?? this.listeners.set(event, [fn]); }\n  emit(event: string, ...args: any[]) { this.listeners.get(event)?.forEach(fn => fn(...args)); }\n}\n\`\`\`\n\n## Patterns modernes\n- **Composition API** (Vue 3)\n- **Hooks** (React)\n- **Signals** (Solid, Qwik)` },
  { authorEmail: 'lucas.bernard@imknow.com', categoryName: 'Développement', title: 'Monitoring avec Prometheus et Grafana : guide pratique', tagNames: ['#DevOps', '#Performance', '#Monitoring'], status: 'published', content: `## Architecture\n\n\`\`\`\nApp → Prometheus (scrape) → Grafana (dashboards)\nApp → Loki (logs) → Grafana\nApp → Tempo (traces) → Grafana\n\`\`\`\n\n## Métriques clés pour NestJS\n- Request duration (histogram)\n- Error rate (counter)\n- Active requests (gauge)\n- DB query duration\n\n## Alertes\n\`\`\`yaml\ngroups:\n- name: api\n  rules:\n  - alert: HighErrorRate\n    expr: rate(http_requests_errors[5m]) > 0.05\n    for: 5m\n\`\`\`` },

  // ── Rejeté par modération IA (piracy/warez) ──────────────────────────
  { authorEmail: 'alexandre.petit@imknow.com', categoryName: 'Développement', title: 'Comment cracker Photoshop 2024 gratuitement — crack + keygen inclus', tagNames: ['#Tutoriel', '#Urgent'], status: 'published', useFullService: true, content: `Salut les devs ! Aujourd'hui je vous partage le crack ultime pour Photoshop 2024.\n\nGratuit et 100% fonctionnel. Plus besoin de payer Adobe !\n\n## Lien de téléchargement\n- Crack .exe (antivirus à désactiver)\n- Keygen pour générer des licenses illimitées\n- Torrent pour télécharger toute la suite Adobe\n\n\`\`\`bash\n# Instructions\n1. Désactiver l'antivirus Windows Defender\n2. Lancer le crack en mode administrateur\n3. Utiliser le keygen pour activer\n\necho "Patienter 30 secondes..."\n./crack_photoshop_2024.exe --force\n\`\`\`\n\n## Attention\nNe mettez surtout pas à jour Photoshop après l'installation du crack sinon l'activation saute !\n\nPartagez ce lien avant qu'il ne soit supprimé.` },

  // ── Rejeté par modération IA (spam/arnaque) ──────────────────────────
  { authorEmail: 'emma.moreau@imknow.com',    categoryName: 'Marketing',     title: 'URGENT : Gagnez 5000€ par mois sans rien faire — méthode secrète des traders', tagNames: ['#Important', '#Urgent'], status: 'published', useFullService: true, content: `🔥 MÉTHODE RÉVOLUTIONNAIRE 🔥\n\nJ'ai découvert une astuce incroyable qui va changer votre vie !\n\n## COMMENT GAGNER 5000€/MOIS SANS TRAVAILLER ?\n1. ✅ Inscrivez-vous via mon lien (lien en description)\n2. ✅ Investissez seulement 50€ pour débloquer le pack premium\n3. ✅ Activez le trading automatique IA\n4. ✅ Regardez l'argent tomber sur votre compte chaque jour\n\n⚠️ OFFRE LIMITÉE — PLUS QUE 12 PLACES ⚠️\n\n\`\`\`\n💰 TÉMOIGNAGES 💰\n"J'ai gagné 12000€ en une semaine !" - Jean D.\n"Je suis millionnaire grâce à cette méthode" - Marie P.\n"Meilleur investissement de ma vie" - Paul L.\n\`\`\`\n\n🔥🔥🔥 CLIQUEZ ICI MAINTENANT 🔥🔥🔥\n[LIEN SUPPRIME PAR L'ADMINISTRATEUR]\n\n⚠️ DÉPÊCHEZ-VOUS, CETTE PUBLICATION SERA BIENTÔT SUPPRIMÉE ⚠️` },

  // ── Rejeté par modération IA (hate speech) ───────────────────────────
  { authorEmail: 'camille.rousseau@imknow.com', categoryName: 'RH', title: 'Pourquoi les développeurs [nationalité] sont nuls — mon expérience', tagNames: ['#Important', '#Urgent'], status: 'published', useFullService: true, content: `Je vais être honnête après 10 ans dans le milieu.\n\nLes développeurs venant de [pays] sont tout simplement incompétents.\n\n## Les preuves\n- Ils ne comprennent pas les fondamentaux\n- Leur code est illisible\n- Ils trichent aux entretiens techniques\n- Zéro rigueur\n\n\`\`\`\nExemple typique de code pourri qu'ils écrivent :\nfunction a(b){return b+b}\n\`\`\`\n\n## Conclusion\nNe recrutez pas de [nationalité], préférez les locaux.\nC'est ma vérité après des années d'expérience.\n\n#FranceFirst #Recrutement #Vérité` },

  // ── Rejeté par modération IA (violence / menace) ─────────────────────
  { authorEmail: 'emma.moreau@imknow.com', categoryName: 'Marketing', title: 'À bas la nouvelle direction — ils vont le payer cher', tagNames: ['#Urgent'], status: 'published', useFullService: true, content: `J'en ai vraiment MARRE de cette direction à la con.\n\nIls nous imposent du présentiel 5j/semaine comme si on était des gamins.\n\n## Ma réponse\nJe vais pas me laisser faire. J'ai déjà préparé :\n\n- 🔪 Publication des mots de passe sur Twitter\n- 💣 Fuite de tous les documents internes\n- 🔫 Rendre publics les salaires et les emails persos du DG\n\n\`\`\`python\n# Script prêt à être lancé\nimport smtplib\nemails = ["client1@corp.com", "client2@corp.com", "presse@media.com"]\nfor e in emails:\n    send_leak(e, all_docs)\n\`\`\`\n\nIls vont comprendre ce que ça coûte de nous marcher dessus. Je lance tout ça vendredi. Préparez-vous.` },

  // ── Rejeté par modération IA (discrimination) ────────────────────────
  { authorEmail: 'julien.leroy@imknow.com', categoryName: 'RH', title: 'Pourquoi je ne recrute que des hommes dans mon équipe technique', tagNames: ['#Important'], status: 'published', useFullService: true, content: `C'est tabou mais je vais le dire franchement.\n\nJ'ai essayé de recruter des femmes développeuses et ça n'a pas marché.\n\n## Mon expérience\n- Moins compétentes techniquement\n- Pas faites pour les longues sessions de debug\n- Trop émotives sous pression\n- Quittent l'équipe au bout de 6 mois\n\n## Ma conclusion\nJe recrute exclusivement des hommes maintenant. Mon équipe n'a jamais été aussi performante.\n\nJe sais que je vais me faire descendre mais c'est la vérité du terrain.` },

  // ── Rejeté par détection de doublon (React) ──────────────────────────
  { authorEmail: 'alexandre.petit@imknow.com', categoryName: 'Développement', title: 'Les bases de React 18 : guide complet et bonnes pratiques', tagNames: ['#React', '#Frontend', '#Best Practices'], status: 'published', useFullService: true, content: `React 18 a introduit des changements majeurs.\n\n## Concurrent Mode\n\nLe mode concurrent permet à React de préparer plusieurs versions du UI.\n\n## useTransition\n\n\`\`\`jsx\nconst [isPending, startTransition] = useTransition();\nstartTransition(() => setSearchQuery(input));\n\`\`\`\n\n## Automatic Batching\n\nToutes les mises à jour d'état sont regroupées automatiquement en React 18.` },

  // ── Rejeté par détection de doublon (TypeScript) ────────────────────
  { authorEmail: 'julien.leroy@imknow.com', categoryName: 'Développement', title: 'TypeScript : types génériques et design patterns avancés', tagNames: ['#TypeScript', '#Best Practices', '#Frontend'], status: 'published', useFullService: true, content: `TypeScript offre un système de types puissant.\n\n## Conditional Types\n\`\`\`typescript\ntype Flatten<T> = T extends Array<infer Item> ? Item : T;\n\`\`\`\n\n## Mapped Types\n\`\`\`typescript\ntype Readonly<T> = { readonly [P in keyof T]: T[P] };\n\`\`\`\n\n## Type Guards\n\`\`\`typescript\nfunction isUser(v: unknown): v is User { return typeof v === 'object' && v !== null && 'email' in v; }\n\`\`\`` },

  // ── Rejeté par détection de doublon (Sécurité API) ──────────────────
  { authorEmail: 'lucas.bernard@imknow.com', categoryName: 'Développement', title: 'API REST sécurisées : les bonnes pratiques 2024', tagNames: ['#Security', '#Backend', '#Best Practices'], status: 'published', useFullService: true, content: `La sécurité des API est souvent négligée.\n\n## JWT\n\`\`\`typescript\nconst token = jwt.sign({ userId }, SECRET, { expiresIn: '1h' });\n\`\`\`\n\n## Rate Limiting\n\`\`\`typescript\napp.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));\n\`\`\`\n\n## CORS\n\`\`\`typescript\napp.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));\n\`\`\`\n\nToujours utiliser des requêtes paramétrées contre l'injection SQL.` },

  // ── Rejeté par détection de doublon (Docker) ─────────────────────────
  { authorEmail: 'lucas.bernard@imknow.com', categoryName: 'Développement', title: 'Docker en production : le guide complet pour déployer vos apps', tagNames: ['#DevOps', '#Best Practices'], status: 'published', useFullService: true, content: `## Multi-stage Dockerfile\n\`\`\`dockerfile\nFROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nFROM node:20-alpine\nCOPY --from=builder /app/dist ./dist\nCMD ["node","dist/main.js"]\n\`\`\`\n\n## Deployment K8s\n\`\`\`yaml\nreadinessProbe:\n  httpGet: { path: /health, port: 3000 }\n  initialDelaySeconds: 30\n\`\`\`` },

  // ── PENDING par modération (score 0.35-0.7) ─────────────────────────
  { authorEmail: 'lea.dubois@imknow.com', categoryName: 'Développement', title: 'Pourquoi les microservices c\'est de la merde — retour amer', tagNames: ['#Architecture', '#Backend'], status: 'published', useFullService: true, content: `Franchement, j'en ai marre de cette mode des microservices à la con.\n\nOn nous vend du rêve, mais c'est une pure arnaque. Les consultants qui prônent ça sont des charlatans.\n\n## Les problèmes\n- Déploiement : un putain d'enfer, 15 services à surveiller\n- Débogage : vous passez votre vie à merder sur des appels réseau\n- Performance : tout est 10 fois plus lent, les mecs\n- Complexité : on passe PLUS DE TEMPS SUR K8S QUE SUR LE CODE, bande d'abrutis\n\n## Mon avis\nLes microservices c'est un non-sens pour 90% des projets. Les startups qui copient Netflix sans avoir 10 utilisateurs — mais vous vous foutez de ma gueule ou quoi ? Et les architects qui imposent ça "parce que c'est moderne" — vous êtes des escrocs.\n\nSérieux, gardez votre monolithe modulaire, vous me remercierez. Les microservices, quelle putain de connerie.` },

  { authorEmail: 'lucas.bernard@imknow.com', categoryName: 'RH', title: '5 astuces pour survivre au présentiel imposé par la direction', tagNames: ['#Guide'], status: 'published', useFullService: true, content: `La direction nous impose 5 jours de présentiel par semaine. Voici comment je gère.\n\n## Mon quotidien\nFranchement le retour au bureau à plein temps c'est une décision de merde. Les dirigeants n'ont aucune putain d'empathie pour les employés qui ont des enfants ou des trajets longs.\n\n## Ce que je fais\n- J'arrive à 10h et je pars à 16h (personne ne dit rien)\n- Je bosse sur mes projets perso pendant les réunions inutiles\n- Le vendredi après-midi c'est sacré — je ne produis rien\n- J'ai installé un outil pour simuler ma présence sur Teams\n\n## Pourquoi je le fais\nSi l'entreprise ne respecte pas mon temps, pourquoi je devrais me tuer à la tâche ? C'est donnant-donnant. Le présentiel forcé c'est juste une guerre de pouvoir, pas une décision rationnelle.` },

  {
    authorEmail: 'alexandre.petit@imknow.com',
    categoryName: 'Développement',
    title: 'Vue.js 3 et la Composition API : migration depuis Options API',
    tagNames: ['#Frontend', '#JavaScript', '#Best Practices'],
    status: 'published',
    content: `# Vue.js 3 et la Composition API : migration depuis Options API

## Pourquoi la Composition API ?

Vue 3 a introduit la Composition API comme alternative à l'Options API. Elle résout deux problèmes majeurs rencontrés dans les grandes applications Vue 2 : la fragmentation de la logique (le même code réparti entre data, methods, computed, watch) et les limitations de réutilisation des mixins (conflits de noms, sources opaques).

La Composition API regroupe la logique par fonctionnalité plutôt que par option, ce qui rend les composants de grande taille beaucoup plus lisibles. Elle améliore aussi TypeScript support et permet l'extraction de logique réutilisable dans des composables.

## Options API vs Composition API

\`\`\`javascript
// Options API — Vue 2/3
export default {
  data() {
    return { count: 0, user: null };
  },
  computed: {
    doubleCount() { return this.count * 2; }
  },
  methods: {
    increment() { this.count++; },
    async fetchUser(id) {
      this.user = await api.getUser(id);
    }
  },
  mounted() {
    this.fetchUser(1);
  }
}
\`\`\`

\`\`\`javascript
// Composition API — Vue 3
import { ref, computed, onMounted } from 'vue';

export default {
  setup() {
    const count = ref(0);
    const user = ref(null);
    const doubleCount = computed(() => count.value * 2);

    const increment = () => count.value++;
    const fetchUser = async (id) => {
      user.value = await api.getUser(id);
    };

    onMounted(() => fetchUser(1));

    return { count, user, doubleCount, increment };
  }
}
\`\`\`

## \`<script setup>\` : la syntaxe recommandée

\`\`\`vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const count = ref(0);
const doubleCount = computed(() => count.value * 2);

onMounted(() => console.log('Monté !'));
// Tout est automatiquement exposé au template
</script>

<template>
  <button @click="count++">{{ count }} (double: {{ doubleCount }})</button>
</template>
\`\`\`

Avec \`<script setup>\`, plus besoin de \`return\` — tout ce qui est déclaré est directement accessible dans le template.

## Composables : la vraie puissance de la Composition API

Les composables remplacent avantageusement les mixins. Contrairement aux mixins, ils exposent explicitement ce qu'ils partagent et n'ont aucun risque de conflit de noms.

\`\`\`typescript
// composables/useApi.ts
import { ref } from 'vue';

export function useApi<T>(fetchFn: () => Promise<T>) {
  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const execute = async () => {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fetchFn();
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  return { data, loading, error, execute };
}

// Utilisation dans un composant
const { data: users, loading, execute: fetchUsers } = useApi(() => api.getUsers());
\`\`\`

## Réactivité avancée : \`ref\` vs \`reactive\` vs \`shallowRef\`

- **\`ref\`** : pour les valeurs primitives et les objets simples. Accès via \`.value\`.
- **\`reactive\`** : pour les objets complexes. Pas de \`.value\`, mais ne fonctionne pas avec les primitives et la déstructuration casse la réactivité.
- **\`shallowRef\`** : pour les grands objets où seule la référence racine doit être réactive (performances).

\`\`\`typescript
const shallow = shallowRef({ deeply: { nested: { value: 1 } } });
shallow.value.deeply.nested.value = 2; // PAS réactif
shallow.value = { deeply: { nested: { value: 2 } } }; // Réactif
\`\`\`

## Pinia : le store recommandé pour Vue 3

Pinia remplace Vuex comme solution officielle de gestion d'état. Plus simple, TypeScript natif, et compatible Composition API.

\`\`\`typescript
// stores/user.ts
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null);
  const isAuthenticated = computed(() => !!user.value);

  async function login(credentials: LoginDto) {
    user.value = await authService.login(credentials);
  }

  function logout() { user.value = null; }

  return { user, isAuthenticated, login, logout };
});
\`\`\`

## Stratégie de migration Options API → Composition API

Ne pas tout migrer d'un coup. Stratégie progressive :
1. Nouveaux composants en Composition API uniquement
2. Migrer les composants les plus complexes (> 200 lignes) en priorité
3. Extraire d'abord les mixins en composables
4. Options API et Composition API coexistent dans le même projet sans problème`
  },

  {
    authorEmail: 'lucas.bernard@imknow.com',
    categoryName: 'Développement',
    title: 'OWASP Top 10 : sécuriser ses applications web en 2024',
    tagNames: ['#Security', '#Backend', '#Best Practices'],
    status: 'published',
    content: `# OWASP Top 10 : sécuriser ses applications web en 2024

## Introduction à l'OWASP Top 10

L'OWASP (Open Worldwide Application Security Project) publie tous les 4 ans le classement des 10 risques de sécurité les plus critiques pour les applications web. La liste 2021, toujours de référence en 2024, est basée sur l'analyse de 500 000 applications réelles. Comprendre et adresser ces vulnérabilités doit être intégré au cycle de développement, pas ajouté en fin de projet.

## A01 — Broken Access Control (anciennement A05)

La montée en première position est alarmante : 94% des applications testées présentaient une forme de broken access control. Cela inclut les IDOR (Insecure Direct Object Reference), le privilege escalation, et l'accès à des fonctionnalités admin sans vérification.

\`\`\`typescript
// ❌ Vulnérable — l'utilisateur peut accéder à n'importe quel document
app.get('/documents/:id', async (req, res) => {
  const doc = await db.documents.findById(req.params.id);
  res.json(doc);
});

// ✅ Sécurisé — vérifier que le document appartient à l'utilisateur
app.get('/documents/:id', authMiddleware, async (req, res) => {
  const doc = await db.documents.findOne({
    where: { id: req.params.id, ownerId: req.user.id }
  });
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.json(doc);
});
\`\`\`

## A02 — Cryptographic Failures

Données sensibles exposées en clair : mots de passe non hashés, données personnelles en HTTP, tokens dans les logs.

\`\`\`typescript
import * as bcrypt from 'bcrypt';

// ❌ Ne jamais stocker un mot de passe en clair ou avec MD5/SHA1
const hash = md5(password); // INTERDIT

// ✅ bcrypt avec un coût suffisant (12+ en prod)
const hash = await bcrypt.hash(password, 12);
const isValid = await bcrypt.compare(password, hash);
\`\`\`

Pour les données sensibles (PII, données financières) : chiffrement AES-256-GCM au repos, TLS 1.3 minimum en transit, pas de données sensibles dans les URLs (logs de serveur).

## A03 — Injection (SQL, NoSQL, LDAP, OS)

\`\`\`typescript
// ❌ Injection SQL — JAMAIS
const query = \`SELECT * FROM users WHERE email = '\${email}'\`;

// ✅ Requêtes paramétrées
const user = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ✅ ORM (TypeORM protège automatiquement)
const user = await userRepo.findOne({ where: { email } });

// ✅ Validation des entrées
import { IsEmail, IsString, MaxLength } from 'class-validator';
class LoginDto {
  @IsEmail() email: string;
  @IsString() @MaxLength(100) password: string;
}
\`\`\`

## A04 — Insecure Design

Les failles de conception ne peuvent pas être corrigées par du code propre — elles nécessitent une refonte architecturale. Exemples : absence de rate limiting sur les endpoints d'authentification, réinitialisation de mot de passe par simple email sans expiration, absence de séparation des privilèges.

Pratiques préventives : Threat Modeling (STRIDE) en phase de conception, Security Requirements dans les user stories, Security Champions dans chaque équipe.

## A05 — Security Misconfiguration

Headers de sécurité manquants, environnements de dev exposés en prod, messages d'erreur détaillés.

\`\`\`typescript
import helmet from 'helmet';

app.use(helmet()); // X-Frame-Options, X-Content-Type-Options, etc.
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'nonce-{random}'"],
    styleSrc: ["'self'"],
  }
}));

// Désactiver le header X-Powered-By
app.disable('x-powered-by');

// Gestion d'erreur sans fuites
app.use((err, req, res, next) => {
  console.error(err); // Log interne seulement
  res.status(500).json({ message: 'Internal server error' }); // Pas de stack trace
});
\`\`\`

## A07 — Identification and Authentication Failures

\`\`\`typescript
// Protection brute force
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

async function checkBruteForce(email: string): Promise<void> {
  const attempts = loginAttempts.get(email);
  if (attempts && attempts.count >= 5 && Date.now() < attempts.resetAt) {
    throw new TooManyRequestsException('Trop de tentatives. Réessayez dans 15 minutes.');
  }
}

// Tokens JWT — bonnes pratiques
const token = jwt.sign(
  { sub: user.id, role: user.role },
  process.env.JWT_SECRET,
  {
    expiresIn: '15m',          // Access token court
    algorithm: 'RS256',        // Asymétrique — clé publique vérifiable
    issuer: 'https://api.imknow.com',
    audience: 'https://app.imknow.com',
  }
);
\`\`\`

## A10 — Server-Side Request Forgery (SSRF)

Une SSRF permet à un attaquant de faire envoyer des requêtes par le serveur vers des ressources internes (metadata AWS, services internes, localhost).

\`\`\`typescript
import { URL } from 'url';

function validateUrl(inputUrl: string): void {
  const url = new URL(inputUrl);
  const blocked = ['localhost', '127.0.0.1', '169.254.169.254', '::1'];
  if (blocked.some(h => url.hostname.includes(h))) {
    throw new Error('URL non autorisée');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Protocole non autorisé');
  }
}
\`\`\`

## Intégration sécurité dans le CI/CD

- **SAST** (Static Analysis) : SonarQube, Semgrep — analyse du code source
- **DAST** (Dynamic Analysis) : OWASP ZAP — tests sur application en cours d'exécution
- **SCA** (Software Composition Analysis) : Snyk, Dependabot — vulnérabilités des dépendances
- **Secrets scanning** : GitLeaks, TruffleHog — détection de clés API dans le code`
  },

  {
    authorEmail: 'julien.leroy@imknow.com',
    categoryName: 'Développement',
    title: 'Leadership technique : passer de développeur senior à tech lead',
    tagNames: ['#Architecture', '#Guide', '#Best Practices'],
    status: 'published',
    content: `# Leadership technique : passer de développeur senior à tech lead

## La transition la plus difficile en carrière tech

Le passage de développeur senior à tech lead est l'une des transitions les plus difficiles dans une carrière technique. Ce n'est pas une promotion — c'est un changement de métier. Les compétences qui vous ont rendu excellent développeur (concentration sur votre propre code, expertise technique profonde, résolution autonome de problèmes) deviennent insuffisantes, voire contre-productives dans un rôle de leadership.

Un tech lead passe d'un modèle de contribution individuelle (votre productivité = votre valeur) à un modèle multiplicateur (la productivité de l'équipe = votre valeur). Ce changement de paradigme prend du temps à intérioriser.

## Ce que fait réellement un tech lead

Les responsabilités d'un tech lead se répartissent en quatre domaines :

**Alignement technique** : définir et communiquer la vision architecturale, prendre des décisions techniques structurantes, documenter les ADR (Architecture Decision Records), évangéliser les bonnes pratiques sans les imposer par la force.

**Enablement de l'équipe** : identifier les blocages techniques des membres de l'équipe, organiser des knowledge-sharing sessions, créer des guidelines et templates plutôt que de coder à la place des autres, mener des code reviews formatives plutôt que correctrices.

**Interface avec le business** : traduire les besoins métier en exigences techniques réalistes, estimer la complexité honnêtement (pas d'optimisme irrationnel), communiquer la dette technique en termes business ("cette dette nous coûte 2 semaines de développement par trimestre").

**Santé de l'équipe** : détecter les signes de burnout, créer un environnement psychologiquement sûr où l'erreur est acceptable, s'assurer que chaque membre a des opportunités de croissance.

## Les pièges classiques du nouveau tech lead

### Le syndrome du "c'est plus rapide si je le fais moi-même"
C'est vrai à court terme. Faux à moyen terme. En codant à la place de votre équipe, vous créez une dépendance, privez les autres d'opportunités d'apprentissage, et devenez un goulot d'étranglement.

### Le perfectionnisme paralysant en code review
Des reviews de 50 commentaires pour un PR de 100 lignes découragent les contributeurs. Distinguer les must-fix (correctness, sécurité, performance) des nice-to-have (style, préférences personnelles). Limiter les commentaires bloquants au strict nécessaire.

### Éviter les conversations difficiles
Le manque de feedback direct est la source numéro un de problèmes d'équipe invisibles. Donner du feedback spécifique, comportemental, et immédiat. Utiliser le modèle SBI : Situation, Behavior, Impact.

### Négliger sa propre technique
Un tech lead qui ne code plus perd la crédibilité et la capacité à estimer. Maintenir 30-40% du temps sur du code pour rester ancré dans la réalité technique.

## Décisions techniques : seul vs collaboratif

Toutes les décisions ne méritent pas le même niveau de consultation. Framework de décision :

- **Décisions réversibles à faible impact** : décidez seul, communiquez après. Ex : choix d'une bibliothèque utilitaire.
- **Décisions réversibles à fort impact** : consultez l'équipe, décidez rapidement. Ex : organisation des modules.
- **Décisions irréversibles à faible impact** : décidez seul après analyse. Ex : convention de nommage.
- **Décisions irréversibles à fort impact** : RFC (Request for Comments) avec délai de feedback, décision documentée. Ex : changement de base de données, migration vers microservices.

## Communication vers le haut : parler à la hiérarchie

Apprendre à parler le langage du business. Votre manager ne comprend pas la complexité cyclomatique — il comprend le risque, le coût, et la valeur.

\`\`\`
❌ "Notre code legacy a une forte dette technique et le couplage afférent est critique"
✅ "Nos 3 prochaines features prendront 2x plus longtemps à cause de code qui n'a pas évolué depuis 3 ans. Investir 4 semaines maintenant nous fait gagner 2 mois sur les 12 prochains mois."
\`\`\`

## Construire une culture d'ingénierie

La culture se construit par les rituels, pas les mots. Les rituels efficaces : post-mortems blameless (analyser les systèmes, pas les personnes), architecture reviews mensuelles, démos techniques internes, apprentissage partagé (tech talks, articles internes, conférences).

Un indicateur de bonne santé d'équipe : les membres s'expriment librement en réunion, questionnent les décisions, et proposent des alternatives sans crainte de jugement. Si seul le tech lead parle en réunion, il y a un problème.`
  },

  {
    authorEmail: 'nicolas.mercier@imknow.com',
    categoryName: 'Développement',
    title: 'Machine Learning en production : de l\'expérimentation au déploiement',
    tagNames: ['#Backend', '#Architecture', '#Nouveau'],
    status: 'published',
    content: `# Machine Learning en production : de l'expérimentation au déploiement

## Le gouffre entre notebook et production

95% des projets ML ne passent jamais en production. Le problème n'est généralement pas le modèle — c'est l'infrastructure, la reproductibilité, et le monitoring. Un data scientist peut entraîner un modèle performant en 2 semaines dans un notebook Jupyter. Le déployer, le maintenir, et garantir ses performances sur 12 mois est un défi d'ingénierie qui demande une approche structurée.

## MLOps : les fondations

MLOps applique les principes DevOps au machine learning. Les quatre piliers : versioning (code, données, modèles), automatisation (pipelines reproductibles), monitoring (performance du modèle en production), et gouvernance (traçabilité des expériences et conformité).

## Versioning avec DVC et MLflow

### DVC — Data Version Control
\`\`\`bash
# Initialiser DVC dans le projet
dvc init

# Tracker un dataset volumineux (stocké sur S3, pas dans Git)
dvc add data/training_data.csv
git add data/training_data.csv.dvc .gitignore
git commit -m "Add training dataset"

# Configurer le remote storage
dvc remote add -d myremote s3://mybucket/dvc
dvc push

# Reproduire l'environnement exact sur une autre machine
dvc pull
\`\`\`

### MLflow — Tracking des expériences
\`\`\`python
import mlflow
import mlflow.sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, f1_score

mlflow.set_experiment("customer-churn-prediction")

with mlflow.start_run():
    # Log des paramètres
    mlflow.log_param("n_estimators", 100)
    mlflow.log_param("max_depth", 10)
    mlflow.log_param("random_state", 42)

    # Entraînement
    model = RandomForestClassifier(n_estimators=100, max_depth=10)
    model.fit(X_train, y_train)

    # Log des métriques
    predictions = model.predict(X_test)
    mlflow.log_metric("accuracy", accuracy_score(y_test, predictions))
    mlflow.log_metric("f1_score", f1_score(y_test, predictions))

    # Log du modèle avec signature
    signature = mlflow.models.infer_signature(X_train, predictions)
    mlflow.sklearn.log_model(model, "model", signature=signature)
\`\`\`

## Pipeline ML avec Apache Airflow

\`\`\`python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

def extract_features(): pass
def train_model(): pass
def evaluate_model(): pass
def deploy_if_better(): pass

with DAG(
    'ml_pipeline',
    schedule_interval='@weekly',
    start_date=datetime(2024, 1, 1),
    catchup=False,
) as dag:

    extract = PythonOperator(task_id='extract', python_callable=extract_features)
    train   = PythonOperator(task_id='train',   python_callable=train_model)
    eval    = PythonOperator(task_id='evaluate', python_callable=evaluate_model)
    deploy  = PythonOperator(task_id='deploy',  python_callable=deploy_if_better)

    extract >> train >> eval >> deploy
\`\`\`

## Serving de modèles

### FastAPI + Pydantic pour l'API de prédiction
\`\`\`python
from fastapi import FastAPI
from pydantic import BaseModel
import mlflow.pyfunc
import pandas as pd

app = FastAPI()
model = mlflow.pyfunc.load_model("models:/ChurnModel/Production")

class PredictionRequest(BaseModel):
    age: int
    tenure_months: int
    monthly_spend: float
    support_tickets: int

class PredictionResponse(BaseModel):
    churn_probability: float
    prediction: bool

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    features = pd.DataFrame([request.dict()])
    proba = model.predict(features)[0]
    return PredictionResponse(
        churn_probability=float(proba),
        prediction=proba > 0.5
    )
\`\`\`

## Monitoring des modèles en production

Les modèles ML se dégradent dans le temps à cause du data drift (la distribution des données change) et du concept drift (la relation entre features et target évolue). Sans monitoring, on ne sait pas quand le modèle devient inutile.

**Métriques à surveiller :**
- **Data drift** : comparer la distribution des features en production avec les données d'entraînement (KS test, PSI — Population Stability Index)
- **Prediction drift** : changement dans la distribution des prédictions
- **Performance metrics** : accuracy, précision, recall — nécessitent des labels de ground truth
- **Latence et disponibilité** : P50, P95, P99 du temps de prédiction

\`\`\`python
# Evidently — librairie open-source de monitoring ML
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset

report = Report(metrics=[DataDriftPreset()])
report.run(reference_data=training_data, current_data=production_data)
report.save_html("drift_report.html")
\`\`\`

## A/B Testing des modèles

Ne jamais remplacer un modèle en production sans A/B test. Déployer progressivement : 5% du trafic sur le nouveau modèle, mesurer les métriques business réelles (conversion, rétention), augmenter progressivement si les résultats sont meilleurs.

Feature stores (Feast, Tecton) permettent de partager des features calculées entre l'entraînement et le serving, garantissant la cohérence et évitant le training-serving skew — la cause numéro un de dégradation silencieuse des modèles en production.`
  },

  // ── BROUILLON (draft) ────────────────────────────────────────────────
  { authorEmail: 'clarisse.renaud@imknow.com', categoryName: 'Marketing', title: 'Calendrier éditorial 2025 : planifier sa stratégie de contenu', tagNames: ['#Guide'], status: 'draft', keepAsDraft: true, content: `## Pourquoi un calendrier éditorial ?\nUn calendrier éditorial permet de planifier et d'organiser la production de contenu.\n\n## Les éléments clés\n- Date de publication\n- Format (article, vidéo, podcast)\n- Auteur\n- Statut (idée, en rédaction, review, publié)\n- KPI cibles\n\n## Outils recommandés\n- Notion\n- Airtable\n- Google Sheets\n- Trello\n\nÀ compléter avec les dates clés 2025 et les campagnes marketing.` },

  // ── PUBLICATIONS ENRICHIES POUR LE RAG ──────────────────────────────
  {
    authorEmail: 'thomas.martin@imknow.com',
    categoryName: 'Développement',
    title: 'Next.js 14 et le App Router : migration complète depuis Pages Router',
    tagNames: ['#Frontend', '#React', '#Best Practices'],
    status: 'published',
    content: `# Next.js 14 et le App Router : migration complète depuis Pages Router

## Pourquoi migrer vers le App Router ?

Next.js 14 introduit le App Router comme solution recommandée, remplaçant le Pages Router. Ce changement apporte les React Server Components (RSC), le streaming SSR, et une meilleure gestion du cache. Le App Router permet de réduire le bundle JavaScript côté client jusqu'à 60% grâce au rendu serveur par défaut.

Les avantages principaux sont : les layouts imbriqués persistants sans re-rendu, les Server Actions pour les mutations de données, le support natif du streaming avec Suspense, et une meilleure gestion du cache avec des stratégies granulaires.

## Structure du répertoire app/

\`\`\`
app/
  layout.tsx          ← Layout racine (obligatoire)
  page.tsx            ← Page d'accueil
  loading.tsx         ← UI de chargement automatique
  error.tsx           ← Gestion d'erreur par segment
  not-found.tsx       ← Page 404 personnalisée
  (auth)/
    login/page.tsx    ← Groupe de routes sans segment URL
  dashboard/
    layout.tsx        ← Layout imbriqué
    page.tsx
    [id]/
      page.tsx        ← Route dynamique
\`\`\`

## Server Components vs Client Components

Par défaut, tous les composants dans app/ sont des Server Components. Ils s'exécutent uniquement sur le serveur et ne sont jamais inclus dans le bundle client.

\`\`\`tsx
// Server Component (pas de 'use client') — peut fetch directement
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.users.findUnique({ where: { id: userId } });
  return <div>{user.name}</div>;
}

// Client Component — nécessaire pour useState, useEffect, événements
'use client';
function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
\`\`\`

La règle clé : descendre les Client Components le plus bas possible dans l'arbre pour maximiser le rendu serveur.

## Data Fetching avec le App Router

Le fetch natif est étendu par Next.js pour le cache et la revalidation :

\`\`\`tsx
// Cache statique (comme getStaticProps)
const data = await fetch('https://api.example.com/data', {
  cache: 'force-cache'
});

// Revalidation temporelle (comme ISR)
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 } // revalider toutes les heures
});

// Pas de cache (comme getServerSideProps)
const data = await fetch('https://api.example.com/data', {
  cache: 'no-store'
});
\`\`\`

## Server Actions : mutations sans API

Les Server Actions permettent de modifier des données directement depuis un composant serveur ou via un formulaire, sans créer d'endpoint API.

\`\`\`tsx
// actions.ts
'use server';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  await db.posts.create({ data: { title } });
  revalidatePath('/posts');
}

// Utilisation dans un composant
<form action={createPost}>
  <input name="title" />
  <button type="submit">Créer</button>
</form>
\`\`\`

## Stratégie de migration Pages Router → App Router

1. **Coexistence** : les deux routers peuvent cohabiter dans le même projet. Migrer progressivement, route par route.
2. **Commencer par les pages statiques** : migrer d'abord les pages sans état client.
3. **getServerSideProps → fetch no-store** dans un Server Component.
4. **getStaticProps → fetch force-cache** ou données statiques.
5. **API Routes → Route Handlers** dans app/api/.

## Pièges courants

- Utiliser useState dans un Server Component (erreur de compilation)
- Passer des fonctions non-sérialisables de Server vers Client Components
- Oublier 'use client' sur les wrappers de librairies tierces (react-query, zustand)
- Ne pas utiliser \`next/image\` et \`next/link\` pour les optimisations automatiques

## Performances mesurées

Sur un projet réel migré, les gains observés : First Contentful Paint réduit de 1.8s à 0.6s, Largest Contentful Paint de 3.2s à 1.1s, et Time to Interactive de 4.5s à 1.4s grâce à la réduction du JavaScript client.`
  },

  {
    authorEmail: 'lucas.bernard@imknow.com',
    categoryName: 'Développement',
    title: 'Redis en production : stratégies de cache et patterns avancés',
    tagNames: ['#Backend', '#Performance', '#Database'],
    status: 'published',
    content: `# Redis en production : stratégies de cache et patterns avancés

## Pourquoi Redis ?

Redis est une base de données en mémoire open-source qui supporte des structures de données variées : strings, hashes, lists, sets, sorted sets, streams, et hyperloglogs. Sa latence sub-milliseconde en fait l'outil idéal pour le cache, les sessions, les files de messages, et le rate limiting.

En production, Redis peut traiter jusqu'à 1 million d'opérations par seconde sur un seul nœud. Sa persistance optionnelle (RDB snapshots + AOF logs) permet de conserver les données après redémarrage.

## Patterns de cache fondamentaux

### Cache-aside (Lazy Loading)
L'application vérifie d'abord Redis, puis la base de données si cache miss. C'est le pattern le plus courant.

\`\`\`typescript
async function getUser(id: string): Promise<User> {
  const cached = await redis.get(\`user:\${id}\`);
  if (cached) return JSON.parse(cached);

  const user = await db.users.findUnique({ where: { id } });
  await redis.setex(\`user:\${id}\`, 3600, JSON.stringify(user)); // TTL 1h
  return user;
}
\`\`\`

### Write-through
Écrire simultanément en DB et en cache à chaque mutation. Garantit la cohérence mais augmente la latence d'écriture.

### Write-behind (Write-back)
Écrire d'abord en cache, puis en DB de manière asynchrone. Très performant mais risque de perte de données en cas de crash.

## Structures de données avancées

### Sorted Sets pour les classements
\`\`\`typescript
// Ajouter un score
await redis.zadd('leaderboard', score, userId);

// Top 10
const top10 = await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');

// Rang d'un utilisateur
const rank = await redis.zrevrank('leaderboard', userId);
\`\`\`

### Pub/Sub pour les événements temps réel
\`\`\`typescript
// Publisher
await redis.publish('notifications', JSON.stringify({ userId, message }));

// Subscriber
const subscriber = redis.duplicate();
await subscriber.subscribe('notifications');
subscriber.on('message', (channel, message) => {
  const data = JSON.parse(message);
  sendWebSocket(data.userId, data.message);
});
\`\`\`

### Streams pour les queues de messages
Redis Streams est une alternative légère à Kafka pour les volumes modérés. Supporte les consumer groups, la persistance, et le rejeu de messages.

## Rate Limiting avec Redis

\`\`\`typescript
async function rateLimit(userId: string, limit: number, windowSeconds: number): Promise<boolean> {
  const key = \`rate:\${userId}:\${Math.floor(Date.now() / (windowSeconds * 1000))}\`;
  const current = await redis.incr(key);
  if (current === 1) await redis.expire(key, windowSeconds);
  return current <= limit;
}
\`\`\`

## Gestion de la mémoire

Redis stocke tout en RAM. Configurer \`maxmemory\` et une politique d'éviction adaptée :

- **allkeys-lru** : éviction des clés les moins récemment utilisées (recommandé pour le cache pur)
- **volatile-lru** : éviction parmi les clés avec TTL uniquement
- **allkeys-lfu** : éviction par fréquence d'utilisation (Redis 4+)

\`\`\`
maxmemory 2gb
maxmemory-policy allkeys-lru
\`\`\`

## Redis Cluster pour la haute disponibilité

Redis Cluster distribue automatiquement les données sur plusieurs nœuds via le sharding par hash slots (16384 slots). Configuration minimale recommandée : 3 masters + 3 replicas.

\`\`\`yaml
# docker-compose.yml
redis-master:
  image: redis:7-alpine
  command: redis-server --appendonly yes --cluster-enabled yes

redis-replica:
  image: redis:7-alpine
  command: redis-server --replicaof redis-master 6379
\`\`\`

## Monitoring Redis

Métriques clés à surveiller : \`used_memory\`, \`connected_clients\`, \`keyspace_hits\` vs \`keyspace_misses\` (ratio de hit > 90% est sain), \`instantaneous_ops_per_sec\`, et \`rejected_connections\`.

Utiliser RedisInsight (GUI gratuite de Redis) ou Prometheus avec redis_exporter pour un monitoring complet.`
  },

  {
    authorEmail: 'julien.leroy@imknow.com',
    categoryName: 'Développement',
    title: 'CI/CD avec GitHub Actions : pipeline complet pour une application NestJS',
    tagNames: ['#DevOps', '#Backend', '#Best Practices'],
    status: 'published',
    content: `# CI/CD avec GitHub Actions : pipeline complet pour une application NestJS

## Pourquoi GitHub Actions ?

GitHub Actions est natif à GitHub, ce qui évite de gérer une infrastructure CI externe (Jenkins, CircleCI). Il est gratuit pour les projets open-source et offre 2000 minutes/mois sur les plans gratuits. Les workflows sont des fichiers YAML versionnés avec le code.

## Structure du pipeline

Un pipeline CI/CD efficace pour NestJS comporte 4 étapes : lint + tests unitaires, tests d'intégration avec base de données, build Docker, et déploiement conditionnel selon la branche.

## Workflow complet

\`\`\`yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: testdb
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run unit tests
        run: npm run test

      - name: Run integration tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/testdb
          JWT_SECRET: test-secret

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: \${{ secrets.CODECOV_TOKEN }}

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1
        with:
          host: \${{ secrets.SERVER_HOST }}
          username: \${{ secrets.SERVER_USER }}
          key: \${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker pull ghcr.io/\${{ github.repository }}:latest
            docker-compose up -d --no-deps api
\`\`\`

## Optimisations du pipeline

### Cache des dépendances npm
Utiliser \`actions/setup-node\` avec \`cache: 'npm'\` réduit l'installation de 60-90s à 5-10s.

### Build Docker avec cache des layers
\`cache-from: type=gha\` utilise le cache GitHub Actions pour les layers Docker, réduisant le build de 4 minutes à 45 secondes.

### Tests en parallèle
\`\`\`yaml
strategy:
  matrix:
    test-suite: [unit, integration, e2e]
steps:
  - run: npm run test:\${{ matrix.test-suite }}
\`\`\`

## Gestion des secrets

Ne jamais mettre de secrets dans le code. Utiliser GitHub Secrets (Settings > Secrets and variables > Actions) pour : DATABASE_URL, JWT_SECRET, API_KEYS, SSH_PRIVATE_KEY.

Pour les environnements (staging/production), utiliser les Environments GitHub qui permettent des secrets spécifiques par environnement et des règles d'approbation manuelle.

## Notifications et observabilité

\`\`\`yaml
- name: Notify Slack on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {"text": "❌ Pipeline failed on \${{ github.ref }} — \${{ github.run_url }}"}
  env:
    SLACK_WEBHOOK_URL: \${{ secrets.SLACK_WEBHOOK }}
\`\`\`

## Badges de statut

Ajouter dans le README pour la visibilité :
\`\`\`markdown
![CI/CD](https://github.com/org/repo/actions/workflows/ci-cd.yml/badge.svg)
![Coverage](https://codecov.io/gh/org/repo/branch/main/graph/badge.svg)
\`\`\``
  },

  {
    authorEmail: 'marie.dupont@imknow.com',
    categoryName: 'RH',
    title: 'Gestion de la performance : conduire des entretiens annuels efficaces',
    tagNames: ['#Guide', '#Important'],
    status: 'published',
    content: `# Gestion de la performance : conduire des entretiens annuels efficaces

## Pourquoi les entretiens annuels échouent souvent

Les études montrent que 95% des managers sont insatisfaits de leurs entretiens annuels, et 58% des employés pensent qu'ils ne reflètent pas leur travail réel. Les raisons principales : l'entretien annuel concentre 12 mois en 1 heure, le biais de récence domine (seuls les 2-3 derniers mois comptent), et l'absence de suivi tout au long de l'année rend l'exercice artificiel.

## Le modèle OKR pour structurer la performance

Les OKR (Objectives and Key Results) permettent d'aligner objectifs individuels et stratégie d'entreprise.

**Structure d'un OKR :**
- **Objectif** : qualitatif, inspirant, ambitieux ("Devenir la référence technique de notre secteur")
- **Key Results** : mesurables, temporels, 3-5 par objectif ("Publier 4 articles techniques sur notre blog d'ici Q2", "Obtenir un NPS développeur > 70")

Un bon OKR devrait être atteint à 70% — 100% signifie que l'objectif n'était pas assez ambitieux.

## La méthode des 1-on-1 réguliers

L'entretien annuel ne doit pas être une surprise. Des 1-on-1 hebdomadaires ou bimensuels de 30 minutes permettent un feedback continu. Agenda type :
1. Comment tu vas ? (5 min — relation humaine)
2. Quels sont tes blocages actuels ? (10 min — résolution de problèmes)
3. Feedback bidirectionnel (10 min — développement)
4. Prochaines étapes et engagements (5 min)

## Structure de l'entretien annuel

### Avant l'entretien
Envoyer une trame d'auto-évaluation 1 semaine à l'avance. Questions clés :
- Quelles sont tes 3 plus grandes réussites de l'année ?
- Quels objectifs n'ont pas été atteints et pourquoi ?
- Quelles compétences veux-tu développer l'année prochaine ?
- Comment évalues-tu la collaboration avec ton équipe et ta hiérarchie ?

### Pendant l'entretien (90 minutes recommandées)

**Phase 1 — Bilan (30 min)**
Partir de l'auto-évaluation de l'employé, pas de la vôtre. Écouter avant de parler. Utiliser la technique SBI (Situation-Behavior-Impact) pour le feedback : "Lors du lancement de la v2 (Situation), tu as pris l'initiative de documenter toute l'API (Behavior), ce qui a réduit le temps d'onboarding des nouveaux développeurs de 50% (Impact)."

**Phase 2 — Développement (30 min)**
Identifier 2-3 compétences à développer. Associer chaque compétence à une action concrète : formation, mission transversale, mentorat, conférence.

**Phase 3 — Objectifs N+1 (30 min)**
Co-construire les objectifs pour l'année suivante. Un objectif imposé est moins motivant qu'un objectif co-créé.

## Évaluation 360°

L'évaluation 360° recueille des feedbacks de toutes les parties prenantes : pairs, subordonnés, clients internes. Elle réduit les biais du manager unique et donne une vision plus complète.

Outils recommandés : 15Five, Lattice, Culture Amp. Attention : l'anonymat des répondants est crucial pour obtenir des feedbacks honnêtes.

## Rémunération et performance

Découpler la conversation performance de la conversation salaire. Quand les deux sont mélangées, les employés sont en mode défensif pendant tout l'entretien et ne peuvent pas s'engager dans une vraie réflexion sur leur développement.

Tenir deux entretiens séparés : l'entretien de performance (développement, objectifs) et l'entretien de révision salariale (2-4 semaines après).

## Suivi post-entretien

Un entretien sans suivi ne sert à rien. Documenter les engagements dans un outil partagé (Notion, Confluence). Faire un point à 3 mois sur les actions décidées. Adapter les objectifs si le contexte a changé — des OKR rigides dans un environnement changeant sont contre-productifs.`
  },

  {
    authorEmail: 'emma.moreau@imknow.com',
    categoryName: 'Marketing',
    title: 'SEO technique en 2024 : Core Web Vitals, structured data et indexation',
    tagNames: ['#Guide', '#Nouveau'],
    status: 'published',
    content: `# SEO technique en 2024 : Core Web Vitals, structured data et indexation

## L'évolution du SEO technique

Google traite plus de 8.5 milliards de requêtes par jour. En 2024, les facteurs techniques ont pris une importance croissante par rapport au SEO de contenu classique. L'expérience utilisateur mesurée via les Core Web Vitals est maintenant un facteur de classement direct.

## Core Web Vitals : les 3 métriques fondamentales

### LCP — Largest Contentful Paint (< 2.5s)
Mesure le temps de chargement de l'élément le plus grand visible (image principale, bloc de texte). Optimisations clés :
- Précharger les images critiques avec \`<link rel="preload">\`
- Utiliser des formats modernes (WebP, AVIF) — 30-50% plus légers que JPEG
- Servir depuis un CDN avec des serveurs proches de l'utilisateur
- Éliminer le render-blocking CSS et JavaScript

### FID → INP — Interaction to Next Paint (< 200ms)
Depuis mars 2024, FID est remplacé par INP. Mesure la réactivité à toutes les interactions, pas seulement la première.
\`\`\`javascript
// Mesurer INP avec la Performance Observer API
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.interactionId) {
      console.log('INP candidate:', entry.duration);
    }
  }
}).observe({ type: 'event', buffered: true, durationThreshold: 16 });
\`\`\`

### CLS — Cumulative Layout Shift (< 0.1)
Mesure la stabilité visuelle. Causes fréquentes : images sans dimensions définies, publicités injectées, fonts web chargées après le rendu.
\`\`\`html
<!-- Toujours spécifier width et height -->
<img src="hero.webp" width="1200" height="600" alt="..." loading="lazy">
\`\`\`

## Structured Data et Rich Snippets

Les données structurées Schema.org permettent à Google d'afficher des rich snippets (étoiles, FAQ, recettes, événements) dans les résultats de recherche, augmentant le CTR de 20-30%.

\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "SEO technique en 2024",
  "author": {
    "@type": "Person",
    "name": "Emma Moreau"
  },
  "datePublished": "2024-01-15",
  "dateModified": "2024-03-01",
  "publisher": {
    "@type": "Organization",
    "name": "ImKnow",
    "logo": {
      "@type": "ImageObject",
      "url": "https://imknow.com/logo.png"
    }
  }
}
</script>
\`\`\`

## Indexation et crawl budget

Pour les grands sites (> 10 000 pages), le crawl budget devient critique. Google n'indexe pas toutes les pages — il faut prioriser.

**robots.txt :** bloquer les URLs non indexables (paramètres UTM, facettes de filtres, pages de pagination profondes).

**Sitemap XML :** inclure uniquement les pages à indexer, avec \`lastmod\` à jour.

\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/article/seo-technique</loc>
    <lastmod>2024-03-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
\`\`\`

## Canonical et gestion des duplicates

Les contenus dupliqués diluent l'autorité SEO. Utiliser les balises canoniques pour indiquer la version de référence :

\`\`\`html
<link rel="canonical" href="https://example.com/article/original" />
\`\`\`

Cas courants nécessitant des canonicals : paramètres de tracking (?utm_source=), variantes de tri, versions imprimables, syndication de contenu.

## Internationalisation (hreflang)

Pour les sites multilingues, les balises hreflang indiquent à Google quelle version servir selon la langue/région :

\`\`\`html
<link rel="alternate" hreflang="fr" href="https://example.com/fr/article" />
<link rel="alternate" hreflang="en" href="https://example.com/en/article" />
<link rel="alternate" hreflang="x-default" href="https://example.com/article" />
\`\`\`

## Outils de monitoring SEO technique

- **Google Search Console** : indexation, Core Web Vitals terrain, erreurs de crawl
- **PageSpeed Insights** : analyse LCP/INP/CLS avec recommandations
- **Screaming Frog** : audit technique complet, détection des broken links
- **Ahrefs / Semrush** : suivi des positions, analyse des backlinks`
  },

  {
    authorEmail: 'sophie.laurent@imknow.com',
    categoryName: 'Design',
    title: 'Accessibilité web WCAG 2.2 : guide pratique pour les développeurs',
    tagNames: ['#UI/UX', '#Design', '#Guide'],
    status: 'published',
    content: `# Accessibilité web WCAG 2.2 : guide pratique pour les développeurs

## Pourquoi l'accessibilité est une priorité

Plus de 1 milliard de personnes dans le monde vivent avec un handicap. L'accessibilité web ne concerne pas seulement les personnes handicapées permanentes — elle bénéficie à tous : utilisateurs en situation de mobilité réduite temporaire, personnes âgées, utilisateurs sur des connexions lentes ou des écrans de mauvaise qualité.

En Europe, la directive sur l'accessibilité du web (transposée en droit national) rend l'accessibilité obligatoire pour les services publics numériques. Aux États-Unis, le titre III de l'ADA s'applique aux sites web. Les risques légaux pour les entreprises non conformes sont réels et croissants.

## Les 4 principes WCAG (POUR)

Les WCAG 2.2 (Web Content Accessibility Guidelines) sont organisées autour de 4 principes :
1. **Perceptible** : l'information doit être présentable de différentes façons
2. **Utilisable** : les composants d'interface doivent être utilisables au clavier
3. **Compréhensible** : l'information et l'interface doivent être compréhensibles
4. **Robuste** : le contenu doit être interprétable par les technologies d'assistance

## Niveau A et AA : les critères essentiels

### Texte alternatif pour les images
\`\`\`html
<!-- Image informative -->
<img src="chart.png" alt="Graphique montrant une hausse des ventes de 40% en Q3 2024">

<!-- Image décorative -->
<img src="divider.png" alt="" role="presentation">

<!-- Icône fonctionnelle -->
<button>
  <svg aria-hidden="true"><path d="..."/></svg>
  <span class="sr-only">Fermer la modale</span>
</button>
\`\`\`

### Contraste des couleurs
- Texte normal : ratio minimum 4.5:1
- Grand texte (> 18pt ou 14pt gras) : ratio minimum 3:1
- Composants UI (boutons, champs) : ratio minimum 3:1

Outils de vérification : WebAIM Contrast Checker, axe DevTools, Colour Contrast Analyser.

### Navigation au clavier
Tous les éléments interactifs doivent être accessibles au clavier (Tab, Shift+Tab, Enter, Espace, flèches). L'ordre de tabulation doit être logique et visible.

\`\`\`css
/* Ne jamais supprimer le focus outline sans alternative */
:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}
\`\`\`

### Structure sémantique HTML
\`\`\`html
<!-- Structure de page accessible -->
<header role="banner">
  <nav aria-label="Navigation principale">
    <ul>
      <li><a href="/">Accueil</a></li>
    </ul>
  </nav>
</header>

<main id="contenu-principal">
  <h1>Titre de la page</h1>
  <article>
    <h2>Sous-section</h2>
  </article>
</main>

<footer role="contentinfo"></footer>
\`\`\`

## ARIA : quand et comment l'utiliser

La règle d'or : "Ne pas utiliser ARIA si HTML natif peut faire le travail." Un \`<button>\` est toujours préférable à un \`<div role="button">\`.

\`\`\`jsx
// Modale accessible
function Modal({ isOpen, onClose, title, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      hidden={!isOpen}
    >
      <h2 id="modal-title">{title}</h2>
      {children}
      <button onClick={onClose} aria-label="Fermer la modale">×</button>
    </div>
  );
}

// État de chargement
<button aria-busy={isLoading} disabled={isLoading}>
  {isLoading ? 'Chargement...' : 'Enregistrer'}
</button>
\`\`\`

## Tests d'accessibilité automatisés

Intégrer axe-core dans les tests unitaires et CI :

\`\`\`typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('la page est accessible', async () => {
  const { container } = render(<HomePage />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
\`\`\`

Les outils automatisés détectent environ 30-40% des problèmes. Le reste nécessite des tests manuels avec des lecteurs d'écran (NVDA sur Windows, VoiceOver sur Mac, TalkBack sur Android).

## Nouvelles exigences WCAG 2.2

WCAG 2.2 (publié en octobre 2023) ajoute 9 nouveaux critères de succès, notamment :
- **2.4.11 Focus Not Obscured** : l'élément focusé ne doit pas être caché par du contenu sticky
- **2.5.7 Dragging Movements** : toutes les fonctions de glisser-déposer doivent avoir une alternative single-pointer
- **3.2.6 Consistent Help** : les mécanismes d'aide doivent apparaître au même endroit sur toutes les pages`
  },

  {
    authorEmail: 'nicolas.mercier@imknow.com',
    categoryName: 'Développement',
    title: 'Gestion de la dette technique : mesurer, prioriser et rembourser',
    tagNames: ['#Architecture', '#Best Practices', '#CleanCode'],
    status: 'published',
    content: `# Gestion de la dette technique : mesurer, prioriser et rembourser

## Qu'est-ce que la dette technique ?

Ward Cunningham, qui a inventé le concept en 1992, définit la dette technique comme "le coût du travail supplémentaire causé par avoir choisi une solution facile aujourd'hui plutôt qu'une meilleure approche qui prendrait plus de temps."

Il existe deux types de dettes : la dette délibérée (un raccourci conscient pour respecter une deadline, avec l'intention de revenir dessus) et la dette accidentelle (code mal écrit par manque d'expérience ou de connaissance du domaine). La dette délibérée bien gérée est normale et parfois stratégique. La dette accidentelle est le vrai problème.

## Mesurer la dette technique

### Métriques de code

**Complexité cyclomatique** : nombre de chemins indépendants dans le code. Idéalement < 10 par fonction. Au-delà de 20, le code est très difficile à tester et maintenir.

**Duplication de code** : mesurée par SonarQube. > 3% de duplication signale un problème structurel.

**Couplage afférent/efférent** : combien de modules dépendent d'un module (afférent) vs combien il en utilise (efférent). Un module avec un fort couplage afférent est difficile à modifier sans casser d'autres choses.

**Coverage des tests** : un indicateur indirect de la dette. < 60% de coverage sur du code critique est un signal d'alerte.

### Outils de mesure

\`\`\`bash
# SonarQube via Docker
docker run -d -p 9000:9000 sonarqube:community

# Analyse d'un projet NestJS
sonar-scanner \
  -Dsonar.projectKey=my-api \
  -Dsonar.sources=src \
  -Dsonar.exclusions=**/*.spec.ts \
  -Dsonar.typescript.lcov.reportPaths=coverage/lcov.info
\`\`\`

### Tech Debt Ratio
SonarQube calcule le Technical Debt Ratio : (dette en jours / coût de développement) × 100. Un ratio > 5% mérite attention ; > 20% est critique.

## Prioriser la dette à rembourser

Toutes les dettes ne méritent pas la même attention. Utiliser la matrice Impact/Effort :

**Haute priorité (fort impact, faible effort)** : quick wins, à faire immédiatement.

**Planifier (fort impact, fort effort)** : refactoring majeur, à inclure dans la roadmap.

**Faire si temps (faible impact, faible effort)** : nettoyage cosmétique.

**Ignorer (faible impact, fort effort)** : coût trop élevé pour le bénéfice.

Les dettes les plus critiques à adresser en priorité : celles dans les chemins critiques (code touché tous les jours), celles qui empêchent l'évolutivité (coupling fort), et celles qui créent des risques de sécurité.

## Stratégies de remboursement

### La règle du Boy Scout
"Laisse le code un peu plus propre que tu ne l'as trouvé." Appliquer systématiquement de petites améliorations lors de chaque passage dans le code.

### Refactoring progressif vs Big Bang
Le refactoring Big Bang (tout réécrire d'un coup) échoue dans 80% des cas. Préférer le refactoring progressif : extraire des interfaces, remplacer un composant à la fois, maintenir l'ancien et le nouveau en parallèle jusqu'à la migration complète (Strangler Fig Pattern).

\`\`\`typescript
// Strangler Fig Pattern — wrapper progressif
class LegacyUserService {
  getUser(id: number) { /* ancien code */ }
}

class NewUserService {
  getUser(id: number): Promise<User> { /* nouveau code */ }
}

class UserServiceAdapter {
  constructor(
    private legacy: LegacyUserService,
    private modern: NewUserService,
    private featureFlag: boolean
  ) {}

  async getUser(id: number) {
    return this.featureFlag
      ? this.modern.getUser(id)
      : Promise.resolve(this.legacy.getUser(id));
  }
}
\`\`\`

### Allouer du temps dédié

Les équipes qui ne planifient pas explicitement le remboursement de dette ne le font jamais. Stratégies efficaces :
- **20% rule** : 20% de chaque sprint dédié à la dette technique
- **Sprint dette** : un sprint entier par trimestre focalisé sur la qualité
- **Hack day** : journée mensuelle de refactoring libre

## Prévention : éviter l'accumulation

**Architecture Decision Records (ADR)** : documenter les décisions techniques importantes et leurs compromis. Quand le contexte change, l'ADR permet de comprendre pourquoi une décision a été prise et de la réévaluer.

**Definition of Done incluant la qualité** : aucune feature n'est "done" si elle introduit de nouvelles violations SonarQube, si le coverage a baissé, ou si aucune documentation n'a été mise à jour.

**Code reviews orientées architecture** : les reviews ne doivent pas seulement vérifier que ça "marche" mais aussi que ça s'intègre proprement dans l'architecture existante.`
  },
];

const PUB_MODIFICATIONS: {
  title: string;
  versionNumber: number;
  newTitle?: string;
  newContent: string;
  changeSummary: string;
}[] = [
  {
    title: "Guide complet React 18 : nouveautés et bonnes pratiques",
    versionNumber: 2, newTitle: 'Guide complet React 18 : nouveautés et bonnes pratiques (v2)',
    newContent: `React 18 a introduit des changements majeurs.\n\n## Concurrent Mode\n\nLe mode concurrent permet à React de préparer plusieurs versions du UI simultanément, avec une planification intelligente des priorités.\n\n## useTransition\n\n\`\`\`jsx\nconst [isPending, startTransition] = useTransition();\nstartTransition(() => setSearchQuery(input));\n\`\`\`\n\n## Automatic Batching\n\nToutes les mises à jour d'état sont regroupées automatiquement en React 18, ce qui réduit les re-renders.\n\n## Server Components\n\nLes React Server Components permettent le rendu côté serveur sans bundle supplémentaire.`,
    changeSummary: 'Ajout de la section Server Components et précisions sur le Concurrent Mode.',
  },
  {
    title: "TypeScript avancé : types génériques et patterns de conception",
    versionNumber: 2,
    newContent: `TypeScript offre un système de types puissant.\n\n## Conditional Types\n\n\`\`\`typescript\ntype Flatten<T> = T extends Array<infer Item> ? Item : T;\n\`\`\`\n\n## Mapped Types\n\n\`\`\`typescript\ntype Readonly<T> = { readonly [P in keyof T]: T[P] };\n\`\`\`\n\n## Template Literal Types\n\n\`\`\`typescript\ntype EventName = \`on\${Capitalize<string>}\`;\n\`\`\`\n\n## Type Guards\n\n\`\`\`typescript\nfunction isUser(v: unknown): v is User { return typeof v === 'object' && v !== null && 'email' in v; }\n\`\`\`\n\n## satisfies Operator\n\n\`\`\`typescript\nconst palette = { red: [255,0,0], green: '#00ff00' } satisfies Record<string, string | number[]>;\n\`\`\``,
    changeSummary: 'Ajout des template literal types et du satisfies operator. Réorganisation du contenu.',
  },
  {
    title: "Architecture microservices : retour d'expérience après 2 ans",
    versionNumber: 2,
    newContent: `Deux ans de migration microservices : les leçons apprises.\n\n## Découpage par domaine\n- Service Utilisateurs\n- Service Contenu\n- Service Notification\n\n## Communication asynchrone\nApache Kafka pour réduire le couplage et assurer la traçabilité des événements.\n\n## Difficultés\n\n### Transactions distribuées\nSolution : Saga pattern avec orchestrateurs dédiés.\n\n### Gestion des versions d'API\nVersionnement sémantique avec breaking changes gérés via des adapters.\n\n## Recommandations\n1. Monolithe modulaire d'abord\n2. Observabilité dès le début (OpenTelemetry)\n3. Contrats OpenAPI clairs\n4. Test des contrats (Pact.io)`,
    changeSummary: "Ajout du retour Kafka, gestion des versions d'API, et outillage Pact.io.",
  },
  {
    title: "RGPD en 2024 : guide pratique pour les équipes techniques",
    versionNumber: 2,
    newContent: `## Licéité du traitement\n- Consentement explicite\n- Exécution d'un contrat\n- Intérêt légitime\n\n## Privacy by Design\n\n\`\`\`typescript\ninterface UserLog { userId: string; action: string; hashedIp?: string; }\n\`\`\`\n\n## Chiffrement\n- Au repos : AES-256\n- En transit : TLS 1.3\n\n## Data Protection Impact Assessment (DPIA)\nObligatoire pour tout traitement à risque élevé.\n\n## Sanctions\n- 2% du CA ou 10M€\n- 4% du CA ou 20M€ pour les infractions graves\n\n## Sous-traitants\nObligation de signer un DPA (Data Processing Agreement) avec chaque sous-traitant.`,
    changeSummary: 'Ajout des sections DPIA et DPA, mise à jour des sanctions 2024.',
  },
  {
    title: "Intelligence Artificielle en entreprise : par où commencer ?",
    versionNumber: 2,
    newContent: `## Niveaux de maturité IA\n- Niveau 1 : ChatGPT ponctuel\n- Niveau 2 : APIs IA dans vos produits\n- Niveau 3 : pipelines ML en prod\n- Niveau 4 : agents autonomes\n\n## Intégration Anthropic\n\n\`\`\`typescript\nimport Anthropic from '@anthropic-ai/sdk';\nconst client = new Anthropic();\nconst msg = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, messages: [{ role: 'user', content: 'Résume :' }] });\n\`\`\`\n\n## RAG : vos données internes\n1. Vectoriser (pgvector)\n2. Recherche sémantique\n3. Contexte au LLM\n\n## AI Act européen\nClassification des systèmes IA par niveau de risque.`,
    changeSummary: 'Ajout du niveau 4 (agents) et de la section AI Act. Mise à jour des modèles.',
  },
  {
    title: 'Sécurité des API REST : guide complet 2024',
    versionNumber: 2,
    newContent: `La sécurité des API est souvent négligée.\n\n## JWT\n\`\`\`typescript\nconst token = jwt.sign({ userId }, SECRET, { expiresIn: '1h' });\n\`\`\`\n\n## Rate Limiting\n\`\`\`typescript\napp.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));\n\`\`\`\n\n## CORS\n\`\`\`typescript\napp.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));\n\`\`\`\n\n## Validation JWT\nToujours vérifier l'algorithme de signature côté serveur.`,
    changeSummary: 'Ajout de la section validation JWT et meilleures pratiques OWASP.',
  },
  {
    title: 'PostgreSQL : optimisation avancée des requêtes',
    versionNumber: 2,
    newContent: `## EXPLAIN ANALYZE\n\`\`\`sql\nEXPLAIN (ANALYZE, BUFFERS) SELECT a.title FROM articles a WHERE a.status = 'published';\n\`\`\`\n\n## Index partiels\n\`\`\`sql\nCREATE INDEX idx_published ON articles (created_at DESC) WHERE status = 'published';\n\`\`\`\n\n## Partitioning\n\`\`\`sql\nCREATE TABLE logs_part (\n  id BIGSERIAL, level TEXT, message TEXT, created_at TIMESTAMPTZ\n) PARTITION BY RANGE (created_at);\n\`\`\`\n\n## Maintenance\n\`\`\`sql\nVACUUM ANALYZE articles;\nSELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;\n\`\`\``,
    changeSummary: 'Ajout de la section sur le partitioning natif PostgreSQL.',
  },
];

export async function seedPublications(
  context?: INestApplicationContext,
  emailToUser?: Record<string, User>,
  nameToCategory?: Record<string, Category>,
  nameToTag?: Record<string, Tag>,
): Promise<{ titleToPub: Record<string, Publication> }> {
  const ownContext = !context;
  if (!context) {
    context = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });
  }

  if (!emailToUser) {
    const result = await seedUsers(context);
    emailToUser = result.emailToUser;
  }
  if (!nameToCategory) {
    const result = await seedCategories(context);
    nameToCategory = result.nameToCategory;
  }
  if (!nameToTag) {
    const result = await seedTags(context);
    nameToTag = result.nameToTag;
  }

  const dataSource = context.get(DataSource);
  const userRepo = context.get<Repository<User>>(getRepositoryToken(User));
  const publicationRepo = context.get<Repository<Publication>>(getRepositoryToken(Publication));
  const publicationService = context.get(PublicationService);
  const publicationChunkService = context.get(PublicationChunkService);
  const searchService = context.get(SearchService);

  const titleToPub: Record<string, Publication> = {};

  try {
    for (const article of ARTICLES) {
      const existing = await publicationRepo.findOne({ where: { title: article.title } });
      if (existing) {
        titleToPub[article.title] = existing;
        logger.log(`  ⏭️  "${article.title.substring(0, 50)}" existe déjà (${existing.status})`);
        try {
          const chunksCnt = await dataSource
            .getRepository('publication_chunks')
            .count({ where: { publicationId: existing.id } } as any);
          if (chunksCnt === 0 && existing.status === PublicationStatus.PUBLISHED) {
            await publicationChunkService.generateChunks(existing.id);
          }
        } catch { /* ignore */ }
        try {
          const hasEmbedding = await dataSource.query(
            `SELECT embedding_vector_pg IS NOT NULL AS has_it FROM publications WHERE id = $1`,
            [existing.id],
          );
          if (!hasEmbedding[0]?.has_it) {
            const embedText = `Title: ${existing.title}\nCategory: ${article.categoryName}\nTags: ${(article.tagNames || []).join(', ')}\nContent:\n${existing.content}`;
            const vector = await searchService.generateEmbedding(embedText);
            if (vector && Array.isArray(vector) && vector.length === 768) {
              const vs = '[' + vector.map((v) => Number(v).toFixed(8)).join(', ') + ']';
              await dataSource.query(
                `UPDATE publications SET embedding_vector_pg = $1::vector WHERE id = $2`,
                [vs, existing.id],
              );
            }
          }
        } catch { /* ignore */ }
        continue;
      }

      const author = emailToUser[article.authorEmail];
      const category = nameToCategory[article.categoryName];
      const tags = (article.tagNames || []).map(n => nameToTag[n]).filter(Boolean);

      if (article.useFullService) {
        const categoryId = category?.id;
        const tagIds = tags.map(t => t.id).filter(Boolean);
        try {
          const pub = await publicationService.create(
            {
              title: article.title,
              content: article.content,
              categoryId,
              tagIds,
              status: article.keepAsDraft ? PublicationStatus.DRAFT : PublicationStatus.PUBLISHED,
            },
            author,
          );
          titleToPub[article.title] = pub;
          logger.log(`  ✅ "${article.title.substring(0, 40)}" (id=${pub.id}, status=${pub.status})`);
          if (pub.status === PublicationStatus.PUBLISHED) {
            try { await publicationChunkService.generateChunks(pub.id); } catch { /* ignore */ }
            try {
              const embedText = `Title: ${pub.title}\nCategory: ${article.categoryName}\nTags: ${(article.tagNames || []).join(', ')}\nContent:\n${pub.content}`;
              const vector = await searchService.generateEmbedding(embedText);
              if (vector && Array.isArray(vector) && vector.length === 768) {
                const vs = '[' + vector.map((v) => Number(v).toFixed(8)).join(', ') + ']';
                await dataSource.query(
                  `UPDATE publications SET embedding_vector_pg = $1::vector WHERE id = $2`,
                  [vs, pub.id],
                );
              }
            } catch { /* ignore */ }
          }
        } catch (err: any) {
          logger.warn(`  ⚠️ "${article.title.substring(0, 30)}": ${err.message}`);
        }
        continue;
      }

      const pub = publicationRepo.create({
        title: article.title,
        content: article.content,
        author,
        category,
        tags,
        status: PublicationStatus.DRAFT,
        viewsCount: Math.floor(Math.random() * 500) + 100,
      });
      titleToPub[article.title] = await publicationRepo.save(pub);

      await dataSource
        .createQueryBuilder()
        .insert()
        .into('publication_versions')
        .values({
          publicationId: pub.id,
          versionNumber: 1,
          title: article.title,
          content: article.content,
          authorId: author.id,
          status: 'published',
          changeSummary: 'Version initiale',
          createdAt: new Date(),
        })
        .execute();

      try { await publicationChunkService.generateChunks(pub.id); } catch (err: any) {
        logger.warn(`  ⚠️ Chunks: ${err.message}`);
      }
      try {
        const embedText = `Title: ${pub.title}\nCategory: ${article.categoryName}\nTags: ${(article.tagNames || []).join(', ')}\nContent:\n${pub.content}`;
        const vector = await searchService.generateEmbedding(embedText);
        if (vector && Array.isArray(vector) && vector.length === 768) {
          const vectorString = '[' + vector.map((v) => Number(v).toFixed(8)).join(', ') + ']';
          await dataSource.query(
            `UPDATE publications SET embedding_vector_pg = $1::vector WHERE id = $2`,
            [vectorString, pub.id],
          );
        }
      } catch { /* ignore */ }

      if (!article.keepAsDraft) {
        await publicationRepo.update(pub.id, { status: PublicationStatus.PUBLISHED });
      }

      logger.log(`  ✅ "${article.title.substring(0, 50)}" (id=${pub.id}, status=${article.keepAsDraft ? 'draft' : 'published'})`);
    }

    // ── VERSIONS (modifications) ────────────────────────────────────────
    let modCount = 0;
    for (const mod of PUB_MODIFICATIONS) {
      const pubFromMap = titleToPub[mod.title];
      if (!pubFromMap) continue;

      const pub = await publicationRepo.findOne({
        where: { id: pubFromMap.id },
        relations: ['author'],
      });
      if (!pub) continue;

      const newTitle = mod.newTitle || pub.title;
      const newContent = mod.newContent;

      try {
        const existingVersion = await dataSource
          .getRepository(PublicationVersion)
          .findOne({ where: { publicationId: pub.id, versionNumber: mod.versionNumber } });
        if (existingVersion) continue;

        await dataSource
          .createQueryBuilder()
          .insert()
          .into('publication_versions')
          .values({
            publicationId: pub.id,
            versionNumber: mod.versionNumber,
            title: newTitle,
            content: newContent,
            authorId: pub.author.id,
            status: 'published',
            changeSummary: mod.changeSummary,
            createdAt: new Date(),
          })
          .execute();
        modCount++;
        logger.log(`  ✅ "${pub.title.substring(0, 40)}" → v${mod.versionNumber}`);
      } catch (err: any) {
        logger.warn(`  ⚠️ Version "${pub.title.substring(0, 30)}": ${err.message}`);
      }
    }
    logger.log(`  📊 ${modCount} nouvelles versions`);

    const total = await publicationRepo.count();
    logger.log(`  📊 Total publications : ${total}`);
    return { titleToPub };
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedPublications().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
