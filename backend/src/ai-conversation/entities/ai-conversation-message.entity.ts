import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AiConversation } from './ai-conversation.entity';

@Entity('ai_conversation_messages')
export class AiConversationMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => AiConversation, (conv) => conv.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: AiConversation;

  @Column()
  conversationId: number;

  @Column({ type: 'varchar', length: 20 })
  role: 'user' | 'assistant';

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  sources: any[] | null;

  @Column({ default: false })
  isError: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
