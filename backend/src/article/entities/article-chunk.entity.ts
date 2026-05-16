import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Article } from './article.entity';

@Entity('article_chunks')
export class ArticleChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Article, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'articleId' })
  article: Article;

  @Column()
  chunkIndex: number;

  @Column({ type: 'text' })
  content: string;

  @Column()
  charCount: number;

  // embedding_vector_pg (vector(768)) is managed via raw queries;
  // pgvector type is not natively supported by TypeORM column decorators.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
