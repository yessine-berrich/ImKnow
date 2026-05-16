'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import ArticleCard from '@/components/article/ArticleCard';
import TrendingArticles from '@/components/article/Trendingarticles';
import TopContributors from '@/components/users/Topcontributors';
import ArticleDetailModal from '@/components/modals/ArticleDetailModal';
import { FileText, Loader2 } from 'lucide-react';
import CreateArticleModal from '@/components/modals/CreateArticleModal';
import { useSearchParams } from 'next/navigation';
import { fetchCurrentUser, isAuthenticated } from '../../../../../../services/auth.service';
import { toast } from '@/components/modals/ToastContainer';
import { confirm } from '@/components/modals/ConfirmModal';
import { articleService } from '../../../../../../services/article.service';

interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  author: {
    id?: number;
    name: string;
    initials: string;
    department?: string;
    avatar?: string | null;
  };
  category: {
    id?: number | string;
    name: string;
    slug?: string;
  };
  tags?: Array<string | { id?: number; name: string }>;
  publishedAt?: string;
  updatedAt?: string;
  status?: string;
  stats: {
    likes: number;
    comments: number;
    views: number;
    engagementRate?: number;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  media?: Array<{
    id: number;
    url: string;
    filename: string;
    mimetype: string;
    type: 'image' | 'video' | 'document';
    size: number | null;
  }>;
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-[#168F6F]" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | undefined>();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | undefined>();

  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);

  const searchParams = useSearchParams();
  const articleIdFromUrl = searchParams.get('article');
  const articleRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!loading && articles.length > 0 && articleIdFromUrl) {
      setTimeout(() => {
        const articleElement = articleRefs.current[articleIdFromUrl];
        if (articleElement) {
          articleElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          articleElement.classList.add('highlight-article');
          setTimeout(() => {
            articleElement.classList.remove('highlight-article');
          }, 2000);
        }
      }, 500);
    }
  }, [loading, articles, articleIdFromUrl]);

  useEffect(() => {
    const loadUserAndArticles = async () => {
      try {
        const user = await fetchCurrentUser();
        const userId = user?.id;
        if (userId) setCurrentUserId(userId);
        await fetchArticles();
      } catch (error) {
        console.error('Error loading user or articles:', error);
      }
    };
    loadUserAndArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await articleService.getFeeds();

      const transformedArticles: Article[] = response.data.map((article: any) => ({
        id: article.id.toString(),
        title: article.title,
        description: article.description || article.content?.substring(0, 200) || '',
        content: article.content,
        author: {
          id: article.author?.id,
          name: article.author?.name?.trim() || 'Unknown',
          initials: article.author?.initials?.toUpperCase() || 'U',
          department: article.author?.department || article.author?.role || 'Membre',
          avatar: article.author?.avatar || article.author?.profileImage,
        },
        category: {
          id: article.category?.id,
          name: article.category?.name || 'Uncategorized',
          slug: article.category?.slug || 'uncategorized',
        },
        tags: article.tags || [],
        publishedAt: article.createdAt,
        updatedAt: article.updatedAt,
        status: article.status,
        stats: {
          likes: article.stats?.likes || 0,
          comments: article.stats?.comments || 0,
          views: article.stats?.views || 0,
        },
        isLiked: article.isLiked || false,
        isBookmarked: article.isBookmarked || false,
        media: article.media || [],
      }));

      setArticles(transformedArticles);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      console.error('❌ Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenArticleModal = (article: any) => {
    setSelectedArticle(article);
    setIsArticleModalOpen(true);
  };

  const handleCloseArticleModal = () => {
    setIsArticleModalOpen(false);
    setSelectedArticle(null);
  };

  const handleModalLikeUpdate = (isLiked: boolean, likesCount: number) => {
    if (selectedArticle) {
      setArticles(prev => prev.map(article =>
        article.id === selectedArticle.id
          ? { ...article, isLiked, stats: { ...article.stats, likes: likesCount } }
          : article
      ));
    }
  };

  const handleModalBookmarkUpdate = (isBookmarked: boolean) => {
    if (selectedArticle) {
      setArticles(prev => prev.map(article =>
        article.id === selectedArticle.id ? { ...article, isBookmarked } : article
      ));
    }
  };

  const handleModalCommentAdded = (commentsCount: number) => {
    if (selectedArticle) {
      setArticles(prev => prev.map(article =>
        article.id === selectedArticle.id
          ? { ...article, stats: { ...article.stats, comments: commentsCount } }
          : article
      ));
    }
  };

  const handleModalViewIncremented = (viewsCount: number) => {
    if (selectedArticle) {
      setArticles(prev => prev.map(article =>
        article.id === selectedArticle.id
          ? { ...article, stats: { ...article.stats, views: viewsCount } }
          : article
      ));
    }
  };

  const handleCloseModal = () => {
    setCreateModalOpen(false);
    setEditingArticleId(undefined);
  };

  const handleArticleSuccess = () => fetchArticles();

  const handleLike = async (id: string) => {
    try {
      if (!isAuthenticated()) {
        toast.info('Veuillez vous connecter pour liker un article');
        return;
      }
      const result = await articleService.toggleLike(parseInt(id));
      setArticles(prev => prev.map(article =>
        article.id === id
          ? { ...article, isLiked: result.article.isLiked, stats: { ...article.stats, likes: result.article.likesCount } }
          : article
      ));
    } catch (err) {
      console.error('❌ Erreur lors du like:', err);
    }
  };

  const handleBookmark = async (id: string) => {
    try {
      if (!isAuthenticated()) {
        toast.info('Veuillez vous connecter pour sauvegarder un article');
        return;
      }
      const result = await articleService.toggleBookmark(parseInt(id));
      setArticles(prev => prev.map(article =>
        article.id === id ? { ...article, isBookmarked: result.article.isBookmarked } : article
      ));
    } catch (err) {
      console.error('❌ Erreur lors du bookmark:', err);
    }
  };

  const handleShare = (id: string) => {
    const article = articles.find(a => a.id === id);
    if (!article) return;
    const url = `${window.location.origin}/home?article=${id}`;
    if (navigator.share) {
      navigator.share({ title: article.title, text: article.description, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Lien copié dans le presse-papier !');
    }
  };

  const handleEdit = (id: string) => {
    setEditingArticleId(id);
    setCreateModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!await confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) return;
    try {
      await articleService.delete(parseInt(id));
      setArticles(prev => prev.filter(article => article.id !== id));
    } catch (err) {
      console.error('❌ Erreur:', err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#168F6F] mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement des articles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Erreur</h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button
            onClick={fetchArticles}
            className="mt-4 px-4 py-2 bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Conteneur principal avec hauteur fixe - pas de scroll global */}
      <div className="h-full bg-gray-50 dark:bg-gray-950 overflow-hidden">
        <div className="h-full mx-auto max-w-7xl px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">

            {/* ── Colonne principale : scroll indépendant sur les articles ── */}
            <div className="lg:col-span-2 h-full overflow-y-auto py-6 pr-2 scrollbar-hidden">
              
              {/* En-tête - PAS sticky, défile avec les articles */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Articles de la communauté
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Découvrez les derniers articles partagés par nos collaborateurs
                </p>
                {!isAuthenticated() && (
                  <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                    ⚠️ Connectez-vous pour liker et sauvegarder des articles
                  </p>
                )}
              </div>

              {/* Liste des articles */}
              <div className="space-y-6 pb-6">
                {articles.length === 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Aucun article publié
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Soyez le premier à partager votre savoir !
                    </p>
                    {currentUserId && (
                      <button
                        onClick={() => setCreateModalOpen(true)}
                        className="mt-4 px-4 py-2 bg-[#168F6F] text-white rounded-lg hover:bg-[#0F6B54] transition-colors"
                      >
                        Créer un article
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {articles.map((article) => (
                  <div
                    key={article.id}
                    ref={(el) => { articleRefs.current[article.id] = el; }}
                    className="transition-all duration-300"
                  >
                    <ArticleCard
                      article={article}
                      onLike={handleLike}
                      onBookmark={handleBookmark}
                      onShare={handleShare}
                      onArticleUpdated={handleArticleSuccess}
                      showActions={isAuthenticated()}
                      currentUserId={currentUserId}
                      // Ne pas passer onEdit et onDelete pour les articles qui ne sont pas de l'utilisateur
                      onEdit={currentUserId === article.author.id ? handleEdit : undefined}
                      onDelete={currentUserId === article.author.id ? handleDelete : undefined}
                    />
                  </div>
                    ))}

                    <div className="text-center pt-4">
                      <button
                        onClick={fetchArticles}
                        className="px-6 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
                      >
                        Actualiser les articles
                      </button>
                    </div>
                  </>
                )}
              </div>

              <CreateArticleModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseModal}
                onSuccess={handleArticleSuccess}
                articleId={editingArticleId}
              />
            </div>

            {/* ── Sidebar : scroll indépendant ── */}
            <div className="lg:col-span-1 h-full overflow-y-auto py-6 pl-2 scrollbar-hidden">
              <div className="space-y-6">
                <TrendingArticles onArticleClick={handleOpenArticleModal} />
                <TopContributors />
              </div>
            </div>

          </div>
        </div>

        <style jsx global>{`
          /* Hide scrollbar for Chrome, Safari and Opera */
          .scrollbar-hidden::-webkit-scrollbar {
            display: none;
          }
          
          /* Hide scrollbar for IE, Edge and Firefox */
          .scrollbar-hidden {
            -ms-overflow-style: none;  /* IE and Edge */
            scrollbar-width: none;  /* Firefox */
          }
          
          /* Highlight animation */
          @keyframes highlight {
            0%   { box-shadow: 0 0 0 0 rgba(22,143,111,0.5); background-color: rgba(22,143,111,0.1); }
            50%  { box-shadow: 0 0 20px 5px rgba(22,143,111,0.3); background-color: rgba(22,143,111,0.15); }
            100% { box-shadow: 0 0 0 0 rgba(22,143,111,0); background-color: transparent; }
          }
          .highlight-article {
            animation: highlight 2s ease-in-out;
            border-radius: 16px;
          }
        `}</style>
      </div>

      {selectedArticle && (
        <ArticleDetailModal
          isOpen={isArticleModalOpen}
          onClose={handleCloseArticleModal}
          article={selectedArticle}
          onLike={() => {}}
          onBookmark={() => {}}
          onShare={() => {}}
          onModalLikeUpdate={handleModalLikeUpdate}
          onModalBookmarkUpdate={handleModalBookmarkUpdate}
          onModalCommentAdded={handleModalCommentAdded}
          onModalViewIncremented={handleModalViewIncremented}
        />
      )}
    </>
  );
}