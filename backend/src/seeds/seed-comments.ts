import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { Publication } from '../publication/entities/publication.entity';
import { CommentService } from '../comment/comment.service';
import { seedUsers } from './seed-users';
import { seedPublications } from './seed-publications';

const logger = new Logger('Seed:Comments');

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
        likers: ['sophie.laurent@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com', 'nicolas.mercier@imknow.com'],
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
        likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'sophie.laurent@imknow.com', 'nicolas.mercier@imknow.com'],
        replies: [
          { authorEmail: 'alexandre.petit@imknow.com', content: "Excellent ajout Julien ! J'aurais dû mentionner ça. Les limites de `infer` et de la récursivité dans les types sont des pièges classiques. Je vais mettre à jour l'article avec un exemple.", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "Pour les types récursifs, TypeScript impose une limite de profondeur (par défaut ~100). Bon à savoir pour les structures d'arbre très profondes.", mentions: [], likers: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com'] },
        ],
      },
      {
        authorEmail: 'lucas.bernard@imknow.com',
        content: "Très bon article ! Une question pratique : vous recommandez d'activer `strict: true` dès le début d'un projet, mais comment gérer la migration d'un projet existant qui a des centaines d'erreurs TypeScript latentes ?",
        mentions: [],
        likers: ['alexandre.petit@imknow.com', 'emma.moreau@imknow.com', 'nicolas.mercier@imknow.com'],
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
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'nicolas.mercier@imknow.com'],
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
        likers: ['thomas.martin@imknow.com', 'nicolas.mercier@imknow.com'],
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
        likers: ['emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'lucas.bernard@imknow.com', 'clarisse.renaud@imknow.com'],
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
        likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'julien.leroy@imknow.com', 'clarisse.renaud@imknow.com'],
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
  {
    articleTitle: 'Clean Architecture : appliquer les principes de Bob Martin en NestJS',
    threads: [
      {
        authorEmail: 'julien.leroy@imknow.com',
        content: "Excellent article Nicolas ! L'approche Clean Architecture dans NestJS est effectivement très naturelle grâce au système de modules et providers. Tu utilises des CQRS en plus ?",
        mentions: ['nicolas.mercier@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          { authorEmail: 'nicolas.mercier@imknow.com', content: "Merci Julien ! Oui j'utilise `@nestjs/cqrs` pour les commandes métier complexes. Pour les queries simples, je passe directement par les repositories. L'important c'est que le domaine reste pur de toute infrastructure.", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "Tu devrais écrire un article dédié au CQRS dans le contexte Clean Architecture ! Ta stack nous intéresse, on réfléchit à migrer notre app.", mentions: ['nicolas.mercier@imknow.com'], likers: ['nicolas.mercier@imknow.com', 'julien.leroy@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Monitoring avec Prometheus et Grafana : guide pratique',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "On a mis ça en place après ton premier article sur la sécurité. Le combo ELK vs Prometheus/Grafana/Loki c'est un vrai débat. Tu as testé les deux ?",
        mentions: ['lucas.bernard@imknow.com'],
        likers: ['julien.leroy@imknow.com', 'alexandre.petit@imknow.com'],
        replies: [
          { authorEmail: 'lucas.bernard@imknow.com', content: "On utilisait ELK avant. Prometheus + Loki est moins lourd et plus simple à maintenir (un seul opérateur K8s pour Loki). Elasticsearch dévore la RAM dès qu'on dépasse 50GB de logs. Les dashboards Grafana sont aussi bien plus flexibles.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Marque employeur : construire une image qui attire les talents',
    threads: [
      {
        authorEmail: 'julien.leroy@imknow.com',
        content: "Très bon article Marie ! Pour le volet technique de la marque employeur, on pourrait mettre en avant notre stack (NestJS, React, PostgreSQL, K8s) sur les fiches de poste. Les candidats tech regardent ça en premier.",
        mentions: ['marie.dupont@imknow.com'],
        likers: ['marie.dupont@imknow.com', 'thomas.martin@imknow.com', 'emma.moreau@imknow.com'],
        replies: [
          { authorEmail: 'marie.dupont@imknow.com', content: "Excellente idée Julien ! Je vais contacter l'équipe dev pour qu'on mette à jour les fiches de poste avec les technologies utilisées. Ça pourrait être un projet transverse — tu veux participer ?", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'emma.moreau@imknow.com'] },
        ],
      },
    ],
  },
];

export async function seedComments(
  context?: INestApplicationContext,
  emailToUser?: Record<string, User>,
  titleToPub?: Record<string, Publication>,
): Promise<void> {
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
  if (!titleToPub) {
    const result = await seedPublications(context, emailToUser);
    titleToPub = result.titleToPub;
  }

  const commentService = context.get(CommentService);

  try {
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
            try { await commentService.toggleLike(comment.id, liker.id); commentLikeCount++; } catch { /* already liked */ }
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
                try { await commentService.toggleLike(replyComment.id, liker.id); commentLikeCount++; } catch { /* already liked */ }
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
    logger.log(`  ✅ ${commentCount} commentaires, ${replyCount} réponses, ${commentLikeCount} likes`);
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedComments().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
