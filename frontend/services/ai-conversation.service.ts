import { getToken } from './auth.service';

const API_BASE_URL = 'http://localhost:3000';

export interface RagSource {
  publicationId: number;
  title: string;
  chunkIndex: number;
  similarity: number;
}

export interface AiMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  sources?: RagSource[] | null;
  isError: boolean;
  createdAt: string;
}

export interface AiConversation {
  id: number;
  title: string;
  pinned: boolean;
  userId: number;
  messageCount: number;
  preview: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiConversationDetail extends AiConversation {
  messages: AiMessage[];
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    throw new Error(err?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const aiConversationService = {
  /** List all conversations for the logged-in user */
  list(): Promise<AiConversation[]> {
    return request('/ai-conversations');
  },

  /** Get a conversation with its messages */
  get(id: number): Promise<AiConversationDetail> {
    return request(`/ai-conversations/${id}`);
  },

  /** Create a blank conversation */
  create(title = 'Nouvelle conversation'): Promise<AiConversation> {
    return request('/ai-conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  },

  /** Rename or pin/unpin */
  update(id: number, dto: { title?: string; pinned?: boolean }): Promise<AiConversation> {
    return request(`/ai-conversations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  /** Delete a conversation */
  delete(id: number): Promise<{ success: boolean }> {
    return request(`/ai-conversations/${id}`, { method: 'DELETE' });
  },
};
