import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPgVectorColumn1720700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Enable the pgvector extension first!
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // 2. Add the vector column
    await queryRunner.query(`
      ALTER TABLE articles
      ADD COLUMN IF NOT EXISTS embedding_vector_pg vector(768);
    `);

    // 3. Create the HNSW index
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_articles_embedding_pg
      ON articles USING hnsw (embedding_vector_pg vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    `);

    // 4. Copy data (Optional)
    await queryRunner.query(`
      UPDATE articles
      SET embedding_vector_pg = embedding_vector::vector
      WHERE embedding_vector IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_articles_embedding_pg;`);
    await queryRunner.query(`ALTER TABLE articles DROP COLUMN IF EXISTS embedding_vector_pg;`);
    // Note: Usually, we don't DROP EXTENSION in down() because other tables might use it.
  }
}


// npm run typeorm:run