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
import { Comment } from '../comment/entities/comment.entity';
import { Follow } from '../follow/entities/follow.entity';
import { ChatMessage } from '../chat/entities/chat-message.entity';
import { UserBlock } from '../chat/entities/user-block.entity';
import { PublicationReport } from '../publication/entities/publication-report.entity';
import { UserReport } from '../users/entities/user-report.entity';
import { seedUsers } from './seed-users';
import { seedCategories } from './seed-categories';
import { seedTags } from './seed-tags';
import { seedPublications } from './seed-publications';
import { seedFollows } from './seed-follows';
import { seedLikes } from './seed-likes';
import { seedBookmarks } from './seed-bookmarks';
import { seedComments } from './seed-comments';
import { seedChat } from './seed-chat';
import { seedBlocks } from './seed-blocks';
import { seedNotifications } from './seed-notifications';
import { seedReports } from './seed-reports';

const logger = new Logger('Seed');

async function seed() {
  logger.log('🚀 Démarrage du seed complet (modulaire)...');

  const context: INestApplicationContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const dataSource = context.get(DataSource);
  const userRepo = context.get<Repository<User>>(getRepositoryToken(User));
  const categoryRepo = context.get<Repository<Category>>(getRepositoryToken(Category));
  const tagRepo = context.get<Repository<Tag>>(getRepositoryToken(Tag));
  const publicationRepo = context.get<Repository<Publication>>(getRepositoryToken(Publication));
  const followRepo = context.get<Repository<Follow>>(getRepositoryToken(Follow));
  const commentRepo = context.get<Repository<Comment>>(getRepositoryToken(Comment));
  const publicationReportRepo = context.get<Repository<PublicationReport>>(getRepositoryToken(PublicationReport));
  const userReportRepo = context.get<Repository<UserReport>>(getRepositoryToken(UserReport));

  try {
    // ── 1. USERS ──────────────────────────────────────────────────────────
    logger.log('📦 Création des utilisateurs...');
    const { emailToUser } = await seedUsers(context);
    const totalUsers = await userRepo.count();
    logger.log(`   📊 ${totalUsers} utilisateurs`);

    // ── 2. CATEGORIES ─────────────────────────────────────────────────────
    logger.log('📂 Création des catégories...');
    const { nameToCategory } = await seedCategories(context);
    const totalCategories = await categoryRepo.count();
    logger.log(`   📊 ${totalCategories} catégories`);

    // ── 3. TAGS ───────────────────────────────────────────────────────────
    logger.log('🏷️  Création des tags...');
    const { nameToTag } = await seedTags(context);
    const totalTags = await tagRepo.count();
    logger.log(`   📊 ${totalTags} tags`);

    // ── 4. PUBLICATIONS ───────────────────────────────────────────────────
    logger.log('📄 Création des publications...');
    const { titleToPub } = await seedPublications(context, emailToUser, nameToCategory, nameToTag);
    const totalPublications = await publicationRepo.count();
    logger.log(`   📊 ${totalPublications} publications`);

    // ── 5. FOLLOWS ────────────────────────────────────────────────────────
    logger.log('👤 Création des follows...');
    await seedFollows(context, emailToUser);
    const totalFollows = await followRepo.count();
    logger.log(`   📊 ${totalFollows} follows`);

    // ── 6. LIKES ──────────────────────────────────────────────────────────
    logger.log('❤️  Likes publications...');
    await seedLikes(context, emailToUser, titleToPub);

    // ── 7. BOOKMARKS ──────────────────────────────────────────────────────
    logger.log('🔖 Bookmarks...');
    await seedBookmarks(context, emailToUser, titleToPub);

    // ── 8. COMMENTS ───────────────────────────────────────────────────────
    logger.log('💬 Création des commentaires...');
    await seedComments(context, emailToUser, titleToPub);

    // ── 9. CHAT ───────────────────────────────────────────────────────────
    logger.log('💌 Messages de chat...');
    await seedChat(context, emailToUser);

    // ── 10. BLOCKS ────────────────────────────────────────────────────────
    logger.log('🚫 Blocages utilisateurs...');
    await seedBlocks(context, emailToUser);

    // ── 11. NOTIFICATIONS ─────────────────────────────────────────────────
    logger.log('🔔 Notifications...');
    await seedNotifications(context, emailToUser, titleToPub);

    // ── 12. REPORTS ────────────────────────────────────────────────────────
    logger.log('🚩 Signalements...');
    await seedReports(context, emailToUser, titleToPub);

    // ── SUMMARY ───────────────────────────────────────────────────────────
    const counts = {
      users: totalUsers,
      categories: totalCategories,
      tags: totalTags,
      publications: totalPublications,
      publicationVersions: await dataSource.getRepository(PublicationVersion).count(),
      comments: await commentRepo.count({ where: { deletedAt: null } } as any),
      follows: totalFollows,
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
    logger.log('   admin@imknow.com              / Admin@1234  (Administrateur)');
    logger.log('   marie.dupont@imknow.com       / Employee@1234');
    logger.log('   thomas.martin@imknow.com      / Employee@1234');
    logger.log('   sophie.laurent@imknow.com     / Employee@1234');
    logger.log('   lucas.bernard@imknow.com      / Employee@1234');
    logger.log('   emma.moreau@imknow.com        / Employee@1234');
    logger.log('   alexandre.petit@imknow.com    / Employee@1234');
    logger.log('   camille.rousseau@imknow.com   / Employee@1234');
    logger.log('   julien.leroy@imknow.com       / Employee@1234');
    logger.log('   lea.dubois@imknow.com         / Employee@1234');
    logger.log('   nicolas.mercier@imknow.com    / Employee@1234');
    logger.log('   clarisse.renaud@imknow.com    / Employee@1234');

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
