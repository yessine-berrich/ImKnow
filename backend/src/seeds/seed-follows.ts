import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Follow } from '../follow/entities/follow.entity';
import { FollowService } from '../follow/follow.service';
import { seedUsers } from './seed-users';

const logger = new Logger('Seed:Follows');

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
  // Nouveaux users
  ['nicolas.mercier@imknow.com', 'julien.leroy@imknow.com'],
  ['nicolas.mercier@imknow.com', 'thomas.martin@imknow.com'],
  ['nicolas.mercier@imknow.com', 'alexandre.petit@imknow.com'],
  ['clarisse.renaud@imknow.com', 'emma.moreau@imknow.com'],
  ['clarisse.renaud@imknow.com', 'sophie.laurent@imknow.com'],
  ['clarisse.renaud@imknow.com', 'marie.dupont@imknow.com'],
  ['julien.leroy@imknow.com', 'nicolas.mercier@imknow.com'],
  ['thomas.martin@imknow.com', 'nicolas.mercier@imknow.com'],
  ['emma.moreau@imknow.com', 'clarisse.renaud@imknow.com'],
  // Follows involving inactive users (they can still be followed)
  ['marie.dupont@imknow.com', 'antoine.lefevre@imknow.com'],
  ['camille.rousseau@imknow.com', 'beatrice.chevallier@imknow.com'],
  ['antoine.lefevre@imknow.com', 'marie.dupont@imknow.com'],
  // Pending users following active ones
  ['david.moreau@imknow.com', 'nicolas.mercier@imknow.com'],
  ['david.moreau@imknow.com', 'thomas.martin@imknow.com'],
  ['elodie.petit@imknow.com', 'sophie.laurent@imknow.com'],
];

export async function seedFollows(
  context?: INestApplicationContext,
  emailToUser?: Record<string, User>,
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

  const followRepo = context.get<Repository<Follow>>(getRepositoryToken(Follow));
  const followService = context.get(FollowService);

  try {
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
          logger.warn(`  ⚠️ ${followerEmail}→${followingEmail}: ${err.message}`);
        }
      }
    }
    logger.log(`  ✅ ${followCount} nouveaux follows`);
    const total = await followRepo.count();
    logger.log(`  📊 Total follows : ${total}`);
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedFollows().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
