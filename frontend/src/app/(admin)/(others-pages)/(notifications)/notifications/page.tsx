// app/(pages)/notifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Filter, Loader2, Mail, Smartphone, Settings } from 'lucide-react';
import { fetchCurrentUser, getToken } from '../../../../../../services/auth.service';
import { toast } from '@/components/modals/ToastContainer';
import { confirm } from '@/components/modals/ConfirmModal';
import { usePublicationModal } from '@/context/PublicationModalContext';
import { useTranslation } from '@/context/LanguageContext';
import { resolveAvatarUrl } from '@/utils/profile-image';

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
  COMMENT_ON_PUBLICATION = 'comment_on_publication',
  LIKE_ON_PUBLICATION = 'like_on_publication',
  NEW_FOLLOWER = 'new_follower',
  NEWSLETTER = 'newsletter',
  PLATFORM_UPDATE = 'platform_update'
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

interface NotificationPreferences {
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Notification preferences state
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotificationsEnabled: true,
    pushNotificationsEnabled: true,
  });
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferencesSaved, setPreferencesSaved] = useState(false);

  const { openPublicationModal } = usePublicationModal();
  const { t, language } = useTranslation();

  const token = getToken() ?? '';

  useEffect(() => {
    fetchCurrentUser().catch(console.error);
    fetchUnreadCount();
    fetchNotifications();
    fetchNotificationPreferences();
  }, []);

  const fetchNotificationPreferences = async () => {
    try {
      const user = await fetchCurrentUser();
      if (user) {
        setPreferences({
          emailNotificationsEnabled: user.emailNotificationsEnabled ?? true,
          pushNotificationsEnabled: user.pushNotificationsEnabled ?? true,
        });
      }
    } catch (err) {
      console.error('Erreur chargement préférences:', err);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const saveNotificationPreferences = async (updated: NotificationPreferences) => {
    if (!token) return;

    setSavingPreferences(true);
    setPreferencesSaved(false);

    try {
      const res = await fetch('http://localhost:3000/api/users/me/notifications-preferences', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updated),
      });

      if (res.ok) {
        setPreferences(updated);
        setPreferencesSaved(true);
        setTimeout(() => setPreferencesSaved(false), 2500);
      }
    } catch (err) {
      console.error('Erreur sauvegarde préférences:', err);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleTogglePreference = (key: keyof NotificationPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    saveNotificationPreferences(updated);
  };

  const fetchUnreadCount = async () => {
    if (!token) return;

    try {
      const res = await fetch('http://localhost:3000/api/notifications/unread-count', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (err) {
      console.error('Erreur chargement count:', err);
    }
  };

  const fetchNotifications = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        'http://localhost:3000/api/notifications?limit=100&unreadOnly=false',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

      const data = await res.json();
      setNotifications(data || []);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const res = await fetch(`http://localhost:3000/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Erreur mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Erreur mark all read:', err);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!await confirm(t('notifications_page.confirm_delete'))) return;

    setDeletingId(id);
    try {
      const res = await fetch(`http://localhost:3000/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        setNotifications(prev => {
          const deletedNotif = prev.find(n => n.id === id);
          if (deletedNotif && !deletedNotif.isRead) {
            setUnreadCount(count => Math.max(0, count - 1));
          }
          return prev.filter(n => n.id !== id);
        });
      }
    } catch (err) {
      console.error('Erreur suppression:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const getNotificationTypeLabel = (type: NotificationType): string => {
    switch (type) {
      case NotificationType.NEW_COMMENT:
      case NotificationType.COMMENT_ON_PUBLICATION:
        return t('notifications.type_comment');
      case NotificationType.REPLY:
        return t('notifications.type_reply');
      case NotificationType.MENTION:
        return t('notifications.type_mention');
      case NotificationType.NEW_FOLLOWER:
        return t('notifications.type_new_follower');
      case NotificationType.PUBLICATION_PUBLISHED:
        return t('notifications.type_publication_published');
      case NotificationType.PUBLICATION_PENDING_MODERATION:
        return t('notifications.type_pending_moderation');
      case NotificationType.PUBLICATION_REJECTED:
        return t('notifications.type_publication_rejected');
      case NotificationType.PUBLICATION_LIKED:
      case NotificationType.LIKE_ON_PUBLICATION:
        return t('notifications.type_publication_liked');
      case NotificationType.COMMENT_LIKED:
        return t('notifications.type_comment_liked');
      case NotificationType.PUBLICATION_BOOKMARKED:
        return t('notifications.type_bookmarked');
      case NotificationType.SYSTEM_INFO:
        return t('notifications.type_system_info');
      case NotificationType.SYSTEM_ERROR:
        return t('notifications.type_system_error');
      case NotificationType.USER_ROLE_CHANGED:
        return t('notifications.type_role_changed');
      case NotificationType.NEWSLETTER:
        return t('notifications.type_newsletter');
      case NotificationType.PLATFORM_UPDATE:
        return t('notifications.type_platform_update');
      default:
        return t('notifications_page.type_default');
    }
  };

  const getDefaultMessage = (type: NotificationType, senderName: string): string => {
    switch (type) {
      case NotificationType.NEW_COMMENT:
      case NotificationType.COMMENT_ON_PUBLICATION:
        return t('notifications.msg_new_comment', { name: senderName });
      case NotificationType.REPLY:
        return t('notifications.msg_reply', { name: senderName });
      case NotificationType.MENTION:
        return t('notifications.msg_mention', { name: senderName });
      case NotificationType.NEW_FOLLOWER:
        return t('notifications.msg_new_follower', { name: senderName });
      case NotificationType.PUBLICATION_LIKED:
      case NotificationType.LIKE_ON_PUBLICATION:
        return t('notifications.msg_publication_liked', { name: senderName });
      case NotificationType.COMMENT_LIKED:
        return t('notifications.msg_comment_liked', { name: senderName });
      case NotificationType.PUBLICATION_BOOKMARKED:
        return t('notifications.msg_bookmarked', { name: senderName });
      case NotificationType.PUBLICATION_PUBLISHED:
        return t('notifications.msg_publication_published');
      case NotificationType.PUBLICATION_REJECTED:
        return t('notifications.msg_publication_rejected');
      case NotificationType.ACCOUNT_ACTIVATED:
        return t('notifications_page.msg_account_activated');
      case NotificationType.ACCOUNT_DEACTIVATED:
        return t('notifications_page.msg_account_deactivated');
      default:
        return t('notifications.msg_default', { name: senderName });
    }
  };

  const handleOpenPublicationModal = async (publicationId: number, commentId?: number) => {
    try {
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
    } catch (error) {
      console.error('❌ Erreur chargement publication:', error);
      toast.error(t('notifications_page.err_load_publication'));
    }
  };

  const formatDate = (dateStr: string) => {
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    const date = new Date(dateStr);
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const locale = language === 'fr' ? 'fr-FR' : 'en-US';
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return t('notifications.just_now');
    if (minutes < 60) return t('notifications.minutes_ago', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.hours_ago', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t(days > 1 ? 'notifications_page.days_ago_plural' : 'notifications_page.days_ago_one', { count: days });
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  const getProfileImageUrl = (userData: any) => {
    return resolveAvatarUrl(userData?.avatar ?? userData?.profileImage);
  };

  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / PAGE_SIZE));
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleFilterChange = (f: 'all' | 'unread') => {
    setFilter(f);
    setCurrentPage(1);
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Traiter selon le type de notification
    if (notif.type === NotificationType.NEW_FOLLOWER && notif.data?.followerId) {
      window.location.href = `/profile/${notif.data.followerId}`;
    } else if (notif.data?.publicationId) {
      await handleOpenPublicationModal(notif.data.publicationId, notif.data.commentId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('notifications_page.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <Bell className="h-8 w-8 text-blue-600" />
                {t('notifications_page.title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {unreadCount > 0
                  ? t(unreadCount > 1 ? 'notifications_page.unread_plural' : 'notifications_page.unread_one', { count: unreadCount })
                  : t('notifications_page.all_read')}
              </p>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {t('notifications_page.mark_all_read')}
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-800">
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Filter className="h-4 w-4" />
              {t('notifications_page.filter_all', { count: notifications.length })}
            </button>
            <button
              onClick={() => handleFilterChange('unread')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {t('notifications_page.filter_unread', { count: unreadCount })}
            </button>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('notifications_page.pref_title')}
              </h2>
            </div>
            {savingPreferences && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t('notifications_page.pref_saving')}
              </span>
            )}
            {preferencesSaved && !savingPreferences && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                {t('notifications_page.pref_saved')}
              </span>
            )}
          </div>

          {preferencesLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('notifications_page.pref_loading')}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Email toggle */}
              <button
                onClick={() => handleTogglePreference('emailNotificationsEnabled')}
                disabled={savingPreferences}
                className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-lg border transition-all ${
                  preferences.emailNotificationsEnabled
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <div className={`p-2 rounded-lg ${
                  preferences.emailNotificationsEnabled
                    ? 'bg-blue-100 dark:bg-blue-900/50'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  <Mail className={`h-4 w-4 ${
                    preferences.emailNotificationsEnabled
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${
                    preferences.emailNotificationsEnabled
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {t('notifications_page.email_notif')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(preferences.emailNotificationsEnabled ? 'notifications_page.enabled' : 'notifications_page.disabled')}
                  </p>
                </div>
                {/* Toggle switch */}
                <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                  preferences.emailNotificationsEnabled
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${
                    preferences.emailNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </button>

              {/* Push toggle */}
              <button
                onClick={() => handleTogglePreference('pushNotificationsEnabled')}
                disabled={savingPreferences}
                className={`flex items-center gap-3 flex-1 px-4 py-3 rounded-lg border transition-all ${
                  preferences.pushNotificationsEnabled
                    ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <div className={`p-2 rounded-lg ${
                  preferences.pushNotificationsEnabled
                    ? 'bg-blue-100 dark:bg-blue-900/50'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  <Smartphone className={`h-4 w-4 ${
                    preferences.pushNotificationsEnabled
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`} />
                </div>
                <div className="flex-1 text-left">
                  <p className={`text-sm font-medium ${
                    preferences.pushNotificationsEnabled
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {t('notifications_page.push_notif')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t(preferences.pushNotificationsEnabled ? 'notifications_page.enabled' : 'notifications_page.disabled')}
                  </p>
                </div>
                {/* Toggle switch */}
                <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                  preferences.pushNotificationsEnabled
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 bg-white rounded-full shadow transition-transform ${
                    preferences.pushNotificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('notifications_page.empty_title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'unread'
                ? t('notifications_page.empty_all_read')
                : t('notifications_page.empty_none')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedNotifications.map((notif) => {
              const senderName = notif.sender?.firstName && notif.sender?.lastName
                ? `${notif.sender.firstName} ${notif.sender.lastName}`
                : notif.sender?.name || t('notifications.default_sender');

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`bg-white dark:bg-gray-900 rounded-xl border transition-all hover:shadow-md cursor-pointer ${
                    !notif.isRead
                      ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'
                      : 'border-gray-200 dark:border-gray-800'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={getProfileImageUrl(notif.sender)}
                          alt={senderName}
                          className="w-12 h-12 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/images/user/profile.jpg';
                          }}
                        />
                        {!notif.isRead && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900"></span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                              {notif.message || getDefaultMessage(notif.type, senderName)}
                            </p>

                            {/* Rejection reason */}
                            {notif.type === NotificationType.PUBLICATION_REJECTED && notif.data?.reason && (
                              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                {t('notifications_page.reason_label')} {notif.data.reason}
                              </p>
                            )}

                            {/* Moderation info */}
                            {notif.type === NotificationType.PUBLICATION_PENDING_MODERATION && (
                              <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                                {t('notifications_page.pending_moderation')}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!notif.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notif.id);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title={t('notifications_page.mark_read_title')}
                              >
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notif.id);
                              }}
                              disabled={deletingId === notif.id}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                              title={t('notifications_page.delete_title')}
                            >
                              {deletingId === notif.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            notif.type === NotificationType.NEW_COMMENT || 
                            notif.type === NotificationType.COMMENT_ON_PUBLICATION ||
                            notif.type === NotificationType.REPLY
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : notif.type === NotificationType.MENTION
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : notif.type === NotificationType.NEW_FOLLOWER
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : notif.type === NotificationType.PUBLICATION_LIKED ||
                                notif.type === NotificationType.LIKE_ON_PUBLICATION ||
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
                              : notif.type === NotificationType.SYSTEM_INFO ||
                                notif.type === NotificationType.PLATFORM_UPDATE
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {getNotificationTypeLabel(notif.type)}
                          </span>
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          <span>{getTimeAgo(notif.createdAt)}</span>
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          <span>{formatDate(notif.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredNotifications.length)} / {filteredNotifications.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    ←
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                            currentPage === p
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}