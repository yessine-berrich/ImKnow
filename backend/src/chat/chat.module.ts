// src/chat/chat.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatMessage } from './entities/chat-message.entity';
import { UserBlock } from './entities/user-block.entity';
import { ConversationSettings } from './entities/conversation-settings.entity';
import { User } from 'src/users/entities/user.entity';
import { FollowModule } from 'src/follow/follow.module';
import { MediaModule } from 'src/media/media.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage, User, UserBlock, ConversationSettings]),
    UsersModule,
    MediaModule,
    forwardRef(() => FollowModule), // ← forwardRef pour éviter la dépendance circulaire
  ],
  providers: [ChatService, ChatGateway],
  controllers: [ChatController],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
