import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from '../category/entities/category.entity';
import { CategoryService } from '../category/category.service';

const logger = new Logger('Seed:Categories');

const CATEGORIES = [
  { name: 'Développement', description: 'Publications liées au développement logiciel' },
  { name: 'Design', description: "Publications sur le design et l'UX/UI" },
  { name: 'Marketing', description: 'Stratégies marketing et communication' },
  { name: 'RH', description: "Ressources humaines et gestion d'équipe" },
  { name: 'Finance', description: 'Gestion financière et comptabilité' },
  { name: 'Juridique', description: 'Aspects juridiques et conformité' },
];

export async function seedCategories(context?: INestApplicationContext): Promise<{ nameToCategory: Record<string, Category> }> {
  const ownContext = !context;
  if (!context) {
    context = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn'],
    });
  }

  const categoryRepo = context.get<Repository<Category>>(getRepositoryToken(Category));
  const categoryService = context.get(CategoryService);
  const nameToCategory: Record<string, Category> = {};

  try {
    for (const cat of CATEGORIES) {
      const existing = await categoryRepo.findOne({ where: { name: cat.name } });
      if (existing) {
        nameToCategory[cat.name] = existing;
        logger.log(`  ⏭️  Catégorie "${cat.name}" existe déjà`);
        continue;
      }
      nameToCategory[cat.name] = await categoryService.create({ name: cat.name, description: cat.description });
      logger.log(`  ✅ Catégorie "${cat.name}" créée`);
    }
    logger.log(`  📊 ${Object.keys(nameToCategory).length} catégories`);
    return { nameToCategory };
  } finally {
    if (ownContext) await context.close();
  }
}

if (require.main === module) {
  seedCategories().catch(err => {
    logger.error('Erreur fatale:', err.message);
    process.exit(1);
  });
}
