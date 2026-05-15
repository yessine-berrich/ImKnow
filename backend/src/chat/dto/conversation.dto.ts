import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateConversationDto {
  @IsInt()
  @IsNotEmpty()
  receiverId: number;
}

export interface ConversationDto {
  conversationId: string;
  otherUser: {
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
