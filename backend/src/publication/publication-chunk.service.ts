import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PublicationChunk } from './entities/publication-chunk.entity';
import { Publication } from './entities/publication.entity';
import { SearchService } from '../search/search.service';

const CHUNK_TARGET_SIZE = 500;
const CHUNK_OVERLAP = 100;

@Injectable()
export class PublicationChunkService {
  // Tracks in-progress generation per publicationId to prevent concurrent duplicate runs.
  private readonly inProgress = new Set<number>();

  constructor(
    @InjectRepository(PublicationChunk)
    private readonly chunkRepository: Repository<PublicationChunk>,
    @InjectRepository(Publication)
    private readonly publicationRepository: Repository<Publication>,
    private readonly searchService: SearchService,
  ) {}

  private buildSourceText(publication: Publication): string {
    // Returns only the content to embed — metadata header is added by Groq context, not here,
    // to avoid diluting semantic vectors with structural boilerplate shared across all publications.
    return publication.content.trim();
  }

  private buildMetadataPrefix(publication: Publication): string {
    const category = publication.category?.name || 'Uncategorized';
    const tags = publication.tags?.map((t) => t.name).join(', ') || 'none';
    return `Title: ${publication.title}\nCategory: ${category}\nTags: ${tags}\n`;
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

      const advance = Math.max(end - start - CHUNK_OVERLAP, 1);
      start += advance;

      // end already reached text.length — all content is covered, stop here
      if (end >= text.length) break;
    }

    return chunks;
  }

  async generateChunks(publicationId: number): Promise<void> {
    if (this.inProgress.has(publicationId)) {
      console.log(`[CHUNKS] Already in progress for publication ${publicationId}, skipping`);
      return;
    }
    this.inProgress.add(publicationId);
    try {
      const publication = await this.publicationRepository.findOneOrFail({
        where: { id: publicationId },
        relations: ['category', 'tags'],
      });

      const sourceText = this.buildSourceText(publication);
      const metadataPrefix = this.buildMetadataPrefix(publication);
      const chunkTexts = this.splitIntoChunks(sourceText);

      // Delete old chunks before recreating
      await this.chunkRepository
        .createQueryBuilder()
        .delete()
        .from(PublicationChunk)
        .where('"publicationId" = :publicationId', { publicationId })
        .execute();

      for (let i = 0; i < chunkTexts.length; i++) {
        // Store metadata prefix only on the first chunk for Groq context display.
        // Embeddings are generated from pure content so vectors reflect semantics, not structure.
        const content = i === 0 ? `${metadataPrefix}${chunkTexts[i]}` : chunkTexts[i];
        const embedText = chunkTexts[i];

        const chunk = this.chunkRepository.create({
          publication: { id: publicationId } as Publication,
          chunkIndex: i,
          content,
          charCount: content.length,
        });

        const saved = await this.chunkRepository.save(chunk);

        const vector = await this.searchService.generateEmbedding(embedText);
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
    } finally {
      this.inProgress.delete(publicationId);
    }
  }
}
