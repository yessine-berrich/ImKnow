// components/header/NotificationDropdown.tsx
"use client";

import Link from "next/link";
import { toast } from '@/components/modals/ToastContainer';
import React, { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { fetchCurrentUser, getToken } from "../../../services/auth.service";
import Avatar from "../ui/avatar/Avatar";
import { usePublicationModal } from "@/context/PublicationModalContext";
import { useTranslation } from "@/context/LanguageContext";

const enum NotificationType {
  MENTION = 'mention',
  REPLY = 'reply',
  NEW_COMMENT = 'new_comment',
  SYSTEM_ERROR = 'system_error',
  PUBLICATION_PUBLISHED = 'publication_published',
  PUBLICATION_PENDING_MODERATION = 'publication_pending_moderation',
  PUBLICATION_REJECTED = 'publication_rejected',
  SYSTEM_INFO = 'system_info',
  COMMENT_LIKED = 'comment_liked',
  PUBLICATION_LIKED = 'publication_liked',
  PUBLICATION_BOOKMARKED = 'publication_bookmarked',
  USER_ROLE_CHANGED = 'user_role_changed',
  NEW_FOLLOWER = 'new_follower',
  ACCOUNT_ACTIVATED = 'account_activated',
  ACCOUNT_DEACTIVATED = 'account_deactivated',
}

interface Notification {
  id: number;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  message?: string;
  sender?: {
    id: number;
    name: string;
    avatar?: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
  data?: {
    commentId?: number;
    publicationId?: number;
    parentCommentId?: number;
    followerId?: number;
    reason?: string;
  };
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [loading, setLoading] = useState(true);

  const { openPublicationModal } = usePublicationModal();
  const { t, language } = useTranslation();

  const token = getToken() ?? "";
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") || "1" : "1";

  // Nouvelle fonction pour gérer le clic sur une notification
  const handleNotificationClick = async (notif: Notification) => {
    // Marquer comme lue si nécessaire
    if (!notif.isRead) {
      try {
        const res = await fetch(`http://localhost:3000/api/notifications/${notif.id}/read`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (res.ok) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error("Erreur mark as read:", err);
      }
    }

    // Traiter selon le type de notification
    if (notif.type === NotificationType.NEW_FOLLOWER && notif.data?.followerId) {
      // Navigation vers le profil
      window.location.href = `/profile/${notif.data.followerId}`;
    } else if (notif.data?.publicationId) {
      // Ouvrir le modal de l'publication
      await handleOpenPublicationModal(notif.data.publicationId, notif.data.commentId);
    } else {
      // Si pas d'publication, juste fermer le dropdown
      closeDropdown();
    }
  };

  useEffect(() => {
    fetchCurrentUser()
      .then(() => setLoading(false))
      .catch((error) => {
        console.error("Error fetching user:", error);
        setLoading(false);
      });
  }, []);

  // Charger les notifications initiales
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          "http://localhost:3000/api/notifications?limit=20&unreadOnly=false",
          {
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

        const data = await res.json();
        setNotifications(data || []);
        const unread = data.filter((n: Notification) => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error("Erreur chargement notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [token]);

  // Connexion WebSocket
  useEffect(() => {
    if (!userId || !token) return;

    const newSocket = io("http://localhost:3000/notifications", {
      query: { userId: userId.toString() },
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    newSocket.on("new_notification", (newNotif: Notification) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [userId, token]);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const closeDropdown = () => setIsOpen(false);

  // Fonction pour obtenir le libellé du type de notification
  const getNotificationTypeLabel = (type: NotificationType): string => {
    switch (type) {
      case NotificationType.NEW_COMMENT:              return t('notifications.type_comment');
      case NotificationType.REPLY:                    return t('notifications.type_reply');
      case NotificationType.MENTION:                  return t('notifications.type_mention');
      case NotificationType.NEW_FOLLOWER:             return t('notifications.type_new_follower');
      case NotificationType.PUBLICATION_PUBLISHED:        return t('notifications.type_publication_published');
      case NotificationType.PUBLICATION_PENDING_MODERATION: return t('notifications.type_pending_moderation');
      case NotificationType.PUBLICATION_REJECTED:         return t('notifications.type_publication_rejected');
      case NotificationType.PUBLICATION_LIKED:            return t('notifications.type_publication_liked');
      case NotificationType.COMMENT_LIKED:            return t('notifications.type_comment_liked');
      case NotificationType.PUBLICATION_BOOKMARKED:       return t('notifications.type_bookmarked');
      case NotificationType.SYSTEM_INFO:              return t('notifications.type_system_info');
      case NotificationType.SYSTEM_ERROR:             return t('notifications.type_system_error');
      case NotificationType.USER_ROLE_CHANGED:        return t('notifications.type_role_changed');
      case NotificationType.ACCOUNT_ACTIVATED:        return t('notifications.type_account_activated');
      case NotificationType.ACCOUNT_DEACTIVATED:      return t('notifications.type_account_deactivated');
      default:                                        return t('notifications.type_default');
    }
  };

  // Fonction pour obtenir le message par défaut selon le type
  const getDefaultMessage = (type: NotificationType, senderName: string): string => {
    switch (type) {
      case NotificationType.NEW_COMMENT:         return t('notifications.msg_new_comment', { name: senderName });
      case NotificationType.REPLY:               return t('notifications.msg_reply', { name: senderName });
      case NotificationType.MENTION:             return t('notifications.msg_mention', { name: senderName });
      case NotificationType.NEW_FOLLOWER:        return t('notifications.msg_new_follower', { name: senderName });
      case NotificationType.PUBLICATION_LIKED:       return t('notifications.msg_publication_liked', { name: senderName });
      case NotificationType.COMMENT_LIKED:       return t('notifications.msg_comment_liked', { name: senderName });
      case NotificationType.PUBLICATION_BOOKMARKED:  return t('notifications.msg_bookmarked', { name: senderName });
      case NotificationType.PUBLICATION_PUBLISHED:   return t('notifications.msg_publication_published');
      case NotificationType.PUBLICATION_REJECTED:    return t('notifications.msg_publication_rejected');
      case NotificationType.ACCOUNT_ACTIVATED:   return t('notifications.msg_account_activated');
      case NotificationType.ACCOUNT_DEACTIVATED: return t('notifications.msg_account_deactivated');
      default:                                   return t('notifications.msg_default', { name: senderName });
    }
  };

  const handleOpenPublicationModal = async (publicationId: number, commentId?: number) => {
    try {
      const token = getToken();

      const response = await fetch(`http://localhost:3000/api/publications/${publicationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const publicationData = await response.json();

      const formattedPublication: any = {
        id: publicationData.id,
        title: publicationData.title,
        content: publicationData.content,
        description: publicationData.description || publicationData.content?.substring(0, 150) + '...' || '',

        author: {
          id: publicationData.author?.id || 0,
          name: typeof publicationData.author?.name === 'string'
            ? publicationData.author.name
            : `${publicationData.author?.firstName || ''} ${publicationData.author?.lastName || ''}`.trim() || 'Utilisateur',
          initials: ((publicationData.author?.firstName?.charAt(0) || '') +
            (publicationData.author?.lastName?.charAt(0) || '')).toUpperCase() || 'U',
          department: typeof publicationData.author?.department === 'string'
            ? publicationData.author.department
            : publicationData.author?.role || 'Membre',
          avatar: publicationData.author?.avatar || null,
        },

        category: {
          id: publicationData.category?.id || 0,
          name: typeof publicationData.category?.name === 'string'
            ? publicationData.category.name
            : 'Général',
          slug: typeof publicationData.category?.slug === 'string'
            ? publicationData.category.slug
            : 'general',
        },

        tags: Array.isArray(publicationData.tags)
          ? publicationData.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name || String(tag))
          : [],

        isFeatured: false,
        publishedAt: publicationData.createdAt || publicationData.publishedAt || new Date().toISOString(),
        updatedAt: publicationData.updatedAt || null,
        status: publicationData.status || 'published',

        stats: {
          likes: typeof publicationData.stats?.likes === 'number'
            ? publicationData.stats.likes
            : publicationData.likes?.length || 0,
          comments: typeof publicationData.stats?.comments === 'number'
            ? publicationData.stats.comments
            : publicationData.comments?.length || 0,
          views: typeof publicationData.stats?.views === 'number'
            ? publicationData.stats.views
            : publicationData.viewsCount || 0,
        },

        isLiked: !!publicationData.isLiked,
        isBookmarked: !!publicationData.isBookmarked,
      };

      // Utiliser le contexte pour ouvrir le modal
      openPublicationModal(formattedPublication, commentId);
      closeDropdown();
    } catch (error) {
      console.error('❌ Erreur chargement publication:', error);
      toast.error(t('notifications.err_load_publication'));
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return t('notifications.just_now');
    if (minutes < 60) return t('notifications.minutes_ago', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.hours_ago', { count: hours });
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
  };

  const getNotificationAvatar = (sender: Notification['sender']): string | null => {
    if (!sender) return '/images/admin.avif';
    return sender.profileImage || sender.avatar || '/images/profile.jpg';
  };

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleOpen}
      >
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0.5 z-10 flex h-2 w-2">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
            <span className="relative inline-flex w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
          </span>
        )}

        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {t('notifications.title')}
          </h5>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("http://localhost:3000/api/notifications/mark-all-read", {
                      method: "PATCH",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                      },
                    });

                    if (res.ok) {
                      setUnreadCount(0);
                      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
                    }
                  } catch (err) {
                    console.error("Erreur mark all read:", err);
                  }
                }}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                title={t('notifications.mark_all_read_title')}
              >
                {t('notifications.mark_all_read')}
              </button>
            )}
            <button onClick={closeDropdown} className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
              <svg className="fill-current" width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500 dark:text-gray-400">{t('notifications.loading')}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-gray-500 dark:text-gray-400">{t('notifications.empty')}</p>
          </div>
        ) : (
          <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
            {notifications.map((notif) => {
              const senderName = notif.sender?.firstName && notif.sender?.lastName
                ? `${notif.sender.firstName} ${notif.sender.lastName}`
                : notif.sender?.name || t('notifications.default_sender');

              return (
                <li key={notif.id}>
                  <DropdownItem
                    tag="button"
                    onItemClick={() => handleNotificationClick(notif)}
                    className={`flex gap-3 rounded-lg border-b border-gray-100 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${!notif.isRead ? "bg-orange-50 dark:bg-orange-950/20" : ""
                      }`}
                  >
                    <span className="relative block w-10 h-10 rounded-full">
                      <Avatar
                        src={getNotificationAvatar(notif.sender)}
                        alt={senderName}
                        size="medium"
                        className="!w-10 !h-10"
                      />
                      {!notif.isRead && (
                        <span className="absolute bottom-0 right-0 z-10 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-white"></span>
                      )}
                    </span>

                    <div className="flex-1">
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {notif.message || getDefaultMessage(notif.type, senderName)}
                      </p>

                      {/* Afficher la raison du rejet si nécessaire */}
                      {notif.type === NotificationType.PUBLICATION_REJECTED && notif.data?.reason && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                          {t('notifications.reason_label', { reason: notif.data.reason })}
                        </p>
                      )}

                      {/* Afficher l'info de modération */}
                      {notif.type === NotificationType.PUBLICATION_PENDING_MODERATION && (
                        <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                          {t('notifications.pending_moderation_info')}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {/* Type badge with color coding and icon */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${notif.type === NotificationType.NEW_COMMENT ||
                          notif.type === NotificationType.REPLY
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : notif.type === NotificationType.MENTION
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : notif.type === NotificationType.NEW_FOLLOWER
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : notif.type === NotificationType.PUBLICATION_LIKED ||
                                notif.type === NotificationType.COMMENT_LIKED
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : notif.type === NotificationType.PUBLICATION_BOOKMARKED
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : notif.type === NotificationType.PUBLICATION_PUBLISHED
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                    : notif.type === NotificationType.PUBLICATION_REJECTED
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : notif.type === NotificationType.PUBLICATION_PENDING_MODERATION
                                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                        : notif.type === NotificationType.SYSTEM_ERROR
                                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                          : notif.type === NotificationType.SYSTEM_INFO
                                            ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                                            : notif.type === NotificationType.ACCOUNT_ACTIVATED
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                              : notif.type === NotificationType.ACCOUNT_DEACTIVATED
                                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                          {/* Icon based on type */}
                          {notif.type === NotificationType.NEW_COMMENT ||
                            notif.type === NotificationType.REPLY ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                            </svg>
                          ) : notif.type === NotificationType.MENTION ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5.5 16a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 16h-8z" />
                            </svg>
                          ) : notif.type === NotificationType.NEW_FOLLOWER ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                            </svg>
                          ) : notif.type === NotificationType.PUBLICATION_LIKED ||
                            notif.type === NotificationType.COMMENT_LIKED ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            </svg>
                          ) : notif.type === NotificationType.PUBLICATION_BOOKMARKED ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                            </svg>
                          ) : notif.type === NotificationType.PUBLICATION_PUBLISHED ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : notif.type === NotificationType.PUBLICATION_REJECTED ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          ) : notif.type === NotificationType.PUBLICATION_PENDING_MODERATION ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          ) : notif.type === NotificationType.SYSTEM_ERROR ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : notif.type === NotificationType.ACCOUNT_ACTIVATED ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : notif.type === NotificationType.ACCOUNT_DEACTIVATED ? (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524L13.477 14.89zm1.414-1.414L6.524 5.11A6 6 0 0114.89 13.477zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                            </svg>
                          )}
                          {getNotificationTypeLabel(notif.type)}
                        </span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span>{formatDate(notif.createdAt)}</span>
                      </div>
                    </div>
                  </DropdownItem>
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href="/notifications"
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          onClick={closeDropdown}
        >
          {t('notifications.see_all')}
        </Link>
      </Dropdown>
    </div>
  );
}