'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, Eye, Heart, AlertCircle } from 'lucide-react';
import { statsService, TrendingArticle } from '../../../services/stats.service';
import { isAuthenticated } from '../../../services/auth.service';
import { articleService } from '../../../services/article.service';

interface TrendingArticlesResponse {
  period: { from: string; to: string };
  articles: TrendingArticle[];
}

interface TrendingArticlesProps {
  limit?: number;
  onArticleClick?: (article: any) => void;
}

interface ArticleWithState extends TrendingArticle {
  isLiked?: boolean;
  isBookmarked?: boolean;
  likesCount?: number;
  viewsCount?: number;
  commentsCount?: number;
}

function useTrendingArticles(limit = 5) {
  const [data, setData] = useState<TrendingArticlesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const json = await statsService.getTrendingArticles(limit);
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Erreur inconnue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [limit]);

  return { data, loading, error };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const getRankColor = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg';
    case 2:
      return 'bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 text-white';
    case 3:
      return 'bg-gradient-to-br from-amber-700 to-amber-800 text-white';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
  }
};

const formatNumber = (num: number): string => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="group p-3 rounded-lg animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="flex gap-4">
            <div className="h-2.5 w-14 rounded bg-gray-100 dark:bg-gray-800" />
            <div className="h-2.5 w-14 rounded bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────

export default function TrendingArticles({ limit = 5, onArticleClick }: TrendingArticlesProps) {
  const { data, loading, error } = useTrendingArticles(limit);
  
  // États pour suivre les likes/bookmarks dans la liste
  const [articlesState, setArticlesState] = useState<Record<number, {
    isLiked: boolean;
    isBookmarked: boolean;
    likes: number;
    comments: number;
    views: number;
  }>>({});

  // Récupérer l'utilisateur courant
  const isAuth = isAuthenticated();

  // Récupérer les états des likes/bookmarks pour chaque article
  useEffect(() => {
    const fetchArticleStates = async () => {
      if (!data?.articles || !isAuth) return;

      const states: Record<number, {
        isLiked: boolean;
        isBookmarked: boolean;
        likes: number;
        comments: number;
        views: number;
      }> = {};

      for (const article of data.articles) {
        try {
          // Récupérer l'article complet avec ses états
          const fullArticle = await articleService.findOne(article.id);
          
          states[article.id] = {
            isLiked: fullArticle.isLiked || false,
            isBookmarked: fullArticle.isBookmarked || false,
            likes: fullArticle.stats?.likes || article.stats.likes,
            comments: fullArticle.stats?.comments || article.stats.comments,
            views: fullArticle.stats?.views || article.stats.views,
          };
        } catch (err) {
          console.error(`Erreur récupération état article ${article.id}:`, err);
          // En cas d'erreur, utiliser les valeurs par défaut
          states[article.id] = {
            isLiked: false,
            isBookmarked: false,
            likes: article.stats.likes,
            comments: article.stats.comments,
            views: article.stats.views,
          };
        }
      }

      setArticlesState(states);
    };

    fetchArticleStates();
  }, [data, isAuth]);


  const handleArticleClick = async (article: TrendingArticle) => {
    // Récupérer l'état actuel de l'article
    const currentState = articlesState[article.id] || {
      isLiked: false,
      isBookmarked: false,
      likes: article.stats.likes,
      comments: article.stats.comments,
      views: article.stats.views,
    };

    // Fetch full article to get author ID and avatar (not always available in trending response)
    let authorId = (article.author as any).id;
    let authorAvatar: string | null =
      (article.author as any).avatar ?? (article.author as any).profileImage ?? null;

    if (!authorId || !authorAvatar) {
      try {
        const fullArticle = await articleService.findOne(article.id);
        if (!authorId) authorId = fullArticle.author?.id;
        if (!authorAvatar)
          authorAvatar =
            fullArticle.author?.profileImage ??
            fullArticle.author?.avatar ??
            null;
      } catch (error) {
        console.error('Error fetching full article:', error);
      }
    }

    // Créer l'article au format attendu par le modal
    const modalArticle = {
      id: String(article.id),
      title: article.title,
      content: article.content,
      description: article.description,
      author: {
        id: authorId,
        name: article.author.name,
        initials: article.author.initials,
        department: article.author.department || '',
        avatar: authorAvatar,
      },
      category: {
        name: article.category.name,
        slug: article.category.slug,
      },
      tags: article.tags,
      publishedAt: article.publishedAt,
      status: 'published' as const,
      stats: {
        likes: currentState.likes,
        comments: currentState.comments,
        views: currentState.views,
      },
      isLiked: currentState.isLiked,
      isBookmarked: currentState.isBookmarked,
    };
    
    // Appeler la prop passée par le parent
    if (onArticleClick) {
      onArticleClick(modalArticle);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30">
            <TrendingUp className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Articles tendances
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Les plus populaires cette semaine
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
          🔥 Tendance
        </span>
      </div>

      {/* Articles List */}
      <div className="space-y-4">
        {/* Loading */}
        {loading && Array.from({ length: limit }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-red-500 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>Impossible de charger les articles</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && data?.articles.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
            Aucun article publié cette semaine.
          </p>
        )}

        {/* Data */}
        {!loading && !error && data?.articles.map((article) => {
          const articleState = articlesState[article.id] || {
            isLiked: false,
            isBookmarked: false,
            likes: article.stats.likes,
            comments: article.stats.comments,
            views: article.stats.views,
          };

          return (
            <div
              key={article.id}
              onClick={() => handleArticleClick(article)}
              className="group p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 cursor-pointer active:scale-[0.98] select-none"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleArticleClick(article);
                }
              }}
            >
              <div className="flex items-start gap-3">
                {/* Rank Badge */}
                <div className="flex-shrink-0">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${getRankColor(article.rank)} font-bold text-sm transition-transform group-hover:scale-110`}>
                    {article.rank}
                  </div>
                </div>

                {/* Article Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* ✅ CATÉGORIE AVEC LA COULEUR #00926B */}
                    <span className="px-2 py-1 text-xs font-medium bg-[#00926B]/10 dark:bg-[#00926B]/20 text-[#00926B] dark:text-[#00B383] rounded-full">
                      {article.category.name}
                    </span>
                  </div>

                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-relaxed">
                    {article.title}
                  </h4>

                  {/* Stats avec les états mis à jour */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <Eye className="h-3.5 w-3.5" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatNumber(articleState.views)}
                      </span>
                      <span>vues</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <Heart 
                        className={`h-3.5 w-3.5 ${
                          articleState.isLiked 
                            ? 'fill-red-500 text-red-500' 
                            : 'text-red-500 dark:text-red-400'
                        }`} 
                      />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatNumber(articleState.likes)}
                      </span>
                      <span>j'aime</span>
                    </div>
                  </div>
                </div>

                {/* Trending Arrow */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg className="h-5 w-5 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}