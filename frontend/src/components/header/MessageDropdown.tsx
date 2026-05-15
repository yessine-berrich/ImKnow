// components/header/MessageDropdown.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { chatService, Conversation } from '../../../services/chat.service';
import { chatSocketService, NewChatMessagePayload } from '../../../services/chat-socket.service';
import { fetchCurrentUser, getToken } from '../../../services/auth.service';
import { Dropdown } from '../ui/dropdown/Dropdown';
import { DropdownItem } from '../ui/dropdown/DropdownItem';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import UserAvatar from '../chat/UserAvatar';
import { useChatContext } from '../../context/ChatContext';

interface MessageDropdownProps {
  onMessageClick?: () => void;
}

export default function MessageDropdown({ onMessageClick }: MessageDropdownProps) {
  const { canShowOnlineFor } = useChatContext();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const router = useRouter();
  const needsRefreshRef = useRef(false);

  // ── Load current user then connect socket ──────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const token = getToken();
        if (!token) { setError('Non authentifié'); setLoading(false); return; }

        const user = await fetchCurrentUser();
        if (!user?.id) { setError("Impossible de récupérer l'utilisateur"); setLoading(false); return; }

        setCurrentUserId(user.id);
        localStorage.setItem('userId', user.id.toString());
        setError(null);
      } catch {
        setError('Erreur de chargement utilisateur');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ── Fetch conversations from API ───────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const response = await chatService.getUserConversations();
      const list = response.conversations || [];
      const sorted = [...list].sort((a, b) => {
        const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bt - at;
      });
      setConversations(sorted);
      setUnreadCount(sorted.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0));
    } catch (err: any) {
      setError(err.message || 'Erreur de chargement des conversations');
    }
  }, [currentUserId]);

  // ── Initial load once userId is known ─────────────────────────────────
  useEffect(() => {
    if (currentUserId) loadConversations();
  }, [currentUserId, loadConversations]);

  // ── Socket.io — real-time new message ─────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;

    chatSocketService.connect(currentUserId);

    const handleNewMessage = (payload: NewChatMessagePayload) => {
      const isIncoming = payload.message.senderId !== currentUserId;

      setConversations(prev => {
        const idx = prev.findIndex(c => c.conversationId === payload.conversationId);
        if (idx === -1) {
          // Unknown conversation — refresh on next open
          needsRefreshRef.current = true;
          return prev;
        }

        const updated = prev.map(c => {
          if (c.conversationId !== payload.conversationId) return c;
          return {
            ...c,
            lastMessage: {
              id: payload.message.id,
              content: payload.message.content,
              type: payload.message.type as string,
              createdAt: payload.message.createdAt,
              isRead: payload.message.isRead,
              senderId: payload.message.senderId,
            },
            unreadCount: isIncoming ? (c.unreadCount ?? 0) + 1 : c.unreadCount,
          };
        });

        // Re-sort by most recent
        return [...updated].sort((a, b) => {
          const at = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
          const bt = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
          return bt - at;
        });
      });

      if (isIncoming) {
        setUnreadCount(prev => prev + 1);
      }
    };

    chatSocketService.onNewMessage(handleNewMessage);

    return () => {
      chatSocketService.offNewMessage(handleNewMessage);
    };
  }, [currentUserId]);

  // ── Refresh on open (sync reads done in chat page) ─────────────────────
  useEffect(() => {
    if (isOpen && currentUserId) {
      loadConversations();
      needsRefreshRef.current = false;
    }
  }, [isOpen, currentUserId, loadConversations]);

  const closeDropdown = () => {
    setIsOpen(false);
    onMessageClick?.();
  };

  const handleConversationClick = (conversation: Conversation) => {
    closeDropdown();
    router.push(`/chat?userId=${conversation.participant.id}`);
  };

  const getLastMessagePreview = (conversation: Conversation): string => {
    if (!conversation.lastMessage) return 'Aucun message';
    const isOwn = conversation.lastMessage.senderId === currentUserId;
    const prefix = isOwn ? 'Vous: ' : '';
    switch (conversation.lastMessage.type) {
      case 'image': return `${prefix}📷 Photo`;
      case 'file':  return `${prefix}📎 Fichier`;
      default: {
        const content = conversation.lastMessage.content;
        return `${prefix}${content.length > 50 ? content.substring(0, 50) + '…' : content}`;
      }
    }
  };

  const getParticipantName = (c: Conversation): string => {
    const u = c.participant;
    if (u.firstName || u.lastName) return `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return u.fullName || 'Utilisateur';
  };

  const getInitials = (c: Conversation): string => {
    const u = c.participant;
    return `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.toUpperCase() || 'U';
  };

  const formatMessageDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: fr }); }
    catch { return ''; }
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={() => setIsOpen(true)}
      >
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0.5 z-10 flex h-2 w-2">
            <span className="absolute inline-flex w-full h-full bg-blue-400 rounded-full opacity-75 animate-ping" />
            <span className="relative inline-flex w-2 h-2 bg-blue-500 rounded-full border-2 border-white" />
          </span>
        )}
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M18 5.25C18 4.00736 16.9926 3 15.75 3H4.25C3.00736 3 2 4.00736 2 5.25V13.75C2 14.9926 3.00736 16 4.25 16H9.5L13.5 19V16H15.75C16.9926 16 18 14.9926 18 13.75V5.25ZM4.25 4.5H15.75C16.1642 4.5 16.5 4.83579 16.5 5.25V13.75C16.5 14.1642 16.1642 14.5 15.75 14.5H12.5V17L9.5 14.5H4.25C3.83579 14.5 3.5 14.1642 3.5 13.75V5.25C3.5 4.83579 3.83579 4.5 4.25 4.5Z" fill="currentColor" />
          <circle cx="6.5" cy="9.5" r="1.5" fill="currentColor" />
          <circle cx="10" cy="9.5" r="1.5" fill="currentColor" />
          <circle cx="13.5" cy="9.5" r="1.5" fill="currentColor" />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Messages</h5>
          <button onClick={closeDropdown} className="text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-[#00926B] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune conversation</p>
            <p className="text-xs text-gray-400 dark:text-gray500 mt-1">Commencez à discuter avec d'autres utilisateurs</p>
          </div>
        ) : (
          <ul className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
            {conversations.slice(0, 10).map((conversation) => {
              const name = getParticipantName(conversation);
              const hasUnread = (conversation.unreadCount ?? 0) > 0;
              return (
                <li key={conversation.conversationId}>
                  <DropdownItem
                    tag="button"
                    onItemClick={() => handleConversationClick(conversation)}
                    className={`flex gap-3 rounded-lg border-b border-gray-100 px-4 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 w-full text-left transition-colors ${hasUnread ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                  >
                    {/* Avatar */}
                    <UserAvatar
                      userId={conversation.participant.id}
                      profileImageUrl={(conversation.participant as any).profileImage}
                      fullName={name}
                      initials={getInitials(conversation)}
                      size={40}
                      showOnline={canShowOnlineFor(conversation.participant.id)}
                      isOnline={canShowOnlineFor(conversation.participant.id) && (conversation.participant.isOnline ?? false)}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{name}</p>
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                            {formatMessageDate(conversation.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${hasUnread ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                        {getLastMessagePreview(conversation)}
                      </p>
                      {hasUnread && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {conversation.unreadCount} nouveau{(conversation.unreadCount ?? 0) > 1 ? 'x' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </DropdownItem>
                </li>
              );
            })}
          </ul>
        )}

        {conversations.length > 10 && (
          <div className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
            +{conversations.length - 10} autres conversations
          </div>
        )}

        <Link
          href="/chat"
          onClick={closeDropdown}
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        >
          Voir tous les messages
        </Link>
      </Dropdown>
    </div>
  );
}
