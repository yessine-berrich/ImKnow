import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import type { UserReportReason } from '../dto/report-user.dto';

export type UserReportStatus = 'pending' | 'reviewed' | 'dismissed';

@Entity('user_reports')
@Index(['reporter', 'reportedUser', 'status'])
export class UserReport {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  reporter: User;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  reportedUser: User;

  @Column({ length: 50 })
  reason: UserReportReason;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ length: 20, default: 'pending' })
  status: UserReportStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
