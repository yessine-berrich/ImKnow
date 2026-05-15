// src/chat/entities/conversation-settings.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('conversation_settings')
@Index(['userId', 'conversationId'], { unique: true })
export class ConversationSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  conversationId: string;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ default: false })
  isMuted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
