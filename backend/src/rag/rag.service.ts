import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { RagQueryDto } from './dto/rag-query.dto';
import { RagResponse } from './interfaces/rag-response.interface';
import { GroqRagService } from './groq-rag.service';
import { RagRetrievalService } from './rag-retrieval.service';

@Injectable()
export class RagService {
  constructor(
    private readonly ragRetrievalService: RagRetrievalService,
    private readonly groqRagService: GroqRagService,
  ) {}

  async ragSearch(queryDto: RagQueryDto): Promise<RagResponse> {
    const { q, limit = 7, minSimilarity = 0.25 } = queryDto;

    try {
      const chunks = await this.ragRetrievalService.semanticChunkSearch(
        q,
        limit,
        minSimilarity,
      );

      if (chunks.length === 0) {
        return {
          success: true,
          query: q,
          found: 0,
          answer: "Je n'ai pas trouvé d'information pertinente dans les documents disponibles.",
        };
      }

      const answer = await this.groqRagService.generateRAGResponse(q, chunks);

      // Deduplicate sources by publicationId, keeping highest similarity per publication
      const sourceMap = new Map<number, { publicationId: number; title: string; chunkIndex: number; similarity: number }>();
      for (const chunk of chunks) {
        const existing = sourceMap.get(chunk.publicationId);
        if (!existing || chunk.similarity > existing.similarity) {
          sourceMap.set(chunk.publicationId, {
            publicationId: chunk.publicationId,
            title: chunk.title,
            chunkIndex: chunk.chunkIndex,
            similarity: chunk.similarity,
          });
        }
      }
      const sources = Array.from(sourceMap.values()).sort(
        (a, b) => b.similarity - a.similarity,
      );

      return {
        success: true,
        query: q,
        found: chunks.length,
        answer: answer.trim(),
        sources,
      };
    } catch (error: any) {
      console.error('[RAG] Erreur :', error);
      throw new InternalServerErrorException({
        success: false,
        message: 'Erreur lors du traitement RAG',
        debug: error.message,
      });
    }
  }
}
