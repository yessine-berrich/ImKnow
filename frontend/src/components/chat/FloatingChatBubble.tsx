// components/chat/FloatingChatBubble.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import UserAvatar from './UserAvatar';
import { X, Minus, Send, MessageCircle, ChevronDown } from 'lucide-react';
import { useChatContext, FloatingChat } from '../../context/ChatContext';
import { getFullName, getInitials } from '../../utils/chat.utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────
// Individual floating chat window
// ─────────────────────────────────────────────────────────────

interface FloatingWindowProps {
  chat: FloatingChat;
  index: number;
  currentUserId: number | null;
}

function FloatingWindow({ chat, index, currentUserId }: FloatingWindowProps) {
  const { closeFloatingChat, toggleMinimizeChat, sendFloatingMessage, canShowOnlineFor } = useChatContext();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { conversation, messages, isMinimized } = chat;
  const participant = conversation.participant;
  const conversationId = conversation.conversationId;

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isMinimized]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setInput('');
    try {
      await sendFloatingMessage(conversationId, trimmed);
    } catch {
      setInput(trimmed); // restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, conversationId, sendFloatingMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const displayName = getFullName(participant);
  const initials = getInitials(participant);
  // Offset each window from the right so multiple don't stack
  const rightOffset = 16 + index * 320;

  return (
    <div
      style={{ right: `${rightOffset}px` }}
      className="fixed bottom-0 z-50 flex flex-col"
      role="dialog"
      aria-label={`Chat avec ${displayName}`}
    >
      {/* ── Header (always visible) ───────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-xl cursor-pointer select-none shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, #00926B 0%, #00B383 100%)',
          width: '300px',
        }}
        onClick={() => toggleMinimizeChat(conversationId)}
      >
        {/* Avatar */}
        <UserAvatar
          userId={participant.id}
          profileImageUrl={participant.profileImage}
          fullName={displayName}
          initials={initials}
          size={32}
          showOnline={canShowOnlineFor(participant.id)}
          isOnline={canShowOnlineFor(participant.id) && participant.isOnline}
        />

        {/* Name + status */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold truncate leading-tight">
            {displayName}
          </p>
          {canShowOnlineFor(participant.id) && (
            <p className="text-green-100 text-xs">
              {participant.isOnline ? 'En ligne' : 'Hors ligne'}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimizeChat(conversationId);
            }}
            className="p-1 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white"
            aria-label={isMinimized ? 'Agrandir' : 'Réduire'}
          >
            {isMinimized ? <ChevronDown size={14} /> : <Minus size={14} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeFloatingChat(conversationId);
            }}
            className="p-1 rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* ── Body (hidden when minimized) ──────────────────────── */}
      {!isMinimized && (
        <div
          className="flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
          style={{ width: '300px', height: '380px' }}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-gray-950">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
                  Début de la conversation
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isOwn = msg.senderId === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-sm leading-relaxed ${isOwn
                        ? 'bg-[#00926B] text-white rounded-br-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-700'
                        }`}
                    >
                      {msg.type === 'image' ? (
                        <span className="text-xs opacity-80">📷 Image</span>
                      ) : msg.type === 'file' ? (
                        <span className="text-xs opacity-80">📎 {msg.filename ?? 'Fichier'}</span>
                      ) : (
                        <span className="break-words whitespace-pre-wrap">{msg.content}</span>
                      )}
                      <p
                        className={`text-[10px] mt-0.5 ${isOwn ? 'text-green-100' : 'text-gray-400 dark:text-gray-500'
                          }`}
                      >
                        {formatDistanceToNow(new Date(msg.createdAt), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez un message…"
                rows={1}
                disabled={sending}
                className="flex-1 resize-none text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00926B] focus:border-transparent disabled:opacity-50 transition-all"
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="flex-shrink-0 p-2 rounded-xl bg-[#00926B] text-white hover:bg-[#00B383] disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                aria-label="Envoyer"
              >
                {sending ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1 text-center">
              Entrée pour envoyer · Maj+Entrée pour nouvelle ligne
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Root floating chat container (rendered in layout)
// ─────────────────────────────────────────────────────────────

export default function FloatingChatBubble() {
  const { floatingChats, currentUserId, pendingRequestsCount, conversations, openFloatingChat, canShowOnlineFor } =
    useChatContext();
  const [showLauncher, setShowLauncher] = useState(false);

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0);
  const badgeCount = totalUnread + pendingRequestsCount;

  return (
    <>
      {/* Floating windows */}
      {floatingChats.map((chat, i) => (
        <FloatingWindow
          key={chat.conversation.conversationId}
          chat={chat}
          index={i}
          currentUserId={currentUserId}
        />
      ))}

      {/* Launcher FAB */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* Conversation quick-list */}
        {showLauncher && (
          <div
            className="absolute bottom-16 right-0 mb-2 w-72 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-[#00926B] to-[#00B383]">
              <h3 className="text-white font-semibold text-sm">Messages récents</h3>
            </div>
            <div className="max-h-72 overflow-y-auto dark:bg-gray-900">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  Aucune conversation
                </div>
              ) : (
                conversations.slice(0, 8).map((conv) => {
                  const name = getFullName(conv.participant);
                  const initials = getInitials(conv.participant);
                  return (
                    <button
                      key={conv.conversationId}
                      onClick={() => {
                        openFloatingChat(conv);
                        setShowLauncher(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0"
                    >
                      <UserAvatar
                        userId={conv.participant.id}
                        profileImageUrl={conv.participant.profileImage}
                        fullName={name}
                        initials={initials}
                        size={36}
                        showOnline={canShowOnlineFor(conv.participant.id)}
                        isOnline={canShowOnlineFor(conv.participant.id) && conv.participant.isOnline}
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {name}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {conv.lastMessage?.content ?? 'Démarrer la conversation'}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="flex-shrink-0 bg-[#00926B] text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={() => setShowLauncher((v) => !v)}
          className="relative w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95 hover:scale-105"
          style={{
            background: showLauncher
              ? 'linear-gradient(135deg, #00B383 0%, #00926B 100%)'
              : 'linear-gradient(135deg, #00926B 0%, #007a5a 100%)',
          }}
          aria-label="Ouvrir les messages"
        >
          <MessageCircle
            size={24}
            className={`text-white transition-transform duration-300 ${showLauncher ? 'rotate-12' : ''}`}
          />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 ring-2 ring-white dark:ring-gray-900">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </button>
      </div>
    </>
  );
}