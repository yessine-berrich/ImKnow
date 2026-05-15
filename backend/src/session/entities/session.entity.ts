import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  @Index()
  userId: number;

  /**
   * SHA-256 hash of the JWT — we never store the raw token.
   * Indexed for fast lookup on every authenticated request.
   */
  @Column({ unique: true })
  @Index()
  tokenHash: string;

  @Column({ nullable: true })
  deviceType: string; // 'desktop' | 'mobile' | 'tablet'

  @Column({ nullable: true })
  browser: string; // 'Chrome', 'Firefox', 'Safari', …

  @Column({ nullable: true })
  os: string; // 'Windows', 'macOS', 'iOS', 'Android', …

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  location: string; // e.g. 'Tunis, Tunisia'  (optional geo-lookup)

  @Column({ default: true })
  isActive: boolean;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}