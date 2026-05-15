import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { ArticleModule } from 'src/article/article.module';
import { GroqRagService } from './groq-rag.service';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [ArticleModule, UsersModule],
  controllers: [RagController],
  providers: [RagService, GroqRagService], // ← nouveau service pour Groq
  exports: [RagService],
})
export class RagModule { }
