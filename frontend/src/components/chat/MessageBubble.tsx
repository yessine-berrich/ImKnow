'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage } from '../../../services/chat.service';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import UserAvatar from './UserAvatar';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  isConsecutive: boolean;
  senderName?: string;
  senderUserId?: number;
  senderProfileImageUrl?: string;
  onDelete: (messageId: number) => void;
  onEdit: (messageId: number, content: string) => void;
  onAddReaction: (messageId: number, emoji: string) => void;
  onRemoveReaction: (messageId: number, emoji: string) => void;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;

/** Derive two-letter initials from a display name or fall back to "?" */
function initialsFromName(name?: string): string {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Transforme le texte pour rendre les URLs cliquables
 * Détecte les liens http://, https://, et les URLs sans protocole (www.)
 */
const renderTextWithLinks = (text: string) => {
  if (!text) return null;
  
  // Regex pour détecter les URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    // Ajouter le texte avant le lien
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    
    // Ajouter le lien cliquable
    const url = match[0];
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    
    parts.push(
      <a
        key={match.index}
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="underline hover:opacity-80 transition-opacity break-all"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Ajouter le reste du texte
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  
  return parts.length > 0 ? parts : text;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar,
  isConsecutive,
  senderName,
  senderUserId,
  senderProfileImageUrl,
  onDelete,
  onEdit,
  onAddReaction,
  onRemoveReaction,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) setCurrentUserId(Number(userId));
  }, []);

  // Keep editContent in sync if the message is updated externally
  useEffect(() => {
    setEditContent(message.content);
  }, [message.content]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  const handleEdit = useCallback(() => {
    const trimmed = editContent.trim();
    if (trimmed && trimmed !== message.content) {
      onEdit(message.id, trimmed);
    }
    setIsEditing(false);
  }, [editContent, message.content, message.id, onEdit]);

  const handleReaction = useCallback(
    (emoji: string) => {
      if (!currentUserId) return;
      const hasReacted = message.reactions?.[emoji]?.includes(currentUserId);
      if (hasReacted) {
        onRemoveReaction(message.id, emoji);
      } else {
        onAddReaction(message.id, emoji);
      }
      setShowEmojiPicker(false);
    },
    [currentUserId, message.id, message.reactions, onAddReaction, onRemoveReaction],
  );

  const hasUserReacted = (emoji: string): boolean =>
    message.reactions?.[emoji]?.includes(currentUserId ?? -1) ?? false;

  const getFileIcon = (): string => {
    if (message.type === 'image') return '🖼️';
    if (message.mimetype?.includes('pdf')) return '📄';
    if (message.mimetype?.includes('word')) return '📝';
    if (message.mimetype?.includes('text')) return '📃';
    return '📎';
  };

  const getDisplayFilename = (): string => {
    const name = message.filename ?? 'Fichier';
    return name.length > 30 ? `${name.substring(0, 27)}…` : name;
  };

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <>
            <div className="mt-1">
              {imgError ? (
                <a
                  href={message.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm underline opacity-80 hover:opacity-100"
                >
                  🖼️ Voir l'image
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={message.content}
                  alt="Image"
                  className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity max-w-[250px] max-h-[250px] w-auto h-auto object-cover"
                  onError={() => setImgError(true)}
                  onClick={() => setLightboxOpen(true)}
                  loading="lazy"
                />
              )}
            </div>

            {/* Lightbox */}
            {lightboxOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={() => setLightboxOpen(false)}
              >
                <button
                  className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors"
                  onClick={() => setLightboxOpen(false)}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                <a
                  href={message.content}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-4 right-4 text-white bg-black/40 hover:bg-black/60 rounded-lg px-3 py-1.5 text-xs transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  Ouvrir l'original
                </a>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.content}
                  alt="Image"
                  className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </>
        );

      case 'file':
        return (
          <div className="mt-1">
            <a
              href={message.content}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-[#00926B] hover:text-[#00B383] dark:text-[#00B383] dark:hover:text-[#00926B] transition-colors"
            >
              <span className="text-lg">{getFileIcon()}</span>
              <span className="text-sm break-all">{getDisplayFilename()}</span>
            </a>
          </div>
        );

      default:
        return (
          <p className="break-words whitespace-pre-wrap text-sm">
            {renderTextWithLinks(message.content)}
          </p>
        );
    }
  };

  const reactions = Object.entries(message.reactions ?? {}).filter(
    ([, ids]) => ids.length > 0,
  );

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group relative`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowDeleteConfirm(false);
      }}
    >
      <div className={`flex ${isOwn ? 'flex-row-reverse' : 'flex-row'} max-w-[75%] gap-2`}>
        {/* Avatar — first message in a sequence from the other user */}
        {!isOwn && (
          <div className="flex-shrink-0 self-end" style={{ width: 32 }}>
            {showAvatar && !isConsecutive && (
              <UserAvatar
                userId={senderUserId}
                profileImageUrl={senderProfileImageUrl}
                fullName={senderName || ''}
                initials={initialsFromName(senderName)}
                size={32}
              />
            )}
          </div>
        )}

        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} flex-1`}>
          <div className="relative">
            {/* Bubble */}
            <div
              className={`relative rounded-2xl px-3 py-2 ${
                isOwn
                  ? 'bg-[#00926B] text-white rounded-br-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
              } ${isConsecutive ? (isOwn ? 'rounded-tr-sm' : 'rounded-tl-sm') : ''}`}
            >
              {isEditing ? (
                <div className="space-y-2 min-w-[200px]">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full px-2 py-1 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#00926B]"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleEdit();
                      }
                      if (e.key === 'Escape') setIsEditing(false);
                    }}
                  />
                  <div className="flex space-x-2 justify-end">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-xs px-2 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleEdit}
                      className="text-xs px-2 py-1 bg-[#00926B] text-white rounded-md hover:bg-[#00B383] transition-colors"
                    >
                      Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {renderContent()}

                  {/* Timestamp + status */}
                  <div
                    className={`flex items-center gap-1 mt-1 text-xs ${
                      isOwn ? 'text-green-100' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <span>
                      {formatDistanceToNow(new Date(message.createdAt), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                    {message.isEdited && <span>(modifié)</span>}
                    {isOwn && (
                      <span className="ml-1">{message.isRead ? '✓✓' : '✓'}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ✅ CORRIGÉ - Inline action toolbar avec meilleur espacement */}
            {showActions && !isEditing && (
              <div
                className={`absolute top-1/2 -translate-y-1/2 flex gap-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-1.5 z-10 ${
                  isOwn ? '-left-28' : '-right-28'
                }`}
              >
                {/* Emoji reaction picker */}
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#00926B] dark:text-gray-400 dark:hover:text-[#00B383] rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Ajouter une réaction"
                  >
                    <span className="text-base leading-none">😊</span>
                  </button>

                  {/* ✅ CORRIGÉ - Sélecteur d'émojis avec meilleur espacement */}
                  {showEmojiPicker && (
                    <div
                      className={`absolute bottom-full mb-2 z-20 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 min-w-[180px] ${
                        isOwn ? 'right-0' : 'left-0'
                      }`}
                    >
                      <div className="grid grid-cols-6 gap-1.5">
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(emoji)}
                            className={`w-8 h-8 flex items-center justify-center text-xl leading-none hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${
                              hasUserReacted(emoji) ? 'bg-[#00926B]/10' : ''
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit & delete — own messages only */}
                {isOwn && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#00926B] dark:text-gray-400 dark:hover:text-[#00B383] rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Modifier"
                    >
                      <span className="text-sm leading-none">✏️</span>
                    </button>

                    {/* Two-step delete: first click shows confirmation, second confirms */}
                    {showDeleteConfirm ? (
                      <button
                        onClick={() => {
                          onDelete(message.id);
                          setShowDeleteConfirm(false);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-full transition-colors text-sm font-semibold leading-none"
                        title="Confirmer la suppression"
                      >
                        ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Supprimer"
                      >
                        <span className="text-sm leading-none">🗑️</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* ✅ CORRIGÉ - Reactions row avec meilleur espacement */}
          {reactions.length > 0 && !isEditing && (
            <div
              className={`flex flex-wrap gap-1.5 mt-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              {reactions.map(([emoji, userIds]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 text-sm rounded-full border transition-all hover:scale-105 ${
                    userIds.includes(currentUserId ?? -1)
                      ? 'bg-[#00926B]/10 border-[#00926B] text-[#00926B] dark:bg-[#00926B]/20 dark:border-[#00B383] dark:text-[#00B383]'
                      : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  <span className="text-xs font-medium">{userIds.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;