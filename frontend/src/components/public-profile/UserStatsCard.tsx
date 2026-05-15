'use client';

import { BookOpen, Heart, Award, Star, MessageCircle, Eye } from 'lucide-react';

interface UserStatsCardProps {
  stats: {
    totalArticles: number;
    totalLikes: number;
    totalComments: number;
    totalViews: number;
  };
}

export default function UserStatsCard({ stats }: UserStatsCardProps) {
  // Calcul des métriques dérivées
  const engagementRate = stats.totalArticles > 0 
    ? Math.round((stats.totalLikes + stats.totalComments) / stats.totalArticles * 10) / 10
    : 0;
  
  const avgViews = stats.totalArticles > 0 
    ? Math.round(stats.totalViews / stats.totalArticles)
    : 0;

  // Formater les grands nombres
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
        Statistiques
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
  {/* Articles publiés */}
  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
          {stats.totalArticles}
        </h4>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Articles
        </span>
      </div>
       <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800">
        <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>
    </div>
  </div>

  {/* Commentaires reçus */}
  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
          {formatNumber(stats.totalComments)}
        </h4>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Commentaires
        </span>
      </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-800">
              <MessageCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
      </div>
    </div>
  </div>

  {/* Likes reçus */}
  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
          {formatNumber(stats.totalLikes)}
        </h4>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          J'aime
        </span>
      </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-800">
              <Heart className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
    </div>
  </div>

  {/* Vues totales */}
  <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-4">
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-2xl font-bold text-gray-700 dark:text-gray-300">
          {formatNumber(stats.totalViews)}
        </h4>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Vues
        </span>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
        <Eye className="h-6 w-6 text-gray-600 dark:text-gray-400" />
      </div>
    </div>
  </div>
</div>

      {/* Métriques avancées - Affichées uniquement si l'utilisateur a des articles */}
      {stats.totalArticles > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            {/* Taux d'engagement */}
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Engagement / article
              </p>
              <div className="flex items-center justify-center gap-1">
                <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-lg font-semibold text-purple-700 dark:text-purple-400">
                  {engagementRate}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                ({formatNumber(stats.totalLikes + stats.totalComments)} total)
              </p>
            </div>

            {/* Moyenne de vues */}
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Vues / article
              </p>
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-lg font-semibold text-yellow-700 dark:text-yellow-400">
                  {formatNumber(avgViews)}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Moyenne par article
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}