// src/follow/entities/follow.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('follows')
@Unique(['follower', 'following']) // Ensure unique follow relationships
@Index(['follower'])
@Index(['following'])
export class Follow {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  follower: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  following: User;

  @CreateDateColumn()
  createdAt: Date;
}