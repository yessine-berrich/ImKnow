// app/chat/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import FriendsSidebar from '@/components/chat/FriendsSidebar';
import ChatHeader from '@/components/chat/ChatHeader';
import ChatArea from '@/components/chat/ChatArea';
import MessageInput from '@/components/chat/MessageInput';
import EmptyState from '@/components/chat/EmptyState';
import SearchBar from '@/components/chat/SearchBar';
import SearchResults from '@/components/chat/SearchResults';
import { useChatContext } from '@/context/ChatContext';
import { useTranslation } from '@/context/LanguageContext';
import { chatService, Conversation, ChatMessage, MessageType, MessageRequestStatus } from '../../../../../../services/chat.service';
import { chatSocketService, NewChatMessagePayload } from '../../../../../../services/chat-socket.service';

const PAGE_SIZE = 30;

// ── Inline toast ──────────────────────────────────────────────
type ToastVariant = 'error' | 'warning';
interface ToastItem { id: number; msg: string; variant: ToastVariant }

function Toast({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  if (!items.length) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
      {items.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium border max-w-sm w-full animate-fade-in
            ${t.variant === 'error'
              ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
              : 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300'}`}
        >
          <span>{t.variant === 'error' ? '❌' : '⚠️'}</span>
          <span className="flex-1">{t.msg}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-60 hover:opacity-100 transition-opacity text-base leading-none">✕</button>
        </div>
      ))}
    </div>
  );
}

const upsertMessage = (messages: ChatMessage[], message: ChatMessage): ChatMessage[] => {
  const existingIndex = messages.findIndex(existingMessage => existingMessage.id === message.id);
  if (existingIndex === -1) return [...messages, message];

  return messages.map(existingMessage =>
    existingMessage.id === message.id
      ? { ...existingMessage, ...message }
      : existingMessage
  );
};

const prependUniqueMessages = (
  currentMessages: ChatMessage[],
  olderMessages: ChatMessage[],
): ChatMessage[] => {
  const currentIds = new Set(currentMessages.map(message => message.id));
  const uniqueOlderMessages = olderMessages.filter(message => !currentIds.has(message.id));
  return [...uniqueOlderMessages, ...currentMessages];
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { refreshConversations, currentUserId, blockedIds, refreshBlockedIds } = useChatContext();

  // ── Active conversation ───────────────────────────────────
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  // ── Messages state ────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalMessages, setTotalMessages] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastSeenMessageIdRef = useRef<number | null>(null);
  const messageIdsRef = useRef<Set<number>>(new Set());

  // ── Search ────────────────────────────────────────────────
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ── Sending ───────────────────────────────────────────────
  const [isSending, setIsSending] = useState(false);


  // ── Toasts ────────────────────────────────────────────────
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastIdRef = useRef(0);
  const showToast = useCallback((msg: string, variant: ToastVariant = 'error') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, msg, variant }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // ── Conversations locales (chargées directement) ─────────
  const [localConversations, setLocalConversations] = useState<Conversation[]>([]);
  const [conversationsReady, setConversationsReady] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map(message => message.id));
    lastSeenMessageIdRef.current = messages.reduce(
      (latest, message) => Math.max(latest, message.id),
      lastSeenMessageIdRef.current ?? 0,
    );
  }, [messages]);

  /**
   * ✅ Charger les conversations directement
   */
  const loadConversations = useCallback(async () => {
    try {
      const { conversations } = await chatService.getUserConversations();
      setLocalConversations(conversations);
      return conversations;
    } catch (err) {
      showToast(t('chat.err_load_convs'));
      return [];
    } finally {
      setConversationsReady(true);
    }
  }, []);

  // Chargement initial - une seule fois
  useEffect(() => {
    if (!initialLoadDone) {
      loadConversations();
      setInitialLoadDone(true);
    }
  }, [loadConversations, initialLoadDone]);

  /**
   * ✅ Gérer l'ouverture depuis le paramètre userId
   */
  useEffect(() => {
    if (!conversationsReady) return;

    const userIdParam = searchParams.get('userId');
    if (!userIdParam) return;

    const targetId = Number(userIdParam);
    if (isNaN(targetId)) return;

    // Chercher la conversation existante
    const existingConv = localConversations.find(
      (c) => c.participant.id === targetId
    );

    if (existingConv) {
      // Conversation trouvée
      if (!activeConversation || activeConversation.conversationId !== existingConv.conversationId) {
        setActiveConversation(existingConv);
      }
    } else if (currentUserId) {
      // Créer une conversation temporaire
      const syntheticConv: Conversation = {
        conversationId: `temp_${Math.min(currentUserId, targetId)}_${Math.max(currentUserId, targetId)}`,
        participant: {
          id: targetId,
          firstName: '',
          lastName: '',
          fullName: t('chat.loading_name'),
          isOnline: false,
          lastSeenAt: null,
        },
        unreadCount: 0,
      };
      
      if (!activeConversation || activeConversation.conversationId !== syntheticConv.conversationId) {
        setActiveConversation(syntheticConv);
      }
    }
  }, [conversationsReady, localConversations, searchParams, currentUserId, activeConversation]);

  /**
   * ✅ Charger les messages quand la conversation active change
   */
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      lastSeenMessageIdRef.current = null;
      return;
    }

    // Ne pas recharger si c'est la même conversation
    const loadMessagesForConversation = async () => {
      setMessagesLoading(true);
      try {
        const res = await chatService.getConversationHistory(
          activeConversation.participant.id,
          1,
          PAGE_SIZE
        );
        
        setMessages(res.messages);
        lastSeenMessageIdRef.current =
          res.messages.length > 0 ? Math.max(...res.messages.map(message => message.id)) : null;
        setTotalMessages(res.pagination.total);
        setHasMore(PAGE_SIZE < res.pagination.total);
        setPage(1);

        // Marquer comme lu
        await chatService.markMessagesAsRead(activeConversation.conversationId);

        // Rafraîchir le contexte en arrière-plan (sans bloquer l'UI)
        refreshConversations().catch(() => {});

        // Si c'est une conversation temporaire, essayer de la charger réellement
        if (activeConversation.conversationId.startsWith('temp_')) {
          const { conversations } = await chatService.getUserConversations();
          const realConv = conversations.find(c => c.participant.id === activeConversation.participant.id);
          if (realConv) {
            setActiveConversation(realConv);
            setLocalConversations(conversations);
          }
        }
      } catch (err) {
        showToast(t('chat.err_load_msgs'));
        setMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    };

    loadMessagesForConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.conversationId]);

  useEffect(() => {
    if (!currentUserId) return;

    const socket = chatSocketService.connect(currentUserId);

    const handleNewMessage = async ({ conversationId, message }: NewChatMessagePayload) => {
      loadConversations().catch(() => {});
      refreshConversations().catch(() => {});

      const belongsToActiveConversation =
        conversationId === activeConversation?.conversationId ||
        (
          !!activeConversation?.conversationId.startsWith('temp_') &&
          (
            message.senderId === activeConversation.participant.id ||
            message.receiverId === activeConversation.participant.id
          )
        );

      if (!belongsToActiveConversation) return;

      const isNewMessage = !messageIdsRef.current.has(message.id);
      if (isNewMessage) {
        messageIdsRef.current.add(message.id);
      }

      setMessages(prev => upsertMessage(prev, message));

      if (isNewMessage) {
        setTotalMessages(prev => prev + 1);
      }

      lastSeenMessageIdRef.current = Math.max(
        lastSeenMessageIdRef.current ?? 0,
        message.id
      );

      if (message.receiverId === currentUserId) {
        chatService.markMessagesAsRead(conversationId).catch(() => {});
      }

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    chatSocketService.onNewMessage(handleNewMessage);

    if (activeConversation?.conversationId) {
      chatSocketService.joinConversation(activeConversation.conversationId);
    }

    return () => {
      chatSocketService.offNewMessage(handleNewMessage);
      if (activeConversation?.conversationId) {
        chatSocketService.leaveConversation(activeConversation.conversationId);
      }
      if (!socket.connected) {
        chatSocketService.disconnect();
      }
    };
  }, [activeConversation?.conversationId, currentUserId, loadConversations, refreshConversations]);

  const handleLoadMore = useCallback(async () => {
    if (!activeConversation || !hasMore || messagesLoading) return;

    setMessagesLoading(true);
    try {
      const res = await chatService.getConversationHistory(
        activeConversation.participant.id,
        page + 1,
        PAGE_SIZE
      );
      
      setMessages(prev => prependUniqueMessages(prev, res.messages));
      setPage(page + 1);
      setHasMore((page + 1) * PAGE_SIZE < totalMessages);
    } catch (err) {
      showToast(t('chat.err_load_older'), 'warning');
    } finally {
      setMessagesLoading(false);
    }
  }, [activeConversation, hasMore, messagesLoading, page, totalMessages, showToast]);

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setActiveConversation(conversation);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const handleDeleteConversation = useCallback(async () => {
    if (!activeConversation) return;
    try {
      await chatService.deleteConversation(activeConversation.participant.id);
      setActiveConversation(null);
      setMessages([]);
      await loadConversations();
      refreshConversations().catch(() => {});
      showToast(t('chat.conv_deleted'), 'warning');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.err_delete_conv'));
    }
  }, [activeConversation, loadConversations, refreshConversations, showToast]);

  const handleDeleteRequest = useCallback(async () => {
    if (!activeConversation) return;
    try {
      const reqMsg = messages.find(m => m.type === MessageType.MESSAGE_REQUEST);
      if (reqMsg && reqMsg.status === MessageRequestStatus.PENDING) {
        await chatService.cancelMessageRequest(reqMsg.id);
      } else {
        // declined : supprimer tous les messages de la conversation (request + system)
        await chatService.deleteConversation(activeConversation.participant.id);
      }
      setActiveConversation(null);
      setMessages([]);
      await loadConversations();
      refreshConversations().catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.err_delete_req'));
    }
  }, [activeConversation, messages, loadConversations, refreshConversations, showToast]);

  const handleToggleBlock = useCallback(async () => {
    if (!activeConversation) return;
    const participantId = activeConversation.participant.id;
    const isCurrentlyBlocked = blockedIds.has(participantId);
    try {
      if (isCurrentlyBlocked) {
        await chatService.unblockUser(participantId);
        showToast(t('chat.user_unblocked'), 'warning');
      } else {
        await chatService.blockUser(participantId);
        showToast(t('chat.user_blocked_toast'), 'warning');
      }
      await refreshBlockedIds();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.action_failed'));
    }
  }, [activeConversation, blockedIds, showToast, refreshBlockedIds]);

  const handleTogglePin = useCallback(async () => {
    if (!activeConversation) return;
    try {
      const { isPinned } = await chatService.togglePin(activeConversation.conversationId);
      setActiveConversation(prev => prev ? { ...prev, isPinned } : prev);
      setLocalConversations(prev =>
        prev.map(c =>
          c.conversationId === activeConversation.conversationId ? { ...c, isPinned } : c
        ).sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return bt - at;
        })
      );
      refreshConversations().catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.action_failed'));
    }
  }, [activeConversation, refreshConversations, showToast]);

  const handleToggleMute = useCallback(async () => {
    if (!activeConversation) return;
    try {
      const { isMuted } = await chatService.toggleMute(activeConversation.conversationId);
      setActiveConversation(prev => prev ? { ...prev, isMuted } : prev);
      setLocalConversations(prev =>
        prev.map(c =>
          c.conversationId === activeConversation.conversationId ? { ...c, isMuted } : c
        )
      );
      refreshConversations().catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.action_failed'));
    }
  }, [activeConversation, refreshConversations, showToast]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!activeConversation) return;
    
    setIsSending(true);
    try {
      const { message } = await chatService.sendMessage(
        activeConversation.participant.id,
        content
      );
      
      messageIdsRef.current.add(message.id);
      setMessages(prev => upsertMessage(prev, message));
      
      // Rafraîchir en arrière-plan
      loadConversations().catch(() => {});
      refreshConversations().catch(() => {});

      // Scroll en bas
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.err_send_msg'));
    } finally {
      setIsSending(false);
    }
  }, [activeConversation, refreshConversations, loadConversations]);

  const handleSendFile = useCallback(async (file: File) => {
    if (!activeConversation) return;
    
    setIsSending(true);
    try {
      const { message } = await chatService.sendFileMessage(
        activeConversation.participant.id,
        file
      );
      
      messageIdsRef.current.add(message.id);
      setMessages(prev => upsertMessage(prev, message));
      
      // Rafraîchir en arrière-plan
      loadConversations().catch(() => {});
      refreshConversations().catch(() => {});
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.err_send_file'));
    } finally {
      setIsSending(false);
    }
  }, [activeConversation, refreshConversations, loadConversations]);

  const handleDeleteMessage = useCallback(async (id: number) => {
    try {
      await chatService.deleteMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.err_delete_msg'));
    }
  }, []);

  const handleEditMessage = useCallback(async (id: number, content: string) => {
    try {
      const { message } = await chatService.editMessage(id, content);
      setMessages(prev =>
        prev.map(m =>
          m.id === id
            ? { ...m, content: message.content, isEdited: true, editedAt: message.editedAt }
            : m
        )
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.err_edit_msg'));
    }
  }, []);

  const handleAddReaction = useCallback(async (id: number, emoji: string) => {
    try {
      const { message } = await chatService.addReaction(id, emoji);
      setMessages(prev =>
        prev.map(m => (m.id === id ? { ...m, reactions: message.reactions } : m))
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.err_add_reaction'));
    }
  }, []);

  const handleRemoveReaction = useCallback(async (id: number, emoji: string) => {
    try {
      const { message } = await chatService.removeReaction(id, emoji);
      setMessages(prev =>
        prev.map(m => (m.id === id ? { ...m, reactions: message.reactions } : m))
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('chat.err_remove_reaction'));
    }
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!activeConversation || !query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const result = await chatService.searchMessages(
        activeConversation.participant.id,
        query
      );
      setSearchResults(result.messages);
    } catch (err) {
      showToast(t('chat.err_search'), 'warning');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [activeConversation]);

  // Détermine si l'input doit être bloqué et pourquoi.
  // Priorité : demande (pending/declined) > bloqué > ouvert
  const chatInputState = useMemo<'open' | 'declined' | 'pending_sent' | 'blocked'>(() => {
    // 1. État de la demande de contact (priorité sur le blocage)
    const reqMsg = messages.find(m => m.type === MessageType.MESSAGE_REQUEST);
    if (reqMsg) {
      if (reqMsg.status === MessageRequestStatus.DECLINED) return 'declined';
      if (reqMsg.status === MessageRequestStatus.PENDING && reqMsg.senderId === currentUserId) return 'pending_sent';
    }
    // Fallback sur lastMessage si les messages ne sont pas encore chargés
    if (!messages.length && activeConversation?.lastMessage) {
      const last = activeConversation.lastMessage;
      if (last.type === MessageType.MESSAGE_REQUEST) {
        if (last.status === MessageRequestStatus.DECLINED) return 'declined';
        if (last.status === MessageRequestStatus.PENDING && last.senderId === currentUserId) return 'pending_sent';
      }
    }
    // 2. Utilisateur bloqué
    if (activeConversation && blockedIds.has(activeConversation.participant.id)) return 'blocked';
    // 3. Conversation normale
    return 'open';
  }, [messages, activeConversation, currentUserId, blockedIds]);

  // Afficher un loader pendant le chargement initial
  if (!conversationsReady) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('chat.loading_conversations')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-50 dark:bg-gray-950">
      <Toast items={toasts} onDismiss={dismissToast} />
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 h-full border-r border-gray-200 dark:border-gray-800 overflow-hidden">
          <FriendsSidebar
            onSelectConversation={handleSelectConversation}
            currentConversationId={activeConversation?.conversationId}
          />
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col h-full min-w-0 bg-white dark:bg-gray-900 overflow-hidden">
          {activeConversation ? (
            <>
              {/* Header */}
              <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <ChatHeader
                  conversation={activeConversation}
                  isBlocked={chatInputState === 'blocked'}
                  canChat={chatInputState === 'open'}
                  onSearchClick={() => {
                    setShowSearch(v => !v);
                    if (showSearch) {
                      setSearchQuery('');
                      setSearchResults([]);
                    }
                  }}
                  onDeleteConversation={handleDeleteConversation}
                  onToggleBlock={handleToggleBlock}
                  onTogglePin={handleTogglePin}
                  onToggleMute={handleToggleMute}
                />
              </div>

              {/* Search Bar */}
              {showSearch && (
                <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
                  <SearchBar
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onSearch={handleSearch}
                    isLoading={searchLoading}
                    autoFocus
                    onClear={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    placeholder={t('chat.search_in_conv')}
                  />
                </div>
              )}

              {/* Messages/Search Results */}
              <div className="flex-1 overflow-y-auto min-h-0 bg-gray-50 dark:bg-gray-950">
                {showSearch && (searchQuery || searchResults.length > 0) ? (
                  <SearchResults
                    results={searchResults}
                    loading={searchLoading}
                    onClose={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  />
                ) : (
                  <ChatArea
                    messages={messages}
                    currentUserId={currentUserId ?? 0}
                    participant={activeConversation?.participant}
                    onDeleteMessage={handleDeleteMessage}
                    onEditMessage={handleEditMessage}
                    onAddReaction={handleAddReaction}
                    onRemoveReaction={handleRemoveReaction}
                    loading={messagesLoading}
                    hasMore={hasMore}
                    onLoadMore={handleLoadMore}
                    messagesEndRef={messagesEndRef}
                  />
                )}
              </div>

              {/* Input */}
              {!showSearch && (
                <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  {chatInputState !== 'open' ? (
                    <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 dark:bg-gray-800/60">
                      <span className="text-base leading-none">🚫</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                        {chatInputState === 'blocked' && t('chat.blocked_notice')}
                        {chatInputState === 'pending_sent' && t('chat.pending_notice')}
                        {chatInputState === 'declined' && t('chat.declined_notice')}
                      </p>
                      {chatInputState === 'blocked' && (
                        <button onClick={handleToggleBlock} className="text-xs font-semibold text-[#00926B] hover:underline flex-shrink-0">
                          {t('chat.unblock')}
                        </button>
                      )}
                      {chatInputState === 'pending_sent' && (
                        <button onClick={handleDeleteRequest} className="text-xs font-semibold text-[#00926B] hover:underline flex-shrink-0">
                          {t('chat.cancel_request')}
                        </button>
                      )}
                      {chatInputState === 'declined' && (
                        <button onClick={handleDeleteConversation} className="text-xs font-semibold text-[#00926B] hover:underline flex-shrink-0">
                          {t('chat.delete_conv_action')}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-4">
                      <MessageInput
                        onSendMessage={handleSendMessage}
                        onSendFile={handleSendFile}
                        isLoading={isSending}
                        placeholder={t('chat.message_placeholder', { name: activeConversation.participant.firstName || activeConversation.participant.fullName || '...' })}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title={t('chat.select_title')}
              description={t('chat.select_desc')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
