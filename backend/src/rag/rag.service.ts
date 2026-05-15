import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ArticleService } from '../article/article.service';
import { RagQueryDto } from './dto/rag-query.dto';
import { RagResponse } from './interfaces/rag-response.interface';
import { GroqRagService } from './groq-rag.service';

@Injectable()
export class RagService {
  constructor(
    private readonly articleService: ArticleService,
    private readonly groqRagService: GroqRagService,
  ) {}

  async ragSearch(queryDto: RagQueryDto): Promise<RagResponse> {
  const { q, limit = 2, minSimilarity = 0.25 } = queryDto;

  try {
    const searchResults = await this.articleService.semanticSearch(
      q,
      limit,
      minSimilarity,
    );

    if (searchResults.length === 0) {
      return {
        success: true,
        query: q,
        found: 0,
        answer: "Je n'ai pas trouvé d'article suffisamment pertinent.",
      };
    }

    // Conversion explicite ici
    const contextChunks = searchResults.map((r) => ({
      title: r.title,
      content_preview: r.content_preview,
      similarity: Number(r.similarity) || 0,   // ← sécurité maximale
    }));

    const generatedAnswer = await this.groqRagService.generateRAGResponse(q, contextChunks);

    return {
      success: true,
      query: q,
      found: searchResults.length,
      retrieved_articles: searchResults.map((r) => ({
        id: r.id,
        title: r.title,
        similarity: Number(r.similarity) || 0,
      })),
      answer: generatedAnswer.trim(),
    };
  } catch (error) {
    console.error('[RAG] Erreur :', error);
    throw new InternalServerErrorException({
      success: false,
      message: 'Erreur lors du traitement RAG',
      debug: error.message,
    });
  }
}
}