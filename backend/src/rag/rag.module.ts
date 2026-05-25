import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { PublicationModule } from 'src/publication/publication.module';
import { GroqRagService } from './groq-rag.service';
import { UsersModule } from 'src/users/users.module';
import { RagRetrievalService } from './rag-retrieval.service';
import { SearchModule } from 'src/search/search.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Publication } from 'src/publication/entities/publication.entity';
import { AiConversationModule } from 'src/ai-conversation/ai-conversation.module';

@Module({
  imports: [
    PublicationModule,
    UsersModule,
    SearchModule,
    AiConversationModule,
    TypeOrmModule.forFeature([Publication]),
  ],
  controllers: [RagController],
  providers: [RagService, GroqRagService, RagRetrievalService],
  exports: [RagService],
})
export class RagModule {}
