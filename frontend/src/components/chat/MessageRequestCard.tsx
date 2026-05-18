// components/chat/MessageRequestCard.tsx
'use client';

import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { MessageRequestResponseDto } from '../../../services/chat.service';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import Avatar from '../ui/avatar/Avatar';
import { useTranslation } from '../../context/LanguageContext';

interface MessageRequestCardProps {
  request: MessageRequestResponseDto;
  onAccept: (requestId: number) => Promise<void>;
  onDecline: (requestId: number) => Promise<void>;
}

export default function MessageRequestCard({
  request,
  onAccept,
  onDecline,
}: MessageRequestCardProps) {
  const [status, setStatus] = useState<'idle' | 'accepting' | 'declining' | 'done'>('idle');
  const { t, language } = useTranslation();
  const dateLocale = language === 'fr' ? fr : enUS;

  // ✅ MessageRequestResponseDto has: senderId, senderName, senderProfileImage, introMessage
  const initials = request.senderName
    .split(' ')
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'U';

  const handleAccept = async () => {
    setStatus('accepting');
    try {
      await onAccept(request.id);
      setStatus('done');
    } catch {
      setStatus('idle');
    }
  };

  const handleDecline = async () => {
    setStatus('declining');
    try {
      await onDecline(request.id);
      setStatus('done');
    } catch {
      setStatus('idle');
    }
  };

  if (status === 'done') return null;
  const isLoading = status === 'accepting' || status === 'declining';

  return (
    <div className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 transition-all duration-200 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700">
      {/* Accent line */}
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-r-full bg-gradient-to-b from-[#00926B] to-[#00B383] opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <Avatar
            src={request.senderProfileImage}
            alt={request.senderName || initials}
            size="medium"
            className="!w-11 !h-11 ring-2 ring-gray-100 dark:ring-gray-800"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
              {request.senderName}
            </p>
            <span className="text-[11px] text-gray-400 flex-shrink-0">
              {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true, locale: dateLocale })}
            </span>
          </div>

          {/* Intro message preview */}
          {request.introMessage ? (
            <div className="flex items-start gap-1.5 mb-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">
                "{request.introMessage}"
              </p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              {t('chat.wants_to_msg')}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#00926B] hover:bg-[#00B383] text-white text-xs font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {status === 'accepting' ? (
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <Check size={12} />
              )}
              {t('chat.accept')}
            </button>
            <button
              onClick={handleDecline}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 text-xs font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 border border-transparent hover:border-red-200 dark:hover:border-red-800"
            >
              {status === 'declining' ? (
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <X size={12} />
              )}
              {t('chat.decline')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
