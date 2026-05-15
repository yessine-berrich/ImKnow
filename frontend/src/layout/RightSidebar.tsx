// app/components/sidebar/RightSidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';


export default function RightSidebar() {
  const [isVisible, setIsVisible] = useState(true);

  // Données mock
  const popularTags = [
    { id: '1', name: 'React', count: 45 },
    { id: '2', name: 'TypeScript', count: 38 },
    { id: '3', name: 'IA', count: 32 },
    { id: '4', name: 'DevOps', count: 28 },
    { id: '5', name: 'NextJS', count: 25 },
    { id: '6', name: 'Design', count: 22 },
  ];

  const stats = {
    totalArticles: 124,
    totalViews: 12850,
    totalUsers: 87,
    totalLikes: 2341,
  };

  // Suivi du scroll
  useEffect(() => {
    const handleScroll = () => {
      // Cache la sidebar en bas de page
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <>
      <style jsx global>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slideInRight {
          animation: slideInRight 0.3s ease-out;
        }

        .right-sidebar-container {
          position: sticky;
          top: 20px;
          height: fit-content;
          max-height: calc(100vh - 100px);
          overflow-y: auto;
          padding-right: 4px;
          margin-right: -4px;
        }

        .right-sidebar-container::-webkit-scrollbar {
          width: 4px;
        }

        .right-sidebar-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .right-sidebar-container::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 2px;
        }

        .dark .right-sidebar-container::-webkit-scrollbar-thumb {
          background-color: rgba(75, 85, 99, 0.5);
        }

        /* Indicateur de scroll */
        .scroll-indicator {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(to top, rgba(255, 255, 255, 1), rgba(255, 255, 255, 0));
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s;
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }

        .dark .scroll-indicator {
          background: linear-gradient(to top, rgba(17, 24, 39, 1), rgba(17, 24, 39, 0));
        }

        .right-sidebar-container:hover .scroll-indicator {
          opacity: 1;
        }
      `}</style>

      <aside className={`hidden xl:block w-80 flex-shrink-0 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="right-sidebar-container">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 mb-6 animate-slideInRight">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalArticles}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Articles</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(stats.totalViews)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Vues totales</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Trending Articles Widget */}
          <div className="mb-6 animate-slideInRight" style={{ animationDelay: '0.1s' }}>
            <TrendingArticles
              title="Articles tendances"
              maxItems={3}
            />
          </div>

          {/* Top Contributors Widget */}
          <div className="mb-6 animate-slideInRight" style={{ animationDelay: '0.2s' }}>
            <TopContributors 
              title="Top contributeurs"
              maxItems={4}
            />
          </div>

          {/* Popular Tags */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6 animate-slideInRight" style={{ animationDelay: '0.3s' }}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Hash className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Tags populaires</h3>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <button
                    key={tag.id}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium hover:scale-105 transform transition-transform"
                  >
                    #{tag.name}
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                      {tag.count}
                    </span>
                  </button>
                ))}
              </div>
              <button className="w-full mt-3 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-1">
                Explorer tous les tags
                <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Footer Links */}
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-2 animate-slideInRight" style={{ animationDelay: '0.4s' }}>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline">À propos</a>
              <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline">Aide</a>
              <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline">Confidentialité</a>
              <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline">Conditions</a>
              <a href="#" className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline">Contact</a>
            </div>
            <p className="pt-2 border-t border-gray-200 dark:border-gray-800">
              © 2024 KnowledgeHub • Plateforme collaborative de gestion des connaissances
            </p>
          </div>

          {/* Indicateur de scroll */}
          <div className="scroll-indicator" />
        </div>
      </aside>
    </>
  );
}

// Importez les icônes manquantes
import { BookOpen, Eye, Hash, ChevronRight } from 'lucide-react';
import TrendingArticles from '@/components/article/Trendingarticles';import TopContributors from '@/components/users/Topcontributors';

