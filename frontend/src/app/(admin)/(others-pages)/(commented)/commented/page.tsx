// /home/pfe2026/Desktop/PfeProject/frontend/src/app/(admin)/(others-pages)/(commented)/commented/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  MessageCircle,
  ArrowLeft,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

import PublicationCard from '@/components/publication/PublicationCard';
import { confirm } from '@/components/modals/ConfirmModal';
import PublicationFilterBar, { FilterOptions } from '@/components/Filter/PublicationFilterBar';
import { useTranslation } from '@/context/LanguageContext';
import { commentService } from '../../../../../../services/comment.service';
import { getToken } from '../../../../../../services/auth.service';
import { publicationService } from '../../../../../../services/publication.service';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function CommentedPublicationsPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  
  // États
  const [publications, setPublications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  
  // Catégories et tags disponibles
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  // Filtres
  const [filters, setFilters] = useState<FilterOptions & { sortBy: 'recent' | 'oldest' | 'popular' | 'lastComment' }>({
    sortBy: 'lastComment',
    selectedCategory: 'all',
    selectedTag: 'all'
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // ============================================
  // FONCTIONS API
  // ============================================

  const fetchCommentedPublications = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      
      if (!token) {
        router.push('/auth/signin');
        return;
      }

      console.log('🔍 Fetching commented publications...');
      const response = await commentService.findCommentedPublicationsByUser();
      console.log('📦 Réponse brute:', response);

      // ✅ Extraire le tableau d'publications de la réponse
      let publicationsList = [];
      
      if (response && response.success && Array.isArray(response.publications)) {
        // Format: { success: true, count: 5, publications: [...] }
        publicationsList = response.publications;
        console.log('✅ Format avec success.publications,', publicationsList.length, 'publications');
      } else if (Array.isArray(response)) {
        // Format: [...]
        publicationsList = response;
        console.log('✅ Format tableau,', publicationsList.length, 'publications');
      } else {
        console.error('❌ Format de réponse inattendu:', response);
        setError(t('commented.format_error'));
        setPublications([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }

      // Afficher le premier publication pour debug
      if (publicationsList.length > 0) {
        console.log('📄 Structure du premier publication:', {
          id: publicationsList[0].id,
          title: publicationsList[0].title,
          author: publicationsList[0].author,
          category: publicationsList[0].category,
          tags: publicationsList[0].tags,
          likesCount: publicationsList[0].likesCount,
          commentsCount: publicationsList[0].commentsCount,
          viewsCount: publicationsList[0].viewsCount,
          userCommentsCount: publicationsList[0].userCommentsCount,
          lastCommentDate: publicationsList[0].lastCommentDate
        });
      }

      const categoriesSet = new Set<string>();
      const tagsSet = new Set<string>();

      const formattedPublications = publicationsList.map((publication: any) => {
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

        if (publication.tags && Array.isArray(publication.tags)) {
          publication.tags.forEach((tag: any) => {
            const tagName = typeof tag === 'string' ? tag : tag.name;
            if (tagName) tagsSet.add(tagName);
          });
        }

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
            avatar: publication.author?.profileImage || publication.author?.avatar || null
          },
          category: {
            name: publication.category?.name || t('activity_common.uncategorized')
          },
          tags: publication.tags?.map((tag: any) => typeof tag === 'string' ? tag : tag.name) || [],
          publishedAt: publication.publishedAt || publication.createdAt,
          updatedAt: publication.updatedAt,
          status: publication.status || 'published',
          stats: {
            likes: publication.likesCount || publication.likes?.length || 0,
            comments: publication.commentsCount || publication.comments?.length || 0,
            views: publication.viewsCount || publication.stats?.views || 0,
          },
          isLiked: publication.isLiked || false,
          isBookmarked: publication.isBookmarked || false,
          isFeatured: false,
          userCommentsCount: publication.userCommentsCount || publication.commentCount || 1,
          lastCommentDate: publication.lastCommentDate,
        };
      });

      console.log('✅ Publications formatés:', formattedPublications.length);
      setPublications(formattedPublications);
      setTotalCount(formattedPublications.length);
      setAvailableCategories(Array.from(categoriesSet).sort());
      setAvailableTags(Array.from(tagsSet).sort());
      
    } catch (err) {
      console.error('❌ Erreur fetchCommentedPublications:', err);
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

      const publication = publications.find(a => a.id === publicationId);
      if (!publication) return;

      const newLikeState = !publication.isLiked;
      
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

      await publicationService.toggleLike(Number(publicationId));
    } catch {
      // Silently handle error
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

      await publicationService.toggleBookmark(Number(publicationId));
    } catch {
      // Silently handle error
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
      await publicationService.delete(Number(publicationId));
      setPublications(prev => prev.filter(a => a.id !== publicationId));
      setTotalCount(prev => prev - 1);
    } catch {
      // Silently handle error
    }
  };

  const handleFilterChange = (newFilters: Partial<FilterOptions & { sortBy: 'recent' | 'oldest' | 'popular' | 'lastComment' }>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  // Chargement initial
  useEffect(() => {
    fetchCommentedPublications();
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
      } else if (filters.sortBy === 'lastComment') {
        const dateA = a.lastCommentDate ? new Date(a.lastCommentDate).getTime() : 0;
        const dateB = b.lastCommentDate ? new Date(b.lastCommentDate).getTime() : 0;
        return dateB - dateA;
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
              {t('commented.loading')}
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
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </span>
              {t('commented.title')}
            </h1>
            {totalCount > 0 && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-600 dark:bg-green-900/20 dark:text-green-400">
                {totalCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {totalCount === 0
              ? t('commented.count_none')
              : totalCount === 1
                ? t('commented.count_one', { count: totalCount })
                : t('commented.count_plural', { count: totalCount })
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
            {error === t('commented.format_error') ? t('activity_common.load_error') : error === 'Session expirée' ? t('activity_common.session_expired') : t('activity_common.load_error')}
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
              onClick={fetchCommentedPublications}
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
            <MessageCircle className="h-12 w-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            {t('commented.empty_title')}
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400 max-w-md">
            {t('commented.empty_desc')}
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
              <div key={publication.id} className="relative">
                {/* Badge nombre de commentaires */}
                <div className="absolute -top-2 -right-2 z-10">
                  <div className="flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg">
                    <MessageCircle className="h-3 w-3" />
                    <span>{publication.userCommentsCount || publication.stats.comments || 0}</span>
                  </div>
                </div>
                
                <PublicationCard
                  publication={publication}
                  onLike={() => handleUnlike(publication.id)}
                  onBookmark={() => handleBookmark(publication.id)}
                  onShare={() => handleShare(publication.id)}
                  showActions={true}
                />
                
                {/* Dernier commentaire */}
                {publication.lastCommentDate && (
                  <div className="mt-2 text-right text-xs text-gray-500 dark:text-gray-400">
                    {t('commented.last_comment')} {new Date(publication.lastCommentDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
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