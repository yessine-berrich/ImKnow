// app/(admin)/(others-pages)/connections/page.tsx
'use client';

import { getToken } from '../../../../../../services/auth.service';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users, UserCheck, UserPlus, Search, X, Loader2,
  ChevronLeft, UserMinus, Heart, Grid, List,
  RefreshCw, Eye, Sparkles, Send, MessageSquare
} from 'lucide-react';
import Avatar from '@/components/ui/avatar/Avatar';
import SendMessageRequestModal from '@/components/chat/SendMessageRequestModal';
import { followService, FollowRelationshipDto, FollowStatsDto, FriendSuggestionDto } from '../../../../../../services/follow.service';
import { confirm } from '@/components/modals/ConfirmModal';
import { useTranslation } from '@/context/LanguageContext';

type TabType = 'followers' | 'following' | 'friends' | 'suggestions';
type ViewType = 'grid' | 'list';

const PRIMARY_COLOR = '#168F6F';

// Composant UserCard réutilisable
function UserCard({
  user,
  isFriend,
  isFollowing,
  isProcessing,
  followedAt,
  mutualFriendsCount,
  reason,
  activeTab,
  onFollow,
  onUnfollow,
  onRemoveFollower,
  onDismiss,
  onMessage,
  onViewProfile,
  t,
  language,
}: {
  user: any;
  isFriend: boolean;
  isFollowing: boolean;
  isProcessing: boolean;
  followedAt?: string;
  mutualFriendsCount?: number;
  reason?: string;
  activeTab: TabType;
  onFollow: (userId: number) => void;
  onUnfollow: (userId: number, userName: string) => void;
  onRemoveFollower: (userId: number, userName: string) => void;
  onDismiss?: (userId: number) => void;
  onMessage: (userId: number, isFriend: boolean) => void;
  onViewProfile: (userId: number) => void;
  t: (key: any, params?: any) => string;
  language: string;
}) {
  const fullName = `${user.firstName} ${user.lastName}`;

  const getActionButton = () => {
    if (activeTab === 'followers') {
      return (
        <button
          onClick={() => onRemoveFollower(user.id, fullName)}
          disabled={isProcessing}
          className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
          <span className="hidden sm:inline">{t('connections.remove')}</span>
        </button>
      );
    }

    if (activeTab === 'following' || activeTab === 'friends') {
      return (
        <button
          onClick={() => onUnfollow(user.id, fullName)}
          disabled={isProcessing}
          className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
          <span className="hidden sm:inline">{t('connections.following_label')}</span>
        </button>
      );
    }

    if (activeTab === 'suggestions') {
      if (isFollowing) {
        return (
          <button
            onClick={() => onUnfollow(user.id, fullName)}
            disabled={isProcessing}
            className="flex-1 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
            <span className="hidden sm:inline">{t('connections.following_label')}</span>
          </button>
        );
      }
      return (
        <button
          onClick={() => onFollow(user.id)}
          disabled={isProcessing}
          className="flex-1 px-3 py-2 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium shadow-sm"
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          <span className="hidden sm:inline">{t('connections.follow')}</span>
        </button>
      );
    }
    
    return null;
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-opacity-50 hover:shadow-lg transition-all duration-200 overflow-hidden"
         style={{ '--hover-border-color': PRIMARY_COLOR } as React.CSSProperties}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <button onClick={() => onViewProfile(user.id)} className="flex-shrink-0">
            <Avatar
              src={user.profileImage || ''}
              alt={fullName}
              size="large"
              isOnline={user.isOnline}
            />
          </button>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <button
              onClick={() => onViewProfile(user.id)}
              className="text-left w-full group"
            >
              <div className="flex items-center flex-wrap gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-base group-hover:opacity-80 transition-colors"
                    style={{ color: `var(--hover-border-color)` }}>
                  {fullName}
                </h3>
                {isFriend && (
                  <span className="px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-medium rounded-full inline-flex items-center gap-1">
                    <Heart size={10} /> {t('connections.friend')}
                  </span>
                )}
                {user.isOnline && (
                  <span className="text-xs text-emerald-500 font-medium">● {t('connections.online')}</span>
                )}
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {user.email || user.department || ''}
              </p>

              {(mutualFriendsCount !== undefined && mutualFriendsCount > 0) && (
                <p className="text-xs font-medium mt-2"
                   style={{ color: PRIMARY_COLOR }}>
                  {mutualFriendsCount === 1
                    ? t('connections.mutual_friends_one', { count: mutualFriendsCount })
                    : t('connections.mutual_friends_other', { count: mutualFriendsCount })}
                </p>
              )}

              {reason && (mutualFriendsCount === 0 || mutualFriendsCount === undefined) && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 italic">
                  {reason}
                </p>
              )}

              {followedAt && activeTab !== 'suggestions' && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {t('connections.since')} {new Date(followedAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </button>
          </div>

          {/* Dismiss button — suggestions only */}
          {activeTab === 'suggestions' && onDismiss && (
            <button
              onClick={() => onDismiss(user.id)}
              className="flex-shrink-0 p-1.5 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              title={t('connections.hide_suggestion')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => onMessage(user.id, isFriend)}
            className={`px-3 py-2 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-all ${
              isFriend
                ? 'bg-[#168F6F] text-white hover:bg-[#0F6B54] shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
            title={isFriend ? t('connections.message') : t('connections.contact')}
          >
            {isFriend ? <Send size={16} /> : <MessageSquare size={16} />}
            <span className="hidden md:inline">{isFriend ? t('connections.message') : t('connections.contact')}</span>
          </button>

          <button
            onClick={() => onViewProfile(user.id)}
            className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Eye size={16} />
            <span className="hidden md:inline">{t('connections.profile')}</span>
          </button>

          {getActionButton()}
        </div>
      </div>
    </div>
  );
}

// Composant UserListItem pour la vue liste
function UserListItem({
  user,
  isFriend,
  isFollowing,
  isProcessing,
  followedAt,
  mutualFriendsCount,
  reason,
  activeTab,
  onFollow,
  onUnfollow,
  onRemoveFollower,
  onDismiss,
  onMessage,
  onViewProfile,
  t,
  language,
}: {
  user: any;
  isFriend: boolean;
  isFollowing: boolean;
  isProcessing: boolean;
  followedAt?: string;
  mutualFriendsCount?: number;
  reason?: string;
  activeTab: TabType;
  onFollow: (userId: number) => void;
  onUnfollow: (userId: number, userName: string) => void;
  onRemoveFollower: (userId: number, userName: string) => void;
  onDismiss?: (userId: number) => void;
  onMessage: (userId: number, isFriend: boolean) => void;
  onViewProfile: (userId: number) => void;
  t: (key: any, params?: any) => string;
  language: string;
}) {
  const fullName = `${user.firstName} ${user.lastName}`;

  const getActionButton = () => {
    if (activeTab === 'followers') {
      return (
        <button
          onClick={() => onRemoveFollower(user.id, fullName)}
          disabled={isProcessing}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={16} />}
          <span className="hidden sm:inline">{t('connections.remove')}</span>
        </button>
      );
    }

    if (activeTab === 'following' || activeTab === 'friends') {
      return (
        <button
          onClick={() => onUnfollow(user.id, fullName)}
          disabled={isProcessing}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
          <span className="hidden sm:inline">{t('connections.following_label')}</span>
        </button>
      );
    }

    if (activeTab === 'suggestions') {
      if (isFollowing) {
        return (
          <button
            onClick={() => onUnfollow(user.id, fullName)}
            disabled={isProcessing}
            className="px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
          >
            {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
            <span className="hidden sm:inline">{t('connections.following_label')}</span>
          </button>
        );
      }
      return (
        <button
          onClick={() => onFollow(user.id)}
          disabled={isProcessing}
          className="px-4 py-2 text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium shadow-sm"
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
          <span className="hidden sm:inline">{t('connections.follow')}</span>
        </button>
      );
    }
    
    return null;
  };

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-opacity-50 transition-all"
         style={{ '--hover-border-color': PRIMARY_COLOR } as React.CSSProperties}>
      {/* Avatar */}
      <button onClick={() => onViewProfile(user.id)} className="flex-shrink-0">
        <Avatar
          src={user.profileImage || ''}
          alt={fullName}
          size="medium"
          isOnline={user.isOnline}
        />
      </button>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => onViewProfile(user.id)}
          className="text-left w-full"
        >
          <div className="flex items-center flex-wrap gap-2">
            <p className="font-semibold text-gray-900 dark:text-white hover:opacity-80 transition-colors"
               style={{ color: `var(--hover-border-color)` }}>
              {fullName}
            </p>
            {isFriend && (
              <span className="px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 text-xs font-medium rounded-full">
                {t('connections.friend')}
              </span>
            )}
            {user.isOnline && (
              <span className="text-xs text-emerald-500 font-medium">● {t('connections.online')}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {user.email || user.department || ''}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {(mutualFriendsCount !== undefined && mutualFriendsCount > 0) && (
              <span className="text-xs font-medium" style={{ color: PRIMARY_COLOR }}>
                {mutualFriendsCount === 1
                  ? t('connections.mutual_friends_one', { count: mutualFriendsCount })
                  : t('connections.mutual_friends_other', { count: mutualFriendsCount })}
              </span>
            )}
            {reason && (mutualFriendsCount === 0 || mutualFriendsCount === undefined) && (
              <span className="text-xs text-gray-400 italic">{reason}</span>
            )}
            {followedAt && activeTab !== 'suggestions' && (
              <span className="text-xs text-gray-400">
                {t('connections.since')} {new Date(followedAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onMessage(user.id, isFriend)}
          className={`p-2 rounded-xl transition-all ${
            isFriend
              ? 'bg-[#168F6F] text-white hover:bg-[#0F6B54] shadow-sm'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title={isFriend ? t('connections.message') : t('connections.contact')}
        >
          {isFriend ? <Send size={18} /> : <MessageSquare size={18} />}
        </button>
        <button
          onClick={() => onViewProfile(user.id)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
          title={t('connections.profile')}
        >
          <Eye size={18} />
        </button>
        {getActionButton()}
        {activeTab === 'suggestions' && onDismiss && (
          <button
            onClick={() => onDismiss(user.id)}
            className="p-2 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            title={t('connections.hide')}
          >
            <X size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('followers');
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');
  const [loading, setLoading] = useState(true);
  
  // Data states
  const [followers, setFollowers] = useState<FollowRelationshipDto[]>([]);
  const [following, setFollowing] = useState<FollowRelationshipDto[]>([]);
  const [friends, setFriends] = useState<FollowRelationshipDto[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSuggestionDto[]>([]);
  const [stats, setStats] = useState<FollowStatsDto | null>(null);
  
  // UI states
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [followingSet, setFollowingSet] = useState<Set<number>>(new Set());
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<number>>(new Set());
  const [contactModal, setContactModal] = useState<{ id: number; firstName: string; lastName: string; profileImage?: string; department?: string; isOnline?: boolean } | null>(null);


  // Vérification auth
  useEffect(() => {
    if (!getToken()) {
      router.push('/login');
    }
  }, [router]);

  // Chargement des données
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [followersData, followingData, friendsData, statsData, suggestionsData] = await Promise.all([
        followService.getFollowers(),
        followService.getFollowing(),
        followService.getFriends(),
        followService.getFollowStats(),
        followService.getFriendSuggestions(20),
      ]);

      setFollowers(followersData);
      setFollowing(followingData);
      setFriends(friendsData);
      setStats(statsData);
      setSuggestions(suggestionsData);
      
      // Mettre à jour le set des IDs suivis
      const followingIds = new Set<number>(followingData.map(f => f.user.id));
      setFollowingSet(followingIds);
    } catch (err) {
      console.error('Erreur chargement:', err);
      showToast(t('connections.error_loading'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleDismissSuggestion = (userId: number) => {
    setDismissedSuggestionIds(prev => new Set([...prev, userId]));
  };

  const handleMessage = (userId: number, isFriend: boolean) => {
    if (isFriend) {
      router.push(`/chat?userId=${userId}`);
      return;
    }
    // Trouver l'utilisateur dans toutes les listes pour alimenter le modal
    const allItems = [...followers, ...following, ...friends, ...suggestions];
    const found = allItems.find(item => {
      const u = 'user' in item ? item.user : item;
      return u.id === userId;
    });
    if (!found) return;
    const u = 'user' in found ? found.user : found;
    setContactModal({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      profileImage: u.profileImage,
      department: u.department,
      isOnline: u.isOnline,
    });
  };

  // Actions
  const handleFollow = async (userId: number) => {
    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await followService.follow(userId);
      setFollowingSet(prev => new Set([...prev, userId]));
      setDismissedSuggestionIds(prev => new Set([...prev, userId]));
      showToast(t('connections.follow_success'), 'success');
      Promise.all([
        followService.getFollowing().then(setFollowing),
        followService.getFriends().then(setFriends),
        followService.getFollowStats().then(setStats),
      ]).catch(() => {});
    } catch (err: any) {
      showToast(err.message || t('connections.follow_error'), 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleUnfollow = async (userId: number, userName: string) => {
    if (!await confirm(t('connections.unfollow_confirm', { name: userName }))) return;

    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await followService.unfollow(userId);
      setFollowingSet(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      showToast(t('connections.unfollow_success', { name: userName }), 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || t('common.error'), 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleRemoveFollower = async (userId: number, userName: string) => {
    if (!await confirm(t('connections.remove_follower_confirm', { name: userName }))) return;

    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await followService.removeFollower(userId);
      showToast(t('connections.remove_success', { name: userName }), 'success');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || t('common.error'), 'error');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm ${
      type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Filtrage et tri
  const getCurrentData = useCallback(() => {
    switch (activeTab) {
      case 'followers': return followers;
      case 'following': return following;
      case 'friends': return friends;
      case 'suggestions':
        return suggestions.filter(s => !dismissedSuggestionIds.has(s.user.id));
      default: return [];
    }
  }, [activeTab, followers, following, friends, suggestions, dismissedSuggestionIds]);

  const filteredAndSortedData = useMemo(() => {
    let data = [...getCurrentData()];

    // Filtre
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(item => {
        const user = 'user' in item ? item.user : item;
        return `${user.firstName} ${user.lastName}`.toLowerCase().includes(query) ||
               user.email?.toLowerCase().includes(query);
      });
    }

    // Tri
    return data.sort((a, b) => {
      const userA = 'user' in a ? a.user : a;
      const userB = 'user' in b ? b.user : b;
      
      if (sortBy === 'name') {
        return `${userA.firstName} ${userA.lastName}`.localeCompare(`${userB.firstName} ${userB.lastName}`);
      }
      if (sortBy === 'date') {
        const dateA = 'followedAt' in a ? a.followedAt : null;
        const dateB = 'followedAt' in b ? b.followedAt : null;
        if (dateA && dateB) {
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        }
        return 0;
      }
      return 0;
    });
  }, [getCurrentData, searchQuery, sortBy]);

  const tabs = [
    { id: 'followers' as TabType, label: t('connections.followers'), icon: Users, count: stats?.followersCount || 0 },
    { id: 'following' as TabType, label: t('connections.following'), icon: UserCheck, count: stats?.followingCount || 0 },
    { id: 'friends' as TabType, label: t('connections.friends'), icon: Heart, count: stats?.friendsCount || 0 },
    { id: 'suggestions' as TabType, label: t('connections.suggestions'), icon: Sparkles, count: Math.max(0, suggestions.length - dismissedSuggestionIds.size) },
  ];

  // Helper pour les props de rendu
  const getItemProps = (item: any) => {
    const user = 'user' in item ? item.user : item;
    const isFriend = friends.some(f => f.user.id === user.id);
    const isFollowing = followingSet.has(user.id);
    const isProcessing = processingIds.has(user.id);
    const followedAt = 'followedAt' in item ? item.followedAt : undefined;
    const mutualFriendsCount = 'mutualFriendsCount' in item ? item.mutualFriendsCount : undefined;
    const reason = 'reason' in item ? item.reason : undefined;
    
    return { user, isFriend, isFollowing, isProcessing, followedAt, mutualFriendsCount, reason };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4"
                 style={{ color: PRIMARY_COLOR }} />
          <p className="text-gray-600 dark:text-gray-400">{t('connections.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="mx-auto max-w-6xl px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm"
          >
            <ChevronLeft size={18} />
            {t('common.back')}
          </button>

          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              {t('connections.title')}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400 text-sm">
              {t('connections.subtitle')}
            </p>
          </div>
        </div>

        {/* Barre d'actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('connections.search_placeholder')}
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-50 focus:border-transparent transition-all"
              style={{ '--tw-ring-color': PRIMARY_COLOR } as React.CSSProperties}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
              className="px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50"
              style={{ '--tw-ring-color': PRIMARY_COLOR } as React.CSSProperties}
            >
              <option value="date">{t('connections.sort_recent')}</option>
              <option value="name">{t('connections.sort_name')}</option>
            </select>

            {/* View toggle */}
            <div className="flex bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1">
              <button
                onClick={() => setViewType('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewType === 'grid' 
                    ? 'text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                style={viewType === 'grid' ? { backgroundColor: PRIMARY_COLOR } : {}}
                title={t('connections.grid_view')}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewType('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewType === 'list'
                    ? 'text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                style={viewType === 'list' ? { backgroundColor: PRIMARY_COLOR } : {}}
                title={t('connections.list_view')}
              >
                <List size={18} />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={loadAllData}
              className="p-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-500 hover:opacity-80 transition-all"
              style={{ color: PRIMARY_COLOR }}
              title={t('connections.refresh')}
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-1.5 rounded-2xl mb-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                style={isActive ? { backgroundColor: PRIMARY_COLOR } : {}}
              >
                <Icon size={16} />
                {tab.label}
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content - Grid / List */}
        {filteredAndSortedData.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'suggestions' ? <Sparkles size={32} className="text-gray-400" /> : <Users size={32} className="text-gray-400" />}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {searchQuery ? t('connections.no_results') :
               activeTab === 'suggestions' ? t('connections.no_suggestions') :
               activeTab === 'friends' ? t('connections.no_friends') :
               activeTab === 'followers' ? t('connections.no_followers') :
               t('connections.no_following')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {searchQuery
                ? t('connections.try_different_search')
                : activeTab === 'suggestions'
                  ? t('connections.suggestions_hint')
                  : activeTab === 'friends'
                    ? t('connections.friends_hint')
                    : t('connections.following_hint')}
            </p>
            {activeTab === 'suggestions' && !searchQuery && (
              <button
                onClick={loadAllData}
                className="px-4 py-2 text-white rounded-xl hover:opacity-90 transition-all text-sm font-medium"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                {t('connections.refresh_suggestions')}
              </button>
            )}
          </div>
        ) : viewType === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAndSortedData.map((item) => {
              const props = getItemProps(item);
              return (
                <UserCard
                  key={props.user.id}
                  {...props}
                  activeTab={activeTab}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  onRemoveFollower={handleRemoveFollower}
                  onDismiss={handleDismissSuggestion}
                  onMessage={handleMessage}
                  onViewProfile={(id) => router.push(`/profile/${id}`)}
                  t={t}
                  language={language}
                />
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAndSortedData.map((item) => {
              const props = getItemProps(item);
              return (
                <UserListItem
                  key={props.user.id}
                  {...props}
                  activeTab={activeTab}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  onRemoveFollower={handleRemoveFollower}
                  onDismiss={handleDismissSuggestion}
                  onMessage={handleMessage}
                  onViewProfile={(id) => router.push(`/profile/${id}`)}
                  t={t}
                  language={language}
                />
              );
            })}
          </div>
        )}

        {/* Footer info */}
        {filteredAndSortedData.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-400">
            {t('connections.showing_results', { count: filteredAndSortedData.length, plural: filteredAndSortedData.length > 1 ? 's' : '' })}
            {searchQuery && t('connections.for_query', { query: searchQuery })}
          </div>
        )}
      </div>

      {/* Modal de demande de contact */}
      {contactModal && (
        <SendMessageRequestModal
          user={contactModal}
          onClose={() => setContactModal(null)}
          onSuccess={() => {
            showToast(t('connections.request_sent'), 'success');
            setContactModal(null);
          }}
        />
      )}
    </div>
  );
}
