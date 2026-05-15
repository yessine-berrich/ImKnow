import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatMessage } from './entities/chat-message.entity';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<number, Set<string>>();

  handleConnection(client: Socket) {
    const userId = this.resolveUserId(client);

    if (!userId) {
      client.disconnect();
      return;
    }

    const sockets = this.connectedUsers.get(userId) ?? new Set<string>();
    sockets.add(client.id);
    this.connectedUsers.set(userId, sockets);

    client.data.userId = userId;
    client.join(this.userRoom(userId));
  }

  handleDisconnect(client: Socket) {
    const userId = Number(client.data.userId);
    if (!userId) return;

    const sockets = this.connectedUsers.get(userId);
    if (!sockets) return;

    sockets.delete(client.id);
    if (sockets.size === 0) {
      this.connectedUsers.delete(userId);
    }
  }

  @SubscribeMessage('chat:conversation:join')
  joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string },
  ) {
    if (data?.conversationId) {
      client.join(this.conversationRoom(data.conversationId));
    }
  }

  @SubscribeMessage('chat:conversation:leave')
  leaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId?: string },
  ) {
    if (data?.conversationId) {
      client.leave(this.conversationRoom(data.conversationId));
    }
  }

  emitNewMessage(message: ChatMessage) {
    const payload = this.toMessagePayload(message);

    this.server
      .to(this.userRoom(payload.message.senderId))
      .to(this.userRoom(payload.message.receiverId))
      .to(this.conversationRoom(payload.conversationId))
      .emit('chat:message:new', payload);
  }

  private toMessagePayload(message: ChatMessage) {
    return {
      conversationId: message.conversationId,
      message: {
        id: message.id,
        content: message.content,
        type: message.type,
        filename: message.filename,
        mimetype: message.mimetype,
        senderId: message.sender.id,
        receiverId: message.receiver.id,
        parentMessageId: message.parentMessageId,
        forwardedFrom: message.forwardedFrom,
        reactions: message.reactions ?? {},
        isEdited: message.isEdited,
        editedAt: message.editedAt,
        isRead: message.isRead,
        createdAt: message.createdAt,
        status: message.status,
      },
    };
  }

  private resolveUserId(client: Socket): number | null {
    const rawUserId = client.handshake.auth?.userId ?? client.handshake.query.userId;
    const userId = Number(rawUserId);
    return Number.isFinite(userId) && userId > 0 ? userId : null;
  }

  private userRoom(userId: number): string {
    return `user_${userId}`;
  }

  private conversationRoom(conversationId: string): string {
    return `conversation_${conversationId}`;
  }
}
