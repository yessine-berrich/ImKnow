'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, Eye, Heart, AlertCircle, Flame } from 'lucide-react';
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

const formatNumber = (num: number): string => {
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

const RANK_CONFIG: Record<number, { label: string; bg: string; text: string; border: string }> = {
  1: {
    label: '1',
    bg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
    text: 'text-white',
    border: 'ring-2 ring-yellow-300/60',
  },
  2: {
    label: '2',
    bg: 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-500 dark:to-slate-600',
    text: 'text-white',
    border: 'ring-2 ring-slate-300/50 dark:ring-slate-500/50',
  },
  3: {
    label: '3',
    bg: 'bg-gradient-to-br from-amber-600 to-orange-700',
    text: 'text-white',
    border: 'ring-2 ring-amber-500/50',
  },
};

function RankBadge({ rank }: { rank: number }) {
  const cfg = RANK_CONFIG[rank];
  if (cfg) {
    return (
      <div
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${cfg.bg} ${cfg.text} ${cfg.border} font-extrabold text-sm shadow-md transition-transform duration-200 group-hover:scale-110`}
      >
        {cfg.label}
      </div>
    );
  }
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 font-bold text-sm text-gray-500 dark:text-gray-400 transition-transform duration-200 group-hover:scale-105">
      {rank}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-start gap-3 rounded-xl p-3 animate-pulse">
      <div className="h-9 w-9 rounded-xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-0.5">
        <div className="h-2.5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-3.5 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-3.5 w-3/4 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="flex gap-3">
          <div className="h-2.5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
          <div className="h-2.5 w-16 rounded-full bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

export default function TrendingArticles({ limit = 5, onArticleClick }: TrendingArticlesProps) {
  const { data, loading, error } = useTrendingArticles(limit);
  const [articlesState, setArticlesState] = useState<Record<number, {
    isLiked: boolean;
    isBookmarked: boolean;
    likes: number;
    comments: number;
    views: number;
  }>>({});

  const isAuth = isAuthenticated();

  useEffect(() => {
    const fetchArticleStates = async () => {
      if (!data?.articles || !isAuth) return;
      const states: Record<number, { isLiked: boolean; isBookmarked: boolean; likes: number; comments: number; views: number }> = {};
      for (const article of data.articles) {
        try {
          const fullArticle = await articleService.findOne(article.id);
          states[article.id] = {
            isLiked: fullArticle.isLiked || false,
            isBookmarked: fullArticle.isBookmarked || false,
            likes: fullArticle.stats?.likes || article.stats.likes,
            comments: fullArticle.stats?.comments || article.stats.comments,
            views: fullArticle.stats?.views || article.stats.views,
          };
        } catch {
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
    const currentState = articlesState[article.id] || {
      isLiked: false,
      isBookmarked: false,
      likes: article.stats.likes,
      comments: article.stats.comments,
      views: article.stats.views,
    };

    let authorId = (article.author as any).id;
    let authorAvatar: string | null =
      (article.author as any).avatar ?? (article.author as any).profileImage ?? null;

    if (!authorId || !authorAvatar) {
      try {
        const fullArticle = await articleService.findOne(article.id);
        if (!authorId) authorId = fullArticle.author?.id;
        if (!authorAvatar)
          authorAvatar = fullArticle.author?.profileImage ?? fullArticle.author?.avatar ?? null;
      } catch {}
    }

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
      category: { name: article.category.name, slug: article.category.slug },
      tags: article.tags,
      publishedAt: article.publishedAt,
      status: 'published' as const,
      stats: { likes: currentState.likes, comments: currentState.comments, views: currentState.views },
      isLiked: currentState.isLiked,
      isBookmarked: currentState.isBookmarked,
    };

    if (onArticleClick) onArticleClick(modalArticle);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition-shadow duration-300">
      {/* Subtle top accent bar */}
      <div className="h-1 w-full bg-[#168F6F]" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#168F6F] shadow-md shadow-[#168F6F]/25 dark:shadow-[#168F6F]/15">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                Articles tendances
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Les plus populaires cette semaine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#168F6F]/10 dark:bg-[#168F6F]/15 border border-[#168F6F]/20">
            <TrendingUp className="h-3.5 w-3.5 text-[#168F6F]" />
            <span className="text-xs font-semibold text-[#168F6F]">Top {limit}</span>
          </div>
        </div>

        {/* List */}
        <div className="space-y-1">
          {loading && Array.from({ length: limit }).map((_, i) => <SkeletonRow key={i} />)}

          {!loading && error && (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-gray-400">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <span>Impossible de charger les articles</span>
            </div>
          )}

          {!loading && !error && data?.articles.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-gray-400">
              <TrendingUp className="h-6 w-6" />
              <span>Aucun article publié cette semaine.</span>
            </div>
          )}

          {!loading && !error && data?.articles.map((article, index) => {
            const articleState = articlesState[article.id] || {
              isLiked: false,
              isBookmarked: false,
              likes: article.stats.likes,
              comments: article.stats.comments,
              views: article.stats.views,
            };
            const isTop = article.rank <= 3;

            return (
              <div
                key={article.id}
                onClick={() => handleArticleClick(article)}
                className={`group relative flex items-start gap-3 rounded-xl px-3 py-3 cursor-pointer transition-all duration-200 select-none
                  ${isTop
                    ? 'hover:bg-[#168F6F]/5 dark:hover:bg-[#168F6F]/10'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }
                  active:scale-[0.985]`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleArticleClick(article); }
                }}
              >
                {/* Rank */}
                <RankBadge rank={article.rank} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#168F6F]/10 dark:bg-[#168F6F]/15 text-[#168F6F] border border-[#168F6F]/20 mb-1.5">
                    {article.category.name}
                  </span>

                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug mb-2 line-clamp-2 group-hover:text-[#168F6F] transition-colors">
                    {article.title}
                  </h4>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <Eye className="h-3.5 w-3.5" />
                      <span className="font-medium text-gray-600 dark:text-gray-300">
                        {formatNumber(articleState.views)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <Heart
                        className={`h-3.5 w-3.5 transition-colors ${
                          articleState.isLiked ? 'fill-rose-500 text-rose-500' : 'text-[#168F6F]'
                        }`}
                      />
                      <span className="font-medium text-gray-600 dark:text-gray-300">
                        {formatNumber(articleState.likes)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200">
                  <svg className="h-4 w-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Separator (not last) */}
                {index < (data?.articles.length ?? 0) - 1 && (
                  <div className="absolute bottom-0 left-14 right-3 h-px bg-gray-100 dark:bg-gray-800 group-hover:opacity-0 transition-opacity" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
