// context/ChatContext.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  chatService,
  Conversation,
  ChatMessage,
  MessageRequestResponseDto,
  MessageRequestStatus,
} from '../../services/chat.service';
import { followService, FollowRelationshipDto } from '../../services/follow.service';
import { decodeToken, fetchCurrentUser, getToken } from '../../services/auth.service';

export interface FloatingChat {
  conversation: Conversation;
  messages: ChatMessage[];
  isOpen: boolean;
  isMinimized: boolean;
}

interface ChatContextValue {
  friends: FollowRelationshipDto[];
  friendsLoading: boolean;
  refreshFriends: () => Promise<void>;

  conversations: Conversation[];
  conversationsLoading: boolean;
  refreshConversations: () => Promise<void>;

  pendingRequests: MessageRequestResponseDto[];
  pendingRequestsCount: number;
  requestsLoading: boolean;
  refreshRequests: () => Promise<void>;

  floatingChats: FloatingChat[];
  openFloatingChat: (conversation: Conversation) => void;
  closeFloatingChat: (conversationId: string) => void;
  toggleMinimizeChat: (conversationId: string) => void;
  sendFloatingMessage: (conversationId: string, content: string) => Promise<void>;

  currentUserId: number | null;

  blockedIds: Set<number>;
  refreshBlockedIds: () => Promise<void>;
  canShowOnlineFor: (userId: number) => boolean;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used inside <ChatProvider>');
  return ctx;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [friends, setFriends] = useState<FollowRelationshipDto[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<MessageRequestResponseDto[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [floatingChats, setFloatingChats] = useState<FloatingChat[]>([]);
  const [blockedIds, setBlockedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    const getStoredUserId = () =>
      localStorage.getItem('userId') || sessionStorage.getItem('userId');

    const persistUserId = (userId: number) => {
      const storage = localStorage;
      storage.setItem('userId', userId.toString());
    };

    const resolveCurrentUserId = async () => {
      const storedUserId = getStoredUserId();
      if (storedUserId) {
        const userId = Number(storedUserId);
        if (!Number.isNaN(userId)) {
          setCurrentUserId(userId);
          return;
        }
      }

      const token = getToken();
      const decoded = token ? decodeToken(token) : null;
      const tokenUserId = decoded?.sub ?? decoded?.id ?? decoded?.userId;
      if (tokenUserId) {
        const userId = Number(tokenUserId);
        if (!Number.isNaN(userId)) {
          persistUserId(userId);
          setCurrentUserId(userId);
          return;
        }
      }

      try {
        const user = await fetchCurrentUser();
        if (!cancelled && user?.id) {
          persistUserId(user.id);
          setCurrentUserId(user.id);
        }
      } catch {
        // L'absence d'utilisateur est gérée par les services auth/API.
      }
    };

    resolveCurrentUserId();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    refreshFriends();
    refreshConversations();
    refreshRequests();
    refreshBlockedIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const refreshFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const data = await followService.getFriends();
      setFriends(data);
    } catch { /* fail gracefully */ }
    finally { setFriendsLoading(false); }
  }, []);

  const refreshConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const { conversations: convs } = await chatService.getUserConversations();
      setConversations(convs);
    } catch { /* fail gracefully */ }
    finally { setConversationsLoading(false); }
  }, []);

  const refreshRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const { requests } = await chatService.getPendingMessageRequests();
      setPendingRequests(requests);
    } catch { /* fail gracefully */ }
    finally { setRequestsLoading(false); }
  }, []);

  const refreshBlockedIds = useCallback(async () => {
    try {
      const ids = await chatService.getBlockedUserIds();
      setBlockedIds(new Set(ids));
    } catch { /* fail gracefully */ }
  }, []);

  const canShowOnlineFor = useCallback((userId: number): boolean => {
    if (blockedIds.has(userId)) return false;
    const conv = conversations.find(c => c.participant.id === userId);
    if (!conv) return true;
    if (conv.pendingRequest) return false;
    if (
      conv.lastMessage?.type === 'message_request' &&
      conv.lastMessage?.status !== MessageRequestStatus.ACCEPTED
    ) return false;
    return true;
  }, [blockedIds, conversations]);

  useEffect(() => {
    if (pathname !== '/chat') return;

    let cancelled = false;

    const ensureCurrentUser = async () => {
      if (currentUserId) return currentUserId;

      const storedUserId =
        localStorage.getItem('userId') || sessionStorage.getItem('userId');
      if (storedUserId) {
        const userId = Number(storedUserId);
        if (!Number.isNaN(userId)) {
          setCurrentUserId(userId);
          return userId;
        }
      }

      const token = getToken();
      const decoded = token ? decodeToken(token) : null;
      const tokenUserId = decoded?.sub ?? decoded?.id ?? decoded?.userId;
      if (tokenUserId) {
        const userId = Number(tokenUserId);
        if (!Number.isNaN(userId)) {
          const storage = localStorage;
          storage.setItem('userId', userId.toString());
          setCurrentUserId(userId);
          return userId;
        }
      }

      const user = await fetchCurrentUser();
      if (user?.id) {
        const storage = localStorage;
        storage.setItem('userId', user.id.toString());
        setCurrentUserId(user.id);
        return user.id;
      }

      return null;
    };

    const refreshChatData = async () => {
      const userId = await ensureCurrentUser().catch(() => null);
      if (!userId || cancelled) return;

      await Promise.allSettled([
        refreshFriends(),
        refreshConversations(),
        refreshRequests(),
        refreshBlockedIds(),
      ]);
    };

    refreshChatData();

    return () => {
      cancelled = true;
    };
  }, [
    pathname,
    currentUserId,
    refreshFriends,
    refreshConversations,
    refreshRequests,
    refreshBlockedIds,
  ]);

  // ─── Floating chat ─────────────────────────────────────────

  const openFloatingChat = useCallback(async (conversation: Conversation) => {
    const convId = conversation.conversationId;
    const participantId = conversation.participant?.id;

    // ✅ Garde : si l'id du participant est invalide, ne rien faire
    if (!participantId) {
      console.error('openFloatingChat: participant.id manquant', conversation);
      return;
    }

    // Ajouter ou rouvrir la fenêtre flottante immédiatement (UX réactif)
    setFloatingChats((prev) => {
      const exists = prev.find((c) => c.conversation.conversationId === convId);
      if (exists) {
        // Déjà ouverte → juste rouvrir/dé-minimiser
        return prev.map((c) =>
          c.conversation.conversationId === convId
            ? { ...c, isOpen: true, isMinimized: false }
            : c,
        );
      }
      // Limite à 3 fenêtres simultanées : retirer la plus ancienne si besoin
      const trimmed = prev.length >= 3 ? prev.slice(1) : prev;
      return [
        ...trimmed,
        { conversation, messages: [], isOpen: true, isMinimized: false },
      ];
    });

    // Charger l'historique en arrière-plan
    try {
      const res = await chatService.getConversationHistory(participantId, 1, 30);
      setFloatingChats((prev) =>
        prev.map((c) =>
          c.conversation.conversationId === convId
            ? { ...c, messages: res.messages }
            : c,
        ),
      );
      // Marquer comme lus
      await chatService.markMessagesAsRead(convId);
      // Mettre à jour la liste des conversations (unreadCount remis à 0)
      setConversations((prev) =>
        prev.map((c) =>
          c.conversationId === convId ? { ...c, unreadCount: 0 } : c,
        ),
      );
    } catch (err) {
      console.error('openFloatingChat: erreur chargement historique', err);
      // La fenêtre est déjà ouverte, l'utilisateur peut quand même écrire
    }
  }, []);

  const closeFloatingChat = useCallback((conversationId: string) => {
    setFloatingChats((prev) =>
      prev.filter((c) => c.conversation.conversationId !== conversationId),
    );
  }, []);

  const toggleMinimizeChat = useCallback((conversationId: string) => {
    setFloatingChats((prev) =>
      prev.map((c) =>
        c.conversation.conversationId === conversationId
          ? { ...c, isMinimized: !c.isMinimized }
          : c,
      ),
    );
  }, []);

  const sendFloatingMessage = useCallback(
    async (conversationId: string, content: string) => {
      const chat = floatingChats.find((c) => c.conversation.conversationId === conversationId);
      if (!chat) return;

      const { message } = await chatService.sendMessage(
        chat.conversation.participant.id,
        content,
      );

      setFloatingChats((prev) =>
        prev.map((c) =>
          c.conversation.conversationId === conversationId
            ? { ...c, messages: [...c.messages, message] }
            : c,
        ),
      );

      // Mettre à jour la liste des conversations
      refreshConversations();
    },
    [floatingChats, refreshConversations],
  );

  return (
    <ChatContext.Provider
      value={{
        friends,
        friendsLoading,
        refreshFriends,
        conversations,
        conversationsLoading,
        refreshConversations,
        pendingRequests,
        pendingRequestsCount: pendingRequests.length,
        requestsLoading,
        refreshRequests,
        floatingChats,
        openFloatingChat,
        closeFloatingChat,
        toggleMinimizeChat,
        sendFloatingMessage,
        currentUserId,
        blockedIds,
        refreshBlockedIds,
        canShowOnlineFor,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
