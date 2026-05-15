// src/chat/dto/chat.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  MaxLength,
  Max,
  IsArray,
} from 'class-validator';
import { MessageType, MessageRequestStatus } from '../entities/chat-message.entity';
import { Type } from 'class-transformer';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType = MessageType.TEXT;

  @IsString()
  @IsOptional()
  filename?: string;

  @IsString()
  @IsOptional()
  mimetype?: string;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  parentMessageId?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  forwardedFrom?: number;
}

export class GetMessagesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SearchMessagesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class AddReactionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  emoji: string;
}

export class ForwardMessageDto {
  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  receiverIds: number[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  forwardComment?: string;
}

// ── Demande de contact ────────────────────────────────────────────────────────

export class SendMessageRequestDto {
  @IsString()
  @IsOptional()
  @MaxLength(300)
  introMessage?: string;
}

export class RespondMessageRequestDto {
  @IsEnum(MessageRequestStatus)
  @IsNotEmpty()
  action: MessageRequestStatus.ACCEPTED | MessageRequestStatus.DECLINED;
}

// ── Interfaces de réponse ─────────────────────────────────────────────────────

export interface MessageRequestResponseDto {
  id: number;
  senderId: number;
  senderName: string;
  senderProfileImage?: string | null;
  introMessage?: string;
  status: MessageRequestStatus;
  createdAt: Date;
}

export interface ConversationDto {
  conversationId: string;
  participant: {
    id: number;
    firstName: string;
    lastName: string;
    fullName: string;
    profileImage?: string | null;
    isOnline: boolean;
  };
  lastMessage?: {
    id: number;
    content: string;
    type: string;
    createdAt: Date;
    isRead: boolean;
    senderId: number;
  };
  unreadCount: number;
}