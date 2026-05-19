import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Publication } from './publication.entity';
import { User } from 'src/users/entities/user.entity';

@Entity('publication_versions')
@Index('idx_publication_versions_publication_id', ['publicationId'])
@Index('idx_publication_versions_publication_version', ['publicationId', 'versionNumber'], {
  unique: true,
})
export class PublicationVersion {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Publication, (publication) => publication.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'publication_id' })
  publication: Publication;

  @Column()
  publicationId: number;

  @Column()
  versionNumber: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'author_id' })
  author?: User;

  @Column({ nullable: true })
  authorId?: number;

  @Column({
    type: 'enum',
    enum: ['draft', 'pending', 'published', 'rejected'],
    default: 'draft',
  })
  status: string;

  @Column({ type: 'text', nullable: true })
  changeSummary?: string;

  // Snapshot léger des relations (optionnel mais très utile)
  @Column({ type: 'jsonb', nullable: true })
  categorySnapshot?: { id: number; name: string };

  @Column({ type: 'jsonb', nullable: true })
  tagsSnapshot?: Array<{ id: number; name: string }>;

  @CreateDateColumn()
  createdAt: Date;
}
