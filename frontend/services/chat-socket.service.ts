import { io, Socket } from 'socket.io-client';
import { getToken } from './auth.service';
import { ChatMessage } from './chat.service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

export interface NewChatMessagePayload {
  conversationId: string;
  message: ChatMessage;
}

class ChatSocketService {
  private socket: Socket | null = null;
  private connectedUserId: number | null = null;

  // Handlers kept at service level — survive socket reconnections
  private messageHandlers = new Set<(payload: NewChatMessagePayload) => void>();

  connect(userId: number): Socket {
    if (this.socket && this.connectedUserId === userId) {
      return this.socket;
    }

    this._destroySocket();

    this.connectedUserId = userId;
    this.socket = io(`${SOCKET_URL}/chat`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: {
        userId,
        token: getToken(),
      },
      query: {
        userId: String(userId),
      },
    });

    // Re-register all handlers on the new socket so they survive reconnections
    this.messageHandlers.forEach(handler => {
      this.socket!.on('chat:message:new', handler);
    });

    return this.socket;
  }

  disconnect() {
    this._destroySocket();
  }

  private _destroySocket() {
    this.socket?.disconnect();
    this.socket = null;
    this.connectedUserId = null;
  }

  joinConversation(conversationId: string) {
    this.socket?.emit('chat:conversation:join', { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.socket?.emit('chat:conversation:leave', { conversationId });
  }

  onNewMessage(handler: (payload: NewChatMessagePayload) => void) {
    this.messageHandlers.add(handler);
    this.socket?.on('chat:message:new', handler);
  }

  offNewMessage(handler: (payload: NewChatMessagePayload) => void) {
    this.messageHandlers.delete(handler);
    this.socket?.off('chat:message:new', handler);
  }
}

export const chatSocketService = new ChatSocketService();
