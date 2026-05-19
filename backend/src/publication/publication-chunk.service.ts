import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicationChunk } from './entities/publication-chunk.entity';
import { Publication } from './entities/publication.entity';
import { SearchService } from '../search/search.service';

const CHUNK_TARGET_SIZE = 1000;
const CHUNK_OVERLAP = 200;

@Injectable()
export class PublicationChunkService {
  constructor(
    @InjectRepository(PublicationChunk)
    private readonly chunkRepository: Repository<PublicationChunk>,
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>,
    private readonly searchService: SearchService,
  ) {}

  private buildSourceText(publication: Publication): string {
    const category = publication.category?.name || 'Uncategorized';
    const tags = publication.tags?.map((t) => t.name).join(', ') || 'none';
    return `Title: ${publication.title}\nCategory: ${category}\nTags: ${tags}\nContent:\n${publication.content}`.trim();
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

  async generateChunks(publicationId: number): Promise<void> {
    try {
      const publication = await this.publicationRepository.findOneOrFail({
        where: { id: publicationId },
        relations: ['category', 'tags'],
      });

      const sourceText = this.buildSourceText(publication);
      const chunkTexts = this.splitIntoChunks(sourceText);

      // Delete old chunks before recreating
      await this.chunkRepository
        .createQueryBuilder()
        .delete()
        .from(PublicationChunk)
        .where('"publicationId" = :publicationId', { publicationId })
        .execute();

      for (let i = 0; i < chunkTexts.length; i++) {
        const content = chunkTexts[i];

        const chunk = this.chunkRepository.create({
          publication: { id: publicationId } as Publication,
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
            `UPDATE publication_chunks SET embedding_vector_pg = $1::vector WHERE id = $2`,
            [vectorString, saved.id],
          );
        } else {
          console.warn(`[CHUNKS] Skipped embedding for chunk ${i} of publication ${publicationId}: invalid vector`);
        }
      }

      console.log(`[CHUNKS] Generated ${chunkTexts.length} chunks for publication ${publicationId}`);
    } catch (err: any) {
      console.error(`[CHUNKS] Failed to generate chunks for publication ${publicationId}:`, err.message);
    }
  }
}
