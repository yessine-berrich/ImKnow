// components/follow/FollowTabs.tsx - Version corrigée avec couleur #00926B
'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  UserCheck, 
  UserX,
  Heart, 
  Loader2 
} from 'lucide-react';

import { useRouter } from 'next/navigation';
import { FollowRelationshipDto, followService, FriendSuggestionDto, UserBriefDto, StatusResponseDto } from '../../../services/follow.service';
import Avatar from '../ui/avatar/Avatar';

interface FollowTabsProps {
  userId: number;
  isCurrentUser?: boolean;
  onClose?: () => void;
  initialTab?: 'followers' | 'following' | 'friends' | 'suggestions';
}

type TabType = 'followers' | 'following' | 'friends' | 'suggestions';

export default function FollowTabs({ 
  userId, 
  isCurrentUser = false, 
  onClose,
  initialTab = 'followers'
}: FollowTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [followers, setFollowers] = useState<FollowRelationshipDto[]>([]);
  const [following, setFollowing] = useState<FollowRelationshipDto[]>([]);
  const [friends, setFriends] = useState<FollowRelationshipDto[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSuggestionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  // Track follow status for each user (for followers tab)
  const [followStatusMap, setFollowStatusMap] = useState<Record<number, boolean>>({});
  
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, [userId, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Charger les données en fonction de l'onglet actif
      if (activeTab === 'followers') {
        const data = isCurrentUser 
          ? await followService.getFollowers()
          : await followService.getUserFollowers(Number(userId));
        setFollowers(data);
        
        // Check follow status for each follower (if current user is following them back)
        if (isCurrentUser) {
          const statusMap: Record<number, boolean> = {};
          await Promise.all(
            data.map(async (follower) => {
              try {
                const status = await followService.getStatus(follower.user.id);
                statusMap[follower.user.id] = status.isFollowing;
              } catch (e) {
                statusMap[follower.user.id] = false;
              }
            })
          );
          setFollowStatusMap(statusMap);
        }
      } else if (activeTab === 'following') {
        const data = isCurrentUser 
          ? await followService.getFollowing()
          : await followService.getUserFollowing(Number(userId));
        setFollowing(data);
      } else if (activeTab === 'friends') {
        const data = isCurrentUser 
          ? await followService.getFriends()
          : await followService.getUserFriends(Number(userId));
        setFriends(data);
      } else if (activeTab === 'suggestions' && isCurrentUser) {
        const suggestionsData = await followService.getFriendSuggestions(20);
        setSuggestions(suggestionsData);
      }
    } catch (error) {
      console.error('Error loading follow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId: number) => {
    setActionLoading(targetUserId);
    try {
      await followService.follow(targetUserId);
      // Update local state to show "Ami" badge immediately
      setFollowStatusMap(prev => ({ ...prev, [targetUserId]: true }));
      await loadData();
    } catch (error) {
      console.error('Error following user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollow = async (targetUserId: number) => {
    setActionLoading(targetUserId);
    try {
      await followService.unfollow(targetUserId);
      await loadData();
    } catch (error) {
      console.error('Error unfollowing user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFollower = async (followerId: number) => {
    setActionLoading(followerId);
    try {
      await followService.removeFollower(followerId);
      await loadData();
    } catch (error) {
      console.error('Error removing follower:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const navigateToProfile = (profileUserId: number) => {
    if (onClose) onClose();
    router.push(`/profile/${profileUserId}`);
  };

  const renderUserCard = (item: FollowRelationshipDto | FriendSuggestionDto, type: 'follower' | 'following' | 'friend' | 'suggestion') => {
    const isSuggestion = type === 'suggestion';
    
    // Extract user data from nested structure
    const userData: UserBriefDto | undefined = isSuggestion 
      ? (item as FriendSuggestionDto).user 
      : (item as FollowRelationshipDto).user;
    
    const userIdNum = userData?.id || 0;
    const name = userData ? `${userData.firstName} ${userData.lastName}` : 'Utilisateur';
    const suggestion = item as FriendSuggestionDto;

    return (
      <div key={userIdNum} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => navigateToProfile(userIdNum)}
            className="flex-shrink-0"
          >
            <Avatar
              src={userData?.profileImage}
              alt={name}
              size="medium"
              className="!w-12 !h-12"
            />
          </button>
          
          <div className="flex-1 min-w-0">
            <button
              onClick={() => navigateToProfile(userIdNum)}
              className="text-left"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white truncate hover:text-[#00926B] dark:hover:text-[#00B383]">
                {name}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {userData?.department || ''}
              </p>
              {isSuggestion && suggestion.mutualFriendsCount > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {suggestion.mutualFriendsCount} ami{suggestion.mutualFriendsCount > 1 ? 's' : ''} en commun
                </p>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCurrentUser && (
            <>
              {type === 'suggestion' && (
                <button
                  onClick={() => handleFollow(userIdNum)}
                  disabled={actionLoading === userIdNum}
                  className="px-3 py-1.5 bg-[#00926B] text-white text-sm rounded-lg hover:bg-[#00B383] transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  {actionLoading === userIdNum ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  <span>Suivre</span>
                </button>
              )}

              {type === 'follower' && (
                <div className="flex gap-1">
                  {/* Show "Suivre en retour" only if not already following */}
                  {!followStatusMap[userIdNum] && (
                    <button
                      onClick={() => handleFollow(userIdNum)}
                      disabled={actionLoading === userIdNum}
                      className="px-3 py-1.5 bg-[#00926B] text-white text-sm rounded-lg hover:bg-[#00B383] transition-colors disabled:opacity-50 flex items-center gap-1"
                      title="Suivre en retour"
                    >
                      {actionLoading === userIdNum ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <><UserPlus size={14} /><span>Suivre</span></>
                      )}
                    </button>
                  )}
                  {/* Show "Ami" badge if already following (mutual follow) */}
                  {followStatusMap[userIdNum] && (
                    <span className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm rounded-lg flex items-center gap-1">
                      <UserCheck size={14} />
                      <span>Ami</span>
                    </span>
                  )}
                  {/* Show "Supprimer" only for current user's own followers */}
                  {isCurrentUser && (
                    <button
                      onClick={() => handleRemoveFollower(userIdNum)}
                      disabled={actionLoading === userIdNum}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <UserX size={18} />
                    </button>
                  )}
                </div>
              )}

              {type === 'following' && (
                <button
                  onClick={() => handleUnfollow(userIdNum)}
                  disabled={actionLoading === userIdNum}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {actionLoading === userIdNum ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Ne plus suivre'
                  )}
                </button>
              )}

              {type === 'friend' && (
                <button
                  onClick={() => handleUnfollow(userIdNum)}
                  disabled={actionLoading === userIdNum}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  {actionLoading === userIdNum ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Ne plus suivre'
                  )}
                </button>
              )}
            </>
          )}

          {!isCurrentUser && type === 'following' && (
            <button
              onClick={() => handleUnfollow(userIdNum)}
              disabled={actionLoading === userIdNum}
              className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {actionLoading === userIdNum ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                'Ne plus suivre'
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'followers':
        return followers;
      case 'following':
        return following;
      case 'friends':
        return friends;
      case 'suggestions':
        return suggestions;
      default:
        return [];
    }
  };

  const getTabCount = (tab: TabType) => {
    switch (tab) {
      case 'followers':
        return followers.length;
      case 'following':
        return following.length;
      case 'friends':
        return friends.length;
      case 'suggestions':
        return suggestions.length;
      default:
        return 0;
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'followers':
        return "Aucun abonné pour le moment";
      case 'following':
        return "Vous ne suivez personne pour le moment";
      case 'friends':
        return "Aucun ami pour le moment";
      case 'suggestions':
        return "Aucune suggestion pour le moment";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {isCurrentUser ? 'Mes relations' : 'Relations'}
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('followers')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'followers'
              ? 'border-[#00926B] text-[#00926B] dark:border-[#00B383] dark:text-[#00B383]'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Users size={18} />
          <span>Abonnés</span>
          <span className={`text-sm px-2 py-0.5 rounded-full ${
            activeTab === 'followers'
              ? 'bg-[#00926B]/10 text-[#00926B] dark:bg-[#00926B]/20 dark:text-[#00B383]'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {getTabCount('followers')}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('following')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'following'
              ? 'border-[#00926B] text-[#00926B] dark:border-[#00B383] dark:text-[#00B383]'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <UserCheck size={18} />
          <span>Abonnements</span>
          <span className={`text-sm px-2 py-0.5 rounded-full ${
            activeTab === 'following'
              ? 'bg-[#00926B]/10 text-[#00926B] dark:bg-[#00926B]/20 dark:text-[#00B383]'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {getTabCount('following')}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'friends'
              ? 'border-[#00926B] text-[#00926B] dark:border-[#00B383] dark:text-[#00B383]'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
          }`}
        >
          <Heart size={18} />
          <span>Amis</span>
          <span className={`text-sm px-2 py-0.5 rounded-full ${
            activeTab === 'friends'
              ? 'bg-[#00926B]/10 text-[#00926B] dark:bg-[#00926B]/20 dark:text-[#00B383]'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            {getTabCount('friends')}
          </span>
        </button>

        {isCurrentUser && (
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'suggestions'
                ? 'border-[#00926B] text-[#00926B] dark:border-[#00B383] dark:text-[#00B383]'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
            }`}
          >
            <UserPlus size={18} />
            <span>Suggestions</span>
            <span className={`text-sm px-2 py-0.5 rounded-full ${
              activeTab === 'suggestions'
                ? 'bg-[#00926B]/10 text-[#00926B] dark:bg-[#00926B]/20 dark:text-[#00B383]'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {getTabCount('suggestions')}
            </span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#00926B]" />
          </div>
        ) : (
          <div className="space-y-2">
            {getCurrentData().length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  {getEmptyMessage()}
                </p>
              </div>
            ) : (
              getCurrentData().map((item) => 
                renderUserCard(item, activeTab === 'suggestions' ? 'suggestion' : 
                  activeTab === 'followers' ? 'follower' :
                  activeTab === 'following' ? 'following' : 'friend')
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}