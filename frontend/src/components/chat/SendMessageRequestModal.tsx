// components/chat/SendMessageRequestModal.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';
import { chatService } from '../../../services/chat.service';
import { getFullName, getInitials } from '../../utils/chat.utils';
import Avatar from '../ui/avatar/Avatar';
import { useTranslation } from '../../context/LanguageContext';
import { translateError } from '@/utils/errorTranslation';

interface SendMessageRequestModalProps {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    profileImage?: string;
    department?: string;
    isOnline?: boolean;
    lastSeenAt?: Date | string | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function SendMessageRequestModal({
  user,
  onClose,
  onSuccess,
}: SendMessageRequestModalProps) {
  const [introMessage, setIntroMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const { t } = useTranslation();
  const displayName = getFullName(user);
  const initials = getInitials(user);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Bloquer le scroll du body quand le modal est ouvert
  useEffect(() => {
    if (status !== 'sent') {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [status]);

  // Fetch profile image if needed
  useEffect(() => {
    if (user.profileImage) {
      const imageUrl = user.profileImage.startsWith('http') 
        ? user.profileImage 
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${user.profileImage}`;
      setProfileImageUrl(imageUrl);
    }
  }, [user.profileImage]);

  const handleSend = async () => {
    setStatus('sending');
    setErrorMsg('');
    try {
      await chatService.sendMessageRequest(user.id, introMessage.trim() || undefined);
      setStatus('sent');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(
        translateError(err instanceof Error ? err.message : undefined, t),
      );
    }
  };

  // Déterminer le statut en ligne (forcer à false si undefined)
  const isUserOnline = user.isOnline === true;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Overlay avec flou - couvre tout l'écran et gère la fermeture */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-fadeIn cursor-pointer"
        onClick={onClose}
      />

      {/* Modal content - empêche la propagation du clic */}
      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-scaleIn"
        role="dialog"
        aria-modal="true"
        aria-label={`Envoyer une demande à ${displayName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 relative">
              <Avatar
                src={profileImageUrl || user.profileImage || ''}
                alt={displayName}
                isOnline={false}
              />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Envoyer une demande
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                à <span className="font-medium text-gray-700 dark:text-gray-300">{displayName}</span>
                {user.department ? ` · ${user.department}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {status === 'sent' ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                <Send size={24} className="text-[#168F6F]" />
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Demande envoyée !</p>
              <p className="text-sm text-gray-500 mt-1">
                {displayName} recevra votre demande de message.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl mb-4">
                <MessageSquare size={14} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Vous n'êtes pas encore amis avec {user.firstName}. Envoyez-lui une demande pour pouvoir communiquer.
                </p>
              </div>

              <label className="block mb-1.5">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Message d'introduction{' '}
                  <span className="text-gray-400 font-normal">(facultatif)</span>
                </span>
              </label>
              <textarea
                ref={textareaRef}
                value={introMessage}
                onChange={(e) => setIntroMessage(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder={`Présentez-vous à ${user.firstName}…`}
                disabled={status === 'sending'}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#168F6F] focus:border-transparent resize-none disabled:opacity-50 transition-all"
              />
              <div className="flex justify-between items-center mt-1 mb-4">
                <span className="text-xs text-gray-400">
                  Augmente vos chances d'acceptation
                </span>
                <span className="text-xs text-gray-400">{introMessage.length}/300</span>
              </div>

              {status === 'error' && (
                <div className="mb-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={status === 'sending'}
                  className="flex-1 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSend}
                  disabled={status === 'sending'}
                  className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-[#168F6F] hover:bg-[#0F6B54] text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95"
                >
                  {status === 'sending' ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Envoi…
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Envoyer la demande
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}