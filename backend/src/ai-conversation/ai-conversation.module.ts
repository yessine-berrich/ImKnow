import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiConversationService } from './ai-conversation.service';
import { AiConversationController } from './ai-conversation.controller';
import { AiConversation } from './entities/ai-conversation.entity';
import { AiConversationMessage } from './entities/ai-conversation-message.entity';
import { UsersModule } from 'src/users/users.module';

@Module({
  // UsersModule is still needed because AiConversationController uses AuthGuard (from UsersModule)
  imports: [
    TypeOrmModule.forFeature([AiConversation, AiConversationMessage]),
    UsersModule,
  ],
  controllers: [AiConversationController],
  providers: [AiConversationService],
  exports: [AiConversationService],
})
export class AiConversationModule {}
