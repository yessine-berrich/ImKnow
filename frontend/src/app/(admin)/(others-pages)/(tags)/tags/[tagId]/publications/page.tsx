'use client';

import { getToken } from '../../../../../../../../services/auth.service';
import { useState, useEffect } from 'react';
import { toast } from '@/components/modals/ToastContainer';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, FileText, TrendingUp, Clock, Eye, Tag } from 'lucide-react';
import PublicationCard from '@/components/publication/PublicationCard';
import { useTranslation } from '@/context/LanguageContext';

interface TagData {
  id: number;
  name: string;
  publicationCount?: number;
}

export default function TagPublicationsPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const tagId = params.tagId as string;
  
  const [tag, setTag] = useState<TagData | null>(null);
  const [publications, setPublications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'views'>('recent');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // Récupérer l'ID utilisateur depuis le token
  const getUserIdFromToken = () => {
    const token = getToken();
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      return decoded.sub || decoded.id || decoded.userId || null;
    } catch {
      const userIdFromStorage = localStorage.getItem('userId');
      return userIdFromStorage ? parseInt(userIdFromStorage) : null;
    }
  };

  useEffect(() => {
    const token = getToken();
    const userIdFromToken = getUserIdFromToken();
    
    if (token && userIdFromToken) {
      setIsAuthenticated(true);
      setCurrentUserId(userIdFromToken);
    } else {
      const userIdFromStorage = localStorage.getItem('userId');
      if (userIdFromStorage) {
        setIsAuthenticated(true);
        setCurrentUserId(parseInt(userIdFromStorage));
      } else {
        setIsAuthenticated(false);
        setCurrentUserId(null);
      }
    }
  }, []);

  useEffect(() => {
    loadTagAndPublications();
  }, [tagId, sortBy]);

  const loadTagAndPublications = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      // Charger les infos du tag
      const tagResponse = await fetch(`${API_URL}/api/tags/${tagId}`, {
        headers,
      });

      if (!tagResponse.ok) {
        throw new Error(t('cat_pub.not_found_tag'));
      }

      const tagData = await tagResponse.json();
      setTag({
        id: tagData.id,
        name: tagData.name,
        publicationCount: tagData.publications?.length || 0,
      });

      // Charger tous les publications
      const publicationsResponse = await fetch(`${API_URL}/api/publications`, {
        headers,
      });

      if (!publicationsResponse.ok) {
        throw new Error(t('cat_pub.load_error'));
      }

      const allPublications = await publicationsResponse.json();

      // Filtrer les publications qui ont ce tag et sont publiés
      let filteredPublications = allPublications.filter((publication: any) => {
        // Vérifier si l'publication a le tag recherché
        const hasTag = publication.tags?.some((t: any) => {
          if (typeof t === 'object' && t !== null) {
            return t.id === parseInt(tagId) || t.name === tagData.name;
          }
          return t === tagData.name || t === parseInt(tagId);
        });
        
        return hasTag && publication.status === 'published';
      });

      // Transformer les publications pour PublicationCard
      const formatted = filteredPublications.map((publication: any) => {
        // ✅ CORRECTION : Extraire correctement le nom de l'auteur
        const author = publication.author || {};
        const firstName = author.firstName || '';
        const lastName = author.lastName || '';
        const authorName = firstName && lastName 
          ? `${firstName} ${lastName}` 
          : author.name || 'Utilisateur';
        
        const authorInitials = authorName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'U';

        // ✅ CORRECTION : Garder les tags avec leurs IDs
        let tags: { id: number; name: string }[] = [];
        if (Array.isArray(publication.tags)) {
          tags = publication.tags.map((tagItem: any) => {
            if (typeof tagItem === 'object' && tagItem !== null) {
              return { id: tagItem.id || 0, name: tagItem.name || '' };
            }
            if (typeof tagItem === 'string') {
              return { id: 0, name: tagItem };
            }
            return { id: 0, name: String(tagItem) };
          });
        }

        return {
          id: String(publication.id),
          title: publication.title,
          description: publication.description || publication.content?.substring(0, 150) + '...' || '',
          content: publication.content || '',
          author: {
            id: publication.author?.id,
            name: authorName,
            initials: authorInitials,
            department: publication.author?.role || publication.author?.department || 'Membre',
            avatar: publication.author?.avatar || publication.author?.profileImage || null,
          },
          category: publication.category ? {
            id: publication.category.id,
            name: publication.category.name,
            slug: publication.category.name?.toLowerCase().replace(/\s+/g, '-') || 'non-classe'
          } : {
            name: 'Non classé',
            slug: 'non-classe'
          },
          tags: tags,
          publishedAt: publication.publishedAt || publication.createdAt,
          status: publication.status || 'published',
          stats: {
            likes: publication.stats?.likes || 0,
            comments: publication.stats?.comments || 0,
            views: publication.stats?.views || 0,
          },
          isLiked: publication.isLiked || false,
          isBookmarked: publication.isBookmarked || false,
          isFeatured: false,
        };
      });

      // Trier selon le critère sélectionné
      switch (sortBy) {
        case 'popular':
          formatted.sort((a: any, b: any) => b.stats.likes - a.stats.likes);
          break;
        case 'views':
          formatted.sort((a: any, b: any) => b.stats.views - a.stats.views);
          break;
        case 'recent':
        default:
          formatted.sort((a: any, b: any) => 
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          );
      }

      setPublications(formatted);
    } catch (err: any) {
      console.error('Error loading tag publications:', err);
      setError(err.message || t('cat_pub.load_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (id: string) => {
    const token = getToken();
    if (!token) {
      toast.info(t('cat_pub.toast_login_like'));
      return;
    }

    try {
      const publication = publications.find(a => a.id === id);
      if (!publication) return;

      const newIsLiked = !publication.isLiked;

      // Optimistic update
      setPublications(prev => prev.map(publication => {
        if (publication.id === id) {
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

      const response = await fetch(`${API_URL}/api/publications/${id}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(t('cat_pub.toast_like_error'));
      }

    } catch (err) {
      console.error('Erreur like:', err);
      toast.error(t('cat_pub.toast_like_error'));
      await loadTagAndPublications();
    }
  };

  const handleBookmark = async (id: string) => {
    const token = getToken();
    if (!token) {
      toast.info(t('cat_pub.toast_login_bookmark'));
      return;
    }

    try {
      const publication = publications.find(a => a.id === id);
      if (!publication) return;

      const newIsBookmarked = !publication.isBookmarked;

      setPublications(prev => prev.map(publication => {
        if (publication.id === id) {
          return {
            ...publication,
            isBookmarked: newIsBookmarked
          };
        }
        return publication;
      }));

      const response = await fetch(`${API_URL}/api/publications/${id}/bookmark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(t('cat_pub.toast_bookmark_error'));
      }

    } catch (err) {
      console.error('Erreur bookmark:', err);
      toast.error(t('cat_pub.toast_bookmark_error'));
      await loadTagAndPublications();
    }
  };

  const handleShare = (id: string) => {
    const publication = publications.find(a => a.id === id);
    if (!publication) return;
    
    const url = `${window.location.origin}/home?publication=${id}`;
    if (navigator.share) {
      navigator.share({
        title: publication.title,
        text: publication.description,
        url: url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
        toast.success(t('cat_pub.toast_link_copied'));
      });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Lien copié !');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#168F6F] mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('cat_pub.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('cat_pub.error_title')}</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {t('cat_pub.back')}
            </button>
            <button
              onClick={loadTagAndPublications}
              className="px-4 py-2 bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
            >
              {t('cat_pub.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        
        {/* Header avec retour */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{t('cat_pub.back')}</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-6 h-6 text-[#168F6F] dark:text-[#00B383]" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {tag?.name}
                </h1>
              </div>
              <div className="flex items-center gap-4 mt-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t(publications.length > 1 ? 'cat_pub.pub_count_plural' : 'cat_pub.pub_count', { count: publications.length })}
                </span>
                {tag?.publicationCount && tag.publicationCount > publications.length && (() => {
                  const diff = tag.publicationCount - publications.length;
                  return (
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">
                      {t(diff > 1 ? 'cat_pub.tag_unpublished_plural' : 'cat_pub.tag_unpublished', { count: diff })}
                    </span>
                  );
                })()}
                {!isAuthenticated && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    {t('cat_pub.login_to_interact')}
                  </span>
                )}
              </div>
            </div>

            {/* Filtres de tri */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                {t('cat_pub.sort_by')}
              </span>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-1 border border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => setSortBy('recent')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    sortBy === 'recent'
                      ? 'bg-[#168F6F]/10 text-[#168F6F] dark:bg-[#168F6F]/20 dark:text-[#00B383]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('cat_pub.sort_recent')}</span>
                </button>
                <button
                  onClick={() => setSortBy('popular')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    sortBy === 'popular'
                      ? 'bg-[#168F6F]/10 text-[#168F6F] dark:bg-[#168F6F]/20 dark:text-[#00B383]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('cat_pub.sort_popular')}</span>
                </button>
                <button
                  onClick={() => setSortBy('views')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    sortBy === 'views'
                      ? 'bg-[#168F6F]/10 text-[#168F6F] dark:bg-[#168F6F]/20 dark:text-[#00B383]'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('cat_pub.sort_views')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des publications */}
        {publications.length > 0 ? (
          <div className="space-y-6">
            {publications.map((publication) => (
              <PublicationCard
                key={publication.id}
                publication={publication}
                onLike={handleLike}
                onBookmark={handleBookmark}
                onShare={handleShare}
                showActions={isAuthenticated}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="h-8 w-8 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('cat_pub.tag_empty_title')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t('cat_pub.tag_empty_text')}
            </p>
            <button
              onClick={() => router.back()}
              className="px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              {t('cat_pub.tag_back')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}