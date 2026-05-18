// components/chat/FriendsSidebar.tsx
'use client';

import React, { useState, useMemo } from 'react';
import UserAvatar from './UserAvatar';
import { Users, MessageSquare, Bell, Search, X, Pin, BellOff } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { useTranslation } from '../../context/LanguageContext';
import MessageRequestCard from './MessageRequestCard';
import { Conversation, MessageType, chatService } from '../../../services/chat.service';
import { getFullName, getInitials } from '../../utils/chat.utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';

type SidebarTab = 'friends' | 'conversations' | 'requests';

interface FriendsSidebarProps {
  onSelectConversation: (conv: Conversation) => void;
  currentConversationId?: string;
}

export default function FriendsSidebar({
  onSelectConversation,
  currentConversationId,
}: FriendsSidebarProps) {
  const { t, language } = useTranslation();
  const {
    friends,
    friendsLoading,
    conversations,
    conversationsLoading,
    pendingRequests,
    pendingRequestsCount,
    requestsLoading,
    refreshRequests,
    refreshConversations,
    currentUserId,
    canShowOnlineFor,
  } = useChatContext();
  const dateLocale = language === 'fr' ? fr : enUS;

  const [activeTab, setActiveTab] = useState<SidebarTab>('conversations');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Filtered lists ──────────────────────────────────────

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        getFullName(c.participant).toLowerCase().includes(q) ||
        c.lastMessage?.content?.toLowerCase().includes(q),
    );
  }, [conversations, searchQuery]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase();
    return friends.filter((f) => getFullName(f.user).toLowerCase().includes(q));
  }, [friends, searchQuery]);

  // ── Handlers ────────────────────────────────────────────

  const handleAccept = async (requestId: number) => {
    await chatService.respondToMessageRequest(requestId, 'accepted');
    await refreshRequests();
    await refreshConversations();
  };

  const handleDecline = async (requestId: number) => {
    await chatService.respondToMessageRequest(requestId, 'declined');
    await refreshRequests();
    await refreshConversations();
  };

  const handleFriendClick = (
    friendUserId: number,
    firstName: string,
    lastName: string,
    profileImage?: string,
    isOnline?: boolean,
  ) => {
    const existing = conversations.find((c) => c.participant.id === friendUserId);
    if (existing) {
      onSelectConversation(existing);
      return;
    }
    const syntheticConv: Conversation = {
      conversationId: [currentUserId, friendUserId]
        .sort((a, b) => (a ?? 0) - (b ?? 0))
        .join('_'),
      participant: {
        id: friendUserId,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        profileImage,
        isOnline: isOnline ?? false,
      },
      unreadCount: 0,
    };
    onSelectConversation(syntheticConv);
  };

  /** Renvoie le texte à afficher dans l'aperçu de la dernière conversation */
  const getLastMessagePreview = (conv: Conversation): string => {
    const last = conv.lastMessage;
    if (!last) return t('chat.new_conversation');
    return chatService.getMessagePreview(last);
  };

  // ── Tabs ────────────────────────────────────────────────

  const tabs: { id: SidebarTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'conversations',
      label: t('chat.tab_messages'),
      icon: <MessageSquare size={15} />,
      badge: conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0) || undefined,
    },
    {
      id: 'friends',
      label: t('chat.tab_friends'),
      icon: <Users size={15} />,
      badge: friends.length || undefined,
    },
    {
      id: 'requests',
      label: t('chat.tab_requests'),
      icon: <Bell size={15} />,
      badge: pendingRequestsCount || undefined,
    },
  ];

  return (
    <aside className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight mb-3">
          {t('chat.sidebar_title')}
        </h2>
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('chat.search_sidebar')}
            className="w-full pl-8 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00926B] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${activeTab === tab.id
              ? 'text-[#00926B] dark:text-[#00B383]'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
          >
            <div className="relative">
              {tab.icon}
              {tab.badge ? (
                <span className="absolute -top-2 -right-2 bg-[#00926B] text-white text-[9px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              ) : null}
            </div>
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-[#00926B] to-[#00B383]" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* CONVERSATIONS */}
        {activeTab === 'conversations' && (
          <>
            {conversationsLoading ? (
              <ConversationSkeleton />
            ) : filteredConversations.length === 0 ? (
              <EmptyState
                icon={<MessageSquare size={28} className="text-gray-300 dark:text-gray-600" />}
                title={searchQuery ? t('chat.no_results') : t('chat.no_conversations')}
                subtitle={
                  searchQuery ? t('chat.try_other') : t('chat.start_with_friend')
                }
              />
            ) : (
              filteredConversations.map((conv) => {
                const name = getFullName(conv.participant);
                const initials = getInitials(conv.participant);
                const isActive = conv.conversationId === currentConversationId;
                const isRequest =
                  conv.lastMessage?.type === MessageType.MESSAGE_REQUEST &&
                  conv.pendingRequest != null;
                const isPinned = conv.isPinned ?? false;
                const isMuted = conv.isMuted ?? false;

                return (
                  <button
                    key={conv.conversationId}
                    onClick={() => onSelectConversation(conv)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-all border-b border-gray-50 dark:border-gray-800/50 last:border-0 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#00926B]/8 to-transparent border-l-2 border-l-[#00926B]'
                        : isPinned
                        ? 'bg-[#00926B]/5 dark:bg-[#00926B]/10 hover:bg-[#00926B]/10 dark:hover:bg-[#00926B]/15'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <UserAvatar
                      userId={conv.participant.id}
                      profileImageUrl={conv.participant.profileImage}
                      fullName={name}
                      initials={initials}
                      size={40}
                      showOnline={canShowOnlineFor(conv.participant.id)}
                      isOnline={canShowOnlineFor(conv.participant.id) && conv.participant.isOnline}
                    />

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex justify-between items-baseline gap-1">
                        <p
                          className={`text-sm truncate ${conv.unreadCount > 0
                            ? 'font-bold text-gray-900 dark:text-white'
                            : 'font-medium text-gray-800 dark:text-gray-200'
                            }`}
                        >
                          {name}
                        </p>
                        {conv.lastMessage && (
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {formatDistanceToNow(new Date(conv.lastMessage.createdAt), {
                              addSuffix: false,
                              locale: dateLocale,
                            })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <p
                          className={`text-xs truncate ${conv.unreadCount > 0
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-400'
                            }`}
                        >
                          {/* Préfixe "Vous:" uniquement pour les messages normaux */}
                          {conv.lastMessage?.senderId === currentUserId &&
                            conv.lastMessage?.type === MessageType.TEXT && (
                              <span className="text-gray-400">{t('chat.you_prefix')}</span>
                            )}
                          {getLastMessagePreview(conv)}
                        </p>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Pin indicator */}
                          {isPinned && (
                            <Pin size={11} className="text-[#00926B] dark:text-[#00B383]" />
                          )}
                          {/* Mute indicator */}
                          {isMuted && (
                            <BellOff size={11} className="text-gray-400 dark:text-gray-500" />
                          )}
                          {/* Badge "demande" pour les conversations en attente */}
                          {isRequest && (
                            <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[9px] font-semibold rounded-full px-1.5 py-0.5">
                              {t('chat.request_badge')}
                            </span>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="bg-[#00926B] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </>
        )}

        {/* FRIENDS */}
        {activeTab === 'friends' && (
          <>
            {friendsLoading ? (
              <ConversationSkeleton />
            ) : filteredFriends.length === 0 ? (
              <EmptyState
                icon={<Users size={28} className="text-gray-300 dark:text-gray-600" />}
                title={searchQuery ? t('chat.no_results') : t('chat.no_friends')}
                subtitle={
                  searchQuery
                    ? t('chat.try_other')
                    : t('chat.follow_users')
                }
              />
            ) : (
              <div className="p-3 space-y-1">
                {filteredFriends.map((rel) => {
                  const friend = rel.user;
                  const name = getFullName(friend);
                  const initials = getInitials(friend);
                  return (
                    <button
                      key={rel.id}
                      onClick={() =>
                        handleFriendClick(
                          friend.id,
                          friend.firstName,
                          friend.lastName,
                          friend.profileImage,
                          friend.isOnline,
                        )
                      }
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
                    >
                      <UserAvatar
                        userId={friend.id}
                        profileImageUrl={friend.profileImage}
                        fullName={name}
                        initials={initials}
                        size={38}
                        showOnline={canShowOnlineFor(friend.id)}
                        isOnline={canShowOnlineFor(friend.id) && friend.isOnline}
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-[#00926B] dark:group-hover:text-[#00B383] transition-colors">
                          {name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {friend.department ?? ''}
                        </p>
                      </div>
                      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MessageSquare size={14} className="text-[#00926B]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* REQUESTS */}
        {activeTab === 'requests' && (
          <>
            {requestsLoading ? (
              <ConversationSkeleton />
            ) : pendingRequests.length === 0 ? (
              <EmptyState
                icon={<Bell size={28} className="text-gray-300 dark:text-gray-600" />}
                title={t('chat.no_requests')}
                subtitle={t('chat.requests_here')}
              />
            ) : (
              <div className="p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-3">
                  {pendingRequests.length === 1
                    ? t('chat.pending_one', { count: pendingRequests.length })
                    : t('chat.pending_plural', { count: pendingRequests.length })}
                </p>
                {pendingRequests.map((req) => (
                  <MessageRequestCard
                    key={req.id}
                    request={req}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}

function ConversationSkeleton() {
  return (
    <div className="p-3 space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-1 py-2 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-2/3" />
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="mb-3">{icon}</div>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}