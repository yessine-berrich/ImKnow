'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/modals/ToastContainer';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/context/LanguageContext';
import PublicationCard from '@/components/publication/PublicationCard';
import { FileText, ChevronLeft, Heart, Eye, Users, UserCheck, UserPlus } from 'lucide-react';
import UserAboutCard from '@/components/public-profile/UserAboutCard';
import UserStatsCard from '@/components/public-profile/UserStatsCard';
import UserProfileHeader from '@/components/public-profile/UserProfileHeader';
import FollowTabs from '@/components/follow/FollowTabs';
import { fetchCurrentUser, isAuthenticated } from '../../../../../../../services/auth.service';
import { publicationService } from '../../../../../../../services/publication.service';
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

interface UserPublication {
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
  const { t, language } = useTranslation();

  const [activeTab, setActiveTab] = useState<'publications' | 'relations'>('publications');
  const [user, setUser] = useState<User | null>(null);
  const [userPublications, setUserPublications] = useState<UserPublication[]>([]);
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

        const publications = await publicationService.getPublicationsByUserId(Number(userId));

        // Normalisation du statut et filtrage des publications publiés seulement
        const formattedPublications: UserPublication[] = publications
          .map((publication: any) => {
            // Normaliser le statut
            let normalizedStatus = String(publication.status).toLowerCase();
            if (!['draft', 'published', 'pending', 'rejected'].includes(normalizedStatus)) {
              normalizedStatus = 'draft';
            }

            const authorName = publication.author
              ? `${publication.author.firstName || ''} ${publication.author.lastName || ''}`.trim()
              : t('public_profile.default_author');

            const initials = authorName
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2) || 'U';

            // ✅ CORRECTION : Garder les tags avec leurs IDs
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

            let isLiked = false;
            if (currentUserId && publication.likes && Array.isArray(publication.likes)) {
              isLiked = publication.likes.some((like: any) =>
                like.id === currentUserId ||
                like.userId === currentUserId ||
                like.user?.id === currentUserId
              );
            }

            let isBookmarked = false;
            if (currentUserId && publication.bookmarks && Array.isArray(publication.bookmarks)) {
              isBookmarked = publication.bookmarks.some((bookmark: any) =>
                bookmark.id === currentUserId ||
                bookmark.userId === currentUserId ||
                bookmark.user?.id === currentUserId
              );
            }

            const publicationDepartment = publication.author?.department || t('public_profile.default_department');

            return {
              id: String(publication.id),
              title: publication.title,
              description: publication.description || publication.content?.substring(0, 180) + '...' || '',
              content: publication.content || '',
              author: {
                id: publication.author?.id,
                name: authorName,
                initials: initials,
                department: publicationDepartment,
                avatar: publication.author?.avatar || publication.author?.profileImage || undefined
              },
              category: {
                name: publication.category?.name || t('public_profile.uncategorized'),
                slug: publication.category?.name?.toLowerCase().replace(/\s+/g, '-') || 'non-classe'
              },
              tags: tags,
              publishedAt: publication.publishedAt || publication.createdAt,
              status: normalizedStatus,
              stats: {
                likes: publication.likes?.length || publication.stats?.likes || 0,
                comments: publication.comments?.length || publication.stats?.comments || 0,
                views: publication.viewsCount || publication.stats?.views || 0,
              },
              isLiked: isLiked,
              isBookmarked: isBookmarked,
              isFeatured: false,
            };
          })
          // ✅ FILTRAGE IMPORTANT : Ne garder que les publications PUBLIÉS pour l'affichage public
          .filter(publication => publication.status === 'published');

        setUserPublications(formattedPublications);

        console.log('📊 Publications publiés chargés:', {
          total: formattedPublications.length,
          publications: formattedPublications.map(a => ({ title: a.title, status: a.status, tags: a.tags }))
        });

      } catch (err: any) {
        console.error('Erreur:', err);
        if (err.message?.includes('404') || err.message?.includes('non trouvé')) {
          setError(t('public_profile.profile_not_found'));
        } else {
          setError(t('public_profile.user_not_found'));
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
      toast.info(t('public_profile.login_to_like'));
      return;
    }

    try {
      const publication = userPublications.find(a => a.id === id);
      if (!publication) return;

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

    } catch (err) {
      console.error('Erreur like:', err);
      toast.error(t('public_profile.like_error'));
    }
  };

  const handleBookmark = async (id: string) => {
    if (!isAuthenticated()) {
      toast.info(t('public_profile.login_to_save'));
      return;
    }

    try {
      const publication = userPublications.find(a => a.id === id);
      if (!publication) return;

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

    } catch (err) {
      console.error('Erreur bookmark:', err);
      toast.error(t('public_profile.bookmark_error'));
    }
  };

  const handleShare = (id: string) => {
    const url = `${window.location.origin}/publications/${id}`;
    navigator.clipboard.writeText(url);
    toast.success(t('public_profile.link_copied'));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
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
      department: user.department ?? t('public_profile.default_department'),
      email: user.email,
      isOnline: user.isOnline || false,
      lastSeenAt: user.lastSeenAt || null,
    };
  };

  const formatUserForAbout = (user: User) => {
    const location = [user.city, user.state, user.country]
      .filter(Boolean)
      .join(', ') || t('public_profile.location_unspecified');

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

  // Statistiques basées sur les publications publiés
  const userStats = {
    totalPublications: userPublications.length,
    totalLikes: userPublications.reduce((sum, publication) => sum + (publication.stats?.likes || 0), 0),
    totalComments: userPublications.reduce((sum, publication) => sum + (publication.stats?.comments || 0), 0),
    totalViews: userPublications.reduce((sum, publication) => sum + (publication.stats?.views || 0), 0),
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
            {t('public_profile.back')}
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
            {t('public_profile.back')}
          </button>
          <div className="text-center max-w-md mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">😕</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {t('public_profile.profile_not_found')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {error || t('public_profile.user_not_found')}
              </p>
              <button
                onClick={() => router.push('/')}
                className="px-6 py-2 bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
              >
                {t('public_profile.back_home')}
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
          {t('public_profile.back')}
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
                      onClick={() => setActiveTab('publications')}
                      className={`flex items-center gap-2 px-4 py-2 font-medium border-b-2 transition-colors ${
                        activeTab === 'publications'
                          ? 'border-[#168F6F] text-[#168F6F] dark:text-[#00B383]'
                          : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                      }`}
                    >
                      <FileText size={18} />
                      {t('public_profile.tab_publications')} ({userPublications.length})
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
                      {t('public_profile.tab_relations')}
                    </button>
                  </div>

                  <div className="space-y-6">
                    {activeTab === 'publications' ? (
                      userPublications.length > 0 ? (
                        <>
                          {userPublications.map((publication) => (
                            <PublicationCard
                              key={publication.id}
                              publication={publication}
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
                            {t('public_profile.no_publications_title')}
                          </h3>
                          <p className="text-gray-500 dark:text-gray-400">
                            {t('public_profile.no_publications_msg', { name: user.firstName })}
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