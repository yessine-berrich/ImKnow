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

  // ── BROUILLON (draft) ────────────────────────────────────────────────
  { authorEmail: 'clarisse.renaud@imknow.com', categoryName: 'Marketing', title: 'Calendrier éditorial 2025 : planifier sa stratégie de contenu', tagNames: ['#Guide'], status: 'draft', keepAsDraft: true, content: `## Pourquoi un calendrier éditorial ?\nUn calendrier éditorial permet de planifier et d'organiser la production de contenu.\n\n## Les éléments clés\n- Date de publication\n- Format (article, vidéo, podcast)\n- Auteur\n- Statut (idée, en rédaction, review, publié)\n- KPI cibles\n\n## Outils recommandés\n- Notion\n- Airtable\n- Google Sheets\n- Trello\n\nÀ compléter avec les dates clés 2025 et les campagnes marketing.` },
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
