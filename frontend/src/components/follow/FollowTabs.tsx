'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, UserPlus, UserCheck, UserX, Heart,
  Loader2, Sparkles, UserMinus, ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  FollowRelationshipDto,
  followService,
  FriendSuggestionDto,
  UserBriefDto,
} from '../../../services/follow.service';
import Avatar from '../ui/avatar/Avatar';
import { useTranslation } from '@/context/LanguageContext';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FollowTabsProps {
  userId: number;
  currentUserId?: number | null;
  isCurrentUser?: boolean;
  onClose?: () => void;
  initialTab?: TabType;
}

type TabType = 'followers' | 'following' | 'friends' | 'suggestions';

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtDate = (d: string | undefined, lang: string) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fullName = (u: UserBriefDto) =>
  u.fullName || `${u.firstName} ${u.lastName}`.trim() || 'Utilisateur';

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="h-11 w-11 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-2.5 w-24 rounded-full bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="h-8 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────────

function TabBtn({
  active, onClick, icon, label, count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'border-[#168F6F] text-[#168F6F]'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
      }`}
    >
      {icon}
      <span>{label}</span>
      <span className={`ml-0.5 min-w-[20px] rounded-full px-1.5 py-0.5 text-xs font-semibold ${
        active
          ? 'bg-[#168F6F]/10 text-[#168F6F]'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
      }`}>
        {count}
      </span>
    </button>
  );
}

// ── Action button ──────────────────────────────────────────────────────────────

function ActionBtn({
  loading, onClick, variant, children,
}: {
  loading: boolean;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: React.ReactNode;
}) {
  const styles = {
    primary:   'bg-[#168F6F] text-white hover:bg-[#127a5f]',
    secondary: 'bg-[#168F6F]/10 dark:bg-[#168F6F]/15 text-[#168F6F] border border-[#168F6F]/30 hover:bg-[#168F6F]/20',
    danger:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30',
    ghost:     'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${styles[variant]}`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : children}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function FollowTabs({
  userId,
  currentUserId,
  isCurrentUser = false,
  onClose,
  initialTab = 'followers',
}: FollowTabsProps) {
  const router = useRouter();
  const { t, language } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [followers,   setFollowers]   = useState<FollowRelationshipDto[]>([]);
  const [following,   setFollowing]   = useState<FollowRelationshipDto[]>([]);
  const [friends,     setFriends]     = useState<FollowRelationshipDto[]>([]);
  const [suggestions, setSuggestions] = useState<FriendSuggestionDto[]>([]);
  const [loading, setLoading]         = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Maps userId → { isFollowing, isFriend }
  const [statusMap, setStatusMap] = useState<Record<number, { isFollowing: boolean; isFriend: boolean }>>({});

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadStatuses = useCallback(async (users: UserBriefDto[]) => {
    const map: Record<number, { isFollowing: boolean; isFriend: boolean }> = {};
    await Promise.all(
      users.map(async (u) => {
        try {
          const s = await followService.getStatus(u.id);
          map[u.id] = { isFollowing: s.isFollowing, isFriend: s.isFriend };
        } catch {
          map[u.id] = { isFollowing: false, isFriend: false };
        }
      })
    );
    setStatusMap((prev) => ({ ...prev, ...map }));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fwrs, fwing, frds] = await Promise.all([
        isCurrentUser ? followService.getFollowers()         : followService.getUserFollowers(userId),
        isCurrentUser ? followService.getFollowing()         : followService.getUserFollowing(userId),
        isCurrentUser ? followService.getFriends()           : followService.getUserFriends(userId),
      ]);

      setFollowers(fwrs);
      setFollowing(fwing);
      setFriends(frds);

      const allUsers = [
        ...fwrs.map((d) => d.user),
        ...fwing.map((d) => d.user),
        ...frds.map((d) => d.user),
      ];
      // Deduplicate by id before fetching statuses
      const unique = Array.from(new Map(allUsers.map((u) => [u.id, u])).values());
      await loadStatuses(unique);

      if (isCurrentUser) {
        const sugs = await followService.getFriendSuggestions(20);
        setSuggestions(sugs);
      }
    } catch (err) {
      console.error('FollowTabs loadData error:', err);
    } finally {
      setLoading(false);
    }
  }, [isCurrentUser, userId, loadStatuses]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const act = async (uid: number, fn: () => Promise<unknown>) => {
    setActionLoading(uid);
    try {
      await fn();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleFollow         = (uid: number) => act(uid, () => followService.follow(uid));
  const handleUnfollow       = (uid: number) => act(uid, () => followService.unfollow(uid));
  const handleRemoveFollower = (uid: number) => act(uid, () => followService.removeFollower(uid));

  const navigate = (uid: number) => {
    onClose?.();
    router.push(`/profile/${uid}`);
  };

  // ── Current data ────────────────────────────────────────────────────────────

  const currentData = (): (FollowRelationshipDto | FriendSuggestionDto)[] => {
    switch (activeTab) {
      case 'followers':   return followers;
      case 'following':   return following;
      case 'friends':     return friends;
      case 'suggestions': return suggestions;
    }
  };

  const count = (tab: TabType) => {
    switch (tab) {
      case 'followers':   return followers.length;
      case 'following':   return following.length;
      case 'friends':     return friends.length;
      case 'suggestions': return suggestions.length;
    }
  };

  const emptyMsg = () => {
    if (isCurrentUser) {
      switch (activeTab) {
        case 'followers':   return { title: t('connections.no_followers'),   sub: t('connections.followers_hint') };
        case 'following':   return { title: t('connections.no_following'),   sub: t('connections.following_hint') };
        case 'friends':     return { title: t('connections.no_friends'),     sub: t('connections.mutually_subscribe') };
        case 'suggestions': return { title: t('connections.no_suggestions'), sub: t('connections.come_back_later') };
      }
    }
    switch (activeTab) {
      case 'followers':   return { title: t('connections.no_followers'),   sub: t('connections.no_followers_other') };
      case 'following':   return { title: t('connections.no_following'),   sub: t('connections.no_following_other') };
      case 'friends':     return { title: t('connections.no_friends'),     sub: t('connections.no_friends_other') };
      case 'suggestions': return { title: '', sub: '' };
    }
  };

  // ── Render a user card ──────────────────────────────────────────────────────

  const renderCard = (item: FollowRelationshipDto | FriendSuggestionDto) => {
    const isSuggestion = 'mutualFriendsCount' in item;
    const userData     = isSuggestion
      ? (item as FriendSuggestionDto).user
      : (item as FollowRelationshipDto).user;
    const rel          = item as FollowRelationshipDto;
    const sug          = item as FriendSuggestionDto;
    const uid          = userData.id;
    const name         = fullName(userData);
    const isSelf       = currentUserId != null && uid === currentUserId;
    const status       = statusMap[uid];
    const isFollowing  = status?.isFollowing ?? false;
    const isFriend     = status?.isFriend    ?? false;
    const busy         = actionLoading === uid;
    const date         = fmtDate(rel.followedAt, language);

    return (
      <div
        key={uid}
        className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#168F6F]/5 dark:hover:bg-[#168F6F]/10 transition-colors"
      >
        {/* Avatar */}
        <button onClick={() => navigate(uid)} className="flex-shrink-0">
          <Avatar
            src={userData.profileImage}
            alt={name}
            size="medium"
            className="!h-11 !w-11 transition-transform duration-200 group-hover:scale-105"
          />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <button onClick={() => navigate(uid)} className="text-left block w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900 dark:text-white truncate hover:text-[#168F6F] transition-colors">
                {name}
              </span>
              {isFriend && activeTab !== 'friends' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#168F6F]/10 text-[#168F6F]">
                  <Heart size={9} className="fill-[#168F6F]" /> {t('connections.friend')}
                </span>
              )}
              {activeTab === 'friends' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#168F6F]/10 text-[#168F6F]">
                  <Heart size={9} className="fill-[#168F6F]" /> {t('connections.friend_badge')}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
              {userData.department || ''}
              {userData.department && date ? ' · ' : ''}
              {date ? `${t('connections.since')} ${date}` : ''}
            </p>
            {isSuggestion && sug.mutualFriendsCount > 0 && (
              <p className="text-[11px] text-[#168F6F] mt-0.5">
                {sug.mutualFriendsCount === 1
                  ? t('connections.mutual_friends_one', { count: sug.mutualFriendsCount })
                  : t('connections.mutual_friends_other', { count: sug.mutualFriendsCount })}
              </p>
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1.5">

          {/* ── Current user viewing their own relations ── */}
          {!isSelf && isCurrentUser && (
            <>
              {/* Suggestions: Suivre */}
              {activeTab === 'suggestions' && (
                <ActionBtn loading={busy} onClick={() => handleFollow(uid)} variant="primary">
                  <UserPlus size={13} /><span>{t('connections.follow')}</span>
                </ActionBtn>
              )}

              {activeTab === 'followers' && (
                <>
                  {!isFollowing && (
                    <ActionBtn loading={busy} onClick={() => handleFollow(uid)} variant="primary">
                      <UserPlus size={13} /><span>{t('connections.follow')}</span>
                    </ActionBtn>
                  )}
                  {isFollowing && !isFriend && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#168F6F]/10 text-[#168F6F] border border-[#168F6F]/20">
                      <UserCheck size={13} /> {t('connections.subscribed')}
                    </span>
                  )}
                  {isFriend && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#168F6F]/10 text-[#168F6F] border border-[#168F6F]/20">
                      <Heart size={13} className="fill-[#168F6F]" /> {t('connections.friend')}
                    </span>
                  )}
                  <ActionBtn loading={busy} onClick={() => handleRemoveFollower(uid)} variant="danger">
                    <UserX size={13} />
                  </ActionBtn>
                </>
              )}

              {activeTab === 'following' && (
                <ActionBtn loading={busy} onClick={() => handleUnfollow(uid)} variant="ghost">
                  <UserMinus size={13} /><span>{t('connections.unfollow')}</span>
                </ActionBtn>
              )}

              {activeTab === 'friends' && (
                <ActionBtn loading={busy} onClick={() => handleUnfollow(uid)} variant="ghost">
                  <UserMinus size={13} /><span>{t('connections.unfollow')}</span>
                </ActionBtn>
              )}
            </>
          )}

          {/* ── Viewing another user's relations ── */}
          {!isSelf && !isCurrentUser && (
            <>
              {isFollowing && !isFriend && (
                <ActionBtn loading={busy} onClick={() => handleUnfollow(uid)} variant="secondary">
                  <UserCheck size={13} /><span>{t('connections.subscribed')}</span>
                </ActionBtn>
              )}
              {isFriend && (
                <ActionBtn loading={busy} onClick={() => handleUnfollow(uid)} variant="secondary">
                  <Heart size={13} className="fill-[#168F6F]" /><span>{t('connections.friend')}</span>
                </ActionBtn>
              )}
              {!isFollowing && (
                <ActionBtn loading={busy} onClick={() => handleFollow(uid)} variant="primary">
                  <UserPlus size={13} /><span>{t('connections.follow')}</span>
                </ActionBtn>
              )}
            </>
          )}

          {/* Navigate arrow */}
          <button
            onClick={() => navigate(uid)}
            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 dark:text-gray-600"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const tabs: { key: TabType; label: string; icon: React.ReactNode; show: boolean }[] = [
    { key: 'followers',   label: t('connections.followers'),   icon: <Users size={15} />,     show: true },
    { key: 'following',   label: t('connections.following'),   icon: <UserCheck size={15} />, show: true },
    { key: 'friends',     label: t('connections.friends'),     icon: <Heart size={15} />,     show: true },
    { key: 'suggestions', label: t('connections.suggestions'), icon: <Sparkles size={15} />,  show: isCurrentUser },
  ];

  const data = currentData();
  const { title, sub } = emptyMsg();

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4">
          {isCurrentUser ? t('connections.title') : t('connections.relations')}
        </h3>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto gap-1">
          {tabs.filter((t) => t.show).map((t) => (
            <TabBtn
              key={t.key}
              active={activeTab === t.key}
              onClick={() => setActiveTab(t.key)}
              icon={t.icon}
              label={t.label}
              count={count(t.key)}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="py-2 max-h-[520px] overflow-y-auto">
        {loading ? (
          <div className="space-y-1 px-1 pt-1">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <Users size={24} className="text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5 px-1 pt-1">
            {data.map((item) => renderCard(item))}
          </div>
        )}
      </div>
    </div>
  );
}
