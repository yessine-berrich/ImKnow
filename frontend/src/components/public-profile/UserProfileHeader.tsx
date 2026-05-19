'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import {
  Heart, MessageCircle, Eye,
  UserPlus, UserCheck, UserMinus,
  Loader2, Send, MessageSquare, UserRoundCheck,
  Flag, X, AlertTriangle,
} from 'lucide-react';
import Avatar from '../ui/avatar/Avatar';
import { useTranslation } from '../../context/LanguageContext';
import { followService } from '../../../services/follow.service';
import { userService } from '../../../services/user.service';
import type { UserReportReason } from '../../../services/user.service';
import { useRouter } from 'next/navigation';
import SendMessageRequestModal from '../chat/SendMessageRequestModal';
import { useChatContext } from '../../context/ChatContext';

interface UserProfileHeaderProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    /** Stored path: /uploads/avatars/user-5-abc.webp — resolved by Avatar */
    profileImage?: string | null;
    role: string;
    department: string | null;
    email?: string;
    isOnline?: boolean;
    lastSeenAt?: Date | string | null;
  };
  stats: {
    totalPublications: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
  };
  currentUserId?: number | null;
  followersCount?: number;
  followingCount?: number;
  friendsCount?: number;
  onFollowersClick?: () => void;
  onFollowingClick?: () => void;
  onFriendsClick?: () => void;
  hideUnfollow?: boolean;
}

type FollowUIStatus = 'not-following' | 'follower' | 'following' | 'mutual';

export default function UserProfileHeader({
  user,
  stats,
  currentUserId,
  followersCount: propFollowersCount = 0,
  followingCount: propFollowingCount = 0,
  friendsCount: propFriendsCount = 0,
  onFollowersClick,
  onFollowingClick,
  onFriendsClick,
  hideUnfollow = false,
}: UserProfileHeaderProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { canShowOnlineFor } = useChatContext();

  const reportReasons: { value: UserReportReason; label: string }[] = [
    { value: 'harassment', label: t('user_header.report_reason_harassment') },
    { value: 'spam', label: t('user_header.report_reason_spam') },
    { value: 'inappropriate_content', label: t('user_header.report_reason_inappropriate') },
    { value: 'impersonation', label: t('user_header.report_reason_impersonation') },
    { value: 'other', label: t('user_header.report_reason_other') },
  ];

  const [followStatus, setFollowStatus] = useState<FollowUIStatus>('not-following');
  const [followersCount, setFollowersCount] = useState(propFollowersCount);
  const [followingCount, setFollowingCount] = useState(propFollowingCount);
  const [loading, setLoading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<UserReportReason>('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

  const targetUserId = parseInt(user.id);
  const isCurrentUser = currentUserId?.toString() === user.id;
  const isFriend = followStatus === 'mutual';

  // ── Follow data ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isCurrentUser && currentUserId) {
      loadFollowStatus();
      loadFollowStats();
    }
  }, [user.id, currentUserId, isCurrentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFollowStatus = async () => {
    try {
      const status = await followService.getStatus(targetUserId);
      if (status.isFollowing && status.isFollower) setFollowStatus('mutual');
      else if (status.isFollowing) setFollowStatus('following');
      else if (status.isFollower) setFollowStatus('follower');
      else setFollowStatus('not-following');
    } catch {
      setFollowStatus('not-following');
    }
  };

  const loadFollowStats = async () => {
    try {
      const data = await followService.getUserFollowStats(targetUserId);
      setFollowersCount(data.followersCount);
      setFollowingCount(data.followingCount);
    } catch { /* ignore */ }
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleFollow = async () => {
    if (!currentUserId) return showToast(t('user_header.login_to_follow'), 'error');
    setLoading(true);
    try {
      await followService.follow(targetUserId);
      const status = await followService.getStatus(targetUserId);
      if (status.isFollowing && status.isFollower) {
        setFollowStatus('mutual');
        showToast(t('user_header.now_friends'), 'success');
      } else {
        setFollowStatus('following');
        showToast(t('user_header.now_following'), 'success');
      }
      setFollowersCount((p) => p + 1);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setLoading(true);
    try {
      await followService.unfollow(targetUserId);
      const status = await followService.getStatus(targetUserId);
      if (status.isFollower && !status.isFollowing) setFollowStatus('follower');
      else if (!status.isFollower && !status.isFollowing) setFollowStatus('not-following');
      else if (status.isFollowing && status.isFollower) setFollowStatus('mutual');
      else if (status.isFollowing && !status.isFollower) setFollowStatus('following');
      else setFollowStatus('not-following');
      setFollowersCount((p) => Math.max(0, p - 1));
      showToast(t('user_header.unfollowed'), 'success');
      setShowOptions(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = useCallback(() => {
    if (isFriend) router.push(`/chat?userId=${user.id}`);
    else setShowRequestModal(true);
  }, [isFriend, router, user.id]);

  const handleReportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUserId) return showToast(t('user_header.login_to_report'), 'error');
    setReportLoading(true);
    try {
      const result = await userService.reportUser(targetUserId, {
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      });
      showToast(result.message || t('user_header.request_sent'), 'success');
      setShowReportModal(false);
      setReportReason('harassment');
      setReportDetails('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Erreur lors du signalement', 'error');
    } finally {
      setReportLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const el = document.createElement('div');
    el.className = `fixed top-4 right-4 z-[9999] px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium ${
      type === 'success' ? 'bg-[#168F6F]' : 'bg-red-600'
    }`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  };

  const baseButtonStyle =
    'h-9 px-4 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95 text-sm font-semibold';

  const getFollowButton = () => {
    if (isCurrentUser) return null;
    if (loading) {
      return (
        <button disabled className={`${baseButtonStyle} bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed`}>
          <Loader2 size={15} className="animate-spin" />
          <span>{t('user_header.loading')}</span>
        </button>
      );
    }
    if (followStatus === 'not-following') {
      return (
        <button onClick={handleFollow} className={`${baseButtonStyle} bg-[#168F6F] text-white hover:bg-[#00B383]`}>
          <UserPlus size={15} /><span>{t('user_header.follow')}</span>
        </button>
      );
    }
    if (followStatus === 'follower') {
      return (
        <button onClick={handleFollow} className={`${baseButtonStyle} bg-[#168F6F] text-white hover:bg-[#127a5f]`}>
          <UserRoundCheck size={15} /><span>{t('user_header.follow_back')}</span>
        </button>
      );
    }
    return (
      <div className="relative">
        <button
          onClick={() => !hideUnfollow && setShowOptions((v) => !v)}
          className={`${baseButtonStyle} ${
            followStatus === 'mutual'
              ? 'bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] border border-[#168F6F]/30 dark:border-[#168F6F]/30 hover:bg-[#168F6F]/20'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200'
          }`}
        >
          <UserCheck size={15} />
          <span>{followStatus === 'mutual' ? t('user_header.friends_label') : t('user_header.subscribed')}</span>
        </button>
        {showOptions && !hideUnfollow && (
          <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 py-1.5 w-48 z-20">
            <button
              onClick={handleUnfollow}
              className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <UserMinus size={14} />{t('user_header.unfollow')}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">

          {/* Avatar — src is resolved to a full URL inside Avatar via resolveAvatarUrl */}
          <div className="flex-shrink-0">
            <Avatar
              src={user.profileImage}
              alt={`${user.firstName} ${user.lastName}`}
              size="xxlarge"
              isOnline={canShowOnlineFor(Number(user.id)) && user.isOnline}
              lastSeenAt={user.lastSeenAt}
            />
          </div>

          <div className="flex-1">
            <div className="mb-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-base text-gray-500 dark:text-gray-400">
                {user.role} · {user.department ?? t('user_header.member')}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#00B383] text-sm font-medium rounded-full">
                  {stats.totalPublications} publication{stats.totalPublications !== 1 ? 's' : ''}
                </span>
                {!isCurrentUser && (
                  <>
                    <button onClick={onFollowersClick} className="px-3 py-1 bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#00B383] text-sm font-medium rounded-full hover:bg-[#168F6F]/20 transition-colors cursor-pointer">
                      <span className="font-bold">{followersCount}</span> {followersCount !== 1 ? t('user_header.followers_plural') : t('user_header.followers_singular')}
                    </button>
                    <button onClick={onFollowingClick} className="px-3 py-1 bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#00B383] text-sm font-medium rounded-full hover:bg-[#168F6F]/20 transition-colors cursor-pointer">
                      <span className="font-bold">{followingCount}</span> {followingCount !== 1 ? t('user_header.following_plural') : t('user_header.following_singular')}
                    </button>
                    {propFriendsCount > 0 && (
                      <button onClick={onFriendsClick} className="px-3 py-1 bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#00B383] text-sm font-medium rounded-full hover:bg-[#168F6F]/20 transition-colors cursor-pointer">
                        <span className="font-bold">{propFriendsCount}</span> {propFriendsCount !== 1 ? t('user_header.friends_plural') : t('user_header.friends_singular')}
                      </button>
                    )}
                  </>
                )}
              </div>

              {!isCurrentUser && (
                <div className="flex flex-wrap items-center gap-2">
                  {getFollowButton()}
                  <button
                    onClick={handleMessageClick}
                    className={`${baseButtonStyle} ${
                      isFriend
                        ? 'bg-[#168F6F] text-white hover:bg-[#00B383]'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isFriend ? <Send size={15} /> : <MessageSquare size={15} />}
                    <span>{isFriend ? t('user_header.message') : t('user_header.contact')}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (!currentUserId) { showToast(t('user_header.login_to_report'), 'error'); return; }
                      setShowReportModal(true);
                    }}
                    className={`${baseButtonStyle} bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800`}
                    title="Signaler ce profil"
                  >
                    <Flag size={15} /><span>{t('user_header.report')}</span>
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5"><Heart size={14} className="text-[#168F6F]" /><span>{stats.totalLikes} {t('user_header.likes')}</span></span>
              <span className="flex items-center gap-1.5"><MessageCircle size={14} className="text-[#168F6F]" /><span>{stats.totalComments} {t('user_header.comments')}</span></span>
              <span className="flex items-center gap-1.5"><Eye size={14} className="text-[#168F6F]" /><span>{stats.totalViews.toLocaleString()} {t('user_header.views')}</span></span>
            </div>
          </div>
        </div>
      </div>

      {showRequestModal && (
        <SendMessageRequestModal
          user={{
            id: targetUserId,
            firstName: user.firstName,
            lastName: user.lastName,
            profileImage: user.profileImage ?? undefined,
            department: user.department ?? undefined,
            isOnline: user.isOnline,
            lastSeenAt: user.lastSeenAt ?? undefined,
          }}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => showToast(t('user_header.request_sent'), 'success')}
        />
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('user_header.report_title', { name: `${user.firstName} ${user.lastName}` })}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('user_header.report_subtitle')}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300" aria-label={t('user_header.close')}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('user_header.report_reason_label')}</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value as UserReportReason)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                >
                  {reportReasons.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('user_header.report_details_label')}</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder={t('user_header.report_details_placeholder')}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                />
                <div className="mt-1 text-right text-xs text-gray-400">{reportDetails.length}/1000</div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowReportModal(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
                  {t('user_header.cancel')}
                </button>
                <button type="submit" disabled={reportLoading} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70">
                  {reportLoading && <Loader2 size={15} className="animate-spin" />}
                  {t('user_header.send_report')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
