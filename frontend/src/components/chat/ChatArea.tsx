// components/chat/ChatArea.tsx
'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage, MessageType, MessageRequestStatus } from '../../../services/chat.service';
import { useTranslation } from '../../context/LanguageContext';
import LoadingSpinner from './LoadingSpinner';
import MessageBubble from './MessageBubble';

interface Participant {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  profileImage?: string;
}

interface ChatAreaProps {
  messages: ChatMessage[];
  currentUserId: number;
  participant?: Participant;
  onDeleteMessage: (messageId: number) => void;
  onEditMessage: (messageId: number, content: string) => void;
  onAddReaction: (messageId: number, emoji: string) => void;
  onRemoveReaction: (messageId: number, emoji: string) => void;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onRespondToRequest?: (requestId: number, action: 'accepted' | 'declined') => Promise<void>;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  currentUserId,
  participant,
  onDeleteMessage,
  onEditMessage,
  onAddReaction,
  onRemoveReaction,
  loading,
  hasMore,
  onLoadMore,
  messagesEndRef,
  onRespondToRequest,
}) => {
  const { t } = useTranslation();
  const participantName =
    participant?.fullName ||
    (participant?.firstName || participant?.lastName
      ? `${participant.firstName ?? ''} ${participant.lastName ?? ''}`.trim()
      : undefined);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtTop, setIsAtTop] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const atTop = container.scrollTop === 0;
    setIsAtTop(atTop);

    if (atTop && hasMore && !loading && !isLoadingMoreRef.current) {
      isLoadingMoreRef.current = true;
      const scrollHeightBefore = container.scrollHeight;
      onLoadMore();
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - scrollHeightBefore;
          }
          isLoadingMoreRef.current = false;
        }),
      );
    }
  }, [hasMore, loading, onLoadMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    isLoadingMoreRef.current = false;
  }, [messages.length]);

  const messageGroups = useCallback((): Record<string, ChatMessage[]> => {
    return messages.reduce<Record<string, ChatMessage[]>>((acc, message) => {
      const key = new Date(message.createdAt).toLocaleDateString();
      (acc[key] = acc[key] ?? []).push(message);
      return acc;
    }, {});
  }, [messages])();

  const formatDateHeader = (dateKey: string): string => {
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString();
    if (dateKey === today) return t('chat.today');
    if (dateKey === yesterday) return t('chat.yesterday');
    return dateKey;
  };

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.senderId === currentUserId) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentUserId, messagesEndRef]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900"
    >
      {isAtTop && hasMore && (
        <div className="flex justify-center py-2">
          {loading ? (
            <LoadingSpinner size="sm" />
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t('chat.scroll_older')}
            </span>
          )}
        </div>
      )}

      {Object.entries(messageGroups).map(([dateKey, dateMessages]) => (
        <div key={dateKey}>
          {/* Séparateur de date */}
          <div className="flex justify-center my-4">
            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full">
              {formatDateHeader(dateKey)}
            </span>
          </div>

          {dateMessages.map((message, index) => {
            // ── Message SYSTEM ─────────────────────────────────
            if (message.type === MessageType.SYSTEM) {
              return (
                <div key={message.id} className="flex justify-center my-3">
                  <div className="flex items-center gap-2 bg-gradient-to-r from-[#00926B]/10 to-[#00B383]/10 border border-[#00926B]/20 text-[#00926B] dark:text-[#00B383] text-xs px-4 py-2 rounded-full">
                    <span>🎉</span>
                    <span className="font-medium">{message.content}</span>
                  </div>
                </div>
              );
            }

            // ── Message REQUEST ────────────────────────────────
            if (message.type === MessageType.MESSAGE_REQUEST) {
              const isReceiver = message.receiverId === currentUserId;
              const isPending = message.status === MessageRequestStatus.PENDING;
              const isAccepted = message.status === MessageRequestStatus.ACCEPTED;
              const isDeclined = message.status === MessageRequestStatus.DECLINED;

              return (
                <div key={message.id} className="flex justify-center my-4">
                  <div className="max-w-sm w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">📩</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {isReceiver ? t('chat.request_received') : t('chat.request_sent')}
                        </p>
                        {message.content && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                            {message.content}
                          </p>
                        )}

                        {/* Statut */}
                        {isAccepted && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ {t('chat.request_accepted')}
                          </span>
                        )}
                        {isDeclined && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs text-red-500 dark:text-red-400 font-medium">
                            ✕ {t('chat.request_declined')}
                          </span>
                        )}

                        {/* Boutons d'action pour le destinataire quand la demande est en attente */}
                        {isReceiver && isPending && onRespondToRequest && (
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => onRespondToRequest(message.id, 'accepted')}
                              className="flex-1 py-1.5 text-xs font-semibold bg-[#00926B] hover:bg-[#007a5a] text-white rounded-lg transition-colors"
                            >
                              {t('chat.accept')}
                            </button>
                            <button
                              onClick={() => onRespondToRequest(message.id, 'declined')}
                              className="flex-1 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                            >
                              {t('chat.decline')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // ── Message normal ─────────────────────────────────
            const prevSenderId = dateMessages[index - 1]?.senderId;
            const showAvatar = index === 0 || prevSenderId !== message.senderId;
            const isConsecutive = index > 0 && prevSenderId === message.senderId;

            const isOwn = message.senderId === currentUserId;
            return (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                isConsecutive={isConsecutive}
                senderName={isOwn ? undefined : participantName}
                senderUserId={isOwn ? undefined : participant?.id}
                senderProfileImageUrl={isOwn ? undefined : participant?.profileImage}
                onDelete={onDeleteMessage}
                onEdit={onEditMessage}
                onAddReaction={onAddReaction}
                onRemoveReaction={onRemoveReaction}
              />
            );
          })}
        </div>
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
};

export default ChatArea;
