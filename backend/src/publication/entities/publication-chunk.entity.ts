import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Publication } from './publication.entity';

@Entity('publication_chunks')
export class PublicationChunk {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Publication, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'publicationId' })
  publication: Publication;

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
