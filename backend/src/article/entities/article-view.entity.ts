import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Index,
  Column,
} from 'typeorm';
import { Article } from './article.entity';
import { User } from '../../users/entities/user.entity';

@Entity('article_views')
@Index(['article', 'user'], { unique: true }) // Optionnel : 1 seule vue comptabilisée par utilisateur
export class ArticleView {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Article, (article) => article.id, { onDelete: 'CASCADE' })
  article: Article;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  user?: User; // Nullable si tu autorises les vues par des invités

  @Column({ nullable: true })
  ipAddress: string; // Pour limiter la triche sans compte utilisateur

  @CreateDateColumn()
  createdAt: Date;
}
