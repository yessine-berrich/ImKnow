import {
  Column, CreateDateColumn, Entity, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('report_admin_notes')
export class ReportAdminNote {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  content: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE', eager: false })
  admin: User;

  @Column({ nullable: true, type: 'int' })
  reportedUserId: number | null;

  @Column({ nullable: true, type: 'int' })
  reportedPublicationId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
