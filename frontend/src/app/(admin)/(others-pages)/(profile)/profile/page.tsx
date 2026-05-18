'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../../../../../../services/auth.service';
import { useUser } from '@/context/UserContext';
import { useTranslation } from '@/context/LanguageContext';
import { toast } from '@/components/modals/ToastContainer';
import { confirm } from '@/components/modals/ConfirmModal';
import { articleService } from '../../../../../../services/article.service';
import EditableUserProfileHeader from '@/components/user-profile/EditableUserProfileHeader';
import EditableUserAboutCard from '@/components/user-profile/EditableUserAboutCard';
import UserStatsCard from '@/components/public-profile/UserStatsCard';
import ArticleCard from '@/components/article/ArticleCard';
import { followService } from '../../../../../../services/follow.service';
import CreateArticleModal from '@/components/modals/CreateArticleModal';

interface UserArticle {
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
  const [activeTab, setActiveTab] = useState<'articles' | 'drafts' | 'pending' | 'rejected'>('articles');
  const [userArticles, setUserArticles] = useState<UserArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Follow system states
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);

  const loading = userLoading || articlesLoading;

  useEffect(() => {
    if (!userData) return;
    setArticlesLoading(true);
    Promise.all([
      loadUserArticles(userData.id),
      loadFollowStats(userData.id),
    ]).finally(() => setArticlesLoading(false));
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

  const loadUserArticles = async (userId: number | string) => {
    try {
      const articles = await articleService.getArticlesByUserId(Number(userId));

      const uid = parseInt(userId);
      const formattedArticles: UserArticle[] = articles.map((article: any) => {
        const likesCount = article.likes?.length || article.likesCount || article.stats?.likes || 0;
        const commentsCount = article.comments?.length || article.commentsCount || article.stats?.comments || 0;
        const viewsCount = article.viewsCount || article.stats?.views || 0;

        const isLiked = article.likes?.some((like: any) =>
          like.id === uid || like.userId === uid
        ) || article.isLiked || false;

        const isBookmarked = article.bookmarks?.some((bookmark: any) =>
          bookmark.id === uid || bookmark.userId === uid
        ) || article.isBookmarked || false;

        let tags: { id: number; name: string }[] = [];
        if (Array.isArray(article.tags)) {
          tags = article.tags.map((tag: any) => {
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
          id: article.id.toString(),
          title: article.title,
          description: article.description || article.content?.substring(0, 150) + '...' || '',
          content: article.content,
          author: {
            id: article.author?.id || uid,
            name: article.author?.name || `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || t('profile_page.default_role'),
            initials: article.author?.initials ||
              ((userData?.firstName?.charAt(0) || '') + (userData?.lastName?.charAt(0) || '')).toUpperCase() || 'U',
            department: article.author?.department || t('profile_page.default_department'),
            avatar: article.author?.avatar || article.author?.profileImage || userData?.profileImage,
          },
          category: article.category ? {
            name: article.category.name,
            slug: article.category.name?.toLowerCase().replace(/\s+/g, '-') || 'general',
          } : { name: t('profile_page.default_category'), slug: 'general' },
          tags: tags,
          publishedAt: article.publishedAt || article.createdAt,
          status: article.status || 'published',
          stats: {
            likes: likesCount,
            comments: commentsCount,
            views: viewsCount,
          },
          isLiked: isLiked,
          isBookmarked: isBookmarked,
          isFeatured: article.isFeatured || false,
          rejectionReason: article.rejectionReason || null,
        };
      });

      setUserArticles(formattedArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  };

  // Calculate statistics from real data
  const userStats = {
    totalArticles: userArticles.filter(a => a.status === 'published').length,
    totalLikes: userArticles.reduce((sum, article) => sum + (article.stats?.likes || 0), 0),
    totalComments: userArticles.reduce((sum, article) => sum + (article.stats?.comments || 0), 0),
    totalViews: userArticles.reduce((sum, article) => sum + (article.stats?.views || 0), 0),
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

      setUserArticles(prev => prev.map(article => {
        if (article.id === id) {
          const newIsLiked = !article.isLiked;
          return {
            ...article,
            isLiked: newIsLiked,
            stats: {
              ...article.stats,
              likes: article.stats.likes + (newIsLiked ? 1 : -1)
            }
          };
        }
        return article;
      }));

      const result = await articleService.toggleLike(parseInt(id));

      setUserArticles(prev => prev.map(article => {
        if (article.id === id) {
          return {
            ...article,
            isLiked: result.article.isLiked,
            stats: { ...article.stats, likes: result.article.likesCount }
          };
        }
        return article;
      }));
    } catch (error) {
      console.error('Error liking article:', error);
      if (userData) await loadUserArticles(userData.id);
    }
  };

  const handleBookmark = async (id: string) => {
    try {
      if (!isAuthenticated()) {
        toast.info(t('profile_page.login_required'));
        return;
      }

      setUserArticles(prev => prev.map(article => {
        if (article.id === id) {
          return {
            ...article,
            isBookmarked: !article.isBookmarked
          };
        }
        return article;
      }));

      const result = await articleService.toggleBookmark(parseInt(id));

      setUserArticles(prev => prev.map(article => {
        if (article.id === id) {
          return { ...article, isBookmarked: result.article.isBookmarked };
        }
        return article;
      }));
    } catch (error) {
      console.error('Error bookmarking article:', error);
      if (userData) await loadUserArticles(userData.id);
    }
  };

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/articles/${id}`;
    if (navigator.share) {
      navigator.share({
        title: 'Partager cet article',
        url: url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
      });
    } else {
      navigator.clipboard.writeText(url);
    }
  };

  const handleEdit = (id: string) => {
    console.log('Edit article:', id);
  };

  const handleDelete = async (id: string) => {
    if (!await confirm(t('profile_page.delete_confirm'))) return;

    try {
      await articleService.delete(parseInt(id));
      if (userData) await loadUserArticles(userData.id);
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error(t('profile_page.delete_error'));
    }
  };

  const handleArticleUpdated = () => {
    if (userData) loadUserArticles(userData.id);
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

  const publishedArticles = userArticles.filter(a => a.status === 'published');
  const draftArticles    = userArticles.filter(a => a.status === 'draft');
  const pendingArticles  = userArticles.filter(a => a.status === 'pending');
  const rejectedArticles = userArticles.filter(a => a.status === 'rejected');

  const getTabContent = () => {
    switch (activeTab) {
      case 'articles':  return publishedArticles;
      case 'drafts':    return draftArticles;
      case 'pending':   return pendingArticles;
      case 'rejected':  return rejectedArticles;
      default:          return [];
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'articles':
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
  const currentArticles = getTabContent();

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

          {/* Right Column: Articles */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
              {/* Header */}
              <div className="mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white/90">
                      {t('profile_page.my_articles')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {t('profile_page.articles_subtitle')}
                    </p>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-800">
                  <button
                    onClick={() => setActiveTab('articles')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'articles'
                      ? 'border-[#168F6F] text-[#168F6F] dark:text-[#00B383]'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                  >
                    {t('profile_page.tab_published')} ({publishedArticles.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('drafts')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'drafts'
                      ? 'border-[#168F6F] text-[#168F6F] dark:text-[#00B383]'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                  >
                    {t('profile_page.tab_drafts')} ({draftArticles.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`relative px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'pending'
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                  >
                    {t('profile_page.tab_pending')}
                    {pendingArticles.length > 0 ? (
                      <span className={`ml-1.5 inline-flex items-center justify-center text-xs font-bold rounded-full min-w-[18px] h-[18px] px-1 ${
                        activeTab === 'pending'
                          ? 'bg-amber-500 text-white'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                      }`}>
                        {pendingArticles.length}
                      </span>
                    ) : (
                      <span className="ml-1 text-gray-400 dark:text-gray-500">(0)</span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('rejected')}
                    className={`px-4 py-2 font-medium border-b-2 transition-colors ${activeTab === 'rejected'
                      ? 'border-red-600 text-red-600 dark:text-red-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                  >
                    {t('profile_page.tab_rejected')} ({rejectedArticles.length})
                  </button>
                </div>
              </div>

              {/* Articles List */}
              <div className="space-y-6">
                {currentArticles.length === 0 ? (
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
                    {(activeTab === 'articles' || activeTab === 'drafts' || activeTab === 'pending') && (
                      <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-4 py-2 bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
                      >
                        {t('profile_page.create_article')}
                      </button>
                    )}

                  </div>
                ) : (
                  <>
                    {currentArticles.map((article) => (
                      <div key={article.id} className="relative">
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
                        {activeTab === 'rejected' && article.rejectionReason && (
                          <div className="mb-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">
                              <span className="font-medium">{t('profile_page.rejection_reason')}</span> {article.rejectionReason}
                            </p>
                          </div>
                        )}
                        <ArticleCard
                          article={{
                            ...article,
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
                          onArticleUpdated={handleArticleUpdated}
                          showActions={true}
                          showHistory={true}
                          currentUserId={userData.id}
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

          <CreateArticleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadUserArticles(userData.id);
          setIsCreateModalOpen(false);
        }}
      />
    </div>
  );
}