import { Category } from 'src/category/entities/category.entity';
import { Tag } from 'src/tag/entities/tag.entity';
import { User } from 'src/users/entities/user.entity';
import { Comment } from 'src/comment/entities/comment.entity';
import { Media } from 'src/media/entities/media.entity'; // Importe l'entité Media

import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { PublicationVersion } from './publication-version.entity';
import { PublicationStatus } from 'utils/constants';

@Entity('publications')
export class Publication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({
    type: 'enum',
    enum: PublicationStatus,
    default: PublicationStatus.DRAFT,
  })
  status: PublicationStatus;

  @Column({ default: 0 })
  viewsCount: number;

  @ManyToOne(() => User, (user) => user.publications, { onDelete: 'CASCADE' })
  author: User;

  @ManyToOne(() => Category, (category) => category.publications)
  category: Category;

  @ManyToMany(() => Tag, (tag) => tag.publications)
  @JoinTable({ name: 'publication_tags' })
  tags: Tag[];

  @OneToMany(() => Comment, (comment) => comment.publication)
  comments: Comment[];

  @OneToMany(() => Media, (media) => media.publication, { cascade: true })
  media: Media[];

  @ManyToMany(() => User, (user) => user.likedPublications)
  @JoinTable({ name: 'publication_likes' })
  likes: User[];

  @ManyToMany(() => User, (user) => user.bookmarkedPublications)
  @JoinTable({ name: 'publication_bookmarks' })
  bookmarks: User[];

  @OneToMany(() => PublicationVersion, (version) => version.publication, {
    cascade: false,
  })
  versions: PublicationVersion[];

  @Column({ nullable: true })
  currentVersionNumber?: number;

  @Column({
    type: 'float4',
    array: true,
    nullable: true,
  })
  embedding_vector: number[];

  @Column({ type: 'jsonb', nullable: true })
  moderationResult?: {
    isFlagged: boolean;
    score: number; // 0.0 à 1.0
    categories: string[];
    reason?: string;
    confidence: number;
    model: string;
    moderatedAt: Date;
  };

  @Column({ default: false })
  isAutoModerated: boolean;

  @Column({ type: 'float', nullable: true })
  moderationScore?: number;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @Column({ type: 'float', nullable: true })
  duplicateScore?: number; // score max trouvé lors de la dernière vérif

  @Column({ type: 'jsonb', nullable: true })
  similarPublicationsCache?: Array<{
    id: number;
    title: string;
    score: number;
    createdAt: Date;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
