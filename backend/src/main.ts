import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { seedCategoriesAndTags } from './seeds/category-tag.seed';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import type { Response } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const dataSource = app.get(DataSource);
  await seedCategoriesAndTags(dataSource);

  // ── Static files ──────────────────────────────────────────────────────────
  const uploadsPath = join(process.cwd(), 'uploads');
  console.log('Serving static files from:', uploadsPath);

  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/',
    setHeaders: (res: Response, path: string) => {
      if (path.includes(`${require('path').sep}avatars${require('path').sep}`)) {
        // Avatar filenames are unique per upload → safe to cache indefinitely
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        // Other uploads: revalidate after 1 hour
        res.setHeader('Cache-Control', 'public, max-age=3600');
      }
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global validation ─────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
