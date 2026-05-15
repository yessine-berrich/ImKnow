'use client';

import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Eye,
  FileText,
  Users,
  ArrowUp,
  ArrowDown,
  Minus,
  Tag,
  User,
  MessageCircle,
  Heart,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { statsService, EmployeeTrendingStats } from '../../../../../../services/stats.service';

export default function TrendingPage() {
  const [data, setData] = useState<EmployeeTrendingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTrendingData();
  }, []);

  const fetchTrendingData = async () => {
    try {
      setLoading(true);
      const result = await statsService.getEmployeeTrendingStats();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ {error}</div>
          <button
            onClick={fetchTrendingData}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-brand-500" />
            Tendances de la semaine
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {new Date(data.period.from).toLocaleDateString('fr-FR')} - {new Date(data.period.to).toLocaleDateString('fr-FR')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<FileText className="w-6 h-6" />}
            title="Articles publiés"
            value={data.stats.totalArticles}
            growth={data.stats.articlesGrowth}
            color="blue"
          />
          <StatCard
            icon={<Eye className="w-6 h-6" />}
            title="Vues totales"
            value={data.stats.totalViews}
            growth={data.stats.viewsGrowth}
            color="green"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            title="Auteurs actifs"
            value={data.stats.activeAuthors}
            growth={0}
            color="purple"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Articles */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📈 Articles populaires
                </h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.topArticles.map((article, index) => (
                  <ArticleCard key={article.id} article={article} rank={index + 1} />
                ))}
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                📊 Activité quotidienne
              </h2>
              <ActivityChart data={data.dailyActivity} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Tags */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Tags tendance
              </h2>
              <div className="space-y-3">
                {data.trendingTags.map((tag) => (
                  <TagCard key={tag.id} tag={tag} />
                ))}
              </div>
            </div>

            {/* Top Authors */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Auteurs du moment
              </h2>
              <div className="space-y-4">
                {data.topAuthors.map((author, index) => (
                  <AuthorCard key={author.id} author={author} rank={index + 1} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composants enfants
function StatCard({ icon, title, value, growth, color }: { 
  icon: React.ReactNode; 
  title: string; 
  value: number; 
  growth: number; 
  color: 'blue' | 'green' | 'purple';
}) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>{icon}</div>
        {growth !== 0 && (
          <span className={`flex items-center gap-1 text-sm font-medium ${growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {growth > 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {Math.abs(growth)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value.toLocaleString()}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{title}</div>
    </div>
  );
}

function ArticleCard({ article, rank }: { article: EmployeeTrendingStats['topArticles'][0]; rank: number }) {
  return (
    <Link href={`/articles/${article.slug}`} className="block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
              {article.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
              {article.excerpt}
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {article.viewsCount.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {article.likesCount.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                {article.commentsCount.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(article.publishedAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TagCard({ tag }: { tag: EmployeeTrendingStats['trendingTags'][0] }) {
  const trendIcon = {
    up: <ArrowUp className="w-4 h-4 text-green-500" />,
    down: <ArrowDown className="w-4 h-4 text-red-500" />,
    stable: <Minus className="w-4 h-4 text-yellow-500" />,
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900 dark:text-white">#{tag.name}</span>
          {trendIcon[tag.trend]}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{tag.articleCount} articles</span>
          <span>{tag.totalViews.toLocaleString()} vues</span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-semibold text-brand-600 dark:text-brand-400">
          {tag.热度}°
        </div>
        <div className="text-xs text-gray-500">popularité</div>
      </div>
    </div>
  );
}

function AuthorCard({ author, rank }: { author: EmployeeTrendingStats['topAuthors'][0]; rank: number }) {
  return (
    <Link href={`/profile/${author.id}`} className="block">
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white font-semibold">
          {author.avatar ? (
            <Image src={author.avatar} alt={author.name} width={40} height={40} className="rounded-full object-cover" />
          ) : (
            author.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-900 dark:text-white truncate">{author.name}</p>
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">#{rank}</span>
          </div>
          {author.department && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{author.department}</p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
            <span>{author.articleCount} articles</span>
            <span>{author.engagementRate}% engagement</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ActivityChart({ data }: { data: EmployeeTrendingStats['dailyActivity'] }) {
  const maxViews = Math.max(...data.map(d => d.views), 1);
  const maxArticles = Math.max(...data.map(d => d.articles), 1);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-brand-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Articles</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Vues</span>
          </div>
        </div>
      </div>
      <div className="flex items-end gap-2 h-64">
        {data.map((day, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-2">
            <div className="relative w-full flex justify-center gap-1">
              <div 
                className="w-1/2 bg-brand-500 rounded-t transition-all duration-300 hover:opacity-80"
                style={{ height: `${(day.articles / maxArticles) * 150}px` }}
              />
              <div 
                className="w-1/2 bg-green-500 rounded-t transition-all duration-300 hover:opacity-80"
                style={{ height: `${(day.views / maxViews) * 150}px` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 transform -rotate-45 origin-top-left">
              {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}