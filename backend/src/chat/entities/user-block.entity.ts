import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('user_blocks')
@Index(['blockerId', 'blockedId'], { unique: true })
export class UserBlock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  blockerId: number;

  @Column()
  blockedId: number;

  @CreateDateColumn()
  createdAt: Date;
}
