import { getToken } from './auth.service';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// ─────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  MESSAGE_REQUEST = 'message_request',
  SYSTEM = 'system',
}

export enum MessageRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export interface ChatMessage {
  id: number;
  content: string;
  type: MessageType;
  filename?: string;
  mimetype?: string;
  senderId: number;
  receiverId: number;
  parentMessageId?: number;
  forwardedFrom?: number;
  reactions: Record<string, number[]>;
  isEdited: boolean;
  editedAt?: string;
  isRead: boolean;
  createdAt: string;
  // Champs spécifiques aux demandes de contact
  status?: MessageRequestStatus | null;
}

export interface OtherUser {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  profileImage?: string;
  isOnline: boolean;
  lastSeenAt?: Date | string | null;  // <-- SEULE MODIFICATION AJOUTÉE
}

export interface Conversation {
  conversationId: string;
  participant: OtherUser;   // ← "participant" est le champ renvoyé par le backend
  lastMessage?: {
    id: number;
    content: string;
    type: string;
    createdAt: string;
    isRead: boolean;
    senderId: number;
    status?: MessageRequestStatus;
  };
  unreadCount: number;
  pendingRequest?: {
    id: number;
    introMessage?: string;
  } | null;
  isPinned?: boolean;
  isMuted?: boolean;
}

// Alias de commodité utilisé dans les composants
export type OtherUserField = OtherUser;

// MessageRequest n'est plus une entité séparée :
// c'est un ChatMessage avec type = MESSAGE_REQUEST
export interface MessageRequestResponseDto {
  id: number;
  senderId: number;
  senderName: string;
  senderProfileImage?: string;
  introMessage?: string;
  status: MessageRequestStatus;
  createdAt: string;
}

export interface MessageStats {
  totalSent: number;
  totalReceived: number;
  totalConversations: number;
  mostActiveConversation: string | null;
  averageMessagesPerDay: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  messages: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ConversationHistoryResponse {
  success: boolean;
  conversationId: string;
  messages: ChatMessage[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// ─────────────────────────────────────────────────────────────
// Service Implementation
// ─────────────────────────────────────────────────────────────

class ChatService {
  private getAuthHeaders(): HeadersInit {
    if (typeof window === 'undefined') return {};
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('userId');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('userId');
        window.location.href = '/signin';
      }
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 400 && errorData.message) {
        const detail = Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message;
        throw new Error(`Validation error: ${detail}`);
      }
      throw new Error(errorData.message || `HTTP Error: ${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  private async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<T>(response);
  }

  private async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  private async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  private async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'PATCH',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  private async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    return this.handleResponse<T>(response);
  }

  private async uploadFile<T>(endpoint: string, file: File): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: formData,
    });
    return this.handleResponse<T>(response);
  }

  // ─────────────────────────────────────────────────────────────
  // Demandes de contact (stockées comme ChatMessage)
  // ─────────────────────────────────────────────────────────────

  async sendMessageRequest(
    receiverId: number,
    introMessage?: string,
  ): Promise<{ success: boolean; request: ChatMessage }> {
    return this.post(`/chat/requests/${receiverId}`, { introMessage });
  }

  async respondToMessageRequest(
    requestId: number,
    action: 'accepted' | 'declined',
  ): Promise<{ success: boolean; message: string; request: ChatMessage }> {
    return this.put(`/chat/requests/${requestId}`, { action });
  }

  async getPendingMessageRequests(): Promise<{
    success: boolean;
    count: number;
    requests: MessageRequestResponseDto[];
  }> {
    return this.get('/chat/requests/pending');
  }

  async getSentMessageRequests(): Promise<{
    success: boolean;
    count: number;
    requests: MessageRequestResponseDto[];
  }> {
    return this.get('/chat/requests/sent');
  }

  async cancelMessageRequest(requestId: number): Promise<{ success: boolean }> {
    return this.delete(`/chat/requests/${requestId}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Messagerie
  // ─────────────────────────────────────────────────────────────

  async sendMessage(
    receiverId: number,
    content: string,
    parentMessageId?: number,
  ): Promise<{ success: boolean; message: ChatMessage }> {
    return this.post(`/chat/messages/${receiverId}`, {
      content,
      type: MessageType.TEXT,
      ...(parentMessageId !== undefined && { parentMessageId }),
    });
  }

  async sendFileMessage(
    receiverId: number,
    file: File,
  ): Promise<{ success: boolean; message: ChatMessage }> {
    return this.uploadFile(`/chat/files/${receiverId}`, file);
  }

  async getConversationHistory(
    userId: number,
    page = 1,
    limit = 20,
  ): Promise<ConversationHistoryResponse> {
    const validPage = Math.max(1, Math.floor(page) || 1);
    const validLimit = Math.min(100, Math.max(1, Math.floor(limit) || 20));
    return this.get(`/chat/history/${userId}?page=${validPage}&limit=${validLimit}`);
  }

  async getUserConversations(): Promise<{
    success: boolean;
    count: number;
    conversations: Conversation[];
  }> {
    const response = await this.get<{
      success: boolean;
      count: number;
      conversations: Array<{
        conversationId: string;
        participant?: Partial<OtherUser>;
        otherUser?: Partial<OtherUser>;
        lastMessage?: Conversation['lastMessage'];
        unreadCount?: number;
        pendingRequest?: Conversation['pendingRequest'];
        isPinned?: boolean;
        isMuted?: boolean;
      }>;
    }>('/chat/conversations');

    const conversations: Conversation[] = (response.conversations ?? []).map((conv) => {
      // Le backend envoie "participant" — "otherUser" est gardé pour rétrocompatibilité
      const raw = conv.participant ?? conv.otherUser;

      const participant: OtherUser = {
        id: raw?.id ?? 0,
        firstName: raw?.firstName ?? '',
        lastName: raw?.lastName ?? '',
        fullName:
          raw?.fullName?.trim() ||
          `${raw?.firstName ?? ''} ${raw?.lastName ?? ''}`.trim() ||
          'Utilisateur inconnu',
        profileImage: raw?.profileImage,
        isOnline: raw?.isOnline ?? false,
        lastSeenAt: raw?.lastSeenAt ?? null,  // <-- SEULE MODIFICATION AJOUTÉE
      };

      return {
        conversationId: conv.conversationId,
        participant,
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount ?? 0,
        pendingRequest: conv.pendingRequest ?? null,
        isPinned: conv.isPinned ?? false,
        isMuted: conv.isMuted ?? false,
      };
    });

    return { success: response.success, count: conversations.length, conversations };
  }

  async markMessagesAsRead(
    conversationId: string,
  ): Promise<{ success: boolean; markedAsRead: number }> {
    return this.post(`/chat/read/${conversationId}`);
  }

  async deleteMessage(messageId: number): Promise<{ success: boolean; message: string }> {
    return this.delete(`/chat/messages/${messageId}`);
  }

  async getUnreadCount(
    conversationId: string,
  ): Promise<{ success: boolean; unreadCount: number }> {
    return this.get(`/chat/unread/${conversationId}`);
  }

  async searchMessages(
    userId: number,
    query: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<ChatMessage>> {
    const validPage = Math.max(1, Math.floor(Number(page)) || 1);
    const validLimit = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 20));
    return this.get(
      `/chat/search/${userId}?query=${encodeURIComponent(query)}&page=${validPage}&limit=${validLimit}`,
    );
  }

  async addReaction(
    messageId: number,
    emoji: string,
  ): Promise<{ success: boolean; message: { id: number; content: string; reactions: Record<string, number[]> } }> {
    return this.post(`/chat/reactions/${messageId}`, { emoji });
  }

  async removeReaction(
    messageId: number,
    emoji: string,
  ): Promise<{ success: boolean; message: { id: number; content: string; reactions: Record<string, number[]> } }> {
    return this.delete(`/chat/reactions/${messageId}?emoji=${encodeURIComponent(emoji)}`);
  }

  async forwardMessage(
    messageId: number,
    receiverIds: number[],
    forwardComment?: string,
  ): Promise<{ success: boolean; count: number; messages: ChatMessage[] }> {
    return this.post(`/chat/forward/${messageId}`, { receiverIds, forwardComment });
  }

  async editMessage(
    messageId: number,
    content: string,
  ): Promise<{ success: boolean; message: { id: number; content: string; isEdited: boolean; editedAt: string; createdAt: string } }> {
    return this.patch(`/chat/messages/${messageId}`, { content });
  }

  async getMessageStats(): Promise<{ success: boolean; stats: MessageStats }> {
    return this.get('/chat/stats');
  }

  async getMessageReplies(
    messageId: number,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<ChatMessage>> {
    const validPage = Math.max(1, Math.floor(Number(page)) || 1);
    const validLimit = Math.min(100, Math.max(1, Math.floor(Number(limit)) || 20));
    return this.get(`/chat/replies/${messageId}?page=${validPage}&limit=${validLimit}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Delete conversation
  // ─────────────────────────────────────────────────────────────

  async deleteConversation(otherUserId: number): Promise<{ deleted: number }> {
    return this.delete(`/chat/conversations/${otherUserId}`);
  }

  async togglePin(conversationId: string): Promise<{ isPinned: boolean }> {
    return this.post(`/chat/conversations/${conversationId}/pin`);
  }

  async toggleMute(conversationId: string): Promise<{ isMuted: boolean }> {
    return this.post(`/chat/conversations/${conversationId}/mute`);
  }

  // ─────────────────────────────────────────────────────────────
  // Block / Unblock
  // ─────────────────────────────────────────────────────────────

  async getBlockedUserIds(): Promise<number[]> {
    const res = await this.get<{ blockedIds: number[] }>('/chat/block');
    return res.blockedIds;
  }

  async blockUser(userId: number): Promise<{ success: boolean }> {
    return this.post(`/chat/block/${userId}`, {});
  }

  async unblockUser(userId: number): Promise<{ success: boolean }> {
    return this.delete(`/chat/block/${userId}`);
  }

  async isBlockedByMe(userId: number): Promise<boolean> {
    const res = await this.get<{ blocked: boolean }>(`/chat/block/${userId}`);
    return res.blocked;
  }

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  generateConversationId(userId1: number, userId2: number): string {
    const [a, b] = [userId1, userId2].sort((x, y) => x - y);
    return `${a}_${b}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  isImageFile(mimetype: string): boolean {
    return mimetype.startsWith('image/');
  }

  /** Renvoie le label d'affichage selon le type de message */
  getMessagePreview(msg: { type: string; content: string; filename?: string }): string {
    switch (msg.type) {
      case MessageType.IMAGE:
        return '📷 Photo';
      case MessageType.FILE:
        return `📎 ${msg.filename ?? 'Fichier'}`;
      case MessageType.MESSAGE_REQUEST:
        return '📩 Demande de contact';
      case MessageType.SYSTEM:
        return msg.content;
      default:
        return msg.content;
    }
  }
}

export const chatService = new ChatService();
