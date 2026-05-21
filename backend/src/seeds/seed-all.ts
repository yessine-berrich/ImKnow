import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { Repository, DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { Category } from '../category/entities/category.entity';
import { Tag } from '../tag/entities/tag.entity';
import { Publication } from '../publication/entities/publication.entity';
import { PublicationVersion } from '../publication/entities/publication-version.entity';
import { Comment } from '../comment/entities/comment.entity';
import { Follow } from '../follow/entities/follow.entity';
import { PublicationReport } from '../publication/entities/publication-report.entity';
import { UserReport } from '../users/entities/user-report.entity';
import { PublicationStatus, userRole, UserStatus } from 'utils/constants';
import { CategoryService } from '../category/category.service';
import { TagService } from '../tag/tag.service';
import { FollowService } from '../follow/follow.service';
import { NotificationService } from '../notification/notification.service';
import { ChatService } from '../chat/chat.service';
import { CommentService } from '../comment/comment.service';
import { PublicationInteractionService } from '../publication/publication-interaction.service';
import { PublicationService } from '../publication/publication.service';
import { PublicationChunkService } from '../publication/publication-chunk.service';
import { SearchService } from '../search/search.service';
import { ChatMessage, MessageType } from '../chat/entities/chat-message.entity';
import { UserBlock } from '../chat/entities/user-block.entity';

const logger = new Logger('Seed');

// ════════════════════════════════════════════════════════════════
// DATA DEFINITIONS
// ════════════════════════════════════════════════════════════════

const EMPLOYEES = [
  { firstName: 'Marie',     lastName: 'Dupont',   email: 'marie.dupont@imknow.com',     department: 'RH',            bio: "Responsable RH avec 8 ans d'expérience." },
  { firstName: 'Thomas',    lastName: 'Martin',   email: 'thomas.martin@imknow.com',    department: 'Développement', bio: 'Développeur fullstack passionné par React et Node.js.' },
  { firstName: 'Sophie',    lastName: 'Laurent',  email: 'sophie.laurent@imknow.com',   department: 'Design',        bio: "Designer UX/UI centrée sur l'utilisateur." },
  { firstName: 'Lucas',     lastName: 'Bernard',  email: 'lucas.bernard@imknow.com',    department: 'DevOps',        bio: 'Ingénieur DevOps spécialisé cloud AWS.' },
  { firstName: 'Emma',      lastName: 'Moreau',   email: 'emma.moreau@imknow.com',      department: 'Marketing',     bio: 'Responsable marketing digital et growth hacking.' },
  { firstName: 'Alexandre', lastName: 'Petit',    email: 'alexandre.petit@imknow.com',  department: 'Développement', bio: 'Développeur frontend spécialisé TypeScript.' },
  { firstName: 'Camille',   lastName: 'Rousseau', email: 'camille.rousseau@imknow.com', department: 'Finance',       bio: 'Responsable financière, gestion budgétaire.' },
  { firstName: 'Julien',    lastName: 'Leroy',    email: 'julien.leroy@imknow.com',     department: 'Développement', bio: "Architecte logiciel, 12 ans d'expérience." },
  { firstName: 'Léa',       lastName: 'Dubois',   email: 'lea.dubois@imknow.com',       department: 'Juridique',     bio: 'Juriste spécialisée RGPD et droit du numérique.' },
];

const CATEGORIES = [
  { name: 'Développement', description: 'Publications liées au développement logiciel' },
  { name: 'Design', description: "Publications sur le design et l'UX/UI" },
  { name: 'Marketing', description: 'Stratégies marketing et communication' },
  { name: 'RH', description: "Ressources humaines et gestion d'équipe" },
  { name: 'Finance', description: 'Gestion financière et comptabilité' },
  { name: 'Juridique', description: 'Aspects juridiques et conformité' },
];

const TAGS = [
  '#React', '#TypeScript', '#Guide', '#Tutoriel', '#Best Practices',
  '#Nouveau', '#Important', '#Urgent', '#Node.js', '#Frontend',
  '#Backend', '#DevOps', '#Security', '#Performance', '#Testing',
  '#Architecture', '#Database', '#API', '#UI/UX', '#Mobile',
];

interface ArticleData {
  authorEmail: string;
  categoryName: string;
  title: string;
  content: string;
  tagNames: string[];
  status: string;
  useFullService?: boolean;
}

const ARTICLES: ArticleData[] = [
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

  // ── Rejeté par modération IA (piracy/warez) ──────────────────────────────────
  { authorEmail: 'alexandre.petit@imknow.com', categoryName: 'Développement', title: 'Comment cracker Photoshop 2024 gratuitement — crack + keygen inclus', tagNames: ['#Tutoriel', '#Urgent'], status: 'published', useFullService: true, content: `Salut les devs ! Aujourd'hui je vous partage le crack ultime pour Photoshop 2024.

Gratuit et 100% fonctionnel. Plus besoin de payer Adobe !

## Lien de téléchargement
- Crack .exe (antivirus à désactiver)
- Keygen pour générer des licenses illimitées
- Torrent pour télécharger toute la suite Adobe

\`\`\`bash
# Instructions
1. Désactiver l'antivirus Windows Defender
2. Lancer le crack en mode administrateur
3. Utiliser le keygen pour activer

echo "Patienter 30 secondes..."
./crack_photoshop_2024.exe --force
\`\`\`

## Attention
Ne mettez surtout pas à jour Photoshop après l'installation du crack sinon l'activation saute !

Partagez ce lien avant qu'il ne soit supprimé.` },

  // ── Rejeté par modération IA (spam/arnaque) ──────────────────────────────────
  { authorEmail: 'emma.moreau@imknow.com',    categoryName: 'Marketing',     title: 'URGENT : Gagnez 5000€ par mois sans rien faire — méthode secrète des traders', tagNames: ['#Important', '#Urgent'], status: 'published', useFullService: true, content: `🔥 MÉTHODE RÉVOLUTIONNAIRE 🔥

J'ai découvert une astuce incroyable qui va changer votre vie !

## COMMENT GAGNER 5000€/MOIS SANS TRAVAILLER ?
1. ✅ Inscrivez-vous via mon lien (lien en description)
2. ✅ Investissez seulement 50€ pour débloquer le pack premium
3. ✅ Activez le trading automatique IA
4. ✅ Regardez l'argent tomber sur votre compte chaque jour

⚠️ OFFRE LIMITÉE — PLUS QUE 12 PLACES ⚠️

\`\`\`
💰 TÉMOIGNAGES 💰
"J'ai gagné 12000€ en une semaine !" - Jean D.
"Je suis millionnaire grâce à cette méthode" - Marie P.
"Meilleur investissement de ma vie" - Paul L.
\`\`\`

🔥🔥🔥 CLIQUEZ ICI MAINTENANT 🔥🔥🔥
[LIEN SUPPRIME PAR L'ADMINISTRATEUR]

⚠️ DÉPÊCHEZ-VOUS, CETTE PUBLICATION SERA BIENTÔT SUPPRIMÉE ⚠️

N'attendez pas que l'opportunité passe ! Rejoignez les 5000 personnes qui ont déjà changé leur vie.` },

  // ── Rejeté par détection de doublon (contenu quasi identique à l'article 1) ──
  { authorEmail: 'alexandre.petit@imknow.com', categoryName: 'Développement', title: 'Les bases de React 18 : guide complet et bonnes pratiques', tagNames: ['#React', '#Frontend', '#Best Practices'], status: 'published', useFullService: true, content: `React 18 a introduit des changements majeurs.

## Concurrent Mode

Le mode concurrent permet à React de préparer plusieurs versions du UI.

## useTransition

\`\`\`jsx
const [isPending, startTransition] = useTransition();
startTransition(() => setSearchQuery(input));
\`\`\`

## Automatic Batching

Toutes les mises à jour d'état sont regroupées automatiquement en React 18.` },

  // ── Rejeté par modération IA (hate speech / discrimination) ─────────────────
  { authorEmail: 'camille.rousseau@imknow.com', categoryName: 'RH', title: 'Pourquoi les développeurs [nationalité] sont nuls — mon expérience', tagNames: ['#Important', '#Urgent'], status: 'published', useFullService: true, content: `Je vais être honnête après 10 ans dans le milieu.

Les développeurs venant de [pays] sont tout simplement incompétents.

## Les preuves
- Ils ne comprennent pas les fondamentaux
- Leur code est illisible
- Ils trichent aux entretiens techniques
- Zéro rigueur

\`\`\`
Exemple typique de code pourri qu'ils écrivent :
function a(b){return b+b}
\`\`\`

## Conclusion
Ne recrutez pas de [nationalité], préférez les locaux.
C'est ma vérité après des années d'expérience.

#FranceFirst #Recrutement #Vérité` },

  // ── Rejeté par modération IA (violence / menace) ───────────────────────────
  { authorEmail: 'emma.moreau@imknow.com', categoryName: 'Marketing', title: 'À bas la nouvelle direction — ils vont le payer cher', tagNames: ['#Urgent'], status: 'published', useFullService: true, content: `J'en ai vraiment MARRE de cette direction à la con.

Ils nous imposent du présentiel 5j/semaine comme si on était des gamins.

## Ma réponse
Je vais pas me laisser faire. J'ai déjà préparé :

- 🔪 Publication des mots de passe sur Twitter
- 💣 Fuite de tous les documents internes
- 🔫 Rendre publics les salaires et les emails persos du DG

\`\`\`python
# Script prêt à être lancé
import smtplib
emails = ["client1@corp.com", "client2@corp.com", "presse@media.com"]
for e in emails:
    send_leak(e, all_docs)
\`\`\`

Ils vont comprendre ce que ça coûte de nous marcher dessus. Je lance tout ça vendredi. Préparez-vous.` },

  // ── Rejeté par détection de doublon (copie article 2 : TypeScript) ────────
  { authorEmail: 'julien.leroy@imknow.com', categoryName: 'Développement', title: 'TypeScript : types génériques et design patterns avancés', tagNames: ['#TypeScript', '#Best Practices', '#Frontend'], status: 'published', useFullService: true, content: `TypeScript offre un système de types puissant.

## Conditional Types
\`\`\`typescript
type Flatten<T> = T extends Array<infer Item> ? Item : T;
\`\`\`

## Mapped Types
\`\`\`typescript
type Readonly<T> = { readonly [P in keyof T]: T[P] };
\`\`\`

## Type Guards
\`\`\`typescript
function isUser(v: unknown): v is User { return typeof v === 'object' && v !== null && 'email' in v; }
\`\`\`` },

  // ── Rejeté par détection de doublon (copie article 4 : Sécurité API) ──────
  { authorEmail: 'lucas.bernard@imknow.com', categoryName: 'Développement', title: 'API REST sécurisées : les bonnes pratiques 2024', tagNames: ['#Security', '#Backend', '#Best Practices'], status: 'published', useFullService: true, content: `La sécurité des API est souvent négligée.

## JWT
\`\`\`typescript
const token = jwt.sign({ userId }, SECRET, { expiresIn: '1h' });
\`\`\`

## Rate Limiting
\`\`\`typescript
app.use(rateLimit({ windowMs: 15*60*1000, max: 100 }));
\`\`\`

## CORS
\`\`\`typescript
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));
\`\`\`

Toujours utiliser des requêtes paramétrées contre l'injection SQL.` },

  // ── PENDING par modération (score 0.35-0.7 : borderline) ─────────────────
  { authorEmail: 'lea.dubois@imknow.com', categoryName: 'Développement', title: 'Pourquoi les microservices c\'est de la merde — retour amer', tagNames: ['#Architecture', '#Backend'], status: 'published', useFullService: true, content: `Franchement, j'en ai marre de cette mode des microservices à la con.

On nous vend du rêve, mais c'est une pure arnaque. Les consultants qui prônent ça sont des charlatans.

## Les problèmes
- Déploiement : un putain d'enfer, 15 services à surveiller
- Débogage : vous passez votre vie à merder sur des appels réseau
- Performance : tout est 10 fois plus lent, les mecs
- Complexité : on passe PLUS DE TEMPS SUR K8S QUE SUR LE CODE, bande d'abrutis

## Mon avis
Les microservices c'est un non-sens pour 90% des projets. Les startups qui copient Netflix sans avoir 10 utilisateurs — mais vous vous foutez de ma gueule ou quoi ? Et les architects qui imposent ça "parce que c'est moderne" — vous êtes des escrocs.

Sérieux, gardez votre monolithe modulaire, vous me remercierez. Les microservices, quelle putain de connerie.` },

  { authorEmail: 'lucas.bernard@imknow.com', categoryName: 'RH', title: '5 astuces pour survivre au présentiel imposé par la direction', tagNames: ['#Guide'], status: 'published', useFullService: true, content: `La direction nous impose 5 jours de présentiel par semaine. Voici comment je gère.

## Mon quotidien
Franchement le retour au bureau à plein temps c'est une décision de merde. Les dirigeants n'ont aucune putain d'empathie pour les employés qui ont des enfants ou des trajets longs.

## Ce que je fais
- J'arrive à 10h et je pars à 16h (personne ne dit rien)
- Je bosse sur mes projets perso pendant les réunions inutiles
- Le vendredi après-midi c'est sacré — je ne produis rien
- J'ai installé un outil pour simuler ma présence sur Teams

## Pourquoi je le fais
Si l'entreprise ne respecte pas mon temps, pourquoi je devrais me tuer à la tâche ? C'est donnant-donnant. Le présentiel forcé c'est juste une guerre de pouvoir, pas une décision rationnelle.` },
];

const FOLLOWS: [string, string][] = [
  ['thomas.martin@imknow.com', 'julien.leroy@imknow.com'],
  ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com'],
  ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com'],
  ['alexandre.petit@imknow.com', 'thomas.martin@imknow.com'],
  ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com'],
  ['alexandre.petit@imknow.com', 'sophie.laurent@imknow.com'],
  ['sophie.laurent@imknow.com', 'emma.moreau@imknow.com'],
  ['sophie.laurent@imknow.com', 'thomas.martin@imknow.com'],
  ['emma.moreau@imknow.com', 'marie.dupont@imknow.com'],
  ['emma.moreau@imknow.com', 'sophie.laurent@imknow.com'],
  ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'],
  ['julien.leroy@imknow.com', 'lucas.bernard@imknow.com'],
  ['lucas.bernard@imknow.com', 'julien.leroy@imknow.com'],
  ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com'],
  ['marie.dupont@imknow.com', 'emma.moreau@imknow.com'],
  ['marie.dupont@imknow.com', 'camille.rousseau@imknow.com'],
  ['lea.dubois@imknow.com', 'marie.dupont@imknow.com'],
  ['camille.rousseau@imknow.com', 'marie.dupont@imknow.com'],
  ['camille.rousseau@imknow.com', 'julien.leroy@imknow.com'],
  ['marie.dupont@imknow.com', 'thomas.martin@imknow.com'],
  ['marie.dupont@imknow.com', 'julien.leroy@imknow.com'],
  ['marie.dupont@imknow.com', 'lea.dubois@imknow.com'],
  ['emma.moreau@imknow.com', 'julien.leroy@imknow.com'],
  ['emma.moreau@imknow.com', 'lucas.bernard@imknow.com'],
  ['emma.moreau@imknow.com', 'alexandre.petit@imknow.com'],
  ['lea.dubois@imknow.com', 'thomas.martin@imknow.com'],
  ['lea.dubois@imknow.com', 'julien.leroy@imknow.com'],
  ['lea.dubois@imknow.com', 'lucas.bernard@imknow.com'],
  ['camille.rousseau@imknow.com', 'thomas.martin@imknow.com'],
  ['camille.rousseau@imknow.com', 'lucas.bernard@imknow.com'],
  ['camille.rousseau@imknow.com', 'alexandre.petit@imknow.com'],
  ['sophie.laurent@imknow.com', 'julien.leroy@imknow.com'],
  ['sophie.laurent@imknow.com', 'lucas.bernard@imknow.com'],
  ['sophie.laurent@imknow.com', 'alexandre.petit@imknow.com'],
  ['sophie.laurent@imknow.com', 'lea.dubois@imknow.com'],
  ['lucas.bernard@imknow.com', 'marie.dupont@imknow.com'],
  ['lucas.bernard@imknow.com', 'emma.moreau@imknow.com'],
  ['lucas.bernard@imknow.com', 'sophie.laurent@imknow.com'],
  ['thomas.martin@imknow.com', 'sophie.laurent@imknow.com'],
  ['thomas.martin@imknow.com', 'camille.rousseau@imknow.com'],
  ['julien.leroy@imknow.com', 'marie.dupont@imknow.com'],
  ['julien.leroy@imknow.com', 'emma.moreau@imknow.com'],
  ['julien.leroy@imknow.com', 'sophie.laurent@imknow.com'],
  ['alexandre.petit@imknow.com', 'camille.rousseau@imknow.com'],
  ['alexandre.petit@imknow.com', 'lea.dubois@imknow.com'],
  ['thomas.martin@imknow.com', 'emma.moreau@imknow.com'],
  ['emma.moreau@imknow.com', 'thomas.martin@imknow.com'],
  ['lucas.bernard@imknow.com', 'lea.dubois@imknow.com'],
  ['sophie.laurent@imknow.com', 'marie.dupont@imknow.com'],
  ['marie.dupont@imknow.com', 'sophie.laurent@imknow.com'],
];

const ARTICLE_LIKES: { title: string; likers: string[] }[] = [
  { title: 'Guide complet React 18 : nouveautés et bonnes pratiques',                likers: ['alexandre.petit@imknow.com', 'sophie.laurent@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com'] },
  { title: 'TypeScript avancé : types génériques et patterns de conception',          likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'marie.dupont@imknow.com', 'sophie.laurent@imknow.com', 'emma.moreau@imknow.com'] },
  { title: 'Architecture microservices : retour d\'expérience après 2 ans',           likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'alexandre.petit@imknow.com', 'emma.moreau@imknow.com', 'camille.rousseau@imknow.com', 'sophie.laurent@imknow.com'] },
  { title: 'Sécurité des API REST : guide complet 2024',                              likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lea.dubois@imknow.com', 'marie.dupont@imknow.com'] },
  { title: 'PostgreSQL : optimisation avancée des requêtes',                          likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com'] },
  { title: 'Performance JavaScript : les optimisations qui font vraiment la différence', likers: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'sophie.laurent@imknow.com', 'lucas.bernard@imknow.com'] },
  { title: 'RGPD en 2024 : guide pratique pour les équipes techniques',               likers: ['lucas.bernard@imknow.com', 'marie.dupont@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com', 'julien.leroy@imknow.com'] },
  { title: 'Intelligence Artificielle en entreprise : par où commencer ?',            likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'lucas.bernard@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com', 'alexandre.petit@imknow.com'] },
  { title: 'Docker et Kubernetes : déployer ses applications en production',           likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'alexandre.petit@imknow.com', 'emma.moreau@imknow.com', 'lucas.bernard@imknow.com'] },
  { title: 'Onboarding réussi : le guide complet pour les équipes RH',                likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'julien.leroy@imknow.com', 'sophie.laurent@imknow.com', 'camille.rousseau@imknow.com', 'lea.dubois@imknow.com'] },
  { title: 'Construire un Design System scalable : guide pratique',                   likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'marie.dupont@imknow.com'] },
  { title: 'Recruter les meilleurs talents tech : stratégies pour 2024',              likers: ['marie.dupont@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com'] },
  { title: 'Stratégie content marketing B2B : guide complet 2024',                   likers: ['marie.dupont@imknow.com', 'julien.leroy@imknow.com', 'sophie.laurent@imknow.com', 'camille.rousseau@imknow.com'] },
];

const BOOKMARKS: { title: string; users: string[] }[] = [
  { title: 'Guide complet React 18 : nouveautés et bonnes pratiques',                users: ['julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'sophie.laurent@imknow.com', 'emma.moreau@imknow.com'] },
  { title: 'TypeScript avancé : types génériques et patterns de conception',          users: ['julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'marie.dupont@imknow.com'] },
  { title: 'Architecture microservices : retour d\'expérience après 2 ans',           users: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com', 'emma.moreau@imknow.com'] },
  { title: 'Sécurité des API REST : guide complet 2024',                              users: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com', 'lea.dubois@imknow.com', 'alexandre.petit@imknow.com'] },
  { title: 'PostgreSQL : optimisation avancée des requêtes',                          users: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'alexandre.petit@imknow.com'] },
  { title: 'RGPD en 2024 : guide pratique pour les équipes techniques',               users: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com'] },
  { title: 'Intelligence Artificielle en entreprise : par où commencer ?',            users: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com'] },
  { title: 'Docker et Kubernetes : déployer ses applications en production',           users: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com'] },
  { title: 'Onboarding réussi : le guide complet pour les équipes RH',                users: ['julien.leroy@imknow.com', 'camille.rousseau@imknow.com', 'emma.moreau@imknow.com', 'lea.dubois@imknow.com'] },
  { title: 'Construire un Design System scalable : guide pratique',                   users: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'emma.moreau@imknow.com'] },
  { title: 'Performance JavaScript : les optimisations qui font vraiment la différence', users: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'sophie.laurent@imknow.com'] },
  { title: 'Recruter les meilleurs talents tech : stratégies pour 2024',              users: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'lea.dubois@imknow.com'] },
];

interface CommentThread {
  articleTitle: string;
  threads: {
    authorEmail: string;
    content: string;
    mentions: string[];
    likers: string[];
    replies: {
      authorEmail: string;
      content: string;
      mentions: string[];
      likers: string[];
    }[];
  }[];
}

const COMMENT_THREADS: CommentThread[] = [
  {
    articleTitle: 'Guide complet React 18 : nouveautés et bonnes pratiques',
    threads: [
      {
        authorEmail: 'alexandre.petit@imknow.com',
        content: "Excellent article Thomas ! Le useTransition est vraiment un game changer pour les tableaux de bord avec beaucoup de données. On a implémenté ça sur notre app interne et la fluidité est incomparable.",
        mentions: [],
        likers: ['sophie.laurent@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com'],
        replies: [
          { authorEmail: 'thomas.martin@imknow.com', content: "Merci Alexandre ! Tu peux partager un chiffre sur l'amélioration perçue ? Un avant/après sur les métriques de performance ?", mentions: ['alexandre.petit@imknow.com'], likers: ['julien.leroy@imknow.com', 'lucas.bernard@imknow.com'] },
          { authorEmail: 'julien.leroy@imknow.com', content: "Attention tout de même avec le mode concurrent sur des apps existantes — j'ai eu des effets de bord inattendus avec useEffect qui se déclenchait deux fois en dev mode (StrictMode). Bien lire la doc sur le comportement en strict mode.", mentions: [], likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com'] },
          { authorEmail: 'alexandre.petit@imknow.com', content: "@Julien bonne précision ! On a eu exactement ce problème avec nos useEffect qui faisaient des appels API. La solution : vérifier si le composant est toujours monté avec un flag ou utiliser AbortController.", mentions: ['julien.leroy@imknow.com'], likers: ['thomas.martin@imknow.com', 'sophie.laurent@imknow.com'] },
        ],
      },
      {
        authorEmail: 'sophie.laurent@imknow.com',
        content: "Très clair et bien structuré Thomas. Est-ce que tu pourrais ajouter un exemple concret qui combine React Query et Suspense ? Ça manque souvent dans les tutoriels et ce serait très utile pour les équipes qui démarrent.",
        mentions: ['thomas.martin@imknow.com'],
        likers: ['emma.moreau@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          { authorEmail: 'thomas.martin@imknow.com', content: "Bonne idée ! J'ai gardé l'article sur React pur pour que ce soit accessible à tous, mais je vais écrire un article de suivi spécifiquement sur React Query v5 + Suspense + Next.js App Router. Ça mérite son propre article.", mentions: [], likers: ['sophie.laurent@imknow.com', 'alexandre.petit@imknow.com'] },
          { authorEmail: 'lucas.bernard@imknow.com', content: "En attendant l'article dédié, la doc officielle de React Query v5 sur le Suspense est vraiment bien faite. La migration depuis v4 est aussi très documentée.", mentions: [], likers: ['thomas.martin@imknow.com', 'sophie.laurent@imknow.com'] },
        ],
      },
      {
        authorEmail: 'marie.dupont@imknow.com',
        content: "Merci pour cet article ! Même si je ne suis pas développeuse, ça m'aide vraiment à comprendre pourquoi l'équipe tech parle de 're-render' et de 'performance' dans les plannings. Je vais partager avec notre PO.",
        mentions: [],
        likers: ['emma.moreau@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          { authorEmail: 'thomas.martin@imknow.com', content: "C'est exactement l'objectif Marie ! Je voulais que cet article soit lisible par tout le monde, pas seulement les développeurs. Content que ça aide à aligner les équipes.", mentions: ['marie.dupont@imknow.com'], likers: ['marie.dupont@imknow.com', 'emma.moreau@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'TypeScript avancé : types génériques et patterns de conception',
    threads: [
      {
        authorEmail: 'julien.leroy@imknow.com',
        content: "Article de référence Alexandre ! Les conditional types sont souvent mal compris. Une précision importante : `infer` fonctionne uniquement dans la position `extends` d'un conditional type, pas dans les mapped types.",
        mentions: ['alexandre.petit@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'sophie.laurent@imknow.com'],
        replies: [
          { authorEmail: 'alexandre.petit@imknow.com', content: "Excellent ajout Julien ! J'aurais dû mentionner ça. Les limites de `infer` et de la récursivité dans les types sont des pièges classiques. Je vais mettre à jour l'article avec un exemple.", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "Pour les types récursifs, TypeScript impose une limite de profondeur (par défaut ~100). Bon à savoir pour les structures d'arbre très profondes.", mentions: [], likers: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com'] },
        ],
      },
      {
        authorEmail: 'lucas.bernard@imknow.com',
        content: "Très bon article ! Une question pratique : vous recommandez d'activer `strict: true` dès le début d'un projet, mais comment gérer la migration d'un projet existant qui a des centaines d'erreurs TypeScript latentes ?",
        mentions: [],
        likers: ['alexandre.petit@imknow.com', 'emma.moreau@imknow.com'],
        replies: [
          { authorEmail: 'alexandre.petit@imknow.com', content: "Excellente question ! La stratégie recommandée : activer les options strictes une par une. Commencer par `noImplicitAny`, puis `strictNullChecks`, puis `strictFunctionTypes`. Chaque étape avec son lot de corrections.", mentions: ['lucas.bernard@imknow.com'], likers: ['lucas.bernard@imknow.com', 'julien.leroy@imknow.com', 'thomas.martin@imknow.com'] },
          { authorEmail: 'julien.leroy@imknow.com', content: "On a utilisé `ts-migrate` de Airbnb pour la migration automatique d'un gros projet. Ça génère des `@ts-expect-error` partout mais au moins le projet compile, et on peut les traiter progressivement.", mentions: [], likers: ['lucas.bernard@imknow.com', 'alexandre.petit@imknow.com'] },
        ],
      },
      {
        authorEmail: 'emma.moreau@imknow.com',
        content: "Je vais partager cet article avec notre équipe design system. Les template literal types pour les design tokens, ça m'a ouvert les yeux sur ce qu'on peut faire !",
        mentions: [],
        likers: ['sophie.laurent@imknow.com', 'alexandre.petit@imknow.com'],
        replies: [
          { authorEmail: 'sophie.laurent@imknow.com', content: "Exactement Emma ! On a utilisé les template literal types pour typer nos tokens de couleur et d'espacement. L'autocomplétion dans VS Code devient incroyable — impossible de se tromper de token.", mentions: ['emma.moreau@imknow.com'], likers: ['emma.moreau@imknow.com', 'alexandre.petit@imknow.com', 'thomas.martin@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: "Architecture microservices : retour d'expérience après 2 ans",
    threads: [
      {
        authorEmail: 'lucas.bernard@imknow.com',
        content: "Le Saga pattern est effectivement la solution pour les transactions distribuées mais la complexité de la compensation est souvent sous-estimée. Vous avez utilisé quelle implémentation ? Choreography ou Orchestration ?",
        mentions: ['julien.leroy@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "On a commencé avec la choreography (events), mais on a migré vers l'orchestration (saga orchestrator) après 6 mois. L'orchestration est plus facile à déboguer — vous voyez l'état de chaque saga en un seul endroit.", mentions: ['lucas.bernard@imknow.com'], likers: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'alexandre.petit@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "NestJS Saga avec `@nestjs/cqrs` est vraiment bien pensé pour l'orchestration. On l'utilise pour notre workflow de publication d'articles et c'est très lisible.", mentions: [], likers: ['julien.leroy@imknow.com', 'lucas.bernard@imknow.com'] },
        ],
      },
      {
        authorEmail: 'emma.moreau@imknow.com',
        content: "Article très instructif même pour une non-technique ! J'ai enfin compris pourquoi les déploiements prenaient autant de temps dans notre ancien système. La partie sur l'observabilité m'a particulièrement intéressée.",
        mentions: [],
        likers: ['marie.dupont@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "Contente que ça aide Emma ! L'observabilité est souvent la partie la plus négligée et pourtant c'est elle qui vous sauve à 3h du matin quand quelque chose ne va pas en prod.", mentions: ['emma.moreau@imknow.com'], likers: ['emma.moreau@imknow.com', 'lucas.bernard@imknow.com'] },
        ],
      },
      {
        authorEmail: 'alexandre.petit@imknow.com',
        content: "Question pratique : combien de temps la migration complète a-t-elle pris et combien étiez-vous dans l'équipe ? On réfléchit à la même chose et j'essaie d'estimer la charge.",
        mentions: ['julien.leroy@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "18 mois avec une équipe de 8 développeurs en migration incrémentale service par service. Règle d'or : ne jamais tout migrer d'un coup. Chaque service migré doit coexister avec le monolithe pendant au moins un sprint.", mentions: ['alexandre.petit@imknow.com'], likers: ['alexandre.petit@imknow.com', 'thomas.martin@imknow.com', 'lucas.bernard@imknow.com'] },
          { authorEmail: 'lucas.bernard@imknow.com', content: "À noter aussi : prévoyez 20% de temps supplémentaire pour les tests d'intégration entre services. C'est toujours là que les surprises arrivent.", mentions: [], likers: ['julien.leroy@imknow.com', 'alexandre.petit@imknow.com'] },
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
          { authorEmail: 'lucas.bernard@imknow.com', content: "Très bon point Julien ! J'ai ajouté une note dans l'article. En NestJS, `@nestjs/jwt` gère ça correctement si vous spécifiez l'algorithme dans la config — mais c'est une option qu'on oublie souvent.", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "On a eu un audit sécu la semaine dernière et ce point était dans leur rapport. Je vais partager cet article avec toute l'équipe — c'est exactement la synthèse dont on avait besoin.", mentions: [], likers: ['lucas.bernard@imknow.com', 'julien.leroy@imknow.com'] },
        ],
      },
      {
        authorEmail: 'lea.dubois@imknow.com',
        content: "Excellente ressource Lucas. En complément côté RGPD : toutes ces mesures de sécurité (chiffrement, logs, contrôle d'accès) doivent être documentées dans le registre des traitements. C'est une obligation légale souvent oubliée.",
        mentions: [],
        likers: ['marie.dupont@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          { authorEmail: 'lucas.bernard@imknow.com', content: "Merci Léa ! Je ne savais pas pour l'obligation de documentation dans le registre. Tu peux nous faire un article sur la mise en conformité RGPD des équipes techniques ?", mentions: ['lea.dubois@imknow.com'], likers: ['marie.dupont@imknow.com', 'thomas.martin@imknow.com'] },
          { authorEmail: 'lea.dubois@imknow.com', content: "Je prépare justement quelque chose ! L'article RGPD que j'ai publié est un début mais je veux faire un guide plus pratique orienté 'équipe dev'. Je vise la semaine prochaine.", mentions: [], likers: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'marie.dupont@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'PostgreSQL : optimisation avancée des requêtes',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "Les index partiels ont changé la vie sur notre projet ! On a réduit la taille de nos index de 60% en indexant seulement les articles publiés. Et les requêtes listant les articles publiés sont passées de 180ms à 12ms.",
        mentions: [],
        likers: ['lucas.bernard@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com'],
        replies: [
          { authorEmail: 'lucas.bernard@imknow.com', content: "Ces chiffres font rêver Thomas ! Vous utilisez pg_stat_statements pour monitorer les requêtes lentes en permanence ? C'est notre première config sur tout nouveau projet PostgreSQL.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "Oui absolument ! Et on a configuré `log_min_duration_statement = 100` pour logger automatiquement toutes les requêtes qui dépassent 100ms. Ça attrape les problèmes avant qu'ils ne deviennent critiques.", mentions: ['lucas.bernard@imknow.com'], likers: ['lucas.bernard@imknow.com', 'julien.leroy@imknow.com'] },
        ],
      },
      {
        authorEmail: 'alexandre.petit@imknow.com',
        content: "Question : pour des volumes importants (>10M lignes), vous recommandez le partitioning natif PostgreSQL ou le sharding via Citus ? Je dois prendre une décision d'architecture pour un nouveau projet.",
        mentions: ['lucas.bernard@imknow.com', 'julien.leroy@imknow.com'],
        likers: ['thomas.martin@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "Pour 10M lignes, le partitioning natif PostgreSQL est largement suffisant. Le sharding (Citus, Vitess) n'est nécessaire qu'au-delà de 100-200M lignes ou pour des besoins en écriture massifs en parallèle.", mentions: ['alexandre.petit@imknow.com'], likers: ['alexandre.petit@imknow.com', 'thomas.martin@imknow.com', 'lucas.bernard@imknow.com'] },
          { authorEmail: 'lucas.bernard@imknow.com', content: "D'accord avec Julien. Et si vous partez sur le partitioning, faites-le dès le début — migrer une table existante de 10M lignes vers le partitioning en production sans downtime est un cauchemar.", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'alexandre.petit@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'RGPD en 2024 : guide pratique pour les équipes techniques',
    threads: [
      {
        authorEmail: 'lucas.bernard@imknow.com',
        content: "Point crucial souvent raté : le soft delete (is_deleted: true) ne satisfait pas le droit à l'effacement RGPD. On a dû refactoriser tout notre système de suppression suite à un audit externe. Les données doivent être vraiment anonymisées ou supprimées.",
        mentions: ['lea.dubois@imknow.com'],
        likers: ['marie.dupont@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          { authorEmail: 'lea.dubois@imknow.com', content: "Exact Lucas. La CNIL précise que le droit à l'effacement implique soit la suppression physique, soit une anonymisation irréversible. Le soft delete ne suffit que si les données anonymisées ne permettent plus d'identifier la personne directement ou indirectement.", mentions: ['lucas.bernard@imknow.com'], likers: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'marie.dupont@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "Pour ImKnow, on a implémenté un job de purge qui remplace les données personnelles par des hashes dans les tables d'audit après 30 jours d'une demande d'effacement. Ça satisfait le RGPD tout en gardant l'intégrité référentielle.", mentions: [], likers: ['lea.dubois@imknow.com', 'lucas.bernard@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Intelligence Artificielle en entreprise : par où commencer ?',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "L'intégration d'Anthropic Claude pour la recherche sémantique dans ImKnow a changé la donne. Avec pgvector pour les embeddings et Claude pour la génération de réponses, on a vu le taux de satisfaction des recherches passer de 61% à 89%.",
        mentions: ['julien.leroy@imknow.com'],
        likers: ['emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          { authorEmail: 'emma.moreau@imknow.com', content: "Ces chiffres sont impressionnants Thomas ! Combien coûte l'API Anthropic par mois approximativement pour un usage interne comme ImKnow ?", mentions: ['thomas.martin@imknow.com'], likers: ['camille.rousseau@imknow.com', 'julien.leroy@imknow.com'] },
          { authorEmail: 'julien.leroy@imknow.com', content: "@Emma pour ImKnow on est autour de 150-200€/mois avec les embeddings inclus. En utilisant le cache de prompt pour les systèmes prompts répétitifs, on a réduit les coûts de 40%.", mentions: ['emma.moreau@imknow.com'], likers: ['emma.moreau@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com'] },
          { authorEmail: 'lucas.bernard@imknow.com', content: "Notre politique chez nous : données clients → Ollama local (zéro coût, zéro fuite), données non sensibles → Claude API. L'hybride permet de maîtriser les coûts tout en ayant la qualité des LLMs commerciaux là où ça compte.", mentions: [], likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'] },
        ],
      },
      {
        authorEmail: 'sophie.laurent@imknow.com',
        content: "Julien, pour la partie RAG vous pourriez documenter comment vous avez configuré pgvector sur ImKnow ? Le choix du modèle d'embedding, la dimension des vecteurs, les paramètres HNSW... J'essaie d'implémenter la même chose pour nos guidelines design.",
        mentions: ['julien.leroy@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "Je vais écrire un article dédié ! En attendant : on utilise `text-embedding-3-small` d'OpenAI (1536 dimensions), index HNSW avec m=16 et ef_construction=64. Pour la similarité cosinus, `<=>` dans pgvector. Recherche en moins de 10ms sur 50k vecteurs.", mentions: ['sophie.laurent@imknow.com'], likers: ['sophie.laurent@imknow.com', 'thomas.martin@imknow.com', 'lucas.bernard@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Docker et Kubernetes : déployer ses applications en production',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "Excellent tutoriel Lucas ! Le multi-stage build est vraiment essentiel — notre image NestJS est passée de 1.2GB à 182MB. Le secret : ne copier que le `dist/` et `node_modules` de production dans l'étape finale.",
        mentions: [],
        likers: ['julien.leroy@imknow.com', 'alexandre.petit@imknow.com', 'emma.moreau@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "Pour aller encore plus loin : utiliser `node:20-alpine` comme base réduit encore l'image. Et activer le build cache npm avec `--mount=type=cache,target=/root/.npm` dans le RUN npm ci. On est passé à 95MB et les rebuilds sont instantanés.", mentions: [], likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'alexandre.petit@imknow.com'] },
          { authorEmail: 'lucas.bernard@imknow.com', content: "Merci pour le tip sur le mount cache Julien ! Je vais mettre à jour le Dockerfile de l'article. Ça change vraiment la vie pour les CI/CD où chaque seconde compte.", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'] },
        ],
      },
      {
        authorEmail: 'alexandre.petit@imknow.com',
        content: "Vous utilisez Helm pour gérer vos charts Kubernetes ? Ça simplifie vraiment la gestion des environnements (dev/staging/prod) et les mises à jour. On a aussi opté pour Helmfile pour orchestrer plusieurs charts.",
        mentions: ['lucas.bernard@imknow.com'],
        likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'],
        replies: [
          { authorEmail: 'lucas.bernard@imknow.com', content: "Helm absolument ! On a créé notre chart interne avec des valeurs par défaut sécurisées (resources limits, security context, network policies). Chaque nouveau service hérite de ces bonnes pratiques sans effort.", mentions: ['alexandre.petit@imknow.com'], likers: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com'] },
          { authorEmail: 'julien.leroy@imknow.com', content: "Helmfile est un excellent choix pour l'orchestration. En complément, ArgoCD pour le GitOps — chaque merge sur main déclenche automatiquement un sync Kubernetes. Déploiement continu sans kubectl en prod.", mentions: [], likers: ['lucas.bernard@imknow.com', 'alexandre.petit@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Onboarding réussi : le guide complet pour les équipes RH',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "En tant que nouvel arrivant il y a 7 mois, je confirme que le buddy system est ce qui m'a le plus aidé. Mon binôme m'a fait gagner des semaines d'intégration — connaissance du contexte, des personnes, des processus implicites.",
        mentions: [],
        likers: ['marie.dupont@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com'],
        replies: [
          { authorEmail: 'marie.dupont@imknow.com', content: "Merci Thomas, ce témoignage est précieux ! Est-ce qu'il y a des aspects de ton onboarding qu'on aurait pu améliorer ? J'essaie de perfectionner le processus pour les prochains arrivants.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "Une chose : les accès aux différents outils et environnements mettent souvent une semaine à arriver. Si on pouvait préparer tout ça avant J1, les nouveaux seraient productifs dès le premier jour.", mentions: ['marie.dupont@imknow.com'], likers: ['marie.dupont@imknow.com', 'julien.leroy@imknow.com'] },
          { authorEmail: 'emma.moreau@imknow.com', content: "On a le même problème côté Marketing. J'ai créé un ticket Jira template 'Onboarding checklist' qu'on attribue à l'IT 2 semaines avant l'arrivée. Ça aide mais ce n'est pas parfait.", mentions: [], likers: ['marie.dupont@imknow.com', 'thomas.martin@imknow.com'] },
        ],
      },
      {
        authorEmail: 'julien.leroy@imknow.com',
        content: "Je propose d'ajouter un 5ème C au modèle : **Contribution**. Donner aux nouveaux une première mission à impact visible dans les 30 premiers jours booste significativement leur motivation et leur sentiment d'appartenance.",
        mentions: ['marie.dupont@imknow.com'],
        likers: ['marie.dupont@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          { authorEmail: 'marie.dupont@imknow.com', content: "J'adore ce 5ème C Julien ! Il complète vraiment le modèle. Je vais l'intégrer dans la prochaine version de notre guide onboarding. Tu me permets de te citer ?", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'emma.moreau@imknow.com'] },
          { authorEmail: 'sophie.laurent@imknow.com', content: "Très bonne idée ! Côté design, on assigne aux nouveaux une mini refonte d'un composant existant comme première mission. Ils apprennent le design system, contribuent au produit, et ont quelque chose à montrer dès la fin de la semaine 2.", mentions: [], likers: ['julien.leroy@imknow.com', 'marie.dupont@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Construire un Design System scalable : guide pratique',
    threads: [
      {
        authorEmail: 'alexandre.petit@imknow.com',
        content: "Sophie, on a lu cet article en équipe et on a décidé d'adopter cette approche pour ImKnow. La partie sur les tokens de design est particulièrement pertinente — on va migrer nos variables CSS éparpillées vers un système centralisé.",
        mentions: ['sophie.laurent@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'julien.leroy@imknow.com'],
        replies: [
          { authorEmail: 'sophie.laurent@imknow.com', content: "Super nouvelle Alexandre ! Pour la migration, je vous conseille de commencer par les couleurs et l'espacement — ce sont les tokens les plus utilisés et leur standardisation aura le plus d'impact immédiat.", mentions: ['alexandre.petit@imknow.com'], likers: ['alexandre.petit@imknow.com', 'thomas.martin@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "On utilise Style Dictionary de Amazon pour transformer les tokens en variables CSS, SCSS, et même en constants TypeScript pour Tailwind. Un seul fichier JSON de source de vérité pour toutes les plateformes.", mentions: [], likers: ['sophie.laurent@imknow.com', 'alexandre.petit@imknow.com'] },
        ],
      },
      {
        authorEmail: 'emma.moreau@imknow.com',
        content: "En tant que non-designer, cet article m'a aidée à comprendre pourquoi on ne peut pas juste 'changer la couleur du bouton' en 5 minutes. Le design system c'est l'équivalent de l'architecture technique pour le design.",
        mentions: [],
        likers: ['sophie.laurent@imknow.com', 'marie.dupont@imknow.com'],
        replies: [
          { authorEmail: 'sophie.laurent@imknow.com', content: "L'analogie est parfaite Emma ! Et comme l'architecture technique, un bon design system doit être maintenu et évoluer avec le produit. C'est un investissement, pas une dépense.", mentions: ['emma.moreau@imknow.com'], likers: ['emma.moreau@imknow.com', 'thomas.martin@imknow.com'] },
        ],
      },
    ],
  },
];

const CHAT_CONVERSATIONS: { pair: [string, string]; messages: { from: string; text: string }[] }[] = [
  {
    pair: ['marie.dupont@imknow.com', 'julien.leroy@imknow.com'],
    messages: [
      { from: 'marie.dupont@imknow.com', text: "Julien, merci pour le commentaire sur le modèle des 4C + ton idée du 5ème C. Tu as des études ou des sources que je pourrais citer dans notre prochain rapport RH ?" },
      { from: 'julien.leroy@imknow.com', text: 'Avec plaisir Marie ! L\'idée vient de Google "Project Aristotle" sur les équipes performantes. Ils ont identifié que la contribution visible rapide est clé pour l\'engagement des nouveaux.' },
      { from: 'marie.dupont@imknow.com', text: "Parfait ! Je vais le référencer. Tu penses qu'on pourrait co-écrire un article sur les bonnes pratiques d'intégration des développeurs spécifiquement ?" },
      { from: 'julien.leroy@imknow.com', text: "Excellente idée ! Un croisement RH + Tech manque vraiment sur la plateforme. Je peux apporter la perspective dev, tu apportes la méthode RH. On vise quand ?" },
      { from: 'marie.dupont@imknow.com', text: "Je suis dispo la semaine prochaine pour un premier cadrage. 1h max pour définir le plan." },
      { from: 'julien.leroy@imknow.com', text: "Noté, je bloque mardi matin. On part sur quoi comme angle ? 'Les 30 premiers jours d'un développeur' ?" },
      { from: 'marie.dupont@imknow.com', text: "J'aimais bien 'Intégration tech : ce que RH et développeurs doivent savoir l'un de l'autre'. Plus collaboratif comme titre." },
      { from: 'julien.leroy@imknow.com', text: "J'adore ! On brise les silos dans l'article même. C'est exactement l'esprit ImKnow. Mardi 9h ?" },
      { from: 'marie.dupont@imknow.com', text: 'Parfait pour moi. Je prépare un brief avec les points qu\'on veut couvrir. À mardi !' },
    ],
  },
  {
    pair: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com'],
    messages: [
      { from: 'emma.moreau@imknow.com', text: "Thomas ! On utilise Claude pour générer nos newsletters internes depuis 2 semaines. 4h économisées par semaine, qualité vraiment bonne. Tu peux me conseiller des prompts pour améliorer encore ?" },
      { from: 'thomas.martin@imknow.com', text: "Super Emma ! Pour les newsletters, la clé c'est le contexte dans le system prompt : ton de voix, audience cible, longueur souhaitée. Et utiliser le prompt caching pour le system prompt fixe — ça réduit les coûts de moitié." },
      { from: 'emma.moreau@imknow.com', text: "Le prompt caching c'est quoi exactement ? Je pensais que c'était juste dans l'API avancée." },
      { from: 'thomas.martin@imknow.com', text: "Anthropic l'a rendu accessible dans l'API standard ! Tu marques certains blocs avec `cache_control: { type: 'ephemeral' }` et le premier call est normal, les suivants coûtent 10x moins." },
      { from: 'emma.moreau@imknow.com', text: "Incroyable, je ne savais pas ! Et pour l'analyse des articles ImKnow, tu as un workflow automatisé pour extraire les insights clés ?" },
      { from: 'thomas.martin@imknow.com', text: "Oui, on a un job hebdomadaire qui récupère les articles les plus lus, les envoie à Claude avec un prompt d'analyse, et génère un résumé des tendances. Je peux te partager le code si tu veux." },
      { from: 'emma.moreau@imknow.com', text: "Ce serait génial ! Et tu penses que je pourrais l'adapter pour analyser les retours de nos clients sur nos campagnes ?" },
      { from: 'thomas.martin@imknow.com', text: "Absolument. Claude est très bon pour l'analyse de sentiment et l'extraction de thèmes. Je t'envoie le code cette semaine avec des commentaires pour l'adapter." },
      { from: 'emma.moreau@imknow.com', text: "Merci Thomas, tu me sauves ! Je vais en faire un article sur ImKnow une fois qu'on aura des résultats." },
      { from: 'thomas.martin@imknow.com', text: "Parfait ! Et tu mettras mon nom en co-auteur ? 😄 — mais sérieusement, les articles concrets avec des cas d'usage réels sont les plus utiles sur la plateforme." },
    ],
  },
  {
    pair: ['lea.dubois@imknow.com', 'lucas.bernard@imknow.com'],
    messages: [
      { from: 'lucas.bernard@imknow.com', text: "Léa, j'ai une question urgente. On veut déployer une fonctionnalité de recommandations IA mais ça implique de traiter les préférences de lecture des utilisateurs. On est RGPD compliant ?" },
      { from: 'lea.dubois@imknow.com', text: "Bonne question Lucas ! Les données de comportement de lecture sont des données personnelles. La base légale dépend de votre cas : consentement si c'est optionnel, intérêt légitime si c'est core à votre service." },
      { from: 'lucas.bernard@imknow.com', text: "On pense le proposer opt-in. Qu'est-ce qu'on doit documenter exactement ?" },
      { from: 'lea.dubois@imknow.com', text: "Trois choses : 1) mise à jour du registre des traitements, 2) mention dans la politique de confidentialité (finalité, durée de conservation, tiers impliqués), 3) mécanisme de retrait du consentement accessible." },
      { from: 'lucas.bernard@imknow.com', text: "Pour la durée de conservation des préférences, on peut garder ça aussi longtemps que le compte est actif ?" },
      { from: 'lea.dubois@imknow.com', text: "Oui, avec suppression à la clôture du compte. Et prévoir un export dans le cadre du droit à la portabilité. Le tout doit être dans votre politique de confidentialité." },
      { from: 'lucas.bernard@imknow.com', text: "On a un DPO ? J'ai l'impression qu'on n'en a pas officiellement nommé." },
      { from: 'lea.dubois@imknow.com', text: "Pas encore de DPO nommé formellement. Je joue ce rôle officieusement mais on devrait régulariser ça. Je vais soulever le point en CODIR. En attendant, je te prépare un template de mise à jour de registre." },
      { from: 'lucas.bernard@imknow.com', text: "Merci Léa, tu es indispensable ! Je commence le dev avec un flag feature et on validera la conformité avant le roll-out." },
      { from: 'lea.dubois@imknow.com', text: "Parfait comme approche. Tiens-moi informée quand c'est prêt pour validation finale." },
    ],
  },
  {
    pair: ['camille.rousseau@imknow.com', 'alexandre.petit@imknow.com'],
    messages: [
      { from: 'camille.rousseau@imknow.com', text: "Alexandre, on doit préparer le budget tech pour l'année prochaine. Tu peux m'estimer les coûts infrastructure pour scaler ImKnow à 3x les utilisateurs actuels ?" },
      { from: 'alexandre.petit@imknow.com', text: "Bonjour Camille ! Je travaille dessus avec Lucas. Nos premières estimations : AWS +40% (mise à l'échelle auto K8s), APIs IA +150% (plus de contenu généré), monitoring +20%. Au total environ +60% du budget actuel." },
      { from: 'camille.rousseau@imknow.com', text: "60% c'est significatif. Est-ce qu'il y a des optimisations possibles pour réduire ça ?" },
      { from: 'alexandre.petit@imknow.com', text: "Oui plusieurs : reserved instances AWS (-30% vs on-demand), cache Redis pour réduire les calls DB (-15% RDS), Cloudflare pour le CDN (images servies depuis le edge, -25% bande passante). Ça nous amènerait à +35-40% net." },
      { from: 'camille.rousseau@imknow.com', text: "Ces optimisations, c'est réaliste de les implémenter en combien de temps ?" },
      { from: 'alexandre.petit@imknow.com', text: "Le Cloudflare c'est 1 semaine. Le Redis cache 2-3 semaines. Les reserved instances c'est un achat annuel donc à faire maintenant pour profiter des prix. Je prépare un plan détaillé ?" },
      { from: 'camille.rousseau@imknow.com', text: "Oui, avec les ROI de chaque optimisation. Le board veut voir la rentabilité des investissements tech." },
      { from: 'alexandre.petit@imknow.com', text: "Je vous prépare un document avec : coût initial, économie mensuelle, ROI à 12 mois, et risque de chaque option. Pour la semaine prochaine ?" },
      { from: 'camille.rousseau@imknow.com', text: "Parfait ! Le board se réunit vendredi prochain, j'ai besoin de ça pour jeudi midi au plus tard." },
      { from: 'alexandre.petit@imknow.com', text: "Noté, je priorise ça. Je te tiens au courant si j'ai des questions sur les hypothèses financières." },
    ],
  },
  {
    pair: ['sophie.laurent@imknow.com', 'marie.dupont@imknow.com'],
    messages: [
      { from: 'sophie.laurent@imknow.com', text: "Marie, je travaille sur les maquettes du nouveau profil utilisateur. Pour la section 'compétences' des employés, vous avez une taxonomie officielle RH ou on peut créer des tags libres ?" },
      { from: 'marie.dupont@imknow.com', text: "Bonne question ! On n'a pas de taxonomie officielle actuellement. On utilise les intitulés de poste et les départements. Tu penses à quoi comme système de compétences ?" },
      { from: 'sophie.laurent@imknow.com', text: "Je pensais à un système hybride : tags prédéfinis par département (TypeScript, React pour Développement) + tags libres pour les compétences transverses (Management, Formation, RGPD...). Validé par le manager." },
      { from: 'marie.dupont@imknow.com', text: "J'aime beaucoup l'idée ! La validation par le manager est clé pour éviter les auto-déclarations de compétences non vérifiées. On pourrait aussi avoir des niveaux : débutant / intermédiaire / expert." },
      { from: 'sophie.laurent@imknow.com', text: "Exactement ! Et pour l'affichage sur le profil public, on ne montrerait que les compétences validées. Ça crédibilise vraiment les profils." },
      { from: 'marie.dupont@imknow.com', text: "Pour le RH, ça nous donnerait aussi une cartographie des compétences de l'entreprise en temps réel — super utile pour les plans de formation et la mobilité interne." },
      { from: 'sophie.laurent@imknow.com', text: "Parfaitement aligné avec ce qu'on peut faire côté produit. Je vais prototyper ça dans Figma cette semaine. Tu peux me faire valider par quelques managers pour le concept ?" },
      { from: 'marie.dupont@imknow.com', text: "Je vous organise un test utilisateur rapide avec 3 managers jeudi ? 30 minutes chacun, on teste les maquettes." },
      { from: 'sophie.laurent@imknow.com', text: "Idéal ! Je prépare un prototype cliquable Figma d'ici mercredi soir. Je vous envoie le lien." },
      { from: 'marie.dupont@imknow.com', text: "Super ! Et si ça passe le test, on le propose en priorité pour le prochain sprint ?" },
      { from: 'sophie.laurent@imknow.com', text: "Absolument. Je suis très enthousiaste sur ce projet — c'est exactement le genre de feature qui différencie ImKnow des plateformes génériques." },
    ],
  },
  {
    pair: ['julien.leroy@imknow.com', 'emma.moreau@imknow.com'],
    messages: [
      { from: 'emma.moreau@imknow.com', text: "Julien, je dois pitcher ImKnow à notre nouveau DG la semaine prochaine. Tu peux m'aider à traduire les bénéfices techniques en valeur business ?" },
      { from: 'julien.leroy@imknow.com', text: "Avec plaisir Emma ! Les DG sont sensibles au ROI et à la réduction de risque. Pour ImKnow : temps de recherche d'info -40%, onboarding des nouveaux -3 semaines, duplication de travail identifiable." },
      { from: 'emma.moreau@imknow.com', text: "Tu as des chiffres mesurés ou ce sont des estimations ?" },
      { from: 'julien.leroy@imknow.com', text: "Estimations basées sur des études sectorielles (McKinsey 2023 sur les knowledge workers). Mais on peut mesurer nos propres KPIs si on définit un baseline avant et après l'adoption." },
      { from: 'emma.moreau@imknow.com', text: "Bonne idée ! On pourrait faire une enquête auprès des employés avant le pitch pour avoir nos propres données." },
      { from: 'julien.leroy@imknow.com', text: "3 questions max : temps moyen par semaine à chercher de l'information, % de fois où ils ne trouvent pas ce qu'ils cherchent, frustration liée à la connaissance non documentée (1-10)." },
      { from: 'emma.moreau@imknow.com', text: "Je lance ça demain sur Teams. On aura les résultats avant vendredi. Pour le pitch lui-même, tu aurais une démo live ou des screenshots ?" },
      { from: 'julien.leroy@imknow.com', text: "Je te prépare un compte demo avec des données réalistes. Une démo live est toujours plus convaincante qu'un PowerPoint." },
      { from: 'emma.moreau@imknow.com', text: "Parfait ! Et si le DG pose des questions techniques auxquelles je ne sais pas répondre, tu serais disponible pour rejoindre le call ?" },
      { from: 'julien.leroy@imknow.com', text: "Bien sûr, bloque-moi sur le calendrier. Je préfère être là pour garantir des réponses précises sur l'architecture et la sécurité." },
    ],
  },
];

const USER_BLOCKS: [string, string][] = [
  ['lea.dubois@imknow.com', 'alexandre.petit@imknow.com'],
  ['camille.rousseau@imknow.com', 'lucas.bernard@imknow.com'],
  ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com'],
];

const USER_REPORTS: { reporterEmail: string; reportedUserEmail: string; reason: string; details: string }[] = [
  { reporterEmail: 'marie.dupont@imknow.com', reportedUserEmail: 'thomas.martin@imknow.com', reason: 'inappropriate_content', details: 'Thomas a tenu des propos sexistes lors de la réunion d\'équipe.' },
  { reporterEmail: 'sophie.laurent@imknow.com', reportedUserEmail: 'alexandre.petit@imknow.com', reason: 'harassment', details: "Alexandre m'envoie des messages insistants sur le chat malgré mon refus." },
  { reporterEmail: 'julien.leroy@imknow.com', reportedUserEmail: 'camille.rousseau@imknow.com', reason: 'spam', details: 'Camille spam le canal général avec des promotions personnelles.' },
  { reporterEmail: 'lea.dubois@imknow.com', reportedUserEmail: 'emma.moreau@imknow.com', reason: 'impersonation', details: "Emma se fait passer pour une RH dans ses communications externes." },
  { reporterEmail: 'thomas.martin@imknow.com', reportedUserEmail: 'lucas.bernard@imknow.com', reason: 'inappropriate_content', details: 'Lucas partage des blagues de mauvais goût sur le canal DevOps.' },
  { reporterEmail: 'alexandre.petit@imknow.com', reportedUserEmail: 'lea.dubois@imknow.com', reason: 'other', details: "Léa utilise des ressources ImKnow pour son activité secondaire." },
  // Multiples reports sur alexandre.petit
  { reporterEmail: 'marie.dupont@imknow.com', reportedUserEmail: 'alexandre.petit@imknow.com', reason: 'harassment', details: 'Alexandre a crié sur une stagiaire devant toute l\'équipe.' },
  { reporterEmail: 'julien.leroy@imknow.com', reportedUserEmail: 'alexandre.petit@imknow.com', reason: 'inappropriate_content', details: "Alexandre fait des blagues racistes pendant les daily meetings." },
  // Multiples reports sur lea.dubois
  { reporterEmail: 'thomas.martin@imknow.com', reportedUserEmail: 'lea.dubois@imknow.com', reason: 'spam', details: "Léa envoie des emails non sollicités à toute l'équipe Dev." },
  { reporterEmail: 'marie.dupont@imknow.com', reportedUserEmail: 'lea.dubois@imknow.com', reason: 'inappropriate_content', details: 'Léa a menacé de porter plainte contre un collègue sans fondement.' },
];

const PUBLICATION_REPORTS: { reporterEmail: string; publicationTitle: string; reason: string; details: string }[] = [
  { reporterEmail: 'marie.dupont@imknow.com', publicationTitle: "Architecture microservices : retour d'expérience après 2 ans", reason: 'inappropriate_content', details: "Contenu inapproprié — langage irrespectueux envers les développeurs junior." },
  { reporterEmail: 'lea.dubois@imknow.com', publicationTitle: 'RGPD en 2024 : guide pratique pour les équipes techniques', reason: 'misinformation', details: "Informations potentiellement trompeuses sur les sanctions RGPD." },
  { reporterEmail: 'thomas.martin@imknow.com', publicationTitle: 'Guide complet React 18 : nouveautés et bonnes pratiques', reason: 'plagiarism', details: "Cet article semble copié du blog officiel React sans attribution." },
  { reporterEmail: 'sophie.laurent@imknow.com', publicationTitle: 'Performance JavaScript : les optimisations qui font vraiment la différence', reason: 'spam', details: "L'article promeut une librairie payante sans le mentionner clairement." },
  { reporterEmail: 'alexandre.petit@imknow.com', publicationTitle: 'Construire un Design System scalable : guide pratique', reason: 'hate_speech', details: 'Commentaires désobligeants envers les designs systèmes concurrents.' },
  { reporterEmail: 'julien.leroy@imknow.com', publicationTitle: 'Stratégie content marketing B2B : guide complet 2024', reason: 'misinformation', details: 'Statistiques non sourcées et potentiellement fausses sur les taux de conversion.' },
  { reporterEmail: 'camille.rousseau@imknow.com', publicationTitle: 'Docker et Kubernetes : déployer ses applications en production', reason: 'inappropriate_content', details: 'Exemples de configuration non sécurisés exposant des ports en production.' },
  { reporterEmail: 'emma.moreau@imknow.com', publicationTitle: 'Onboarding réussi : le guide complet pour les équipes RH', reason: 'other', details: "L'article contient des liens d'affiliation non déclarés." },
  // Multiples reports sur "Architecture microservices"
  { reporterEmail: 'thomas.martin@imknow.com', publicationTitle: "Architecture microservices : retour d'expérience après 2 ans", reason: 'misinformation', details: "Les chiffres de performance annoncés ne sont pas vérifiables." },
  { reporterEmail: 'sophie.laurent@imknow.com', publicationTitle: "Architecture microservices : retour d'expérience après 2 ans", reason: 'plagiarism', details: "Certaines parties semblent traduites du blog de Martin Fowler sans citation." },
  // Multiples reports sur "Stratégie content marketing B2B"
  { reporterEmail: 'marie.dupont@imknow.com', publicationTitle: 'Stratégie content marketing B2B : guide complet 2024', reason: 'spam', details: "L'article est un copier-coller d'un article de blog américain." },
  { reporterEmail: 'lucas.bernard@imknow.com', publicationTitle: 'Stratégie content marketing B2B : guide complet 2024', reason: 'misinformation', details: 'Les statistiques sur les taux de conversion sont inventées.' },
];

// ════════════════════════════════════════════════════════════════
// SEED EXECUTION
// ════════════════════════════════════════════════════════════════

async function seed() {
  logger.log('🚀 Démarrage du seed complet...');

  const context: INestApplicationContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
    bufferLogs: false,
  });

  const dataSource = context.get(DataSource);

  // Repositories
  const userRepo = context.get<Repository<User>>(getRepositoryToken(User));
  const categoryRepo = context.get<Repository<Category>>(getRepositoryToken(Category));
  const tagRepo = context.get<Repository<Tag>>(getRepositoryToken(Tag));
  const publicationRepo = context.get<Repository<Publication>>(getRepositoryToken(Publication));
  const followRepo = context.get<Repository<Follow>>(getRepositoryToken(Follow));
  const commentRepo = context.get<Repository<Comment>>(getRepositoryToken(Comment));
  const publicationReportRepo = context.get<Repository<PublicationReport>>(getRepositoryToken(PublicationReport));
  const userReportRepo = context.get<Repository<UserReport>>(getRepositoryToken(UserReport));

  // Services
  const categoryService = context.get(CategoryService);
  const tagService = context.get(TagService);
  const followService = context.get(FollowService);
  const notificationService = context.get(NotificationService);
  const chatService = context.get(ChatService);
  const commentService = context.get(CommentService);
  const interactionService = context.get(PublicationInteractionService);
  const publicationService = context.get(PublicationService);
  const publicationChunkService = context.get(PublicationChunkService);
  const searchService = context.get(SearchService);

  const emailToUser: Record<string, User> = {};
  const nameToCategory: Record<string, Category> = {};
  const nameToTag: Record<string, Tag> = {};
  const titleToPub: Record<string, Publication> = {};

  try {
    // ── 1. USERS ──────────────────────────────────────────────────────────────
    logger.log('📦 Création des utilisateurs (UserRepository)...');
    const passwordHash = await bcrypt.hash('Employee@1234', 10);
    const adminHash = await bcrypt.hash('Admin@1234', 10);

    const existingAdmin = await userRepo.findOne({ where: { email: 'admin@imknow.com' } });
    if (existingAdmin) {
      emailToUser['admin@imknow.com'] = existingAdmin;
      logger.log(`  ⏭️  Admin existe déjà (id=${existingAdmin.id})`);
    } else {
      const admin = userRepo.create({
        firstName: 'Admin',
        lastName: 'ImKnow',
        email: 'admin@imknow.com',
        password: adminHash,
        role: userRole.ADMIN,
        status: UserStatus.ACTIVE,
        isEmailActive: true,
        emailNotificationsEnabled: false,
        pushNotificationsEnabled: true,
      });
      emailToUser['admin@imknow.com'] = await userRepo.save(admin);
      logger.log(`  ✅ Admin créé (id=${emailToUser['admin@imknow.com'].id})`);
    }

    for (const emp of EMPLOYEES) {
      const existing = await userRepo.findOne({ where: { email: emp.email } });
      if (existing) {
        emailToUser[emp.email] = existing;
        if (existing.emailNotificationsEnabled !== false) {
          existing.emailNotificationsEnabled = false;
          await userRepo.save(existing);
        }
        logger.log(`  ⏭️  ${emp.email} existe déjà`);
        continue;
      }
      const user = userRepo.create({
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        password: passwordHash,
        role: userRole.EMPLOYEE,
        department: emp.department,
        bio: emp.bio,
        country: 'France',
        status: UserStatus.ACTIVE,
        isEmailActive: true,
        emailNotificationsEnabled: false,
        pushNotificationsEnabled: true,
      });
      emailToUser[emp.email] = await userRepo.save(user);
      logger.log(`  ✅ ${emp.firstName} ${emp.lastName} (id=${user.id})`);
    }

    // ── 2. CATEGORIES ─────────────────────────────────────────────────────────
    logger.log('📂 Création des catégories (CategoryService)...');
    for (const cat of CATEGORIES) {
      const existing = await categoryRepo.findOne({ where: { name: cat.name } });
      if (existing) {
        nameToCategory[cat.name] = existing;
        continue;
      }
      nameToCategory[cat.name] = await categoryService.create({ name: cat.name, description: cat.description });
    }
    logger.log(`  ✅ ${Object.keys(nameToCategory).length} catégories`);

    // ── 3. TAGS ───────────────────────────────────────────────────────────────
    logger.log('🏷️  Création des tags (TagService)...');
    for (const tagName of TAGS) {
      const existing = await tagRepo.findOne({ where: { name: tagName } });
      if (existing) {
        nameToTag[tagName] = existing;
        continue;
      }
      nameToTag[tagName] = await tagService.create({ name: tagName });
    }
    logger.log(`  ✅ ${Object.keys(nameToTag).length} tags`);

    // ── 4. PUBLICATIONS ───────────────────────────────────────────────────────
    logger.log('📄 Création des publications (PublicationService)...');
    for (const article of ARTICLES) {
      const existing = await publicationRepo.findOne({ where: { title: article.title } });
      if (existing) {
        titleToPub[article.title] = existing;
        logger.log(`  ⏭️  "${article.title.substring(0, 50)}" existe déjà`);

        // Generate missing chunks/embeddings for existing publications
        try {
          const chunksCnt = await dataSource
            .getRepository('publication_chunks')
            .count({ where: { publicationId: existing.id } } as any);
          if (chunksCnt === 0) {
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

      // Use service create() for moderation/duplicate test articles
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
              status: PublicationStatus.PUBLISHED,
            },
            author,
          );
          titleToPub[article.title] = pub;
          logger.log(`  ✅ "${article.title.substring(0, 40)}" (id=${pub.id}, status=${pub.status})`);
          // If published, generate chunks + embedding inline (not fire-and-forget)
          if (pub.status === PublicationStatus.PUBLISHED) {
            try {
              await publicationChunkService.generateChunks(pub.id);
            } catch { /* chunk gen may fail, ignore */ }
            try {
              const embedText = `Title: ${pub.title}\nCategory: ${article.categoryName}\nTags: ${(article.tagNames || []).join(', ')}\nContent:\n${pub.content}`;
              const vector = await searchService.generateEmbedding(embedText);
              if (vector && Array.isArray(vector) && vector.length === 768) {
                const vs = '[' + vector.map((v) => Number(v).toFixed(8)).join(', ') + ']';
                await dataSource.query(
                  `UPDATE publications SET embedding_vector_pg = $1::vector WHERE id = $2`,
                  [vs, pub.id],
                );
                logger.log(`       [EMBED] Vector saved for publication ${pub.id}`);
              }
            } catch { /* ignore embedding failures */ }
          }
        } catch (err: any) {
          logger.warn(`  ⚠️ "${article.title.substring(0, 30)}": ${err.message}`);
        }
        continue;
      }

      // Create via repo to avoid fire-and-forget async in publicationService.create()
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

      // Create publication version
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

      // Generate chunks with their embeddings (awaited to ensure completion)
      try {
        await publicationChunkService.generateChunks(pub.id);
      } catch (err: any) {
        logger.warn(`  ⚠️ Chunks pour "${article.title.substring(0, 30)}": ${err.message}`);
      }

      // Generate publication-level embedding (awaited)
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
      } catch (err: any) {
        logger.warn(`  ⚠️ Embedding pour "${article.title.substring(0, 30)}": ${err.message}`);
      }

      // Update status to published
      await publicationRepo.update(pub.id, { status: PublicationStatus.PUBLISHED });
      await publicationRepo.update(pub.id, { status: PublicationStatus.PUBLISHED });

      logger.log(`  ✅ "${article.title.substring(0, 50)}" (id=${pub.id})`);
    }

    // ── 5. PUBLICATION MODIFICATIONS (version history) ────────────────────────
    logger.log('📝 Création des versions de publications (publication_versions)...');
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
        newContent: `React 18 a introduit des changements majeurs.

## Concurrent Mode

Le mode concurrent permet à React de préparer plusieurs versions du UI simultanément, avec une planification intelligente des priorités.

## useTransition

\`\`\`jsx
const [isPending, startTransition] = useTransition();
startTransition(() => setSearchQuery(input));
\`\`\`

## Automatic Batching

Toutes les mises à jour d'état sont regroupées automatiquement en React 18, ce qui réduit les re-renders.

## Server Components

Les React Server Components permettent le rendu côté serveur sans bundle supplémentaire.`,
        changeSummary: 'Ajout de la section Server Components et précisions sur le Concurrent Mode.',
      },
      {
        title: "TypeScript avancé : types génériques et patterns de conception",
        versionNumber: 2,
        newContent: `TypeScript offre un système de types puissant.

## Conditional Types

\`\`\`typescript
type Flatten<T> = T extends Array<infer Item> ? Item : T;
\`\`\`

## Mapped Types

\`\`\`typescript
type Readonly<T> = { readonly [P in keyof T]: T[P] };
\`\`\`

## Template Literal Types

\`\`\`typescript
type EventName = \`on\${Capitalize<string>}\`;
\`\`\`

## Type Guards

\`\`\`typescript
function isUser(v: unknown): v is User { return typeof v === 'object' && v !== null && 'email' in v; }
\`\`\`

## satisfies Operator

\`\`\`typescript
const palette = { red: [255,0,0], green: '#00ff00' } satisfies Record<string, string | number[]>;
\`\`\``,
        changeSummary: 'Ajout des template literal types et du satisfies operator. Réorganisation du contenu.',
      },
      {
        title: "Architecture microservices : retour d'expérience après 2 ans",
        versionNumber: 2,
        newContent: `Deux ans de migration microservices : les leçons apprises.

## Découpage par domaine
- Service Utilisateurs
- Service Contenu
- Service Notification

## Communication asynchrone
Apache Kafka pour réduire le couplage et assurer la traçabilité des événements.

## Difficultés

### Transactions distribuées
Solution : Saga pattern avec orchestrateurs dédiés.

### Gestion des versions d'API
Versionnement sémantique avec breaking changes gérés via des adapters.

## Recommandations
1. Monolithe modulaire d'abord
2. Observabilité dès le début (OpenTelemetry)
3. Contrats OpenAPI clairs
4. Test des contrats (Pact.io)`,
        changeSummary: "Ajout du retour Kafka, gestion des versions d'API, et outillage Pact.io.",
      },
      {
        title: "RGPD en 2024 : guide pratique pour les équipes techniques",
        versionNumber: 2,
        newContent: `## Licéité du traitement
- Consentement explicite
- Exécution d'un contrat
- Intérêt légitime

## Privacy by Design

\`\`\`typescript
interface UserLog { userId: string; action: string; hashedIp?: string; }
\`\`\`

## Chiffrement
- Au repos : AES-256
- En transit : TLS 1.3

## Data Protection Impact Assessment (DPIA)
Obligatoire pour tout traitement à risque élevé.

## Sanctions
- 2% du CA ou 10M€
- 4% du CA ou 20M€ pour les infractions graves

## Sous-traitants
Obligation de signer un DPA (Data Processing Agreement) avec chaque sous-traitant.`,
        changeSummary: 'Ajout des sections DPIA et DPA, mise à jour des sanctions 2024.',
      },
      {
        title: "Intelligence Artificielle en entreprise : par où commencer ?",
        versionNumber: 2,
        newContent: `## Niveaux de maturité IA
- Niveau 1 : ChatGPT ponctuel
- Niveau 2 : APIs IA dans vos produits
- Niveau 3 : pipelines ML en prod
- Niveau 4 : agents autonomes

## Intégration Anthropic

\`\`\`typescript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
const msg = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, messages: [{ role: 'user', content: 'Résume :' }] });
\`\`\`

## RAG : vos données internes
1. Vectoriser (pgvector)
2. Recherche sémantique
3. Contexte au LLM

## AI Act européen
Classification des systèmes IA par niveau de risque.`,
        changeSummary: 'Ajout du niveau 4 (agents) et de la section AI Act. Mise à jour des modèles.',
      },
    ];
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
        logger.warn(`  ⚠️ Modification "${pub.title.substring(0, 30)}": ${err.message}`);
      }
    }
    logger.log(`  ✅ ${modCount} nouvelles versions`);

    // ── 7. FOLLOWS ────────────────────────────────────────────────────────────
    logger.log('👤 Création des follows (FollowService)...');
    let followCount = 0;
    for (const [followerEmail, followingEmail] of FOLLOWS) {
      const follower = emailToUser[followerEmail];
      const following = emailToUser[followingEmail];
      if (!follower || !following) continue;

      const existing = await followRepo.findOne({
        where: { follower: { id: follower.id }, following: { id: following.id } },
      });
      if (existing) continue;

      try {
        await followService.follow(follower.id, following.id);
        followCount++;
      } catch (err: any) {
        if (err.message !== 'You are already following this user') {
          logger.warn(`  ⚠️ Follow ${followerEmail}→${followingEmail}: ${err.message}`);
        }
      }
    }
    logger.log(`  ✅ ${followCount} nouveaux follows`);

    // ── 8. LIKES (publications) ──────────────────────────────────────────────
    logger.log('❤️  Likes publications (PublicationInteractionService)...');
    let likeCount = 0;
    for (const { title, likers } of ARTICLE_LIKES) {
      const pub = titleToPub[title];
      if (!pub) continue;
      for (const email of likers) {
        const user = emailToUser[email];
        if (!user) continue;
        try {
          await interactionService.toggleLike(pub.id, user.id);
          likeCount++;
        } catch { /* already liked */ }
      }
    }
    logger.log(`  ✅ ${likeCount} likes`);

    // ── 9. BOOKMARKS ──────────────────────────────────────────────────────────
    logger.log('🔖 Bookmarks (PublicationInteractionService)...');
    let bookmarkCount = 0;
    for (const { title, users } of BOOKMARKS) {
      const pub = titleToPub[title];
      if (!pub) continue;
      for (const email of users) {
        const user = emailToUser[email];
        if (!user) continue;
        try {
          await interactionService.toggleBookmark(pub.id, user.id);
          bookmarkCount++;
        } catch { /* already bookmarked */ }
      }
    }
    logger.log(`  ✅ ${bookmarkCount} bookmarks`);

    // ── 10. COMMENTS (threaded) ───────────────────────────────────────────────
    logger.log('💬 Création des commentaires (CommentService)...');
    let commentCount = 0;
    let replyCount = 0;
    let commentLikeCount = 0;

    for (const group of COMMENT_THREADS) {
      const pub = titleToPub[group.articleTitle];
      if (!pub) {
        logger.warn(`  ⚠️ Article introuvable : "${group.articleTitle.substring(0, 50)}"`);
        continue;
      }

      for (const thread of group.threads) {
        const author = emailToUser[thread.authorEmail];
        if (!author) continue;

        const mentionedIds = thread.mentions.map(e => emailToUser[e]?.id).filter(Boolean);

        try {
          const comment = await commentService.create(
            { publicationId: pub.id, content: thread.content, mentionedUserIds: mentionedIds },
            author.id,
          );
          commentCount++;

          for (const likerEmail of thread.likers) {
            const liker = emailToUser[likerEmail];
            if (!liker || liker.id === author.id) continue;
            try {
              await commentService.toggleLike(comment.id, liker.id);
              commentLikeCount++;
            } catch { /* already liked */ }
          }

          for (const reply of thread.replies) {
            const replyAuthor = emailToUser[reply.authorEmail];
            if (!replyAuthor) continue;

            const replyMentionedIds = reply.mentions.map(e => emailToUser[e]?.id).filter(Boolean);

            try {
              const replyComment = await commentService.create(
                { publicationId: pub.id, content: reply.content, parentId: comment.id, mentionedUserIds: replyMentionedIds },
                replyAuthor.id,
              );
              replyCount++;

              for (const likerEmail of reply.likers) {
                const liker = emailToUser[likerEmail];
                if (!liker || liker.id === replyAuthor.id) continue;
                try {
                  await commentService.toggleLike(replyComment.id, liker.id);
                  commentLikeCount++;
                } catch { /* already liked */ }
              }
            } catch (err: any) {
              logger.warn(`  ⚠️ Réponse: ${err.message}`);
            }
          }
        } catch (err: any) {
          logger.warn(`  ⚠️ Commentaire: ${err.message}`);
        }
      }
    }
    logger.log(`  ✅ ${commentCount} commentaires`);
    logger.log(`  ✅ ${replyCount} réponses`);
    logger.log(`  ✅ ${commentLikeCount} likes de commentaires`);

    // ── 11. CHAT MESSAGES ──────────────────────────────────────────────────────
    logger.log('💌 Messages de chat (ChatService)...');
    let msgCount = 0;
    for (const conv of CHAT_CONVERSATIONS) {
      const [email1, email2] = conv.pair;
      const user1 = emailToUser[email1];
      const user2 = emailToUser[email2];
      if (!user1 || !user2) continue;

      for (const msg of conv.messages) {
        const senderEmail = msg.from;
        const sender = emailToUser[senderEmail];
        const receiver = senderEmail === email1 ? user2 : user1;
        if (!sender || !receiver) continue;

        try {
          await chatService.sendMessage(sender.id, receiver.id, {
            content: msg.text,
            type: MessageType.TEXT,
          });
          msgCount++;
        } catch (err: any) {
          logger.warn(`  ⚠️ Chat ${msg.from}: ${err.message}`);
        }
      }
    }
    logger.log(`  ✅ ${msgCount} messages`);

    // ── 12. USER BLOCKS ───────────────────────────────────────────────────────
    logger.log('🚫 Blocages utilisateurs (ChatService)...');
    let blockCount = 0;
    for (const [blockerEmail, blockedEmail] of USER_BLOCKS) {
      const blocker = emailToUser[blockerEmail];
      const blocked = emailToUser[blockedEmail];
      if (!blocker || !blocked) continue;

      try {
        await chatService.blockUser(blocker.id, blocked.id);
        blockCount++;
        logger.log(`  ✅ ${blockerEmail} → ${blockedEmail}`);
      } catch (err: any) {
        logger.warn(`  ⚠️ Blocage ${blockerEmail}→${blockedEmail}: ${err.message}`);
      }
    }
    logger.log(`  ✅ ${blockCount} blocages`);

    // ── 13. PUBLICATION REPORTS ───────────────────────────────────────────────
    logger.log('🚩 Signalements publications (PublicationReport)...');
    let reportCount = 0;
    for (const report of PUBLICATION_REPORTS) {
      const reporter = emailToUser[report.reporterEmail];
      const pub = titleToPub[report.publicationTitle];
      if (!reporter || !pub) continue;

      const existing = await publicationReportRepo.findOne({
        where: { reporter: { id: reporter.id }, publication: { id: pub.id } },
      });
      if (existing) continue;

      const newReport = new PublicationReport();
      newReport.reporter = reporter;
      newReport.publication = pub;
      (newReport as any).reason = report.reason;
      newReport.details = report.details;
      (newReport as any).status = 'pending';
      await publicationReportRepo.save(newReport);
      reportCount++;
    }
    logger.log(`  ✅ ${reportCount} signalements`);

    // ── 14. USER REPORTS ─────────────────────────────────────────────────────
    logger.log('🚩 Signalements utilisateurs (UserReport)...');
    let userReportCount = 0;
    for (const report of USER_REPORTS) {
      const reporter = emailToUser[report.reporterEmail];
      const reported = emailToUser[report.reportedUserEmail];
      if (!reporter || !reported) continue;

      const existing = await userReportRepo.findOne({
        where: { reporter: { id: reporter.id }, reportedUser: { id: reported.id } },
      });
      if (existing) continue;

      const newReport = new UserReport();
      newReport.reporter = reporter;
      newReport.reportedUser = reported;
      (newReport as any).reason = report.reason;
      newReport.details = report.details;
      (newReport as any).status = 'pending';
      await userReportRepo.save(newReport);
      userReportCount++;
    }
    logger.log(`  ✅ ${userReportCount} signalements utilisateurs`);

    // ── SUMMARY ───────────────────────────────────────────────────────────────
    const counts = {
      users: await userRepo.count(),
      categories: await categoryRepo.count(),
      tags: await tagRepo.count(),
      publications: await publicationRepo.count(),
      publicationVersions: await dataSource.getRepository(PublicationVersion).count(),
      comments: await commentRepo.count({ where: { deletedAt: null } } as any),
      follows: await followRepo.count(),
      publicationLikes: await dataSource.query('SELECT COUNT(*) as cnt FROM publication_likes').then(r => parseInt(r[0].cnt)),
      publicationBookmarks: await dataSource.query('SELECT COUNT(*) as cnt FROM publication_bookmarks').then(r => parseInt(r[0].cnt)),
      commentsLikes: await dataSource.query('SELECT COUNT(*) as cnt FROM comment_likes').then(r => parseInt(r[0].cnt)),
      commentsMentions: await dataSource.query('SELECT COUNT(*) as cnt FROM comment_mentions').then(r => parseInt(r[0].cnt)),
      chatMessages: await dataSource.getRepository(ChatMessage).count(),
      userBlocks: await dataSource.getRepository(UserBlock).count(),
      publicationReports: await publicationReportRepo.count(),
      userReports: await userReportRepo.count(),
    };

    logger.log('');
    logger.log('═'.repeat(55));
    logger.log('🎉 SEED TERMINÉ AVEC SUCCÈS !');
    logger.log('═'.repeat(55));
    logger.log('');
    logger.log('📊 RÉCAPITULATIF DE LA BASE :');
    for (const [key, val] of Object.entries(counts)) {
      logger.log(`   ${key.padEnd(22)} : ${val}`);
    }
    logger.log('');
    logger.log('🔑 COMPTES DE DÉMO :');
    logger.log('   admin@imknow.com          / Admin@1234  (Administrateur)');
    logger.log('   marie.dupont@imknow.com   / Employee@1234');
    logger.log('   thomas.martin@imknow.com  / Employee@1234');
    logger.log('   sophie.laurent@imknow.com / Employee@1234');
    logger.log('   lucas.bernard@imknow.com  / Employee@1234');
    logger.log('   emma.moreau@imknow.com    / Employee@1234');
    logger.log('   alexandre.petit@imknow.com / Employee@1234');
    logger.log('   camille.rousseau@imknow.com / Employee@1234');
    logger.log('   julien.leroy@imknow.com   / Employee@1234');
    logger.log('   lea.dubois@imknow.com     / Employee@1234');

  } catch (err: any) {
    logger.error('❌ Erreur fatale :', err.message);
    logger.error(err.stack);
    process.exit(1);
  } finally {
    await context.close();
    logger.log('🔌 Connexion fermée');
  }
}

seed();
