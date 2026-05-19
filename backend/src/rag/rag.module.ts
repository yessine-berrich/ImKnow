import { Module } from '@nestjs/common';
import { RagService } from './rag.service';
import { RagController } from './rag.controller';
import { PublicationModule } from 'src/publication/publication.module';
import { GroqRagService } from './groq-rag.service';
import { UsersModule } from 'src/users/users.module';
import { RagRetrievalService } from './rag-retrieval.service';
import { SearchModule } from 'src/search/search.module';

@Module({
  imports: [PublicationModule, UsersModule, SearchModule],
  controllers: [RagController],
  providers: [RagService, GroqRagService, RagRetrievalService],
  exports: [RagService],
})
export class RagModule {}
