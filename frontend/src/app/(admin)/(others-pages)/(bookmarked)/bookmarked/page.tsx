// /home/pfe2026/Desktop/PfeProject/frontend/src/app/(admin)/(others-pages)/(bookmarked)/bookmarked/page.tsx

'use client';

import { getToken } from '../../../../../../services/auth.service';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Bookmark,
  ArrowLeft,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

import ArticleCard from '@/components/article/ArticleCard';
import ArticleFilterBar, { FilterOptions } from '@/components/Filter/ArticleFilterBar';
// ============================================
// CONFIGURATION
// ============================================
const API_URL = 'http://localhost:3000';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function BookmarkedArticlesPage() {
  const router = useRouter();
  
  // États
  const [articles, setArticles] = useState<any[]>([]);
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

  const fetchBookmarkedArticles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      
      if (!token) {
        router.push('/auth/signin');
        return;
      }

      const url = getApiUrl('/api/articles/user/bookmarked');
      console.log('🔍 Fetching bookmarked articles from:', url);

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
        console.log('✅ data.articles reçu:', data.articles?.length || 0, 'articles');
        
        // Afficher le premier article pour voir sa structure
        if (data.articles && data.articles.length > 0) {
          console.log('📄 Structure du premier article:', {
            id: data.articles[0].id,
            title: data.articles[0].title,
            viewsCount: data.articles[0].viewsCount,
            stats: data.articles[0].stats,
            likesCount: data.articles[0].likesCount,
            commentsCount: data.articles[0].commentsCount,
            bookmarksCount: data.articles[0].bookmarksCount,
            isLiked: data.articles[0].isLiked,
            isBookmarked: data.articles[0].isBookmarked,
          });
        }

        const categoriesSet = new Set<string>();
        const tagsSet = new Set<string>();

        // Transformation des données
        const formattedArticles = data.articles.map((article: any, index: number) => {
          const authorName = article.author?.name || 
            (article.author?.firstName && article.author?.lastName 
              ? `${article.author.firstName} ${article.author.lastName}` 
              : 'Utilisateur');
          
          const initials = authorName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          if (article.category?.name) {
            categoriesSet.add(article.category.name);
          }

          article.tags?.forEach((tag: string) => {
            if (tag) tagsSet.add(tag);
          });

          // Log pour chaque article transformé
          const formatted = {
            id: String(article.id),
            title: article.title,
            description: article.description || article.content?.substring(0, 180) + '...',
            content: article.content || '',
            author: {
              id: article.author?.id,
              name: authorName,
              initials: initials,
              department: article.author?.department || 'Membre',
              avatar: article.author?.profileImage || article.author?.avatar || null
            },
            category: {
              name: article.category?.name || 'Non classé'
            },
            tags: article.tags?.map((tag: any) => 
              typeof tag === 'string' ? tag : tag.name
            ) || [],
            publishedAt: article.publishedAt || article.createdAt,
            updatedAt: article.updatedAt,
            status: article.status || 'published',
            stats: {
              likes: article.likesCount || article.likes?.length || 0,
              comments: article.commentsCount || article.comments?.length || 0,
              views: article.viewsCount || article.stats?.views || 0,
            },
            isLiked: article.isLiked || false,
            isBookmarked: true,
            isFeatured: false,
          };

          if (index === 0) {
            console.log('🔄 Premier article transformé:', {
              id: formatted.id,
              title: formatted.title,
              stats: formatted.stats,
              views: formatted.stats.views,
              isBookmarked: formatted.isBookmarked,
            });
          }

          return formatted;
        });

        console.log('✅ Articles transformés:', formattedArticles.length);
        console.log('📊 Stats du premier article transformé:', formattedArticles[0]?.stats);

        setArticles(formattedArticles);
        setTotalCount(data.count);
        console.log('📊 Total count:', data.count);
        
        setAvailableCategories(Array.from(categoriesSet).sort());
        console.log('🏷️ Catégories disponibles:', Array.from(categoriesSet).sort());
        
        setAvailableTags(Array.from(tagsSet).sort());
        console.log('🏷️ Tags disponibles:', Array.from(tagsSet).sort());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('❌ Erreur fetchBookmarkedArticles:', err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnbookmark = async (articleId: string) => {
    console.log('🗑️ Unbookmark article:', articleId);
    try {
      const token = getToken();
      if (!token) return;

      setArticles(prev => prev.filter(a => a.id !== articleId));
      setTotalCount(prev => Math.max(0, prev - 1));

      const url = getApiUrl(`/api/articles/${articleId}/bookmark`);
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
        await fetchBookmarkedArticles();
      }
    } catch (error) {
      console.error('❌ Error in handleUnbookmark:', error);
      await fetchBookmarkedArticles();
    }
  };

  const handleLike = async (articleId: string) => {
    console.log('❤️ Like article:', articleId);
    try {
      const token = getToken();
      if (!token) return;

      const article = articles.find(a => a.id === articleId);
      if (!article) {
        console.log('❌ Article not found');
        return;
      }

      const newLikeState = !article.isLiked;
      console.log('🔄 New like state:', newLikeState);
      
      setArticles(prev => 
        prev.map(a => 
          a.id === articleId 
            ? { 
                ...a, 
                isLiked: newLikeState,
                stats: { ...a.stats, likes: a.stats.likes + (newLikeState ? 1 : -1) }
              } 
            : a
        )
      );

      const url = getApiUrl(`/api/articles/${articleId}/like`);
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

  const handleShare = (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const shareUrl = `${window.location.origin}/articles/${articleId}`;
    console.log('🔗 Sharing article:', articleId, 'URL:', shareUrl);
    
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.description,
        url: shareUrl,
      }).catch(() => {
        navigator.clipboard.writeText(shareUrl);
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleEdit = (articleId: string) => {
    console.log('✏️ Edit article:', articleId);
    router.push(`/articles/edit/${articleId}`);
  };

  const handleDelete = async (articleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    
    console.log('🗑️ Delete article:', articleId);
    try {
      const token = getToken();
      const url = getApiUrl(`/api/articles/${articleId}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('📡 Delete response status:', response.status);

      if (response.ok) {
        setArticles(prev => prev.filter(a => a.id !== articleId));
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
    console.log('🚀 Component mounted, fetching bookmarked articles...');
    fetchBookmarkedArticles();
  }, []);

  // ============================================
  // FILTRAGE ET TRI
  // ============================================

  const filteredArticles = articles
    .filter(article => {
      const matchesCategory = filters.selectedCategory === 'all' || article.category.name === filters.selectedCategory;
      const matchesTag = filters.selectedTag === 'all' || article.tags.includes(filters.selectedTag);
      
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

  console.log('📊 Après filtrage:', filteredArticles.length, 'articles sur', articles.length);
  console.log('📈 Stats du premier article filtré:', filteredArticles[0]?.stats);

  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const paginatedArticles = filteredArticles.slice(
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
              Chargement de vos articles sauvegardés...
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
              Articles sauvegardés
            </h1>
            {totalCount > 0 && (
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400">
                {totalCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {totalCount === 0 
              ? "Vous n'avez pas encore sauvegardé d'articles"
              : `${totalCount} article${totalCount > 1 ? 's' : ''} dans votre bibliothèque`
            }
          </p>
        </div>
      </div>

      {/* 🔥 COMPOSANT DE FILTRES 🔥 */}
      <ArticleFilterBar
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
            {error === 'Session expirée' ? 'Session expirée' : 'Erreur de chargement'}
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            {error === 'Session expirée' 
              ? 'Veuillez vous reconnecter'
              : error}
          </p>
          {error === 'Session expirée' ? (
            <Link
              href="/auth/signin"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
            >
              Se connecter
            </Link>
          ) : (
            <button
              onClick={fetchBookmarkedArticles}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
            >
              Réessayer
            </button>
          )}
        </div>
      )}

      {/* État vide */}
      {!error && filteredArticles.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-gray-700">
            <Bookmark className="h-12 w-12 text-gray-400 dark:text-gray-500" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
            Aucun article sauvegardé
          </h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400 max-w-md">
            Vous n'avez pas encore sauvegardé d'articles.
            Explorez notre base de connaissances et sauvegardez vos articles préférés !
          </p>
          <Link
            href="/articles"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
          >
            Explorer les articles
          </Link>
        </div>
      )}

      {/* Grille des articles */}
      {!error && filteredArticles.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {paginatedArticles.map((article, index) => (
              <div key={article.id} className="relative">
                {/* Badge "Sauvegardé" */}
                <div className="absolute -top-2 -right-2 z-10">
                  <div className="flex items-center gap-1 rounded-full bg-yellow-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg">
                    <Bookmark className="h-3 w-3 fill-current" />
                    <span>Sauvegardé</span>
                  </div>
                </div>
                
                <ArticleCard
                  article={article}
                  onLike={() => handleLike(article.id)}
                  onBookmark={() => handleUnbookmark(article.id)}
                  onShare={() => handleShare(article.id)}
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
            Affichage {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredArticles.length)} sur {filteredArticles.length} article{filteredArticles.length > 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  );
}