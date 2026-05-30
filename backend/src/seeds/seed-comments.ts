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
  {
    articleTitle: 'Performance JavaScript : les optimisations qui font vraiment la différence',
    threads: [
      {
        authorEmail: 'julien.leroy@imknow.com',
        content: "Excellent rappel Thomas ! Le piège classique de useMemo c'est justement de l'overuse — mémoïser une valeur simple coûte plus cher que de la recalculer. Il faut profiler d'abord avec React DevTools Profiler avant d'optimiser.",
        mentions: ['thomas.martin@imknow.com'],
        likers: ['alexandre.petit@imknow.com', 'nicolas.mercier@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          { authorEmail: 'thomas.martin@imknow.com', content: "Tout à fait Julien ! La règle que j'applique : useMemo uniquement si la valeur est utilisée dans un autre tableau de dépendances ou si le calcul prend > 1ms mesuré. Dans les autres cas, la réduction de lisibilité ne vaut pas le gain.", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'alexandre.petit@imknow.com'] },
          { authorEmail: 'alexandre.petit@imknow.com', content: "On a utilisé react-window sur notre liste de 2000 articles et le gain est spectaculaire : de 600ms à 30ms de rendu. La virtualisation est définitivement l'optimisation avec le meilleur ratio impact/effort.", mentions: [], likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'nicolas.mercier@imknow.com'] },
        ],
      },
      {
        authorEmail: 'sophie.laurent@imknow.com',
        content: "La section sur les Web Workers m'a ouvert les yeux. On a un parseur de Markdown qui freeze l'UI sur les articles longs — c'est exactement le cas d'usage parfait. Je teste ça demain.",
        mentions: [],
        likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com'],
        replies: [
          { authorEmail: 'thomas.martin@imknow.com', content: "Parfait cas d'usage Sophie ! Avec Comlink (librairie de Google) tu peux exposer le worker comme un objet JavaScript classique — ça simplifie énormément le code. Le parseur Markdown tourne en arrière-plan sans bloquer l'UI.", mentions: ['sophie.laurent@imknow.com'], likers: ['sophie.laurent@imknow.com', 'alexandre.petit@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Recruter les meilleurs talents tech : stratégies pour 2024',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "Le take-home project payé est vraiment ce qui fait la différence. J'ai décliné plusieurs processus avec des tests non rémunérés de 6h. Ça envoie un mauvais signal dès le départ sur la façon dont l'entreprise valorise le temps des gens.",
        mentions: [],
        likers: ['julien.leroy@imknow.com', 'alexandre.petit@imknow.com', 'nicolas.mercier@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          { authorEmail: 'marie.dupont@imknow.com', content: "Témoignage très utile Thomas ! On a adopté le take-home payé (50€ pour 3h max) et la qualité des candidatures a augmenté et les refus en milieu de process ont chuté. Le ROI est clairement positif.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com'] },
          { authorEmail: 'julien.leroy@imknow.com', content: "Ce que j'ajouterais au processus : une session de review du take-home avec le candidat. Ça permet de voir comment il explique ses choix, comment il réagit au feedback, et si le code est vraiment le sien.", mentions: [], likers: ['thomas.martin@imknow.com', 'marie.dupont@imknow.com', 'alexandre.petit@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Stratégie content marketing B2B : guide complet 2024',
    threads: [
      {
        authorEmail: 'clarisse.renaud@imknow.com',
        content: "Très bon article Emma ! Une chose que j'ajouterais au funnel : le contenu post-achat (BOFU) est souvent négligé. Les articles qui aident les clients existants à mieux utiliser le produit génèrent les meilleurs taux d'upsell et de recommandation.",
        mentions: ['emma.moreau@imknow.com'],
        likers: ['marie.dupont@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com'],
        replies: [
          { authorEmail: 'emma.moreau@imknow.com', content: "Excellent point Clarisse ! Chez nous le ratio TOFU/MOFU/BOFU était 70/20/10 et on a rééquilibré vers 50/30/20. L'impact sur le taux de renouvellement a été immédiat.", mentions: ['clarisse.renaud@imknow.com'], likers: ['clarisse.renaud@imknow.com', 'marie.dupont@imknow.com'] },
        ],
      },
      {
        authorEmail: 'sophie.laurent@imknow.com',
        content: "La partie sur la mesure m'intéresse beaucoup. Comment vous distinguez le pipeline influencé par le contenu vs le pipeline direct ? Chez nous l'attribution multi-touch est un vrai casse-tête.",
        mentions: ['emma.moreau@imknow.com'],
        likers: ['clarisse.renaud@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          { authorEmail: 'emma.moreau@imknow.com', content: "On utilise un modèle d'attribution en U (40% premier touch, 40% dernier touch, 20% répartis). Ce n'est pas parfait mais ça donne une vue équilibrée. HubSpot et Marketo proposent des modèles prêts à l'emploi.", mentions: ['sophie.laurent@imknow.com'], likers: ['sophie.laurent@imknow.com', 'clarisse.renaud@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'GraphQL vs REST : comment choisir pour votre prochain projet',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "Notre retour chez ImKnow : REST pour les endpoints publics documentés avec OpenAPI, et on considère GraphQL pour le dashboard interne où les requêtes changent souvent. Le principal frein : la courbe d'apprentissage pour l'équipe backend qui ne connaît pas le schema-first.",
        mentions: ['alexandre.petit@imknow.com'],
        likers: ['julien.leroy@imknow.com', 'nicolas.mercier@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "Le schema-first est justement l'un des grands avantages de GraphQL — il force à définir le contrat avant de coder. Avec code-first (Pothos, NestJS GraphQL) vous pouvez garder TypeScript comme source de vérité si votre équipe est plus à l'aise.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'nicolas.mercier@imknow.com'] },
          { authorEmail: 'nicolas.mercier@imknow.com', content: "N'oublions pas les Persisted Queries pour le cache côté GraphQL — ça comble l'un des principaux avantages REST (cacheability HTTP GET). Avec Apollo Client et un CDN, les performances sont comparables.", mentions: [], likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Tests A/B : méthodologie et pièges à éviter',
    threads: [
      {
        authorEmail: 'emma.moreau@imknow.com',
        content: "Le peeking problem est vraiment le piège numéro un. On a failli prendre une mauvaise décision sur notre page d'accueil en arrêtant le test à J3 parce que p < 0.05. Finalement à J14 le test a convergé dans l'autre sens. La discipline de ne pas regarder les résultats avant la fin est difficile à maintenir mais essentielle.",
        mentions: ['clarisse.renaud@imknow.com'],
        likers: ['clarisse.renaud@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com'],
        replies: [
          { authorEmail: 'clarisse.renaud@imknow.com', content: "C'est exactement pour ça qu'on a adopté le sequential testing (méthode de Wald) plutôt que le test de signification classique. Ça permet des arrêts anticipés statistiquement valides si le résultat est décisif, sans multiplier le risque d'erreur.", mentions: ['emma.moreau@imknow.com'], likers: ['emma.moreau@imknow.com', 'thomas.martin@imknow.com'] },
        ],
      },
      {
        authorEmail: 'camille.rousseau@imknow.com',
        content: "Question côté finance : comment vous gérez la prise de décision quand un test A/B montre une amélioration de 3% mais pas statistiquement significative ? L'équipe business veut quand même lancer. On a ce débat régulièrement.",
        mentions: [],
        likers: ['emma.moreau@imknow.com', 'clarisse.renaud@imknow.com'],
        replies: [
          { authorEmail: 'clarisse.renaud@imknow.com', content: "Décision de gestion de risque : 3% non significatif peut quand même valoir le déploiement si l'effet négatif potentiel est limité et le coût de non-action élevé. L'important est de documenter la décision comme risquée et de monitorer après déploiement.", mentions: ['camille.rousseau@imknow.com'], likers: ['camille.rousseau@imknow.com', 'emma.moreau@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Design Patterns en JavaScript : du classique au moderne',
    threads: [
      {
        authorEmail: 'julien.leroy@imknow.com',
        content: "Très bon panorama Thomas ! J'ajouterais le pattern Proxy (ES6) qui est très puissant pour la validation, le logging et le lazy loading. Les frameworks modernes l'utilisent énormément — Vue 3 Reactivity est basé dessus.",
        mentions: ['thomas.martin@imknow.com'],
        likers: ['alexandre.petit@imknow.com', 'nicolas.mercier@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          { authorEmail: 'thomas.martin@imknow.com', content: "Absolument ! J'ai volontairement écarté Proxy pour ne pas alourdir l'article mais tu as raison. Le pattern Proxy ES6 pour la validation de schéma runtime est élégant et performant. J'écrirais un article de suivi.", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'alexandre.petit@imknow.com'] },
          { authorEmail: 'nicolas.mercier@imknow.com', content: "Mention spéciale aussi pour le pattern Command pour l'undo/redo — très utilisé dans les éditeurs de code et les formulaires complexes. Combiné avec un stack d'historique, ça donne une UX soignée.", mentions: [], likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'alexandre.petit@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Vue.js 3 et la Composition API : migration depuis Options API',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "La migration d'Options API vers Composition API qu'on a faite sur un projet Vue 2 → Vue 3 a pris 6 semaines pour 80 composants. La clé : commencer par identifier les mixins (souvent les plus sales) et les convertir en composables en premier. Ça débloque le plus de valeur.",
        mentions: ['alexandre.petit@imknow.com'],
        likers: ['julien.leroy@imknow.com', 'nicolas.mercier@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          { authorEmail: 'alexandre.petit@imknow.com', content: "L'outil `@vue/compat` est indispensable pour la migration — il permet de faire tourner Vue 3 en mode compatibilité Vue 2 et d'activer les warnings progressivement. On a migré 120 composants sans jamais casser la prod.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com'] },
          { authorEmail: 'nicolas.mercier@imknow.com', content: "Pinia vs Vuex pour les nouveaux projets : Pinia sans hésitation. L'intégration TypeScript est native, l'API est simple, et le devtools Vue supporte les deux. Migrer un Vuex existant vers Pinia est aussi plus simple qu'on ne le croit grâce au plugin de migration.", mentions: [], likers: ['alexandre.petit@imknow.com', 'thomas.martin@imknow.com', 'julien.leroy@imknow.com'] },
        ],
      },
      {
        authorEmail: 'sophie.laurent@imknow.com',
        content: "On utilise Vue 3 + TypeScript pour notre Design System. Les defineProps avec TypeScript sont un game changer pour la DX — l'autocomplétion des props dans les templates est enfin fiable. Quelqu'un a une opinion sur Nuxt 3 vs Next.js pour un nouveau projet full-stack ?",
        mentions: [],
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com'],
        replies: [
          { authorEmail: 'thomas.martin@imknow.com', content: "Nuxt 3 si l'équipe est sur Vue, Next.js si elle est sur React — la techno principale prime sur tout le reste. Les deux sont excellents avec App Router / Nuxt Layers. Si l'équipe est mixte et peut choisir, Next.js a un écosystème plus large et un déploiement Vercel imbattable.", mentions: ['sophie.laurent@imknow.com'], likers: ['sophie.laurent@imknow.com', 'alexandre.petit@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'OWASP Top 10 : sécuriser ses applications web en 2024',
    threads: [
      {
        authorEmail: 'julien.leroy@imknow.com',
        content: "Article de référence Lucas ! Le Broken Access Control en première position me surprend encore. Dans 90% des audits que j'ai vus, les IDOR (Insecure Direct Object Reference) sont présents parce que les équipes vérifient l'authentification (qui es-tu ?) mais pas l'autorisation (as-tu le droit ?). Ce sont deux checks distincts.",
        mentions: ['lucas.bernard@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'nicolas.mercier@imknow.com', 'lea.dubois@imknow.com'],
        replies: [
          { authorEmail: 'lucas.bernard@imknow.com', content: "Exactement Julien. En NestJS, `@UseGuards(JwtAuthGuard)` c'est l'authn. L'authz c'est vérifier dans le handler que `resource.ownerId === req.user.id`. Ce deuxième check est souvent oublié car il n'y a pas de framework qui l'impose — c'est une décision de l'équipe.", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com', 'alexandre.petit@imknow.com'] },
          { authorEmail: 'lea.dubois@imknow.com', content: "D'un point de vue RGPD, un IDOR qui permet d'accéder aux données d'un autre utilisateur est une violation de données à notifier à la CNIL dans les 72h. Ce n'est pas juste un bug technique, c'est une exposition légale.", mentions: [], likers: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'julien.leroy@imknow.com'] },
        ],
      },
      {
        authorEmail: 'nicolas.mercier@imknow.com',
        content: "La section SSRF arrive au bon moment. On a eu un rapport de bug bounty sur une feature d'import d'URL qu'on avait laissée sans validation. La validation côté serveur des URLs est vraiment critique dès qu'on fait des requêtes HTTP côté backend.",
        mentions: ['lucas.bernard@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'alexandre.petit@imknow.com'],
        replies: [
          { authorEmail: 'lucas.bernard@imknow.com', content: "Un bug bounty c'est exactement la bonne façon de découvrir ça. Pour les imports d'URL, blocklist des IPs privées (RFC 1918), résolution DNS côté serveur pour détecter les rebinding attacks, et timeout agressif. Ne jamais faire confiance à l'URL fournie par l'utilisateur.", mentions: ['nicolas.mercier@imknow.com'], likers: ['nicolas.mercier@imknow.com', 'julien.leroy@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Leadership technique : passer de développeur senior à tech lead',
    threads: [
      {
        authorEmail: 'nicolas.mercier@imknow.com',
        content: "Le syndrome 'c'est plus rapide si je le fais moi-même' — je me suis reconnu à 100% dans ma première année comme tech lead. La bascule mentale qui m'a aidé : visualiser mon équipe dans 6 mois. Si je fais le code à la place de quelqu'un, il ne progressera pas et dans 6 mois je serai encore le seul capable. Ce n'est pas scalable.",
        mentions: ['julien.leroy@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com', 'marie.dupont@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "Cette visualisation à 6 mois est très puissante Nicolas. J'ajoute : mesurer sa propre valeur en termes de délivrabilité de l'équipe plutôt que de lignes de code personnelles. Un tech lead qui réduit sa propre contribution de code mais double la vélocité de l'équipe fait un travail excellent.", mentions: ['nicolas.mercier@imknow.com'], likers: ['nicolas.mercier@imknow.com', 'thomas.martin@imknow.com', 'alexandre.petit@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "Ce qui m'a le plus aidé : des 1-on-1 hebdomadaires avec chaque membre de l'équipe. Ça permet de détecter les blocages techniques avant qu'ils ne deviennent des retards de sprint, et de connaître les aspirations de chacun pour les orienter vers les bonnes missions.", mentions: [], likers: ['julien.leroy@imknow.com', 'nicolas.mercier@imknow.com', 'marie.dupont@imknow.com'] },
        ],
      },
      {
        authorEmail: 'marie.dupont@imknow.com',
        content: "En tant que RH, j'apprécie beaucoup la section sur 'parler le langage du business'. Les tech leads qui savent traduire la dette technique en impact business font des propositions qui passent en comité de direction. Ceux qui parlent en jargon technique se font dire 'c'est pas une priorité'.",
        mentions: [],
        likers: ['emma.moreau@imknow.com', 'camille.rousseau@imknow.com', 'julien.leroy@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "C'est une compétence qui s'apprend ! Je recommande de participer aux réunions de direction ou comités produits même quand on n'est pas invité — demander à y assister en observateur. Comprendre les préoccupations business change la façon dont on présente les sujets techniques.", mentions: ['marie.dupont@imknow.com'], likers: ['marie.dupont@imknow.com', 'thomas.martin@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: "Machine Learning en production : de l'expérimentation au déploiement",
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "La partie sur le data drift est souvent sous-estimée. On a eu un modèle de classification qui performait parfaitement en staging mais se dégradait progressivement en prod. La cause : les données de prod avaient une distribution différente (biais de sélection dans le dataset d'entraînement). Le monitoring avec Evidently nous a permis de détecter ça avant que ça devienne critique.",
        mentions: ['nicolas.mercier@imknow.com'],
        likers: ['julien.leroy@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          { authorEmail: 'nicolas.mercier@imknow.com', content: "Le training-serving skew est effectivement très courant. Une bonne pratique : sauvegarder un snapshot des données de production toutes les semaines et comparer la distribution avec le training set. Ça détecte le drift avant d'impacter les métriques business.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com'] },
          { authorEmail: 'julien.leroy@imknow.com', content: "MLflow pour le tracking des expériences est vraiment indispensable. On a eu des situations où on ne savait plus quel dataset, quelle version du code, quels hyperparamètres correspondaient à quel modèle en prod. C'est le genre de dette MLOps qui coûte cher.", mentions: [], likers: ['nicolas.mercier@imknow.com', 'thomas.martin@imknow.com', 'lucas.bernard@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Next.js 14 et le App Router : migration complète depuis Pages Router',
    threads: [
      {
        authorEmail: 'alexandre.petit@imknow.com',
        content: "On est en pleine migration Pages Router → App Router sur ImKnow. Les Server Components ont réduit notre bundle JS de 180kb à 65kb sur la page d'accueil. La difficulté c'est de repérer quels composants ont vraiment besoin de 'use client' — beaucoup de libs tierces ne sont pas encore compatibles.",
        mentions: ['thomas.martin@imknow.com'],
        likers: ['julien.leroy@imknow.com', 'nicolas.mercier@imknow.com', 'sophie.laurent@imknow.com'],
        replies: [
          { authorEmail: 'thomas.martin@imknow.com', content: "Pour les libs tierces pas encore compatibles, le pattern du 'wrapper client' fonctionne bien : créer un petit composant avec 'use client' qui encapsule la lib, et passer le reste en Server Component. La règle : le 'use client' descend le plus bas possible dans l'arbre.", mentions: ['alexandre.petit@imknow.com'], likers: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com'] },
          { authorEmail: 'julien.leroy@imknow.com', content: "Le cache du App Router est puissant mais déroutant au début. Quatre layers de cache différents (Request Memoization, Data Cache, Full Route Cache, Router Cache) avec des règles d'invalidation distinctes. Je recommande de commencer avec `cache: 'no-store'` partout puis d'ajouter le cache progressivement.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'nicolas.mercier@imknow.com'] },
        ],
      },
      {
        authorEmail: 'sophie.laurent@imknow.com',
        content: "Les gains sur les métriques Core Web Vitals que tu mentionnes sont impressionnants. On a lancé un audit Lighthouse avant/après et le LCP est passé de 3.8s à 1.2s. Le SEO a suivi avec une amélioration notable des positions sur nos pages publiques.",
        mentions: [],
        likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'clarisse.renaud@imknow.com'],
        replies: [
          { authorEmail: 'thomas.martin@imknow.com', content: "L'impact SEO est sous-estimé ! Les Core Web Vitals sont un facteur de classement direct depuis 2021. Avec le App Router et les Server Components, on charge uniquement le JS nécessaire — les bots de Google voient le HTML complet directement, sans attendre le JS.", mentions: ['sophie.laurent@imknow.com'], likers: ['sophie.laurent@imknow.com', 'clarisse.renaud@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Redis en production : stratégies de cache et patterns avancés',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "On utilise le pattern Cache-aside sur ImKnow avec une subtilité : le cache stampede. Quand une clé expire et que 50 requêtes arrivent simultanément, elles vont toutes taper la DB. Solution : le probabilistic early revalidation — revalider la clé quelques secondes avant l'expiration avec une probabilité croissante.",
        mentions: ['lucas.bernard@imknow.com'],
        likers: ['julien.leroy@imknow.com', 'nicolas.mercier@imknow.com', 'alexandre.petit@imknow.com'],
        replies: [
          { authorEmail: 'lucas.bernard@imknow.com', content: "Le cache stampede est un vrai problème en prod ! Une autre approche : le mutex lock — seul le premier thread revalide, les autres attendent le résultat en cache. Avec ioredis et `SET NX PX` (set if not exists with TTL), c'est 5 lignes de code.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com'] },
          { authorEmail: 'julien.leroy@imknow.com', content: "Pour les sessions, Redis avec `SETEX` et un TTL glissant (reset à chaque requête) est la solution standard. Comparé aux sessions en DB, la latence passe de ~20ms à ~0.3ms — très notable sur les endpoints authentifiés qui sont appelés des dizaines de fois par page.", mentions: [], likers: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'nicolas.mercier@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'CI/CD avec GitHub Actions : pipeline complet pour une application NestJS',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "Le cache des layers Docker avec `cache-from: type=gha` a réduit notre build de 8 minutes à 90 secondes. Ce n'est pas dans le Dockerfile de base de la plupart des projets et pourtant c'est la chose la plus impactante qu'on puisse faire sur un pipeline NestJS.",
        mentions: ['julien.leroy@imknow.com'],
        likers: ['alexandre.petit@imknow.com', 'nicolas.mercier@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "Pour aller plus loin : ordonner les instructions Dockerfile pour maximiser la réutilisation du cache. COPY package*.json et npm ci avant COPY . — comme ça, si seulement le code change (pas les dépendances), le layer npm ci est réutilisé.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com'] },
          { authorEmail: 'lucas.bernard@imknow.com', content: "On a ajouté les Environments GitHub (staging et production) avec un approbateur obligatoire pour la prod. Le déploiement en production nécessite maintenant une validation manuelle d'un senior — ça a évité plusieurs incidents de déploiement accidentel.", mentions: [], likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com'] },
        ],
      },
      {
        authorEmail: 'nicolas.mercier@imknow.com',
        content: "Le matrix strategy pour paralléliser les tests est top ! On a 3 suites de tests (unit, integration, e2e) qui prenaient 12 minutes en séquence. En parallèle c'est 5 minutes. Combiné avec le cache npm, notre pipeline total est passé de 20 minutes à 7 minutes.",
        mentions: [],
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "Pour les tests e2e en parallèle, attention à l'isolation de la DB de test. Chaque runner matrix doit avoir sa propre instance PostgreSQL (les services GitHub Actions sont indépendants par job) ou sa propre DB de test nommée distinctement.", mentions: ['nicolas.mercier@imknow.com'], likers: ['nicolas.mercier@imknow.com', 'thomas.martin@imknow.com', 'lucas.bernard@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Gestion de la performance : conduire des entretiens annuels efficaces',
    threads: [
      {
        authorEmail: 'emma.moreau@imknow.com',
        content: "La séparation entretien de performance / entretien salarial change vraiment la dynamique. Chez nous on les avait fusionnés et tout le monde arrivait en mode défensif, à minimiser ses lacunes pour ne pas impacter la révision salariale. Depuis la séparation, les entretiens de développement sont devenus des vraies conversations.",
        mentions: ['marie.dupont@imknow.com'],
        likers: ['marie.dupont@imknow.com', 'lea.dubois@imknow.com', 'camille.rousseau@imknow.com', 'thomas.martin@imknow.com'],
        replies: [
          { authorEmail: 'marie.dupont@imknow.com', content: "Exactement Emma ! C'est aussi recommandé par la plupart des frameworks RH modernes (Lattice, 15Five). Le délai entre les deux entretiens doit être d'au moins 2 semaines pour que l'employé puisse dissocier mentalement les deux sujets.", mentions: ['emma.moreau@imknow.com'], likers: ['emma.moreau@imknow.com', 'lea.dubois@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "Les OKR trimestriels ont remplacé les objectifs annuels dans mon équipe. L'environnement tech change trop vite pour fixer des objectifs à 12 mois. Réviser tous les 3 mois avec l'équipe permet d'adapter aux nouvelles priorités et de garder le sens d'avancement.", mentions: [], likers: ['marie.dupont@imknow.com', 'emma.moreau@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'SEO technique en 2024 : Core Web Vitals, structured data et indexation',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "Le passage de FID à INP en mars 2024 a surpris beaucoup d'équipes. Notre score INP était mauvais à cause d'un handler click synchrone qui faisait trop de travail. Solution : déplacer le traitement lourd dans un requestIdleCallback ou un Web Worker. INP < 200ms atteint.",
        mentions: ['emma.moreau@imknow.com'],
        likers: ['alexandre.petit@imknow.com', 'clarisse.renaud@imknow.com', 'sophie.laurent@imknow.com'],
        replies: [
          { authorEmail: 'emma.moreau@imknow.com', content: "Merci pour ce retour concret Thomas ! La migration FID → INP a aussi affecté nos scores PageSpeed — des pages qui étaient à 90 sont passées à 70. On est en train d'identifier les interactions lentes avec le Profiler Chrome DevTools.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'clarisse.renaud@imknow.com'] },
        ],
      },
      {
        authorEmail: 'clarisse.renaud@imknow.com',
        content: "Les données structurées pour les articles ont boosté notre CTR de 18% en ajoutant l'auteur et la date dans les rich snippets. On a aussi implémenté le schema BreadcrumbList et les résultats de recherche Google montrent maintenant le fil d'Ariane — très utile pour les pages catégories.",
        mentions: [],
        likers: ['emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'marie.dupont@imknow.com'],
        replies: [
          { authorEmail: 'emma.moreau@imknow.com', content: "Excellents chiffres Clarisse ! On a aussi ajouté le FAQ schema sur nos pages de documentation et certaines pages ont des featured snippets en position 0. Ça ne se traduit pas toujours en plus de clics mais la visibilité est incomparable.", mentions: ['clarisse.renaud@imknow.com'], likers: ['clarisse.renaud@imknow.com', 'thomas.martin@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Accessibilité web WCAG 2.2 : guide pratique pour les développeurs',
    threads: [
      {
        authorEmail: 'thomas.martin@imknow.com',
        content: "L'accessibilité dans ImKnow a révélé des problèmes qu'on n'avait pas vus en tests visuels. Test rapide : déconnecter la souris et naviguer avec Tab uniquement. Si vous ne pouvez pas accéder à toutes les fonctions, votre app n'est pas accessible — et c'est souvent le cas.",
        mentions: ['sophie.laurent@imknow.com'],
        likers: ['alexandre.petit@imknow.com', 'lea.dubois@imknow.com', 'emma.moreau@imknow.com'],
        replies: [
          { authorEmail: 'sophie.laurent@imknow.com', content: "Le test Tab-uniquement est le meilleur test rapide que je connaisse ! On l'a intégré dans notre Definition of Done : toute nouvelle feature doit être navigable au clavier avant de passer en review. Ça a changé comment les développeurs pensent les composants interactifs.", mentions: ['thomas.martin@imknow.com'], likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lea.dubois@imknow.com'] },
          { authorEmail: 'alexandre.petit@imknow.com', content: "Pour l'automatisation : on a intégré axe-core dans notre pipeline CI via `@axe-core/playwright`. Chaque PR lance un test d'accessibilité sur les pages principales. Ça n'attrape pas tout (30-40% comme mentionné) mais ça évite les régressions les plus grossières.", mentions: [], likers: ['thomas.martin@imknow.com', 'sophie.laurent@imknow.com'] },
        ],
      },
      {
        authorEmail: 'lea.dubois@imknow.com',
        content: "Point légal important : en France, la loi de 2005 rend l'accessibilité obligatoire pour les services publics numériques. Pour le secteur privé, le risque de litige ADA (USA) est croissant et des entreprises françaises avec présence US ont déjà été attaquées. L'accessibilité n'est plus optionnelle.",
        mentions: [],
        likers: ['sophie.laurent@imknow.com', 'marie.dupont@imknow.com', 'thomas.martin@imknow.com', 'emma.moreau@imknow.com'],
        replies: [
          { authorEmail: 'sophie.laurent@imknow.com', content: "Merci pour ce rappel légal Léa ! L'argument ROI est souvent nécessaire pour convaincre la direction. Accessibility = marché élargi (15% de la population mondiale), meilleur SEO (les mêmes pratiques), et réduction des risques légaux. Trois justifications business en une.", mentions: ['lea.dubois@imknow.com'], likers: ['lea.dubois@imknow.com', 'thomas.martin@imknow.com'] },
        ],
      },
    ],
  },
  {
    articleTitle: 'Gestion de la dette technique : mesurer, prioriser et rembourser',
    threads: [
      {
        authorEmail: 'julien.leroy@imknow.com',
        content: "La règle du Boy Scout est simple mais efficace : on l'a formalisée dans notre Definition of Done. Chaque PR doit laisser le code 'au moins aussi propre' qu'avant. Pas de refactoring massif obligatoire, mais une amélioration marginale systématique. Sur 6 mois, l'effet est réel.",
        mentions: ['nicolas.mercier@imknow.com'],
        likers: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com'],
        replies: [
          { authorEmail: 'nicolas.mercier@imknow.com', content: "On a ajouté une règle complémentaire : si tu touches un fichier et tu vois une dette évidente (fonction de 200 lignes, variable mal nommée, commentaire trompeur), tu la corriges dans le même PR. Pas dans 'un prochain ticket' qui n'arrivera jamais.", mentions: ['julien.leroy@imknow.com'], likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com', 'alexandre.petit@imknow.com'] },
          { authorEmail: 'thomas.martin@imknow.com', content: "La communication en termes business est vraiment la clé. On a eu du mal à faire passer du budget pour le remboursement de dette jusqu'à ce qu'on le formule comme 'ce module nous coûte 2 jours supplémentaires par sprint en moyenne'. Le ROI devient clair.", mentions: [], likers: ['julien.leroy@imknow.com', 'nicolas.mercier@imknow.com', 'lucas.bernard@imknow.com'] },
        ],
      },
      {
        authorEmail: 'lucas.bernard@imknow.com',
        content: "SonarQube a changé notre façon de gérer la dette. Le Technical Debt Ratio affiché à chaque build force les équipes à se confronter aux chiffres. On a mis une quality gate : pas de merge si le TD Ratio augmente de plus de 0.5%. Ça crée une friction positive.",
        mentions: [],
        likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'nicolas.mercier@imknow.com', 'alexandre.petit@imknow.com'],
        replies: [
          { authorEmail: 'julien.leroy@imknow.com', content: "La quality gate SonarQube en CI est une excellente idée ! On a aussi activé le scan des secrets (SonarQube détecte les tokens et credentials hardcodés) — ça a rattrapé 3 secrets en prod sur le premier scan. La dette de sécurité est souvent la plus urgente.", mentions: ['lucas.bernard@imknow.com'], likers: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'nicolas.mercier@imknow.com'] },
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
