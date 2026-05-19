import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPgVectorColumn1720700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable the pgvector extension first!
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // Add the vector column
    await queryRunner.query(`
      ALTER TABLE publications
      ADD COLUMN IF NOT EXISTS embedding_vector_pg vector(768);
    `);

    await queryRunner.query(`
      ALTER TABLE publication_chunks
      ADD COLUMN IF NOT EXISTS embedding_vector_pg vector(768);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_publication_chunks_embedding
      ON publication_chunks USING hnsw (embedding_vector_pg vector_cosine_ops)
      WITH (m = 16, ef_construction = 64)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_publication_chunks_article_id
      ON publication_chunks ("publicationId")
    `);

    // Create the HNSW index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_publications_embedding_pg
      ON publications USING hnsw (embedding_vector_pg vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    `);

    // Copy data (Optional)
    await queryRunner.query(`
      UPDATE publications
      SET embedding_vector_pg = embedding_vector::vector
      WHERE embedding_vector IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_publications_embedding_pg;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_publication_chunks_embedding;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_publication_chunks_article_id;`);
    await queryRunner.query(`ALTER TABLE publications DROP COLUMN IF EXISTS embedding_vector_pg;`);
    // Note: Usually, we don't DROP EXTENSION in down() because other tables might use it.
  }
}
// npm run typeorm:run