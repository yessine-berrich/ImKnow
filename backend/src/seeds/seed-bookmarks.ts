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
  // Articles manquants
  { title: 'Stratégie content marketing B2B : guide complet 2024',                      users: ['clarisse.renaud@imknow.com', 'emma.moreau@imknow.com', 'marie.dupont@imknow.com'] },
  { title: 'GraphQL vs REST : comment choisir pour votre prochain projet',              users: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'nicolas.mercier@imknow.com', 'alexandre.petit@imknow.com'] },
  { title: 'Tests A/B : méthodologie et pièges à éviter',                               users: ['clarisse.renaud@imknow.com', 'emma.moreau@imknow.com', 'marie.dupont@imknow.com', 'camille.rousseau@imknow.com'] },
  { title: 'Marque employeur : construire une image qui attire les talents',            users: ['marie.dupont@imknow.com', 'emma.moreau@imknow.com', 'julien.leroy@imknow.com', 'camille.rousseau@imknow.com'] },
  { title: 'Vue.js 3 et la Composition API : migration depuis Options API',             users: ['alexandre.petit@imknow.com', 'thomas.martin@imknow.com', 'nicolas.mercier@imknow.com', 'julien.leroy@imknow.com'] },
  { title: 'OWASP Top 10 : sécuriser ses applications web en 2024',                     users: ['lucas.bernard@imknow.com', 'julien.leroy@imknow.com', 'thomas.martin@imknow.com', 'lea.dubois@imknow.com', 'alexandre.petit@imknow.com'] },
  { title: 'Leadership technique : passer de développeur senior à tech lead',            users: ['thomas.martin@imknow.com', 'nicolas.mercier@imknow.com', 'julien.leroy@imknow.com', 'marie.dupont@imknow.com', 'alexandre.petit@imknow.com'] },
  { title: "Machine Learning en production : de l'expérimentation au déploiement",      users: ['julien.leroy@imknow.com', 'thomas.martin@imknow.com', 'lucas.bernard@imknow.com', 'nicolas.mercier@imknow.com'] },
  { title: 'Next.js 14 et le App Router : migration complète depuis Pages Router',       users: ['alexandre.petit@imknow.com', 'thomas.martin@imknow.com', 'nicolas.mercier@imknow.com', 'julien.leroy@imknow.com'] },
  { title: 'Redis en production : stratégies de cache et patterns avancés',              users: ['lucas.bernard@imknow.com', 'julien.leroy@imknow.com', 'thomas.martin@imknow.com', 'nicolas.mercier@imknow.com', 'alexandre.petit@imknow.com'] },
  { title: 'CI/CD avec GitHub Actions : pipeline complet pour une application NestJS',  users: ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com', 'lucas.bernard@imknow.com', 'nicolas.mercier@imknow.com'] },
  { title: 'Gestion de la performance : conduire des entretiens annuels efficaces',      users: ['marie.dupont@imknow.com', 'emma.moreau@imknow.com', 'lea.dubois@imknow.com', 'camille.rousseau@imknow.com'] },
  { title: 'SEO technique en 2024 : Core Web Vitals, structured data et indexation',    users: ['clarisse.renaud@imknow.com', 'emma.moreau@imknow.com', 'sophie.laurent@imknow.com', 'thomas.martin@imknow.com'] },
  { title: 'Accessibilité web WCAG 2.2 : guide pratique pour les développeurs',         users: ['sophie.laurent@imknow.com', 'thomas.martin@imknow.com', 'lea.dubois@imknow.com', 'emma.moreau@imknow.com', 'alexandre.petit@imknow.com'] },
  { title: 'Gestion de la dette technique : mesurer, prioriser et rembourser',          users: ['thomas.martin@imknow.com', 'julien.leroy@imknow.com', 'nicolas.mercier@imknow.com', 'lucas.bernard@imknow.com', 'alexandre.petit@imknow.com'] },
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
