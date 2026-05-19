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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
