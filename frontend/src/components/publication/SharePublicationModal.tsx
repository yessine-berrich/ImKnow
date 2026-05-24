// components/publication/SharePublicationModal.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X, Search, Send, Link2, Check,
  Mail, MessageCircle, Twitter, Linkedin,
} from 'lucide-react';
import { followService, FollowRelationshipDto } from '../../../services/follow.service';
import { chatService } from '../../../services/chat.service';
import Avatar from '../ui/avatar/Avatar';
import { useChatContext } from '../../context/ChatContext';

// ─── WhatsApp icon (not in lucide) ───────────────────────────────────────────
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// ─── Telegram icon ────────────────────────────────────────────────────────────
const TelegramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

interface SharePublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  publication: {
    id: string;
    title: string;
    description?: string;
  };
}

interface FriendWithImage extends FollowRelationshipDto {
  avatarUrl?: string | null;
}

type SendStatus = 'idle' | 'sending' | 'sent' | 'error';

export default function SharePublicationModal({ isOpen, onClose, publication }: SharePublicationModalProps) {
  const { canShowOnlineFor } = useChatContext();
  const [friends, setFriends] = useState<FriendWithImage[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [copied, setCopied] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const publicationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/home?publication=${publication.id}`
    : `/home?publication=${publication.id}`;

  // ── Load friends ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    setFriendsLoading(true);
    followService.getFriends()
      .then((list) => {
        const withImages = list.map((f) => ({
          ...f,
          avatarUrl: f.user.profileImage ?? null,
        }));
        setFriends(withImages);
      })
      .catch(() => setFriends([]))
      .finally(() => setFriendsLoading(false));
  }, [isOpen]);

  // ── Reset when closed ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setSelectedIds(new Set());
      setSearchQuery('');
      setSendStatus('idle');
      setCopied(false);
    } else {
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // ── Keyboard close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const filteredFriends = friends.filter((f) =>
    f.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const toggleFriend = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // ── Send to selected friends ────────────────────────────────────────────────
  const handleSend = async () => {
    if (selectedIds.size === 0 || sendStatus === 'sending') return;
    setSendStatus('sending');
    const message = `📄 *${publication.title}*\n${publicationUrl}`;
    try {
      await Promise.all(
        [...selectedIds].map((id) => chatService.sendMessage(id, message)),
      );
      setSendStatus('sent');
      setTimeout(() => {
        setSendStatus('idle');
        setSelectedIds(new Set());
      }, 2000);
    } catch {
      setSendStatus('error');
      setTimeout(() => setSendStatus('idle'), 2500);
    }
  };

  // ── Copy link ───────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* ignore */
    }
  };

  // ── External share links ────────────────────────────────────────────────────
  const encoded = encodeURIComponent(publicationUrl);
  const encodedTitle = encodeURIComponent(publication.title);

  const externalLinks = [
    {
      label: 'WhatsApp',
      icon: <WhatsAppIcon />,
      color: 'hover:bg-[#25D366]/10 hover:text-[#25D366] hover:border-[#25D366]/30',
      url: `https://wa.me/?text=${encodeURIComponent(`${publication.title}\n${publicationUrl}`)}`,
    },
    {
      label: 'Telegram',
      icon: <TelegramIcon />,
      color: 'hover:bg-[#2CA5E0]/10 hover:text-[#2CA5E0] hover:border-[#2CA5E0]/30',
      url: `https://t.me/share/url?url=${encoded}&text=${encodedTitle}`,
    },
    {
      label: 'Email',
      icon: <Mail size={20} />,
      color: 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-500',
      url: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${publication.title}\n\n${publication.description ?? ''}\n\n${publicationUrl}`)}`,
    },
    {
      label: 'X / Twitter',
      icon: <Twitter size={20} />,
      color: 'hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white hover:border-black/20 dark:hover:border-white/20',
      url: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`,
    },
    {
      label: 'LinkedIn',
      icon: <Linkedin size={20} />,
      color: 'hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] hover:border-[#0A66C2]/30',
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
    },
    {
      label: 'SMS',
      icon: <MessageCircle size={20} />,
      color: 'hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 hover:border-green-200 dark:hover:border-green-700',
      url: `sms:?&body=${encodeURIComponent(`${publication.title}\n${publicationUrl}`)}`,
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Partager l'publication</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{publication.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── Copy link ────────────────────────────────────────────────────── */}
          <div className="px-5 pt-4 pb-3">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Lien de l'publication</p>
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
              <span className="flex-1 text-xs text-gray-500 dark:text-gray-400 truncate font-mono">{publicationUrl}</span>
              <button
                onClick={handleCopy}
                className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                  copied
                    ? 'bg-[#00926B] text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-[#00926B]/10 hover:text-[#00926B] border border-gray-200 dark:border-gray-600'
                }`}
              >
                {copied ? <Check size={12} /> : <Link2 size={12} />}
                {copied ? 'Copié !' : 'Copier'}
              </button>
            </div>
          </div>

          {/* ── External platforms ───────────────────────────────────────────── */}
          <div className="px-5 pb-4">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Partager via</p>
            <div className="grid grid-cols-3 gap-2">
              {externalLinks.map(({ label, icon, color, url }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-transparent text-gray-500 dark:text-gray-400 text-xs font-medium transition-all ${color}`}
                >
                  {icon}
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* ── Share with friends ───────────────────────────────────────────── */}
          <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-800 pt-4">
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Envoyer à des collègues</p>

            {/* Search */}
            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un collègue…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00926B] transition-all"
              />
            </div>

            {/* Friends list */}
            {friendsLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-[#00926B] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-5">
                {searchQuery ? 'Aucun collègue trouvé' : 'Vous n\'avez pas encore de collègues'}
              </p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {filteredFriends.map((f) => {
                  const isSelected = selectedIds.has(f.user.id);
                  return (
                    <button
                      key={f.user.id}
                      onClick={() => toggleFriend(f.user.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left ${
                        isSelected
                          ? 'bg-[#00926B]/10 dark:bg-[#00926B]/20 border border-[#00926B]/30'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar
                          src={f.avatarUrl || ''}
                          alt={f.user.fullName}
                          size="small"
                          isOnline={canShowOnlineFor(f.user.id) && f.isOnline}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{f.user.fullName}</p>
                        {f.user.department && (
                          <p className="text-xs text-gray-400 truncate">{f.user.department}</p>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? 'bg-[#00926B] border-[#00926B]'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer send bar — only shown when friends selected ─────────────── */}
        {selectedIds.size > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
            <button
              onClick={handleSend}
              disabled={sendStatus === 'sending' || sendStatus === 'sent'}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                sendStatus === 'sent'
                  ? 'bg-emerald-500 text-white'
                  : sendStatus === 'error'
                  ? 'bg-red-500 text-white'
                  : sendStatus === 'sending'
                  ? 'bg-[#00926B]/70 text-white cursor-not-allowed'
                  : 'bg-[#00926B] hover:bg-[#00B383] text-white active:scale-[0.98]'
              }`}
            >
              {sendStatus === 'sending' && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {sendStatus === 'sent' && <Check size={16} />}
              {sendStatus === 'error' && <X size={16} />}
              {sendStatus === 'idle' && <Send size={15} />}
              <span>
                {sendStatus === 'sent'
                  ? 'Envoyé !'
                  : sendStatus === 'error'
                  ? 'Erreur — réessayer'
                  : sendStatus === 'sending'
                  ? 'Envoi…'
                  : selectedIds.size === 1
                  ? 'Envoyer à 1 collègue'
                  : `Envoyer à ${selectedIds.size} collègues`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
