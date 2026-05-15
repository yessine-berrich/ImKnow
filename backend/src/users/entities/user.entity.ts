import { Article } from 'src/article/entities/article.entity';
import { Comment } from 'src/comment/entities/comment.entity';
import { Notification } from 'src/notification/entities/notification.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToMany,
} from 'typeorm';
import { userRole, UserStatus } from 'utils/constants';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  firstName: string;

  @Column({ length: 100 })
  lastName: string;

  @Column({ length: 255, unique: true })
  email: string;

  @Column({ length: 255 })
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  department: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  profileImage: string | null;

  /** Original Google photo URL — kept for re-sync detection when the user changes their Google avatar. */
  @Column({ nullable: true })
  googleAvatarUrl: string;

  @Column({ default: true })
  emailNotificationsEnabled: boolean;

  @Column({ default: true })
  pushNotificationsEnabled: boolean;

  @Column({ type: 'enum', enum: userRole })
  role: userRole;

  @Column({ nullable: true })
  googleId: string;

  @Column({ default: false })
  isGoogleAccount: boolean;

  @Column({ default: false })
  isEmailActive: boolean;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ nullable: true })
  lastSeenAt: Date;

  @Column({ nullable: true, default: null })
  verificationToken: string;

  @Column({ nullable: true, default: null })
  resetPasswordToken: string;

  // ── Email change fields ───────────────────────────────────────────────────

  /** New email address awaiting confirmation — null when no change is pending. */
  @Column({ nullable: true, default: null })
  pendingEmail: string;

  /** One-time token sent to the user's CURRENT email to confirm the change. */
  @Column({ nullable: true, default: null })
  emailChangeToken: string;

  /** Token expiry — 1 hour from the time the request is made. */
  @Column({ type: 'timestamp', nullable: true, default: null })
  emailChangeTokenExpiry: Date;

  // ── Brute-force protection ────────────────────────────────────────────────

  @Column({ default: 0 })
  loginAttempts: number;

  @Column({ type: 'timestamp', nullable: true, default: null })
  lockedUntil: Date | null;

  // ── Relations ─────────────────────────────────────────────────────────────

  @OneToMany(() => Article, (article) => article.author)
  articles: Article[];

  @OneToMany(() => Comment, (comment) => comment.author, { onDelete: 'CASCADE' })
  comments: Comment[];

  @ManyToMany(() => Comment, (comment) => comment.likes, { onDelete: 'CASCADE' })
  likedComments: Comment[];

  @ManyToMany(() => Article, (article) => article.likes, { onDelete: 'CASCADE' })
  likedArticles: Article[];

  @ManyToMany(() => Article, (article) => article.bookmarks, { onDelete: 'CASCADE' })
  bookmarkedArticles: Article[];

  @OneToMany(() => Notification, (notification) => notification.recipient)
  notifications: Notification[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}