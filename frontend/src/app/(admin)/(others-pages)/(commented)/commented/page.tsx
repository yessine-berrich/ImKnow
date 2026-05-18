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

import ArticleCard from '@/components/article/ArticleCard';
import { confirm } from '@/components/modals/ConfirmModal';
import ArticleFilterBar, { FilterOptions } from '@/components/Filter/ArticleFilterBar';
import { useTranslation } from '@/context/LanguageContext';
import { commentService } from '../../../../../../services/comment.service';
import { getToken } from '../../../../../../services/auth.service';
import { articleService } from '../../../../../../services/article.service';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function CommentedArticlesPage() {
  const router = useRouter();
  const { t, language } = useTranslation();
  
  // États
  const [articles, setArticles] = useState<any[]>([]);
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

  const fetchCommentedArticles = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      
      if (!token) {
        router.push('/auth/signin');
        return;
      }

      console.log('🔍 Fetching commented articles...');
      const response = await commentService.findCommentedArticlesByUser();
      console.log('📦 Réponse brute:', response);

      // ✅ Extraire le tableau d'articles de la réponse
      let articlesList = [];
      
      if (response && response.success && Array.isArray(response.articles)) {
        // Format: { success: true, count: 5, articles: [...] }
        articlesList = response.articles;
        console.log('✅ Format avec success.articles,', articlesList.length, 'articles');
      } else if (Array.isArray(response)) {
        // Format: [...]
        articlesList = response;
        console.log('✅ Format tableau,', articlesList.length, 'articles');
      } else {
        console.error('❌ Format de réponse inattendu:', response);
        setError(t('commented.format_error'));
        setArticles([]);
        setTotalCount(0);
        setIsLoading(false);
        return;
      }

      // Afficher le premier article pour debug
      if (articlesList.length > 0) {
        console.log('📄 Structure du premier article:', {
          id: articlesList[0].id,
          title: articlesList[0].title,
          author: articlesList[0].author,
          category: articlesList[0].category,
          tags: articlesList[0].tags,
          likesCount: articlesList[0].likesCount,
          commentsCount: articlesList[0].commentsCount,
          viewsCount: articlesList[0].viewsCount,
          userCommentsCount: articlesList[0].userCommentsCount,
          lastCommentDate: articlesList[0].lastCommentDate
        });
      }

      const categoriesSet = new Set<string>();
      const tagsSet = new Set<string>();

      const formattedArticles = articlesList.map((article: any) => {
        const authorName = article.author?.name ||
          (article.author?.firstName && article.author?.lastName
            ? `${article.author.firstName} ${article.author.lastName}`
            : t('activity_common.default_author'));
        
        const initials = authorName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);

        if (article.category?.name) {
          categoriesSet.add(article.category.name);
        }

        if (article.tags && Array.isArray(article.tags)) {
          article.tags.forEach((tag: any) => {
            const tagName = typeof tag === 'string' ? tag : tag.name;
            if (tagName) tagsSet.add(tagName);
          });
        }

        return {
          id: String(article.id),
          title: article.title,
          description: article.description || article.content?.substring(0, 180) + '...',
          content: article.content || '',
          author: {
            id: article.author?.id,
            name: authorName,
            initials: initials,
            department: article.author?.department || t('activity_common.default_department'),
            avatar: article.author?.profileImage || article.author?.avatar || null
          },
          category: {
            name: article.category?.name || t('activity_common.uncategorized')
          },
          tags: article.tags?.map((tag: any) => typeof tag === 'string' ? tag : tag.name) || [],
          publishedAt: article.publishedAt || article.createdAt,
          updatedAt: article.updatedAt,
          status: article.status || 'published',
          stats: {
            likes: article.likesCount || article.likes?.length || 0,
            comments: article.commentsCount || article.comments?.length || 0,
            views: article.viewsCount || article.stats?.views || 0,
          },
          isLiked: article.isLiked || false,
          isBookmarked: article.isBookmarked || false,
          isFeatured: false,
          userCommentsCount: article.userCommentsCount || article.commentCount || 1,
          lastCommentDate: article.lastCommentDate,
        };
      });

      console.log('✅ Articles formatés:', formattedArticles.length);
      setArticles(formattedArticles);
      setTotalCount(formattedArticles.length);
      setAvailableCategories(Array.from(categoriesSet).sort());
      setAvailableTags(Array.from(tagsSet).sort());
      
    } catch (err) {
      console.error('❌ Erreur fetchCommentedArticles:', err);
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlike = async (articleId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      const article = articles.find(a => a.id === articleId);
      if (!article) return;

      const newLikeState = !article.isLiked;
      
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

      await articleService.toggleLike(Number(articleId));
    } catch {
      // Silently handle error
    }
  };

  const handleBookmark = async (articleId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      const article = articles.find(a => a.id === articleId);
      if (!article) return;

      const newBookmarkState = !article.isBookmarked;
      
      setArticles(prev => 
        prev.map(a => 
          a.id === articleId 
            ? { ...a, isBookmarked: newBookmarkState } 
            : a
        )
      );

      await articleService.toggleBookmark(Number(articleId));
    } catch {
      // Silently handle error
    }
  };

  const handleShare = (articleId: string) => {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const shareUrl = `${window.location.origin}/articles/${articleId}`;
    
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
    router.push(`/articles/edit/${articleId}`);
  };

  const handleDelete = async (articleId: string) => {
    if (!await confirm(t('activity_common.delete_confirm'))) return;
    
    try {
      await articleService.delete(Number(articleId));
      setArticles(prev => prev.filter(a => a.id !== articleId));
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
    fetchCommentedArticles();
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
      } else if (filters.sortBy === 'lastComment') {
        const dateA = a.lastCommentDate ? new Date(a.lastCommentDate).getTime() : 0;
        const dateB = b.lastCommentDate ? new Date(b.lastCommentDate).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

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
              onClick={fetchCommentedArticles}
              className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
            >
              {t('activity_common.retry')}
            </button>
          )}
        </div>
      )}

      {/* État vide */}
      {!error && filteredArticles.length === 0 && (
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
            href="/articles"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
          >
            {t('activity_common.explore_articles')}
          </Link>
        </div>
      )}

      {/* Grille des articles */}
      {!error && filteredArticles.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {paginatedArticles.map((article) => (
              <div key={article.id} className="relative">
                {/* Badge nombre de commentaires */}
                <div className="absolute -top-2 -right-2 z-10">
                  <div className="flex items-center gap-1 rounded-full bg-green-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg">
                    <MessageCircle className="h-3 w-3" />
                    <span>{article.userCommentsCount || article.stats.comments || 0}</span>
                  </div>
                </div>
                
                <ArticleCard
                  article={article}
                  onLike={() => handleUnlike(article.id)}
                  onBookmark={() => handleBookmark(article.id)}
                  onShare={() => handleShare(article.id)}
                  showActions={true}
                />
                
                {/* Dernier commentaire */}
                {article.lastCommentDate && (
                  <div className="mt-2 text-right text-xs text-gray-500 dark:text-gray-400">
                    {t('commented.last_comment')} {new Date(article.lastCommentDate).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
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
              to: Math.min(currentPage * itemsPerPage, filteredArticles.length),
              total: filteredArticles.length,
              plural: filteredArticles.length > 1 ? 's' : '',
            })}
          </div>
        </>
      )}
    </div>
  );
}