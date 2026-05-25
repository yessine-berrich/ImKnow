import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { RagQueryDto } from './dto/rag-query.dto';
import { RagResponse } from './interfaces/rag-response.interface';
import { GroqRagService } from './groq-rag.service';
import { RagRetrievalService } from './rag-retrieval.service';
import { AiConversationService } from 'src/ai-conversation/ai-conversation.service';

@Injectable()
export class RagService {
  constructor(
    private readonly ragRetrievalService: RagRetrievalService,
    private readonly groqRagService: GroqRagService,
    private readonly aiConversationService: AiConversationService,
  ) {}

  async ragSearch(queryDto: RagQueryDto, userId: number): Promise<RagResponse> {
    const { q, limit = 12, minSimilarity = 0.25, conversationId } = queryDto;

    // ── Resolve / create conversation ──────────────────────────────────────
    const conversation = await this.aiConversationService.getOrCreate(
      conversationId,
      userId,
      q,
    );

    // Save user message immediately
    await this.aiConversationService.addMessage(conversation.id, 'user', q, null, false);

    try {
      const chunks = await this.ragRetrievalService.semanticChunkSearch(
        q,
        limit,
        minSimilarity,
      );

      if (chunks.length === 0) {
        const answer = "Je n'ai pas trouvé d'information pertinente dans les documents disponibles.";
        await this.aiConversationService.addMessage(conversation.id, 'assistant', answer, null, false);
        return {
          success: true,
          query: q,
          found: 0,
          answer,
          conversationId: conversation.id,
        };
      }

      const answer = await this.groqRagService.generateRAGResponse(q, chunks);

      // Deduplicate sources by publicationId, keeping highest similarity
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

      // Save assistant message with sources
      await this.aiConversationService.addMessage(
        conversation.id,
        'assistant',
        answer.trim(),
        sources,
        false,
      );

      return {
        success: true,
        query: q,
        found: chunks.length,
        answer: answer.trim(),
        sources,
        conversationId: conversation.id,
      };
    } catch (error: any) {
      console.error('[RAG] Erreur :', error);
      const errMsg = 'Erreur lors du traitement RAG';
      await this.aiConversationService.addMessage(conversation.id, 'assistant', errMsg, null, true);
      throw new InternalServerErrorException({
        success: false,
        message: errMsg,
        debug: error.message,
        conversationId: conversation.id,
      });
    }
  }
}
