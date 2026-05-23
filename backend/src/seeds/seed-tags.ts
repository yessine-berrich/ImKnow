import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Tag } from '../tag/entities/tag.entity';
import { TagService } from '../tag/tag.service';

const logger = new Logger('Seed:Tags');

const TAGS = [
  '#React', '#TypeScript', '#Guide', '#Tutoriel', '#Best Practices',
  '#Nouveau', '#Important', '#Urgent', '#Node.js', '#Frontend',
  '#Backend', '#DevOps', '#Security', '#Performance', '#Testing',
  '#Architecture', '#Database', '#API', '#UI/UX', '#Mobile',
  '#JavaScript', '#Design', '#CleanCode', '#Monitoring', '#CI/CD',
];

export async function seedTags(context?: INestApplicationContext): Promise<{ nameToTag: Record<string, Tag> }> {
  const ownContext = !context;
  if (!context) {
    context = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });
  }

  const tagRepo = context.get<Repository<Tag>>(getRepositoryToken(Tag));
  const tagService = context.get(TagService);
  const nameToTag: Record<string, Tag> = {};

  try {
    for (const tagName of TAGS) {
      const existing = await tagRepo.findOne({ where: { name: tagName } });
      if (existing) {
        nameToTag[tagName] = existing;
        logger.log(`  ⏭️  Tag "${tagName}" existe déjà`);
        continue;
      }
      nameToTag[tagName] = await tagService.create({ name: tagName });
      logger.log(`  ✅ Tag "${tagName}" créé`);
    }
    logger.log(`  📊 ${Object.keys(nameToTag).length} tags`);
    return { nameToTag };
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedTags().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
