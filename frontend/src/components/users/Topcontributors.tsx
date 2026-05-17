'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, BookOpen, AlertCircle, Crown, ChevronRight, Medal } from 'lucide-react';
import { statsService, TopContributor } from '../../../services/stats.service';
import { useRouter } from 'next/navigation';
import { fetchCurrentUser } from '../../../services/auth.service';
import Avatar from '../ui/avatar/Avatar';

interface TopContributorsResponse {
  period: { from: string; to: string };
  contributors: TopContributor[];
}

function useTopContributors(limit = 5) {
  const [data, setData] = useState<TopContributorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const json = await statsService.getTopContributors(limit);
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

const RANK_STYLES = {
  1: {
    card: 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/15 dark:to-yellow-900/10 border border-amber-200/60 dark:border-amber-700/30',
    badge: 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md shadow-amber-200 dark:shadow-amber-900/30',
    score: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-gradient-to-r from-amber-400 to-yellow-500',
    icon: <Crown className="h-3.5 w-3.5 text-white" />,
  },
  2: {
    card: 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/30 dark:to-gray-800/20 border border-slate-200/60 dark:border-slate-700/30',
    badge: 'bg-gradient-to-br from-slate-400 to-slate-500',
    score: 'text-slate-600 dark:text-slate-300',
    bar: 'bg-gradient-to-r from-slate-400 to-slate-500',
    icon: <Medal className="h-3.5 w-3.5 text-white" />,
  },
  3: {
    card: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 border border-orange-200/50 dark:border-orange-800/30',
    badge: 'bg-gradient-to-br from-orange-500 to-amber-700',
    score: 'text-orange-600 dark:text-orange-400',
    bar: 'bg-gradient-to-r from-orange-400 to-amber-600',
    icon: <span className="text-white font-bold text-[10px]">3</span>,
  },
};

const DEFAULT_RANK_STYLE = {
  card: 'hover:bg-[#168F6F]/5 dark:hover:bg-[#168F6F]/10 border border-transparent',
  badge: 'bg-gray-200 dark:bg-gray-700',
  score: 'text-[#168F6F]',
  bar: 'bg-[#168F6F]',
  icon: null,
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 rounded-xl p-3 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-2.5 w-1/4 rounded-full bg-gray-100 dark:bg-gray-800" />
        <div className="h-1.5 w-2/3 rounded-full bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="h-6 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
    </div>
  );
}

export default function TopContributors({ limit = 5 }: { limit?: number }) {
  const { data, loading, error } = useTopContributors(limit);
  const router = useRouter();

  const navigateToProfile = async (userId: number) => {
    try {
      const me = await fetchCurrentUser();
      if (me?.id && me.id.toString() === userId.toString()) {
        router.push('/profile');
      } else {
        router.push(`/profile/${userId}`);
      }
    } catch {
      router.push(`/profile/${userId}`);
    }
  };

  const getScoreBarColor = (score: number, rank: number) => {
    const styles = RANK_STYLES[rank as keyof typeof RANK_STYLES];
    if (styles) return styles.bar;
    return 'bg-[#168F6F]';
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition-shadow duration-300">
      {/* Accent bar */}
      <div className="h-1 w-full bg-[#168F6F]" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#168F6F] shadow-md shadow-[#168F6F]/25 dark:shadow-[#168F6F]/15">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                Top contributeurs
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Meilleurs de la semaine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#168F6F]/10 dark:bg-[#168F6F]/15 border border-[#168F6F]/20">
            <Crown className="h-3.5 w-3.5 text-[#168F6F]" />
            <span className="text-xs font-semibold text-[#168F6F]">Classement</span>
          </div>
        </div>

        {/* List */}
        <div className="space-y-1.5">
          {loading && Array.from({ length: limit }).map((_, i) => <SkeletonRow key={i} />)}

          {!loading && error && (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-gray-400">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <span>Impossible de charger le classement</span>
            </div>
          )}

          {!loading && !error && data?.contributors.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-gray-400">
              <Trophy className="h-6 w-6" />
              <span>Aucun contributeur cette semaine.</span>
            </div>
          )}

          {!loading && !error && data?.contributors.map((contributor, index) => {
            const styles = RANK_STYLES[contributor.rank as keyof typeof RANK_STYLES] ?? DEFAULT_RANK_STYLE;
            const isTop3 = contributor.rank <= 3;

            return (
              <div
                key={contributor.userId}
                onClick={() => navigateToProfile(contributor.userId)}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 cursor-pointer transition-all duration-200 active:scale-[0.985]
                  ${isTop3 ? styles.card : 'hover:bg-[#168F6F]/5 dark:hover:bg-[#168F6F]/10 border border-transparent'}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateToProfile(contributor.userId); }
                }}
              >
                {/* Rank number (left) */}
                <div className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold
                  ${isTop3
                    ? `${styles.badge} text-white`
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {isTop3 ? styles.icon : contributor.rank}
                </div>

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={contributor.profileImage}
                    alt={contributor.fullName}
                    size="medium"
                    className={`!h-10 !w-10 shadow-sm transition-transform duration-200 group-hover:scale-105
                      ${contributor.rank === 1 ? 'ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-gray-900' : ''}
                      ${contributor.rank === 2 ? 'ring-2 ring-slate-300 dark:ring-slate-500 ring-offset-1 dark:ring-offset-gray-900' : ''}
                      ${contributor.rank === 3 ? 'ring-2 ring-orange-300 dark:ring-orange-600 ring-offset-1 dark:ring-offset-gray-900' : ''}
                    `}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#168F6F] transition-colors">
                      {contributor.fullName}
                    </span>
                    <span className={`ml-2 flex-shrink-0 text-xs font-bold ${styles.score ?? 'text-gray-500 dark:text-gray-400'}`}>
                      {contributor.score}%
                    </span>
                  </div>

                  {contributor.department && (
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-1.5 truncate">
                      {contributor.department}
                    </p>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="font-medium text-gray-600 dark:text-gray-300">{contributor.articlesCount}</span>
                      <span>articles</span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex-1 max-w-24">
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${getScoreBarColor(contributor.score, contributor.rank)}`}
                          style={{ width: `${contributor.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200">
                  <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mx-5 mb-5 mt-1 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Basé sur qualité &amp; quantité des contributions
          </span>
          <button
            onClick={() => router.push('/trending')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#168F6F]/10 dark:bg-[#168F6F]/15 text-[#168F6F] border border-[#168F6F]/20 hover:bg-[#168F6F]/20 transition-colors"
          >
            Voir tout
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
