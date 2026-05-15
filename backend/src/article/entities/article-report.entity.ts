import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { Article } from './article.entity';
import type { ArticleReportReason } from '../dto/report-article.dto';

export type ArticleReportStatus = 'pending' | 'reviewed' | 'dismissed';

@Entity('article_reports')
@Index(['reporter', 'article', 'status'])
export class ArticleReport {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  reporter: User;

  @ManyToOne(() => Article, { nullable: false, onDelete: 'CASCADE' })
  article: Article;

  @Column({ length: 50 })
  reason: ArticleReportReason;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ length: 20, default: 'pending' })
  status: ArticleReportStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
