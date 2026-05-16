import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArticleChunk } from './entities/article-chunk.entity';
import { Article } from './entities/article.entity';
import { SearchService } from '../search/search.service';

const CHUNK_TARGET_SIZE = 1000;
const CHUNK_OVERLAP = 200;

@Injectable()
export class ArticleChunkService {
  constructor(
    @InjectRepository(ArticleChunk)
    private readonly chunkRepository: Repository<ArticleChunk>,
    @InjectRepository(Article)
    private readonly articleRepository: Repository<Article>,
    private readonly searchService: SearchService,
  ) {}

  private buildSourceText(article: Article): string {
    const category = article.category?.name || 'Uncategorized';
    const tags = article.tags?.map((t) => t.name).join(', ') || 'none';
    return `Title: ${article.title}\nCategory: ${category}\nTags: ${tags}\nContent:\n${article.content}`.trim();
  }

  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      let end = Math.min(start + CHUNK_TARGET_SIZE, text.length);

      if (end < text.length) {
        // Prefer paragraph boundary
        const paragraphBoundary = text.lastIndexOf('\n\n', end);
        if (paragraphBoundary > start + CHUNK_TARGET_SIZE * 0.5) {
          end = paragraphBoundary;
        } else {
          // Prefer sentence boundary
          const sentenceBoundary = text.lastIndexOf('. ', end);
          if (sentenceBoundary > start + CHUNK_TARGET_SIZE * 0.5) {
            end = sentenceBoundary + 1;
          }
        }
      }

      const chunk = text.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      // Advance by chunk size minus overlap, clamped to avoid infinite loop
      const advance = Math.max(end - start - CHUNK_OVERLAP, 1);
      start += advance;

      if (start >= text.length) break;
    }

    return chunks;
  }

  async generateChunks(articleId: number): Promise<void> {
    try {
      const article = await this.articleRepository.findOneOrFail({
        where: { id: articleId },
        relations: ['category', 'tags'],
      });

      const sourceText = this.buildSourceText(article);
      const chunkTexts = this.splitIntoChunks(sourceText);

      // Delete old chunks before recreating
      await this.chunkRepository
        .createQueryBuilder()
        .delete()
        .from(ArticleChunk)
        .where('"articleId" = :articleId', { articleId })
        .execute();

      for (let i = 0; i < chunkTexts.length; i++) {
        const content = chunkTexts[i];

        const chunk = this.chunkRepository.create({
          article: { id: articleId } as Article,
          chunkIndex: i,
          content,
          charCount: content.length,
        });

        const saved = await this.chunkRepository.save(chunk);

        const vector = await this.searchService.generateEmbedding(content);
        if (vector && Array.isArray(vector) && vector.length === 768) {
          const vectorString =
            '[' + vector.map((v) => Number(v).toFixed(8)).join(', ') + ']';
          await this.chunkRepository.query(
            `UPDATE article_chunks SET embedding_vector_pg = $1::vector WHERE id = $2`,
            [vectorString, saved.id],
          );
        } else {
          console.warn(`[CHUNKS] Skipped embedding for chunk ${i} of article ${articleId}: invalid vector`);
        }
      }

      console.log(`[CHUNKS] Generated ${chunkTexts.length} chunks for article ${articleId}`);
    } catch (err: any) {
      console.error(`[CHUNKS] Failed to generate chunks for article ${articleId}:`, err.message);
    }
  }
}
