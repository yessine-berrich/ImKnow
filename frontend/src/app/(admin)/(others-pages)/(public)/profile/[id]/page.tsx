'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/modals/ToastContainer';
import { useParams, useRouter } from 'next/navigation';
import ArticleCard from '@/components/article/ArticleCard';
import { FileText, ChevronLeft, Heart, Eye, Users, UserCheck, UserPlus } from 'lucide-react';
import UserAboutCard from '@/components/public-profile/UserAboutCard';
import UserStatsCard from '@/components/public-profile/UserStatsCard';
import UserProfileHeader from '@/components/public-profile/UserProfileHeader';
import FollowTabs from '@/components/follow/FollowTabs';
import { fetchCurrentUser, isAuthenticated } from '../../../../../../../services/auth.service';
import { articleService } from '../../../../../../../services/article.service';
import { userService, User as UserType } from '../../../../../../../services/user.service';
import { followService } from '../../../../../../../services/follow.service';

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  department: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  facebook: string | null;
  twitter: string | null;
  linkedin: string | null;
  instagram: string | null;
  profileImage: string | null;
  avatar?: string | null;
  role: string;
  isActive: boolean;
  isOnline: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}

interface UserArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  author: {
    id?: number;
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
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [activeTab, setActiveTab] = useState<'articles' | 'relations'>('articles');
  const [user, setUser] = useState<User | null>(null);
  const [userArticles, setUserArticles] = useState<UserArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  // Follow stats
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [relationsTab, setRelationsTab] = useState<'followers' | 'following' | 'friends' | 'suggestions'>('followers');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await fetchCurrentUser();
        const isAuth = !!user && isAuthenticated();

        setAuthenticated(isAuth);
        setCurrentUserId(user?.id || null);
      } catch (error) {
        console.error('Error loading user:', error);
        setAuthenticated(false);
        setCurrentUserId(null);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);

      try {
        const userData = await userService.findOne(Number(userId));

        const normalizedUser = {
          ...userData,
          avatar: userData.avatar || userData.profileImage
        };

        setUser(normalizedUser as User);

        try {
          const followStats = await followService.getUserFollowStats(Number(userId));
          setFollowersCount(followStats.followersCount);
          setFollowingCount(followStats.followingCount);
          setFriendsCount(followStats.friendsCount);
        } catch (err) {
          console.error('Error loading follow stats:', err);
        }

        const articles = await articleService.getArticlesByUserId(Number(userId));

        // Normalisation du statut et filtrage des articles publiés seulement
        const formattedArticles: UserArticle[] = articles
          .map((article: any) => {
            // Normaliser le statut
            let normalizedStatus = String(article.status).toLowerCase();
            if (!['draft', 'published', 'pending', 'rejected'].includes(normalizedStatus)) {
              normalizedStatus = 'draft';
            }

            const authorName = article.author
              ? `${article.author.firstName || ''} ${article.author.lastName || ''}`.trim()
              : 'Utilisateur';

            const initials = authorName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U';

            // ✅ CORRECTION : Garder les tags avec leurs IDs
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

            let isLiked = false;
            if (currentUserId && article.likes && Array.isArray(article.likes)) {
              isLiked = article.likes.some((like: any) =>
                like.id === currentUserId ||
                like.userId === currentUserId ||
                like.user?.id === currentUserId
              );
            }

            let isBookmarked = false;
            if (currentUserId && article.bookmarks && Array.isArray(article.bookmarks)) {
              isBookmarked = article.bookmarks.some((bookmark: any) =>
                bookmark.id === currentUserId ||
                bookmark.userId === currentUserId ||
                bookmark.user?.id === currentUserId
              );
            }

            const articleDepartment = article.author?.department || 'Membre';

            return {
              id: String(article.id),
              title: article.title,
              description: article.description || article.content?.substring(0, 180) + '...' || '',
              content: article.content || '',
              author: {
                id: article.author?.id,
                name: authorName,
                initials: initials,
                department: articleDepartment,
                avatar: article.author?.avatar || article.author?.profileImage || undefined
              },
              category: {
                name: article.category?.name || 'Non classé',
                slug: article.category?.name?.toLowerCase().replace(/\s+/g, '-') || 'non-classe'
              },
              tags: tags,
              publishedAt: article.publishedAt || article.createdAt,
              status: normalizedStatus,
              stats: {
                likes: article.likes?.length || article.stats?.likes || 0,
                comments: article.comments?.length || article.stats?.comments || 0,
                views: article.viewsCount || article.stats?.views || 0,
              },
              isLiked: isLiked,
              isBookmarked: isBookmarked,
              isFeatured: false,
            };
          })
          // ✅ FILTRAGE IMPORTANT : Ne garder que les articles PUBLIÉS pour l'affichage public
          .filter(article => article.status === 'published');

        setUserArticles(formattedArticles);

        console.log('📊 Articles publiés chargés:', {
          total: formattedArticles.length,
          articles: formattedArticles.map(a => ({ title: a.title, status: a.status, tags: a.tags }))
        });

      } catch (err: any) {
        console.error('Erreur:', err);
        if (err.message?.includes('404') || err.message?.includes('non trouvé')) {
          setError('Utilisateur non trouvé');
        } else {
          setError('Impossible de charger les données du profil');
        }
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserData();
    }
  }, [userId, authenticated, currentUserId]);

  const handleLike = async (id: string) => {
    if (!isAuthenticated()) {
      toast.info('Veuillez vous connecter pour liker un article');
      return;
    }

    try {
      const article = userArticles.find(a => a.id === id);
      if (!article) return;

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

    } catch (err) {
      console.error('Erreur like:', err);
      toast.error('Erreur lors du like');
    }
  };

  const handleBookmark = async (id: string) => {
    if (!isAuthenticated()) {
      toast.info('Veuillez vous connecter pour sauvegarder un article');
      return;
    }

    try {
      const article = userArticles.find(a => a.id === id);
      if (!article) return;

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

    } catch (err) {
      console.error('Erreur bookmark:', err);
      toast.error('Erreur lors du bookmark');
    }
  };

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/articles/${id}`;
    navigator.clipboard.writeText(url);
    toast.success('Lien copié !');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatUserForHeader = (user: User) => {
    return {
      id: user.id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      profileImage: user.profileImage || user.avatar || undefined,
      role: user.role,
      department: user.department ?? 'Membre',
      email: user.email,
      isOnline: user.isOnline || false,
      lastSeenAt: user.lastSeenAt || null,
    };
  };

  const formatUserForAbout = (user: User) => {
    const location = [user.city, user.state, user.country]
      .filter(Boolean)
      .join(', ') || 'Localisation non spécifiée';

    return {
      email: user.email,
      phone: user.phone,
      department: user.department,
      city: user.city,
      country: user.country,
      postalCode: user.postalCode,
      bio: user.bio || '',
      joinDate: user.createdAt,
      website: undefined,
      location: location,
    };
  };

  // Statistiques basées sur les articles publiés
  const userStats = {
    totalArticles: userArticles.length,
    totalLikes: userArticles.reduce((sum, article) => sum + (article.stats?.likes || 0), 0),
    totalComments: userArticles.reduce((sum, article) => sum + (article.stats?.comments || 0), 0),
    totalViews: userArticles.reduce((sum, article) => sum + (article.stats?.views || 0), 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronLeft size={20} />
            Retour
          </button>
          <div className="mb-8 animate-pulse">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-4">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                <div className="flex gap-4">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronLeft size={20} />
            Retour
          </button>
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">😕</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Profil non trouvé
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error || "L'utilisateur que vous recherchez n'existe pas ou a été supprimé."}
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
        >
          <ChevronLeft size={20} />
          Retour
        </button>

        <UserProfileHeader
          user={formatUserForHeader(user)}
          stats={userStats}
          currentUserId={currentUserId}
          followersCount={followersCount}
          followingCount={followingCount}
          friendsCount={friendsCount}
          onFollowersClick={() => { setRelationsTab('followers'); setActiveTab('relations'); }}
          onFollowingClick={() => { setRelationsTab('following'); setActiveTab('relations'); }}
          onFriendsClick={() => { setRelationsTab('friends'); setActiveTab('relations'); }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <UserAboutCard user={formatUserForAbout(user)} />
            <UserStatsCard stats={userStats} />
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
                  <div className="flex border-b border-gray-200 dark:border-gray-800 mb-6">
                    <button
                      onClick={() => setActiveTab('articles')}
                      className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
                        activeTab === 'articles'
                          ? 'border-[#168F6F] text-[#168F6F] dark:text-[#00B383]'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                    >
                      <FileText size={18} />
                      Articles ({userArticles.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('relations')}
                      className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
                        activeTab === 'relations'
                          ? 'border-[#168F6F] text-[#168F6F] dark:text-[#00B383]'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                    >
                      <Users size={18} />
                      Relations
                    </button>
                  </div>

                  <div className="space-y-6">
                    {activeTab === 'articles' ? (
                      userArticles.length > 0 ? (
                        <>
                          {userArticles.map((article) => (
                            <ArticleCard
                              key={article.id}
                              article={article}
                              onLike={handleLike}
                              onBookmark={handleBookmark}
                              onShare={handleShare}
                              showActions={authenticated}
                              currentUserId={currentUserId}
                            />
                          ))}
                        </>
                      ) : (
                        <div className="py-12 text-center">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="text-gray-400 dark:text-gray-500" size={24} />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Aucun article publié
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            {user.firstName} n'a pas encore publié d'articles.
                          </p>
                        </div>
                      )
                    ) : (
                      <FollowTabs
                        key={relationsTab}
                        userId={Number(userId)}
                        currentUserId={currentUserId}
                        isCurrentUser={currentUserId === Number(userId)}
                        initialTab={relationsTab}
                      />
                    )}
                  </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}