// components/chat/ConversationList.tsx
'use client';

import React, { useEffect, useState } from 'react';
import UserAvatar from './UserAvatar';
import { Conversation } from '../../../services/chat.service';
import { getFullName, getInitials } from '../../utils/chat.utils';
import { formatDistanceToNow } from 'date-fns';
import { useChatContext } from '../../context/ChatContext';
import { Pin, BellOff } from 'lucide-react';

interface ConversationListProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  loading: boolean;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations = [],
  currentConversation,
  onSelectConversation,
  loading,
}) => {
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const { canShowOnlineFor } = useChatContext();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) setCurrentUserId(Number(userId));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto" aria-busy="true" aria-label="Loading conversations">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse p-4 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
          <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">No messages yet</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
          Start a conversation with someone
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" role="list" aria-label="Conversations">
      {conversations.map((conversation) => {
        // Guard: skip malformed entries without an participant
        if (!conversation.participant?.id) return null;

        const { participant, lastMessage, unreadCount, conversationId } = conversation;
        const displayName = getFullName(participant);
        const initials = getInitials(participant);
        const isActive = currentConversation?.conversationId === conversationId;
        const isPinned = conversation.isPinned ?? false;
        const isMuted = conversation.isMuted ?? false;

        return (
          <button
            key={conversationId}
            onClick={() => onSelectConversation(conversation)}
            role="listitem"
            aria-current={isActive ? 'true' : undefined}
            className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20'
                  : isPinned
                  ? 'bg-[#00926B]/5 dark:bg-[#00926B]/10'
                  : ''
              }`}
          >
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <UserAvatar
                userId={participant.id}
                profileImageUrl={participant.profileImage}
                fullName={displayName}
                initials={initials}
                size={48}
                showOnline={canShowOnlineFor(participant.id)}
                isOnline={canShowOnlineFor(participant.id) && participant.isOnline}
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                    {displayName}
                  </h3>
                  {lastMessage && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                      {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {lastMessage?.senderId === currentUserId && (
                      <span className="font-medium">You: </span>
                    )}
                    {lastMessage?.type === 'image'
                      ? '📷 Photo'
                      : lastMessage?.type === 'file'
                        ? '📎 File'
                        : lastMessage?.content ?? ''}
                  </p>

                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {isPinned && <Pin size={11} className="text-[#00926B] dark:text-[#00B383]" />}
                    {isMuted && <BellOff size={11} className="text-gray-400 dark:text-gray-500" />}
                    {unreadCount > 0 && (
                      <span
                        className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center"
                        aria-label={`${unreadCount} unread messages`}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ConversationList;