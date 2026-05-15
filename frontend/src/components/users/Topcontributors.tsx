'use client';

import React, { useEffect, useState } from 'react';
import { Trophy, Star, Award, TrendingUp, BookOpen, AlertCircle, Crown } from 'lucide-react';
import { statsService, TopContributor } from '../../../services/stats.service';
import { useRouter } from 'next/navigation';
import { fetchCurrentUser } from '../../../services/auth.service';
import Avatar from '../ui/avatar/Avatar';

interface TopContributorsResponse {
  period: { from: string; to: string };
  contributors: TopContributor[];
}

// ── Fetch hook ────────────────────────────────────────────────────────────────

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

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="group p-3 rounded-lg animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-2.5 w-1/4 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-2 w-1/2 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────────

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

  // Obtenir les initiales
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-blue-600 dark:text-blue-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30">
            <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top contributeurs
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Meilleurs contributeurs de la semaine
            </p>
          </div>
        </div>
        <span className="px-2.5 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
          🏆 Classement
        </span>
      </div>

      {/* Contributors List */}
      <div className="space-y-4">

        {/* Loading */}
        {loading && Array.from({ length: limit }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-2 py-6 justify-center text-sm text-red-500 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>Impossible de charger le classement</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && data?.contributors.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
            Aucun article publié cette semaine.
          </p>
        )}

        {/* Data */}
        {!loading && !error && data?.contributors.map((contributor) => {
          const initials = getInitials(contributor.fullName);

          return (
            <div
              key={contributor.userId}
              onClick={() => navigateToProfile(contributor.userId)}
              className="group p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">

                {/* Avatar with actual profile image */}
                <div className="relative">
                  <Avatar
                    src={contributor.profileImage}
                    alt={contributor.fullName}
                    size="medium"
                    className="!h-12 !w-12 shadow-sm group-hover:scale-105 transition-transform duration-200"
                  />

                  {/* Rank badge for top 3 */}
                  {contributor.rank <= 3 && (
                    <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white dark:bg-gray-900 border-2 border-white dark:border-gray-900 shadow-md">
                      {contributor.rank === 1 && <Crown className="h-3 w-3 text-yellow-500" />}
                      {contributor.rank === 2 && <span className="text-xs font-bold text-gray-400">2</span>}
                      {contributor.rank === 3 && <span className="text-xs font-bold text-amber-600">3</span>}
                    </div>
                  )}
                </div>

                {/* Contributor Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                      {contributor.fullName}
                    </h4>
                    <span className={`text-xs font-bold ${getScoreColor(contributor.score)}`}>
                      {contributor.score}%
                    </span>
                  </div>

                  {contributor.department && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {contributor.department}
                    </p>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {contributor.articlesCount}
                      </span>
                      <span>articles</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex-1 max-w-20">
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            contributor.score >= 90 ? 'bg-green-500' :
                            contributor.score >= 80 ? 'bg-blue-500'  :
                            contributor.score >= 70 ? 'bg-yellow-500': 'bg-gray-400'
                          }`}
                          style={{ width: `${contributor.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Level Indicator */}
                {contributor.rank <= 3 ? (
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="flex flex-col items-center">
                      <div className={`px-2 py-1 rounded text-xs font-bold ${
                        contributor.rank === 1 ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white' :
                        contributor.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-600 text-white' :
                        'bg-gradient-to-r from-amber-600 to-amber-800 text-white'
                      }`}>
                        Niveau {contributor.rank}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">Expert</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg
                      className="h-5 w-5 text-gray-400 dark:text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Basé sur la qualité et quantité des contributions</span>
          <button className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
            Voir tout →
          </button>
        </div>
      </div>
    </div>
  );
}
