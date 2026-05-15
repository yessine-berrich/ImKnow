// src/chat/entities/message-request.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum MessageRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

@Entity('message_requests')
@Unique(['sender', 'receiver']) // Only one pending request between two users
@Index(['sender'])
@Index(['receiver'])
@Index(['status'])
export class MessageRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  /** Optional introductory message shown with the request */
  @Column({ type: 'text', nullable: true })
  introMessage?: string;

  @Column({
    type: 'enum',
    enum: MessageRequestStatus,
    default: MessageRequestStatus.PENDING,
  })
  status: MessageRequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  respondedAt?: Date;
}