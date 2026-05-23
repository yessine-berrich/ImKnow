import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { Publication } from '../publication/entities/publication.entity';
import { PublicationInteractionService } from '../publication/publication-interaction.service';
import { seedUsers } from './seed-users';
import { seedPublications } from './seed-publications';

const logger = new Logger('Seed:Likes');

const ARTICLE_LIKES: { title: string; likers: string[] }[] = [
  { title: 'Guide complet React 18 : nouveautés et bonnes pratiques',                likers: ['alexandre.petit@imknow.com', 'sophie.laurent@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com', 'nicolas.mercier@imknow.com'] },
  { title: 'TypeScript avancé : types génériques et patterns de conception',          likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'marie.dupont@imknow.com', 'sophie.laurent@imknow.com', 'emma.moreau@imknow.com', 'nicolas.mercier@imknow.com'] },
  { title: 'Architecture microservices : retour d\'expérience après 2 ans',           likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'alexandre.petit@imknow.com', 'emma.moreau@imknow.com', 'camille.rousseau@imknow.com', 'sophie.laurent@imknow.com'] },
  { title: 'Sécurité des API REST : guide complet 2024',                              likers: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lea.dubois@imknow.com', 'marie.dupont@imknow.com', 'nicolas.mercier@imknow.com'] },
  { title: 'PostgreSQL : optimisation avancée des requêtes',                          likers: ['thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com'] },
  { title: 'Performance JavaScript : les optimisations qui font vraiment la différence', likers: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'sophie.laurent@imknow.com', 'lucas.bernard@imknow.com', 'nicolas.mercier@imknow.com'] },
  { title: 'RGPD en 2024 : guide pratique pour les équipes techniques',               likers: ['lucas.bernard@imknow.com', 'marie.dupont@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com', 'julien.leroy@imknow.com'] },
  { title: 'Intelligence Artificielle en entreprise : par où commencer ?',            likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'lucas.bernard@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com', 'alexandre.petit@imknow.com', 'clarisse.renaud@imknow.com'] },
  { title: 'Docker et Kubernetes : déployer ses applications en production',           likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'alexandre.petit@imknow.com', 'emma.moreau@imknow.com', 'lucas.bernard@imknow.com'] },
  { title: 'Onboarding réussi : le guide complet pour les équipes RH',                likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'julien.leroy@imknow.com', 'sophie.laurent@imknow.com', 'camille.rousseau@imknow.com', 'lea.dubois@imknow.com'] },
  { title: 'Construire un Design System scalable : guide pratique',                   likers: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'marie.dupont@imknow.com', 'clarisse.renaud@imknow.com'] },
  { title: 'Recruter les meilleurs talents tech : stratégies pour 2024',              likers: ['marie.dupont@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com', 'thomas.martin@imknow.com', 'camille.rousseau@imknow.com'] },
  { title: 'Stratégie content marketing B2B : guide complet 2024',                   likers: ['marie.dupont@imknow.com', 'julien.leroy@imknow.com', 'sophie.laurent@imknow.com', 'camille.rousseau@imknow.com', 'clarisse.renaud@imknow.com'] },
  // Nouveaux articles
  { title: 'Clean Architecture : appliquer les principes de Bob Martin en NestJS',    likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com', 'david.moreau@imknow.com'] },
  { title: 'GraphQL vs REST : comment choisir pour votre prochain projet',            likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'nicolas.mercier@imknow.com'] },
  { title: 'Tests A/B : méthodologie et pièges à éviter',                             likers: ['emma.moreau@imknow.com', 'marie.dupont@imknow.com', 'sophie.laurent@imknow.com', 'camille.rousseau@imknow.com'] },
  { title: 'Marque employeur : construire une image qui attire les talents',          likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'emma.moreau@imknow.com', 'lea.dubois@imknow.com'] },
  { title: 'Design Patterns en JavaScript : du classique au moderne',                  likers: ['alexandre.petit@imknow.com', 'sophie.laurent@imknow.com', 'julien.leroy@imknow.com', 'nicolas.mercier@imknow.com', 'lucas.bernard@imknow.com'] },
  { title: 'Monitoring avec Prometheus et Grafana : guide pratique',                  likers: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'alexandre.petit@imknow.com', 'nicolas.mercier@imknow.com', 'sophie.laurent@imknow.com'] },
];

export async function seedLikes(
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

  const interactionService = context.get(PublicationInteractionService);

  try {
    let likeCount = 0;
    for (const { title, likers } of ARTICLE_LIKES) {
      const pub = titleToPub[title];
      if (!pub) {
        logger.warn(`  ⚠️ Article non trouvé : "${title.substring(0, 40)}"`);
        continue;
      }
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
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedLikes().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
