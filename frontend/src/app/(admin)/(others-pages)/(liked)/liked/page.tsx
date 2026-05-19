// /home/pfe2026/Desktop/PfeProject/frontend/src/app/(admin)/(others-pages)/(liked)/liked/page.tsx

'use client';

import { getToken } from '../../../../../../services/auth.service';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { confirm } from '@/components/modals/ConfirmModal';
import { 
  Heart, 
  ArrowLeft,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

import PublicationCard from '@/components/publication/PublicationCard';
import PublicationFilterBar, { FilterOptions } from '@/components/Filter/PublicationFilterBar';
import { useTranslation } from '@/context/LanguageContext';


// ============================================
// CONFIGURATION
// ============================================
const API_URL = 'http://localhost:3000'; // Backend NestJS

// ============================================
// COMPOSANT PRINCIPAL
//============================================

export default function LikedPublicationsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  // États
  const [publications, setPublications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Catégories et tags disponibles
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  // Filtres
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'recent',
    selectedCategory: 'all',
    selectedTag: 'all'
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================

  const getApiUrl = (path: string) => {
    return API_URL ? `${API_URL}${path}` : path;
  };

  // ============================================
  // FONCTIONS API
  // ============================================

  const fetchLikedPublications = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      
      if (!token) {
        router.push('/auth/signin');
        return;
      }

      const url = getApiUrl('/api/publications/user/liked');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/auth/signin');
        throw new Error('Session expirée');
      }

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const categoriesSet = new Set<string>();
        const tagsSet = new Set<string>();

        // Transformation des données
        const formattedPublications = data.publications.map((publication: any) => {
          const authorName = publication.author?.name || t('activity_common.default_author');
          const initials = authorName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          // Collecter les catégories
          if (publication.category?.name) {
            categoriesSet.add(publication.category.name);
          }

          // Collecter les tags
          publication.tags?.forEach((tag: string) => {
            if (tag) tagsSet.add(tag);
          });

          return {
            id: String(publication.id),
            title: publication.title,
            description: publication.description || publication.content?.substring(0, 180) + '...',
            content: publication.content || '',
            author: {
              id: publication.author?.id,
              name: authorName,
              initials: initials,
              department: publication.author?.department || t('activity_common.default_department'),
              avatar: publication.author?.avatar || null
            },
            category: {
              name: publication.category?.name || t('activity_common.uncategorized'),
              slug: publication.category?.name?.toLowerCase().replace(/\s+/g, '-') || 'non-classe'
            },
            tags: publication.tags || [],
            publishedAt: publication.publishedAt || publication.createdAt,
            updatedAt: publication.updatedAt,
            status: publication.status || 'published',
            stats: {
              likes: publication.likesCount || 0,
              comments: publication.commentsCount || 0,
              views: publication.viewsCount || publication.stats?.views || 0, 
            },
            isLiked: true,
            isBookmarked: publication.bookmarksCount > 0,
            isFeatured: false,
          };
        });

        setPublications(formattedPublications);
        setTotalCount(data.count);
        setAvailableCategories(Array.from(categoriesSet).sort());
        setAvailableTags(Array.from(tagsSet).sort());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlike = async (publicationId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      // Optimistic update
      setPublications(prev => prev.filter(a => a.id !== publicationId));
      setTotalCount(prev => Math.max(0, prev - 1));

      const url = getApiUrl(`/api/publications/${publicationId}/like`);
      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      await fetchLikedPublications();
    }
  };

  const handleBookmark = async (publicationId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      const publication = publications.find(a => a.id === publicationId);
      if (!publication) return;

      const newBookmarkState = !publication.isBookmarked;
      
      setPublications(prev => 
        prev.map(a => 
          a.id === publicationId 
            ? { ...a, isBookmarked: newBookmarkState } 
            : a
        )
      );

      const url = getApiUrl(`/api/publications/${publicationId}/bookmark`);
      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      await fetchLikedPublications();
    }
  };

  const handleShare = (publicationId: string) => {
    const publication = publications.find(a => a.id === publicationId);
    if (!publication) return;

    const shareUrl = `${window.location.origin}/publications/${publicationId}`;
    
    if (navigator.share) {
      navigator.share({
        title: publication.title,
        text: publication.description,
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleEdit = (publicationId: string) => {
    router.push(`/publications/edit/${publicationId}`);
  };

  const handleDelete = async (publicationId: string) => {
    if (!await confirm(t('activity_common.delete_confirm'))) return;
    
    try {
      const token = getToken();
      const url = getApiUrl(`/api/publications/${publicationId}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setPublications(prev => prev.filter(a => a.id !== publicationId));
        setTotalCount(prev => prev - 1);
      }
    } catch {
      // Silently handle error
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset à la première page quand les filtres changent
  };

  // Chargement initial
  useEffect(() => {
    fetchLikedPublications();
  }, []);

  // ============================================
  // FILTRAGE ET TRI
  // ============================================

  const filteredPublications = publications
    .filter(publication => {
      const matchesCategory = filters.selectedCategory === 'all' || publication.category.name === filters.selectedCategory;
      const matchesTag = filters.selectedTag === 'all' || publication.tags.includes(filters.selectedTag);
      
      return matchesCategory && matchesTag;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'recent') {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      } else if (filters.sortBy === 'oldest') {
        return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      } else if (filters.sortBy === 'popular') {
        return b.stats.likes - a.stats.likes;
      }
      return 0;
    });

  const totalPages = Math.ceil(filteredPublications.length / itemsPerPage);
  const paginatedPublications = filteredPublications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ============================================
  // RENDU
  // ============================================

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              {t('liked.loading')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/20">
                <Heart className="h-5 w-5 text-red-600 dark:text-red-400 fill-current" />
              </span>
              {t('liked.title')}
            </h1>
            {totalCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {totalCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {totalCount === 0
              ? t('liked.count_none')
              : totalCount === 1
                ? t('liked.count_one', { count: totalCount })
                : t('liked.count_plural', { count: totalCount })
            }
          </p>
        </div>
      </div>

      {/* 🔥 NOUVEAU COMPOSANT DE FILTRES 🔥 */}
      <PublicationFilterBar
        categories={availableCategories}
        tags={availableTags}
        activeFilters={filters}
        onFilterChange={handleFilterChange}
        className="mb-6"
      />

      {/* État d'erreur */}
      {error && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 rounded-full bg-red-100 p-4 dark:bg-red-900/20">
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            {error === 'Session expirée' ? t('activity_common.session_expired') : t('activity_common.load_error')}
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {error === 'Session expirée'
              ? t('activity_common.reconnect')
              : t('liked.load_error')}
          </p>
          {error === 'Session expirée' ? (
            <Link
              href="/auth/signin"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
            >
              {t('activity_common.login')}
            </Link>
          ) : (
            <button
              onClick={fetchLikedPublications}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
            >
              {t('activity_common.retry')}
            </button>
          )}
        </div>
      )}

      {/* État vide */}
      {!error && filteredPublications.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-700">
            <Heart className="h-12 w-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            {t('liked.empty_title')}
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {t('liked.empty_desc')}
          </p>
          <Link
            href="/publications"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
          >
            {t('activity_common.explore_publications')}
          </Link>
        </div>
      )}

      {/* Grille des publications */}
      {!error && filteredPublications.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {paginatedPublications.map((publication) => (
              <PublicationCard
                key={publication.id}
                publication={publication}
                onLike={() => handleUnlike(publication.id)}
                onBookmark={() => handleBookmark(publication.id)}
                onShare={() => handleShare(publication.id)}
                showActions={true}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center">
              <nav className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </button>
                
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium ${
                      currentPage === i + 1
                        ? 'bg-primary text-white'
                        : 'border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-primary'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
}