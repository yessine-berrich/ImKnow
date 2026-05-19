// /home/pfe2026/Desktop/PfeProject/frontend/src/app/(admin)/(others-pages)/(bookmarked)/bookmarked/page.tsx

'use client';

import { getToken } from '../../../../../../services/auth.service';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { confirm } from '@/components/modals/ConfirmModal';
import { 
  Bookmark,
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
const API_URL = 'http://localhost:3000';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function BookmarkedPublicationsPage() {
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
    return `${API_URL}${path}`;
  };

  // ============================================
  // FONCTIONS API
  // ============================================

  const fetchBookmarkedPublications = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      
      if (!token) {
        router.push('/auth/signin');
        return;
      }

      const url = getApiUrl('/api/publications/user/bookmarked');
      console.log('🔍 Fetching bookmarked publications from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/auth/signin');
        throw new Error('Session expirée');
      }

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Données brutes reçues:', data);
      
      if (data.success) {
        console.log('✅ data.publications reçu:', data.publications?.length || 0, 'publications');
        
        // Afficher le premier publication pour voir sa structure
        if (data.publications && data.publications.length > 0) {
          console.log('📄 Structure du premier publication:', {
            id: data.publications[0].id,
            title: data.publications[0].title,
            viewsCount: data.publications[0].viewsCount,
            stats: data.publications[0].stats,
            likesCount: data.publications[0].likesCount,
            commentsCount: data.publications[0].commentsCount,
            bookmarksCount: data.publications[0].bookmarksCount,
            isLiked: data.publications[0].isLiked,
            isBookmarked: data.publications[0].isBookmarked,
          });
        }

        const categoriesSet = new Set<string>();
        const tagsSet = new Set<string>();

        // Transformation des données
        const formattedPublications = data.publications.map((publication: any, index: number) => {
          const authorName = publication.author?.name ||
            (publication.author?.firstName && publication.author?.lastName
              ? `${publication.author.firstName} ${publication.author.lastName}`
              : t('activity_common.default_author'));
          
          const initials = authorName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          if (publication.category?.name) {
            categoriesSet.add(publication.category.name);
          }

          publication.tags?.forEach((tag: string) => {
            if (tag) tagsSet.add(tag);
          });

          // Log pour chaque publication transformé
          const formatted = {
            id: String(publication.id),
            title: publication.title,
            description: publication.description || publication.content?.substring(0, 180) + '...',
            content: publication.content || '',
            author: {
              id: publication.author?.id,
              name: authorName,
              initials: initials,
              department: publication.author?.department || t('activity_common.default_department'),
              avatar: publication.author?.profileImage || publication.author?.avatar || null
            },
            category: {
              name: publication.category?.name || t('activity_common.uncategorized')
            },
            tags: publication.tags?.map((tag: any) => 
              typeof tag === 'string' ? tag : tag.name
            ) || [],
            publishedAt: publication.publishedAt || publication.createdAt,
            updatedAt: publication.updatedAt,
            status: publication.status || 'published',
            stats: {
              likes: publication.likesCount || publication.likes?.length || 0,
              comments: publication.commentsCount || publication.comments?.length || 0,
              views: publication.viewsCount || publication.stats?.views || 0,
            },
            isLiked: publication.isLiked || false,
            isBookmarked: true,
            isFeatured: false,
          };

          if (index === 0) {
            console.log('🔄 Premier publication transformé:', {
              id: formatted.id,
              title: formatted.title,
              stats: formatted.stats,
              views: formatted.stats.views,
              isBookmarked: formatted.isBookmarked,
            });
          }

          return formatted;
        });

        console.log('✅ Publications transformés:', formattedPublications.length);
        console.log('📊 Stats du premier publication transformé:', formattedPublications[0]?.stats);

        setPublications(formattedPublications);
        setTotalCount(data.count);
        console.log('📊 Total count:', data.count);
        
        setAvailableCategories(Array.from(categoriesSet).sort());
        console.log('🏷️ Catégories disponibles:', Array.from(categoriesSet).sort());
        
        setAvailableTags(Array.from(tagsSet).sort());
        console.log('🏷️ Tags disponibles:', Array.from(tagsSet).sort());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Erreur fetchBookmarkedPublications:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnbookmark = async (publicationId: string) => {
    console.log('🗑️ Unbookmark publication:', publicationId);
    try {
      const token = getToken();
      if (!token) return;

      setPublications(prev => prev.filter(a => a.id !== publicationId));
      setTotalCount(prev => Math.max(0, prev - 1));

      const url = getApiUrl(`/api/publications/${publicationId}/bookmark`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Unbookmark response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ Unbookmark failed');
        await fetchBookmarkedPublications();
      }
    } catch (error) {
      console.error('❌ Error in handleUnbookmark:', error);
      await fetchBookmarkedPublications();
    }
  };

  const handleLike = async (publicationId: string) => {
    console.log('❤️ Like publication:', publicationId);
    try {
      const token = getToken();
      if (!token) return;

      const publication = publications.find(a => a.id === publicationId);
      if (!publication) {
        console.log('❌ Publication not found');
        return;
      }

      const newLikeState = !publication.isLiked;
      console.log('🔄 New like state:', newLikeState);
      
      setPublications(prev => 
        prev.map(a => 
          a.id === publicationId 
            ? { 
                ...a, 
                isLiked: newLikeState,
                stats: { ...a.stats, likes: a.stats.likes + (newLikeState ? 1 : -1) }
              } 
            : a
        )
      );

      const url = getApiUrl(`/api/publications/${publicationId}/like`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Like response status:', response.status);
      
      if (!response.ok) {
        console.error('❌ Like failed');
      }
    } catch (error) {
      console.error('❌ Error in handleLike:', error);
    }
  };

  const handleShare = (publicationId: string) => {
    const publication = publications.find(a => a.id === publicationId);
    if (!publication) return;

    const shareUrl = `${window.location.origin}/publications/${publicationId}`;
    console.log('🔗 Sharing publication:', publicationId, 'URL:', shareUrl);
    
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
    console.log('✏️ Edit publication:', publicationId);
    router.push(`/publications/edit/${publicationId}`);
  };

  const handleDelete = async (publicationId: string) => {
    if (!await confirm(t('activity_common.delete_confirm'))) return;
    
    console.log('🗑️ Delete publication:', publicationId);
    try {
      const token = getToken();
      const url = getApiUrl(`/api/publications/${publicationId}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Delete response status:', response.status);

      if (response.ok) {
        setPublications(prev => prev.filter(a => a.id !== publicationId));
        setTotalCount(prev => prev - 1);
      }
    } catch (error) {
      console.error('❌ Error in handleDelete:', error);
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    console.log('🔍 Filter change:', newFilters);
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  // Chargement initial
  useEffect(() => {
    console.log('🚀 Component mounted, fetching bookmarked publications...');
    fetchBookmarkedPublications();
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

  console.log('📊 Après filtrage:', filteredPublications.length, 'publications sur', publications.length);
  console.log('📈 Stats du premier publication filtré:', filteredPublications[0]?.stats);

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
              {t('bookmarked.loading')}
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
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                <Bookmark className="h-5 w-5 text-yellow-600 dark:text-yellow-400 fill-current" />
              </span>
              {t('bookmarked.title')}
            </h1>
            {totalCount > 0 && (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">
                {totalCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {totalCount === 0
              ? t('bookmarked.count_none')
              : totalCount === 1
                ? t('bookmarked.count_one', { count: totalCount })
                : t('bookmarked.count_plural', { count: totalCount })
            }
          </p>
        </div>
      </div>

      {/* 🔥 COMPOSANT DE FILTRES 🔥 */}
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
              : error}
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
              onClick={fetchBookmarkedPublications}
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
            <Bookmark className="h-12 w-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            {t('bookmarked.empty_title')}
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400 max-w-md">
            {t('bookmarked.empty_desc')}
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
            {paginatedPublications.map((publication, index) => (
              <div key={publication.id} className="relative">
                {/* Badge "Sauvegardé" */}
                <div className="absolute -top-2 -right-2 z-10">
                  <div className="flex items-center gap-1 rounded-full bg-yellow-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg">
                    <Bookmark className="h-3 w-3 fill-current" />
                    <span>{t('bookmarked.saved_badge')}</span>
                  </div>
                </div>
                
                <PublicationCard
                  publication={publication}
                  onLike={() => handleLike(publication.id)}
                  onBookmark={() => handleUnbookmark(publication.id)}
                  onShare={() => handleShare(publication.id)}
                  showActions={true}
                />
              </div>
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

          {/* Compteur */}
          <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('activity_common.displaying', {
              from: ((currentPage - 1) * itemsPerPage) + 1,
              to: Math.min(currentPage * itemsPerPage, filteredPublications.length),
              total: filteredPublications.length,
              plural: filteredPublications.length > 1 ? 's' : '',
            })}
          </div>
        </>
      )}
    </div>
  );
}