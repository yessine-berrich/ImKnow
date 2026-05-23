import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Publication } from '../publication/entities/publication.entity';
import { PublicationReport } from '../publication/entities/publication-report.entity';
import { UserReport } from '../users/entities/user-report.entity';
import { ReportAIService } from '../report-ai/report-ai.service';
import { seedUsers } from './seed-users';
import { seedPublications } from './seed-publications';

const logger = new Logger('Seed:Reports');

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
  // Nouveaux reports
  { reporterEmail: 'lea.dubois@imknow.com', publicationTitle: 'Clean Architecture : appliquer les principes de Bob Martin en NestJS', reason: 'plagiarism', details: 'Cet article reprend des sections du livre de Bob Martin sans citation.' },
  { reporterEmail: 'marie.dupont@imknow.com', publicationTitle: 'Design Patterns en JavaScript : du classique au moderne', reason: 'misinformation', details: "Quelques exemples de code contiennent des erreurs qui pourraient induire les juniors en erreur." },
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
  // Report sur un utilisateur inactif
  { reporterEmail: 'marie.dupont@imknow.com', reportedUserEmail: 'antoine.lefevre@imknow.com', reason: 'inappropriate_content', details: "Antoine a partagé des informations confidentielles après son départ." },
  // Report sur un utilisateur en attente
  { reporterEmail: 'sophie.laurent@imknow.com', reportedUserEmail: 'elodie.petit@imknow.com', reason: 'other', details: 'Le compte semble être un faux, l\'utilisateur ne répond pas aux relances.' },
];

export async function seedReports(
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

  const publicationReportRepo = context.get<Repository<PublicationReport>>(getRepositoryToken(PublicationReport));
  const userReportRepo = context.get<Repository<UserReport>>(getRepositoryToken(UserReport));
  const reportAiService = context.get(ReportAIService);

  try {
    // ── Publication Reports ──────────────────────────────────────────────
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
    logger.log(`  ✅ ${reportCount} signalements publications`);

    // ── User Reports ────────────────────────────────────────────────────
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

    // ── AI Analysis (new + existing unanalyzed) ────────────────────────
    const unanalyzedPubReports = await publicationReportRepo
      .createQueryBuilder('r')
      .select('r.id')
      .where('r.aiAnalyzedAt IS NULL')
      .getMany();
    const unanalyzedUserReports = await userReportRepo
      .createQueryBuilder('r')
      .select('r.id')
      .where('r.aiAnalyzedAt IS NULL')
      .getMany();

    const pubIds  = unanalyzedPubReports.map((r) => r.id);
    const userIds = unanalyzedUserReports.map((r) => r.id);

    const total = pubIds.length + userIds.length;
    if (total > 0) {
      logger.log(`  🤖 Analyse IA de ${total} signalements non analysés (séquentiel)…`);
      let done = 0;
      for (const id of pubIds) {
        await reportAiService.analyzePublicationReport(id).catch((e) =>
          logger.warn(`  ⚠️  AI pub report ${id}: ${e?.message}`),
        );
        done++;
        if (done % 5 === 0) logger.log(`  🤖 ${done}/${total} analysés…`);
        await new Promise((r) => setTimeout(r, 500));
      }
      for (const id of userIds) {
        await reportAiService.analyzeUserReport(id).catch((e) =>
          logger.warn(`  ⚠️  AI user report ${id}: ${e?.message}`),
        );
        done++;
        if (done % 5 === 0) logger.log(`  🤖 ${done}/${total} analysés…`);
        await new Promise((r) => setTimeout(r, 500));
      }
      logger.log(`  ✅ Analyse IA terminée (${done}/${total} réussis)`);
    }
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedReports().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
