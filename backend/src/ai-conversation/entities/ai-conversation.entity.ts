import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { AiConversationMessage } from './ai-conversation-message.entity';

@Entity('ai_conversations')
export class AiConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ default: false })
  pinned: boolean;

  // Plain FK column — no @ManyToOne to avoid TypeORM's relation/column conflict
  // The FK constraint is enforced at DB level (via migration).
  @Column()
  userId: number;

  @OneToMany(() => AiConversationMessage, (msg) => msg.conversation, { cascade: true })
  messages: AiConversationMessage[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
