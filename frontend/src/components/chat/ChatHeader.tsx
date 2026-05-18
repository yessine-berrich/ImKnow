// components/chat/ChatHeader.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import UserAvatar from './UserAvatar';
import { Conversation } from '../../../services/chat.service';
import { getFullName, getInitials } from '../../utils/chat.utils';
import { userService, User } from '../../../services/user.service';
import { Search, MoreVertical, Trash2, ShieldOff, Shield, Pin, PinOff, BellOff, Bell } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

interface ChatHeaderProps {
  conversation: Conversation;
  onSearchClick: () => void;
  isBlocked: boolean;
  canChat: boolean;
  onDeleteConversation: () => void;
  onToggleBlock: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
}


const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversation,
  onSearchClick,
  isBlocked,
  canChat,
  onDeleteConversation,
  onToggleBlock,
  onTogglePin,
  onToggleMute,
}) => {
  const { t, language } = useTranslation();

  const formatLastSeen = (lastSeenAt: Date | string | null | undefined): string => {
    if (!lastSeenAt) return t('chat.last_seen_unknown');
    try {
      const lastSeen = new Date(lastSeenAt);
      if (isNaN(lastSeen.getTime())) return t('chat.last_seen_unknown');
      const now = new Date();
      const diffInMs = now.getTime() - lastSeen.getTime();
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
      if (diffInMinutes < 1) return t('chat.seen_just_now');
      if (diffInMinutes < 60) return diffInMinutes === 1
        ? t('chat.seen_minutes_one', { count: diffInMinutes })
        : t('chat.seen_minutes_plural', { count: diffInMinutes });
      if (diffInHours < 24) return diffInHours === 1
        ? t('chat.seen_hours_one', { count: diffInHours })
        : t('chat.seen_hours_plural', { count: diffInHours });
      if (diffInDays === 1) return t('chat.seen_yesterday');
      if (diffInDays < 7) return t('chat.seen_days', { count: diffInDays });
      const dateLocale = language === 'fr' ? 'fr-FR' : 'en-US';
      return t('chat.seen_on', { date: lastSeen.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' }) });
    } catch {
      return t('chat.last_seen_unknown');
    }
  };

  const otherUser = conversation?.participant;
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!otherUser?.id) return;
    userService.findOne(otherUser.id)
      .then(setUserDetails)
      .catch(() => {});
  }, [otherUser?.id]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!otherUser) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full animate-pulse" />
          <div className="space-y-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse" />
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-20 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const displayName = otherUser.fullName || getFullName(otherUser);
  const initials = getInitials(otherUser);
  const isUserOnline = otherUser.isOnline === true;
  const profileUrl = `/profile/${otherUser.id}`;
  const lastSeenAt = userDetails?.lastSeenAt ?? otherUser.lastSeenAt;

  return (
    <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between">
        {/* Avatar + name */}
        <div className="flex items-center space-x-3">
          <Link href={profileUrl}>
            <UserAvatar
              userId={otherUser.id}
              profileImageUrl={otherUser.profileImage}
              fullName={displayName}
              initials={initials}
              size={40}
              showOnline={canChat}
              isOnline={canChat && isUserOnline}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>
          <div>
            <Link href={profileUrl} className="hover:underline hover:text-[#168F6F] transition-colors">
              <h2 className="font-semibold text-gray-900 dark:text-white">{displayName}</h2>
            </Link>
            {isBlocked ? (
              <p className="text-xs text-red-500">{t('chat.user_blocked_label')}</p>
            ) : canChat && isUserOnline ? (
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {t('chat.online')}
              </p>
            ) : canChat ? (
              <p className="text-xs text-gray-400">{formatLastSeen(lastSeenAt)}</p>
            ) : null}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSearchClick}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={t('chat.search_title')}
          >
            <Search size={18} />
          </button>

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setMenuOpen(v => !v); setConfirmDelete(false); }}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={t('chat.more_options')}
            >
              <MoreVertical size={18} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-1 overflow-hidden">
                {/* Pin / Unpin */}
                <button
                  onClick={() => { onTogglePin(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {conversation.isPinned ? <PinOff size={15} /> : <Pin size={15} />}
                  {conversation.isPinned ? t('chat.unpin') : t('chat.pin')}
                </button>

                {/* Mute / Unmute */}
                <button
                  onClick={() => { onToggleMute(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {conversation.isMuted ? <Bell size={15} /> : <BellOff size={15} />}
                  {conversation.isMuted ? t('chat.unmute') : t('chat.mute')}
                </button>

                <div className="h-px bg-gray-100 dark:bg-gray-700 mx-2" />

                {/* Block / Unblock */}
                <button
                  onClick={() => { onToggleBlock(); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                    ${isBlocked
                      ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                    }`}
                >
                  {isBlocked ? <ShieldOff size={15} /> : <Shield size={15} />}
                  {isBlocked ? t('chat.unblock') : t('chat.block')}
                </button>

                <div className="h-px bg-gray-100 dark:bg-gray-700 mx-2" />

                {/* Delete conversation */}
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={15} />
                    {t('chat.delete_conv_action')}
                  </button>
                ) : (
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                      {t('chat.delete_confirm_msg')}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onDeleteConversation(); setMenuOpen(false); setConfirmDelete(false); }}
                        className="flex-1 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                      >
                        {t('chat.delete')}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold transition-colors"
                      >
                        {t('chat.cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
