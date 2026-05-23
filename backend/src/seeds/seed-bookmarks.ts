import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { Publication } from '../publication/entities/publication.entity';
import { PublicationInteractionService } from '../publication/publication-interaction.service';
import { seedUsers } from './seed-users';
import { seedPublications } from './seed-publications';

const logger = new Logger('Seed:Bookmarks');

const BOOKMARKS: { title: string; users: string[] }[] = [
  { title: 'Guide complet React 18 : nouveautés et bonnes pratiques',                users: ['julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'sophie.laurent@imknow.com', 'emma.moreau@imknow.com', 'nicolas.mercier@imknow.com'] },
  { title: 'TypeScript avancé : types génériques et patterns de conception',          users: ['julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'marie.dupont@imknow.com'] },
  { title: 'Architecture microservices : retour d\'expérience après 2 ans',           users: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com', 'emma.moreau@imknow.com'] },
  { title: 'Sécurité des API REST : guide complet 2024',                              users: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com', 'lea.dubois@imknow.com', 'alexandre.petit@imknow.com'] },
  { title: 'PostgreSQL : optimisation avancée des requêtes',                          users: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'alexandre.petit@imknow.com'] },
  { title: 'RGPD en 2024 : guide pratique pour les équipes techniques',               users: ['lucas.bernard@imknow.com', 'thomas.martin@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com'] },
  { title: 'Intelligence Artificielle en entreprise : par où commencer ?',            users: ['thomas.martin@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'clarisse.renaud@imknow.com'] },
  { title: 'Docker et Kubernetes : déployer ses applications en production',           users: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com'] },
  { title: 'Onboarding réussi : le guide complet pour les équipes RH',                users: ['julien.leroy@imknow.com', 'camille.rousseau@imknow.com', 'emma.moreau@imknow.com', 'lea.dubois@imknow.com'] },
  { title: 'Construire un Design System scalable : guide pratique',                   users: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'emma.moreau@imknow.com', 'clarisse.renaud@imknow.com'] },
  { title: 'Performance JavaScript : les optimisations qui font vraiment la différence', users: ['alexandre.petit@imknow.com', 'julien.leroy@imknow.com', 'lucas.bernard@imknow.com', 'sophie.laurent@imknow.com'] },
  { title: 'Recruter les meilleurs talents tech : stratégies pour 2024',              users: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'lea.dubois@imknow.com'] },
  { title: 'Clean Architecture : appliquer les principes de Bob Martin en NestJS',    users: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com', 'david.moreau@imknow.com'] },
  { title: 'Monitoring avec Prometheus et Grafana : guide pratique',                  users: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'nicolas.mercier@imknow.com'] },
  { title: 'Design Patterns en JavaScript : du classique au moderne',                  users: ['alexandre.petit@imknow.com', 'sophie.laurent@imknow.com', 'nicolas.mercier@imknow.com'] },
];

export async function seedBookmarks(
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
    let bookmarkCount = 0;
    for (const { title, users } of BOOKMARKS) {
      const pub = titleToPub[title];
      if (!pub) {
        logger.warn(`  ⚠️ Article non trouvé : "${title.substring(0, 40)}"`);
        continue;
      }
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
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedBookmarks().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
