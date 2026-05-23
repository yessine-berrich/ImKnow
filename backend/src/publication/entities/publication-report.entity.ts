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
import { Publication } from './publication.entity';
import type { PublicationReportReason } from '../dto/report-publication.dto';

export type PublicationReportStatus = 'pending' | 'reviewed' | 'dismissed';
export type AiRiskLevel = 'low' | 'medium' | 'high' | 'critical';

@Entity('publication_reports')
@Index(['reporter', 'publication', 'status'])
export class PublicationReport {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  reporter: User;

  @ManyToOne(() => Publication, { nullable: false, onDelete: 'CASCADE' })
  publication: Publication;

  @Column({ length: 50 })
  reason: PublicationReportReason;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ length: 20, default: 'pending' })
  status: PublicationReportStatus;

  @Column({ type: 'text', nullable: true })
  adminNote: string | null;

  // ── Champs IA ──────────────────────────────────────────────────────────────

  @Column({ type: 'float', nullable: true })
  aiRiskScore: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  aiRiskLevel: AiRiskLevel | null;

  @Column({ type: 'json', nullable: true })
  aiCategories: string[] | null;

  @Column({ type: 'text', nullable: true })
  aiSummary: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  aiRecommendedAction: string | null;

  @Column({ type: 'float', nullable: true })
  aiConfidence: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  aiModel: string | null;

  @Column({ type: 'timestamp', nullable: true })
  aiAnalyzedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
