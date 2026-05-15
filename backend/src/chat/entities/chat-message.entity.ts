// src/chat/entities/chat-message.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  MESSAGE_REQUEST = 'message_request', // ← nouveau: demande de contact
  SYSTEM = 'system',                   // ← nouveau: message système (ex: "Vous êtes amis")
}

export enum MessageRequestStatus {
  PENDING  = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

@Entity('chat_messages')
@Index(['sender'])
@Index(['receiver'])
@Index(['conversationId'])
@Index(['createdAt'])
@Index(['parentMessageId'])
@Index(['type'])          // utile pour filtrer les MESSAGE_REQUEST
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: MessageType, default: MessageType.TEXT })
  type: MessageType;

  @Column({ nullable: true })
  filename?: string;

  @Column({ nullable: true })
  mimetype?: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  conversationId: string;

  // ── Réponses / threads ──────────────────────────────
  @ManyToOne(() => ChatMessage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parentMessageId' })
  parentMessage?: ChatMessage;

  @Column({ nullable: true })
  parentMessageId?: number;

  // ── Réactions ───────────────────────────────────────
  @Column('simple-json', { nullable: true, default: () => "'{}'" })
  reactions: Record<string, number[]>;

  // ── Transfert ───────────────────────────────────────
  @Column({ nullable: true })
  forwardedFrom?: number;

  // ── Édition ─────────────────────────────────────────
  @Column({ default: false })
  isEdited: boolean;

  @Column({ nullable: true })
  editedAt?: Date;

  // ── Demande de contact (MESSAGE_REQUEST uniquement) ─
  // null pour tous les autres types de messages
  @Column({
    type: 'enum',
    enum: MessageRequestStatus,
    nullable: true,
    default: null,
  })
  status?: MessageRequestStatus | null;
}