// app/(pages)/notifications/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Filter, Loader2, Mail, Smartphone, Settings } from 'lucide-react';
import { fetchCurrentUser, getToken } from '../../../../../../services/auth.service';
import { toast } from '@/components/modals/ToastContainer';
import { useArticleModal } from '@/context/ArticleModalContext';

const enum NotificationType {
  MENTION = 'mention',
  REPLY = 'reply',
  NEW_COMMENT = 'new_comment',
  SYSTEM_ERROR = 'system_error',
  ARTICLE_PUBLISHED = 'article_published',
  ARTICLE_PENDING_MODERATION = 'article_pending_moderation',
  ARTICLE_REJECTED = 'article_rejected',
  SYSTEM_INFO = 'system_info',
  COMMENT_LIKED = 'comment_liked',
  ARTICLE_LIKED = 'article_liked',
  ARTICLE_BOOKMARKED = 'article_bookmarked',
  USER_ROLE_CHANGED = 'user_role_changed',
  COMMENT_ON_ARTICLE = 'comment_on_article',
  LIKE_ON_ARTICLE = 'like_on_article',
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
    articleId?: number;
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

  const { openArticleModal } = useArticleModal();

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
    if (!confirm('Supprimer cette notification ?')) return;

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
      case NotificationType.COMMENT_ON_ARTICLE:
        return 'Commentaire';
      case NotificationType.REPLY:
        return 'Réponse';
      case NotificationType.MENTION:
        return 'Mention';
      case NotificationType.NEW_FOLLOWER:
        return 'Nouvel abonné';
      case NotificationType.ARTICLE_PUBLISHED:
        return 'Article publié';
      case NotificationType.ARTICLE_PENDING_MODERATION:
        return 'En attente de modération';
      case NotificationType.ARTICLE_REJECTED:
        return 'Article refusé';
      case NotificationType.ARTICLE_LIKED:
      case NotificationType.LIKE_ON_ARTICLE:
        return "J'aime";
      case NotificationType.COMMENT_LIKED:
        return "J'aime sur commentaire";
      case NotificationType.ARTICLE_BOOKMARKED:
        return 'Sauvegarde';
      case NotificationType.SYSTEM_INFO:
        return 'Information';
      case NotificationType.SYSTEM_ERROR:
        return 'Erreur système';
      case NotificationType.USER_ROLE_CHANGED:
        return 'Changement de rôle';
      case NotificationType.NEWSLETTER:
        return 'Newsletter';
      case NotificationType.PLATFORM_UPDATE:
        return 'Mise à jour plateforme';
      default:
        return 'Notification';
    }
  };

  const getDefaultMessage = (type: NotificationType, senderName: string): string => {
    switch (type) {
      case NotificationType.NEW_COMMENT:
      case NotificationType.COMMENT_ON_ARTICLE:
        return `${senderName} a commenté votre article`;
      case NotificationType.REPLY:
        return `${senderName} a répondu à votre commentaire`;
      case NotificationType.MENTION:
        return `${senderName} vous a mentionné`;
      case NotificationType.NEW_FOLLOWER:
        return `${senderName} veut vous suivre`;
      case NotificationType.ARTICLE_LIKED:
      case NotificationType.LIKE_ON_ARTICLE:
        return `${senderName} a aimé votre article`;
      case NotificationType.COMMENT_LIKED:
        return `${senderName} a aimé votre commentaire`;
      case NotificationType.ARTICLE_BOOKMARKED:
        return `${senderName} a sauvegardé votre article`;
      case NotificationType.ARTICLE_PUBLISHED:
        return 'Votre article a été publié';
      case NotificationType.ARTICLE_REJECTED:
        return 'Votre article a été refusé';
      case NotificationType.ACCOUNT_ACTIVATED:
        return 'Votre compte a été activé. Vous pouvez maintenant accéder à la plateforme.';
      case NotificationType.ACCOUNT_DEACTIVATED:
        return "Votre compte a été désactivé. Contactez un administrateur pour plus d'informations.";
      default:
        return `${senderName} a interagi avec votre contenu`;
    }
  };

  const handleOpenArticleModal = async (articleId: number, commentId?: number) => {
    try {
      const response = await fetch(`http://localhost:3000/api/articles/${articleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const articleData = await response.json();
      
      const formattedArticle: any = {
        id: articleData.id,
        title: articleData.title,
        content: articleData.content,
        description: articleData.description || articleData.content?.substring(0, 150) + '...' || '',
        
        author: {
          id: articleData.author?.id || 0,
          name: typeof articleData.author?.name === 'string' 
            ? articleData.author.name 
            : `${articleData.author?.firstName || ''} ${articleData.author?.lastName || ''}`.trim() || 'Utilisateur',
          initials: ((articleData.author?.firstName?.charAt(0) || '') + 
                    (articleData.author?.lastName?.charAt(0) || '')).toUpperCase() || 'U',
          department: typeof articleData.author?.department === 'string'
            ? articleData.author.department
            : articleData.author?.role || 'Membre',
          avatar: articleData.author?.avatar || null,
        },
        
        category: {
          id: articleData.category?.id || 0,
          name: typeof articleData.category?.name === 'string' 
            ? articleData.category.name 
            : 'Général',
          slug: typeof articleData.category?.slug === 'string'
            ? articleData.category.slug
            : 'general',
        },
        
        tags: Array.isArray(articleData.tags) 
          ? articleData.tags.map((tag: any) => typeof tag === 'string' ? tag : tag.name || String(tag))
          : [],
        
        isFeatured: false,
        publishedAt: articleData.createdAt || articleData.publishedAt || new Date().toISOString(),
        updatedAt: articleData.updatedAt || null,
        status: articleData.status || 'published',
        
        stats: {
          likes: typeof articleData.stats?.likes === 'number' 
            ? articleData.stats.likes 
            : articleData.likes?.length || 0,
          comments: typeof articleData.stats?.comments === 'number'
            ? articleData.stats.comments
            : articleData.comments?.length || 0,
          views: typeof articleData.stats?.views === 'number'
            ? articleData.stats.views
            : articleData.viewsCount || 0,
        },
        
        isLiked: !!articleData.isLiked,
        isBookmarked: !!articleData.isBookmarked,
      };
      
      // Utiliser le contexte pour ouvrir le modal
      openArticleModal(formattedArticle, commentId);
    } catch (error) {
      console.error('❌ Erreur chargement article:', error);
      toast.error("Impossible de charger l'article");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const getProfileImageUrl = (userData: any) => {
    if (!userData?.id) return '/images/user/profile.jpg';
    if (userData?.profileImage || userData?.avatar) {
      return `http://localhost:3000/api/users/profile-image/${userData.id}?t=${new Date().getTime()}`;
    }
    return '/images/user/profile.jpg';
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const handleNotificationClick = async (notif: Notification) => {
    // Traiter selon le type de notification
    if (notif.type === NotificationType.NEW_FOLLOWER && notif.data?.followerId) {
      window.location.href = `/profile/${notif.data.followerId}`;
    } else if (notif.data?.articleId) {
      await handleOpenArticleModal(notif.data.articleId, notif.data.commentId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des notifications...</p>
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
                Notifications
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {unreadCount > 0 
                  ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}`
                  : 'Toutes les notifications ont été lues'}
              </p>
            </div>
            
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Tout marquer comme lu
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-2 rounded-lg border border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Filter className="h-4 w-4" />
              Toutes ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              Non lues ({unreadCount})
            </button>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Préférences de notifications
              </h2>
            </div>
            {savingPreferences && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sauvegarde...
              </span>
            )}
            {preferencesSaved && !savingPreferences && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                Sauvegardé
              </span>
            )}
          </div>

          {preferencesLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Chargement des préférences...
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
                    Notifications par email
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {preferences.emailNotificationsEnabled ? 'Activées' : 'Désactivées'}
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
                    Notifications push
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {preferences.pushNotificationsEnabled ? 'Activées' : 'Désactivées'}
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
              Aucune notification
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {filter === 'unread' 
                ? 'Vous avez lu toutes vos notifications'
                : 'Vous n\'avez pas encore de notifications'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif) => {
              const senderName = notif.sender?.firstName && notif.sender?.lastName
                ? `${notif.sender.firstName} ${notif.sender.lastName}`
                : notif.sender?.name || 'Utilisateur';

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
                            {notif.type === NotificationType.ARTICLE_REJECTED && notif.data?.reason && (
                              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                                Raison : {notif.data.reason}
                              </p>
                            )}

                            {/* Moderation info */}
                            {notif.type === NotificationType.ARTICLE_PENDING_MODERATION && (
                              <p className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                                Votre article est en attente de modération
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
                                title="Marquer comme lu"
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
                              title="Supprimer"
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
                            notif.type === NotificationType.COMMENT_ON_ARTICLE ||
                            notif.type === NotificationType.REPLY
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : notif.type === NotificationType.MENTION
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                              : notif.type === NotificationType.NEW_FOLLOWER
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : notif.type === NotificationType.ARTICLE_LIKED ||
                                notif.type === NotificationType.LIKE_ON_ARTICLE ||
                                notif.type === NotificationType.COMMENT_LIKED
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : notif.type === NotificationType.ARTICLE_BOOKMARKED
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : notif.type === NotificationType.ARTICLE_PUBLISHED
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : notif.type === NotificationType.ARTICLE_REJECTED
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : notif.type === NotificationType.ARTICLE_PENDING_MODERATION
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
          </div>
        )}
      </div>
    </div>
  );
}