// src/follow/follow.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowController } from './follow.controller';
import { FollowService } from './follow.service';
import { Follow } from './entities/follow.entity';
import { User } from 'src/users/entities/user.entity';
import { NotificationModule } from 'src/notification/notification.module';
import { UsersModule } from 'src/users/users.module';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Follow, User]),
    NotificationModule,
    UsersModule,
    forwardRef(() => ChatModule), // ← forwardRef symétrique
  ],
  controllers: [FollowController],
  providers: [FollowService],
  exports: [TypeOrmModule.forFeature([Follow, User]), FollowService],
})
export class FollowModule {}