import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { ChatService } from '../chat/chat.service';
import { seedUsers } from './seed-users';

const logger = new Logger('Seed:Blocks');

const USER_BLOCKS: [string, string][] = [
  ['lea.dubois@imknow.com', 'alexandre.petit@imknow.com'],
  ['camille.rousseau@imknow.com', 'lucas.bernard@imknow.com'],
  ['thomas.martin@imknow.com', 'alexandre.petit@imknow.com'],
  ['marie.dupont@imknow.com', 'antoine.lefevre@imknow.com'],
];

export async function seedBlocks(
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

  const chatService = context.get(ChatService);

  try {
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
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedBlocks().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
