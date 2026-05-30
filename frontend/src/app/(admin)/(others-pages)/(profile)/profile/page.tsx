'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../../../../../../services/auth.service';
import { useUser } from '@/context/UserContext';
import { useTranslation } from '@/context/LanguageContext';
import { toast } from '@/components/modals/ToastContainer';
import { confirm } from '@/components/modals/ConfirmModal';
import { publicationService } from '../../../../../../services/publication.service';
import EditableUserProfileHeader from '@/components/user-profile/EditableUserProfileHeader';
import EditableUserAboutCard from '@/components/user-profile/EditableUserAboutCard';
import UserStatsCard from '@/components/public-profile/UserStatsCard';
import PublicationCard from '@/components/publication/PublicationCard';
import { followService } from '../../../../../../services/follow.service';
import CreatePublicationModal from '@/components/modals/CreatePublicationModal';

interface UserPublication {
  id: string;
  title: string;
  description: string;
  content: string;
  author: {
    id: number;
    name: string;
    initials: string;
    department: string;
    avatar?: string;
  };
  category: {
    name: string;
    slug: string;
  };
  tags: { id: number; name: string }[];
  publishedAt: string;
  status: 'draft' | 'published' | 'pending' | 'rejected';
  stats: {
    likes: number;
    comments: number;
    views: number;
  };
  isLiked: boolean;
  isBookmarked: boolean;
  isFeatured?: boolean;
  rejectionReason?: string | null;
}

export default function CurrentUserProfilePageWithAPI() {
  const router = useRouter();
  const { user: userData, loading: userLoading } = useUser();
  const { t, language } = useTranslation();
  const [activeTab, setActiveTab] = useState<'publications' | 'drafts' | 'pending' | 'rejected'>('publications');
  const [pubPage, setPubPage] = useState(1);
  const [userPublications, setUserPublications] = useState<UserPublication[]>([]);
  const [publicationsLoading, setPublicationsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Follow system states
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);

  const loading = userLoading || publicationsLoading;

  useEffect(() => {
    if (!userData) return;
    setPublicationsLoading(true);
    Promise.all([
      loadUserPublications(userData.id),
      loadFollowStats(userData.id),
    ]).finally(() => setPublicationsLoading(false));
  }, [userData?.id]);

  const loadFollowStats = async (userId: number | string) => {
    try {
      const stats = await followService.getUserFollowStats(Number(userId));
      setFollowersCount(stats.followersCount);
      setFollowingCount(stats.followingCount);
      setFriendsCount(stats.friendsCount);
    } catch (error) {
      console.error('Error loading follow stats:', error);
    }
  };

  const loadUserPublications = async (userId: number | string) => {
    try {
      const publications = await publicationService.getPublicationsByUserId(Number(userId));

      const uid = parseInt(userId);
      const formattedPublications: UserPublication[] = publications.map((publication: any) => {
        const likesCount = publication.likes?.length || publication.likesCount || publication.stats?.likes || 0;
        const commentsCount = publication.comments?.length || publication.commentsCount || publication.stats?.comments || 0;
        const viewsCount = publication.viewsCount || publication.stats?.views || 0;

        const isLiked = publication.likes?.some((like: any) =>
          like.id === uid || like.userId === uid
        ) || publication.isLiked || false;

        const isBookmarked = publication.bookmarks?.some((bookmark: any) =>
          bookmark.id === uid || bookmark.userId === uid
        ) || publication.isBookmarked || false;

        let tags: { id: number; name: string }[] = [];
        if (Array.isArray(publication.tags)) {
          tags = publication.tags.map((tag: any) => {
            if (typeof tag === 'object' && tag !== null) {
              return { id: tag.id || 0, name: tag.name || '' };
            }
            if (typeof tag === 'string') {
              return { id: 0, name: tag };
            }
            return { id: 0, name: String(tag) };
          });
        }

        return {
          id: publication.id.toString(),
          title: publication.title,
          description: publication.description || publication.content?.substring(0, 150) + '...' || '',
          content: publication.content,
          author: {
            id: publication.author?.id || uid,
            name: publication.author?.name || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || t('profile_page.default_role'),
            initials: publication.author?.initials ||
              ((userData?.firstName?.charAt(0) || '') + (userData?.lastName?.charAt(0) || '')).toUpperCase() || 'U',
            department: publication.author?.department || t('profile_page.default_department'),
            avatar: publication.author?.avatar || publication.author?.profileImage || userData?.profileImage,
          },
          category: publication.category ? {
            name: publication.category.name,
            slug: publication.category.name?.toLowerCase().replace(/\s+/g, '-') || 'general',
          } : { name: t('profile_page.default_category'), slug: 'general' },
          tags: tags,
          publishedAt: publication.publishedAt || publication.createdAt,
          status: publication.status || 'published',
          stats: {
            likes: likesCount,
            comments: commentsCount,
            views: viewsCount,
          },
          isLiked: isLiked,
          isBookmarked: isBookmarked,
          isFeatured: publication.isFeatured || false,
          rejectionReason: publication.rejectionReason || null,
        };
      });

      setUserPublications(formattedPublications);
    } catch (error) {
      console.error('Error loading publications:', error);
    }
  };

  // Calculate statistics from real data
  const userStats = {
    totalPublications: userPublications.filter(a => a.status === 'published').length,
    totalLikes: userPublications.reduce((sum, publication) => sum + (publication.stats?.likes || 0), 0),
    totalComments: userPublications.reduce((sum, publication) => sum + (publication.stats?.comments || 0), 0),
    totalViews: userPublications.reduce((sum, publication) => sum + (publication.stats?.views || 0), 0),
  };



  // ✅ NOUVELLE FONCTION pour rediriger vers les paramètres
  const handleEditProfile = () => {
    router.push('/settings?tab=profile');
  };

  const handleLike = async (id: string) => {
    try {
      if (!isAuthenticated()) {
        toast.info(t('profile_page.login_required'));
        return;
      }

      setUserPublications(prev => prev.map(publication => {
        if (publication.id === id) {
          const newIsLiked = !publication.isLiked;
          return {
            ...publication,
            isLiked: newIsLiked,
            stats: {
              ...publication.stats,
              likes: publication.stats.likes + (newIsLiked ? 1 : -1)
            }
          };
        }
        return publication;
      }));

      const result = await publicationService.toggleLike(parseInt(id));

      setUserPublications(prev => prev.map(publication => {
        if (publication.id === id) {
          return {
            ...publication,
            isLiked: result.publication.isLiked,
            stats: { ...publication.stats, likes: result.publication.likesCount }
          };
        }
        return publication;
      }));
    } catch (error) {
      console.error('Error liking publication:', error);
      if (userData) await loadUserPublications(userData.id);
    }
  };

  const handleBookmark = async (id: string) => {
    try {
      if (!isAuthenticated()) {
        toast.info(t('profile_page.login_required'));
        return;
      }

      setUserPublications(prev => prev.map(publication => {
        if (publication.id === id) {
          return {
            ...publication,
            isBookmarked: !publication.isBookmarked
          };
        }
        return publication;
      }));

      const result = await publicationService.toggleBookmark(parseInt(id));

      setUserPublications(prev => prev.map(publication => {
        if (publication.id === id) {
          return { ...publication, isBookmarked: result.publication.isBookmarked };
        }
        return publication;
      }));
    } catch (error) {
      console.error('Error bookmarking publication:', error);
      if (userData) await loadUserPublications(userData.id);
    }
  };

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/publications/${id}`;
    if (navigator.share) {
      navigator.share({
        title: 'Partager cet publication',
        url: url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
      });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleEdit = (id: string) => {
    console.log('Edit publication:', id);
  };

  const handleDelete = async (id: string) => {
    if (!await confirm(t('profile_page.delete_confirm'))) return;

    try {
      await publicationService.delete(parseInt(id));
      if (userData) await loadUserPublications(userData.id);
    } catch (error) {
      console.error('Error deleting publication:', error);
      toast.error(t('profile_page.delete_error'));
    }
  };

  const handlePublicationUpdated = () => {
    if (userData) loadUserPublications(userData.id);
  };

  const handleNavigateToRelations = (tab: 'followers' | 'following' | 'friends') => {
    router.push(`/connections?tab=${tab}`);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-5"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('profile_page.error_loading')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('profile_page.unable_to_load')}
          </p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
          >
            {t('profile_page.login')}
          </button>
        </div>
      </div>
    );
  }

  const publishedPublications = userPublications.filter(a => a.status === 'published');
  const draftPublications    = userPublications.filter(a => a.status === 'draft');
  const pendingPublications  = userPublications.filter(a => a.status === 'pending');
  const rejectedPublications = userPublications.filter(a => a.status === 'rejected');

  const getTabContent = () => {
    switch (activeTab) {
      case 'publications':  return publishedPublications;
      case 'drafts':    return draftPublications;
      case 'pending':   return pendingPublications;
      case 'rejected':  return rejectedPublications;
      default:          return [];
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'publications':
        return {
          title: t('profile_page.empty_published_title'),
          message: t('profile_page.empty_published_msg'),
        };
      case 'drafts':
        return {
          title: t('profile_page.empty_drafts_title'),
          message: t('profile_page.empty_drafts_msg'),
        };
      case 'pending':
        return {
          title: t('profile_page.empty_pending_title'),
          message: t('profile_page.empty_pending_msg'),
        };
      case 'rejected':
        return {
          title: t('profile_page.empty_rejected_title'),
          message: t('profile_page.empty_rejected_msg'),
        };
    }
  };

  const emptyState = getEmptyMessage();
  const currentPublications = getTabContent();

  const PUB_PAGE_SIZE = 5;
  const pubTotalPages = Math.max(1, Math.ceil(currentPublications.length / PUB_PAGE_SIZE));
  const paginatedPublications = currentPublications.slice(
    (pubPage - 1) * PUB_PAGE_SIZE,
    pubPage * PUB_PAGE_SIZE
  );

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setPubPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header with Edit button - ✅ utilise handleEditProfile pour rediriger */}
        <EditableUserProfileHeader
          user={{
            id: userData.id,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImage: userData.profileImage,
            role: userData.role || t('profile_page.default_role'),
            department: userData.department || t('profile_page.default_department_unspecified'),
            email: userData.email,
          }}
          stats={userStats}
          isCurrentUser={true}
          onEditClick={handleEditProfile}  // ✅ Changé ici - redirige vers /settings
          followersCount={followersCount}
          followingCount={followingCount}
          friendsCount={friendsCount}
          onFollowersClick={() => handleNavigateToRelations('followers')}
          onFollowingClick={() => handleNavigateToRelations('following')}
          onFriendsClick={() => handleNavigateToRelations('friends')}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Profile Info */}
          <div className="space-y-6">
            <EditableUserAboutCard
              user={{
                bio: userData.bio,
                city: userData.city,
                country: userData.country,
                postalCode: userData.postalCode,
                joinDate: userData.createdAt,
                website: userData.website,
                email: userData.email,
                phone: userData.phone,
                department: userData.department,
              }}
              isCurrentUser={true}
            />

            <UserStatsCard stats={userStats} />
          </div>

          {/* Right Column: Publications */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              {/* Header */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                      {t('profile_page.my_publications')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {t('profile_page.publications_subtitle')}
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => handleTabChange('publications')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'publications'
                      ? 'border-[#168F6F] text-[#168F6F] dark:text-[#00B383]'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                  >
                    {t('profile_page.tab_published')} ({publishedPublications.length})
                  </button>
                  <button
                    onClick={() => handleTabChange('drafts')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'drafts'
                      ? 'border-[#168F6F] text-[#168F6F] dark:text-[#00B383]'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                  >
                    {t('profile_page.tab_drafts')} ({draftPublications.length})
                  </button>
                  <button
                    onClick={() => handleTabChange('pending')}
                    className={`relative px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'pending'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                  >
                    {t('profile_page.tab_pending')}
                    {pendingPublications.length > 0 ? (
                      <span className={`ml-1.5 inline-flex items-center justify-center text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 ${
                        activeTab === 'pending'
                          ? 'bg-amber-500 text-white'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                      }`}>
                        {pendingPublications.length}
                      </span>
                    ) : (
                      <span className="ml-1 text-gray-400 dark:text-gray-500">(0)</span>
                    )}
                  </button>
                  <button
                    onClick={() => handleTabChange('rejected')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'rejected'
                      ? 'border-red-600 text-red-600 dark:text-red-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                  >
                    {t('profile_page.tab_rejected')} ({rejectedPublications.length})
                  </button>
                </div>
              </div>

              {/* Publications List */}
              <div className="space-y-6">
                {currentPublications.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="text-gray-400 dark:text-gray-500" size={24} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {emptyState.title}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      {emptyState.message}
                    </p>
                    {(activeTab === 'publications' || activeTab === 'drafts' || activeTab === 'pending') && (
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
                      >
                        {t('profile_page.create_publication')}
                      </button>
                    )}

                  </div>
                ) : (
                  <>
                    {paginatedPublications.map((publication) => (
                      <div key={publication.id} className="relative">
                        {activeTab === 'pending' && (
                          <div className="mb-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400 dark:bg-amber-500 flex-shrink-0">
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                                <circle cx="12" cy="12" r="10" strokeLinecap="round" />
                              </svg>
                            </span>
                            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                              {t('profile_page.pending_banner')}
                            </p>
                          </div>
                        )}
                        {activeTab === 'rejected' && publication.rejectionReason && (
                          <div className="mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">
                              <span className="font-medium">{t('profile_page.rejection_reason')}</span> {publication.rejectionReason}
                            </p>
                          </div>
                        )}
                        <PublicationCard
                          publication={{
                            ...publication,
                            author: {
                              id: userData.id,
                              name: `${userData.firstName} ${userData.lastName}`,
                              initials: `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase(),
                              department: userData.department || t('profile_page.default_department'),
                              avatar: userData.profileImage,
                            },
                          }}
                          onLike={handleLike}
                          onBookmark={handleBookmark}
                          onShare={handleShare}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onPublicationUpdated={handlePublicationUpdated}
                          showActions={true}
                          showHistory={true}
                          currentUserId={userData.id}
                        />
                      </div>
                    ))}

                    {/* Pagination */}
                    {pubTotalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {(pubPage - 1) * PUB_PAGE_SIZE + 1}–{Math.min(pubPage * PUB_PAGE_SIZE, currentPublications.length)} / {currentPublications.length}
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPubPage(p => Math.max(1, p - 1))}
                            disabled={pubPage === 1}
                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            ←
                          </button>
                          {Array.from({ length: pubTotalPages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === pubTotalPages || Math.abs(p - pubPage) <= 1)
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
                                  onClick={() => setPubPage(p as number)}
                                  className={`w-8 h-8 text-sm rounded-lg border transition-colors ${
                                    pubPage === p
                                      ? 'bg-[#168F6F] border-[#168F6F] text-white'
                                      : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                  }`}
                                >
                                  {p}
                                </button>
                              )
                            )}
                          <button
                            onClick={() => setPubPage(p => Math.min(pubTotalPages, p + 1))}
                            disabled={pubPage === pubTotalPages}
                            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            →
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

          <CreatePublicationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadUserPublications(userData.id);
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}