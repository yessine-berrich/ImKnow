import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SearchService } from '../search/search.service';

export interface ChunkSearchResult {
  chunkId: number;
  publicationId: number;
  title: string;
  chunkIndex: number;
  content: string;
  similarity: number;
}

@Injectable()
export class RagRetrievalService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly searchService: SearchService,
  ) {}

  async semanticChunkSearch(
    query: string,
    limit = 8,
    minSimilarity = 0.25,
  ): Promise<ChunkSearchResult[]> {
    if (!query?.trim()) return [];

    const queryVector = await this.searchService.generateEmbedding(query.trim());
    if (!queryVector || !Array.isArray(queryVector) || queryVector.length !== 768) {
      console.warn('[RAG RETRIEVAL] Invalid query vector, returning empty results');
      return [];
    }

    const vectorString =
      '[' + queryVector.map((v) => Number(v).toFixed(8)).join(', ') + ']';

    try {
      const results = await this.dataSource.query(
        `
        SELECT
          c.id                                                                           AS "chunkId",
          a.id                                                                           AS "publicationId",
          a.title,
          c."chunkIndex",
          c.content,
          ROUND(CAST((1 - (c.embedding_vector_pg <=> $1::vector)) AS numeric), 4)       AS similarity
        FROM publication_chunks c
        JOIN publications a ON a.id = c."publicationId"
        WHERE c.embedding_vector_pg IS NOT NULL
          AND a.status = 'published'
          AND (1 - (c.embedding_vector_pg <=> $1::vector)) >= $2
        ORDER BY similarity DESC
        LIMIT $3
        `,
        [vectorString, minSimilarity, limit],
      );

      return results.map((r: any) => ({
        chunkId: Number(r.chunkId),
        publicationId: Number(r.publicationId),
        title: r.title as string,
        chunkIndex: Number(r.chunkIndex),
        content: r.content as string,
        similarity: Number(r.similarity),
      }));
    } catch (err: any) {
      console.error('[RAG RETRIEVAL] pgvector query error:', err.message);
      return [];
    }
  }
}
