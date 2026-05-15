// /home/pfe2026/Desktop/PfeProject/frontend/src/components/filters/ArticleFilterBar.tsx

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SlidersHorizontal,
  Folder,
  Tag,
  X,
  ChevronDown,
  Clock,
  TrendingUp,
  Calendar
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export type SortOption = 'recent' | 'oldest' | 'popular';

export interface FilterOptions {
  sortBy: SortOption;
  selectedCategory: string;
  selectedTag: string;
  searchQuery?: string;
}

interface ArticleFilterBarProps {
  categories: string[];
  tags: string[];
  activeFilters: FilterOptions;
  onFilterChange: (filters: Partial<FilterOptions>) => void;
  showSearch?: boolean;
  className?: string;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function ArticleFilterBar({
  categories,
  tags,
  activeFilters,
  onFilterChange,
  showSearch = false,
  className = ''
}: ArticleFilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(activeFilters.searchQuery || '');

  // Options de tri avec leurs icônes et libellés
  const sortOptions: { value: SortOption; label: string; icon: React.ReactNode }[] = [
    { 
      value: 'recent', 
      label: 'Plus récents', 
      icon: <Clock className="h-4 w-4" /> 
    },
    { 
      value: 'oldest', 
      label: 'Plus anciens', 
      icon: <Calendar className="h-4 w-4" /> 
    },
    { 
      value: 'popular', 
      label: 'Plus populaires', 
      icon: <TrendingUp className="h-4 w-4" /> 
    },
  ];

  // Gestionnaires d'événements
  const handleSortChange = (value: SortOption) => {
    onFilterChange({ sortBy: value });
  };

  const handleCategoryChange = (value: string) => {
    onFilterChange({ selectedCategory: value });
  };

  const handleTagChange = (value: string) => {
    onFilterChange({ selectedTag: value });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ searchQuery: searchInput });
  };

  const clearCategory = () => {
    onFilterChange({ selectedCategory: 'all' });
  };

  const clearTag = () => {
    onFilterChange({ selectedTag: 'all' });
  };

  const clearSearch = () => {
    setSearchInput('');
    onFilterChange({ searchQuery: '' });
  };

  const clearAllFilters = () => {
    setSearchInput('');
    onFilterChange({
      sortBy: 'recent',
      selectedCategory: 'all',
      selectedTag: 'all',
      searchQuery: ''
    });
  };

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = 
    activeFilters.selectedCategory !== 'all' || 
    activeFilters.selectedTag !== 'all' || 
    (activeFilters.searchQuery && activeFilters.searchQuery !== '');

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
      {/* Barre principale */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Recherche (optionnelle) */}
        {showSearch && (
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher par titre, auteur, catégorie..."
              className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 px-4 pr-24 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
            <button
              type="submit"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90"
            >
              Rechercher
            </button>
          </form>
        )}

        {/* Bouton filtres */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition-colors ${
              showFilters 
                ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20' 
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filtres
            {hasActiveFilters && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                {(activeFilters.selectedCategory !== 'all' ? 1 : 0) + 
                 (activeFilters.selectedTag !== 'all' ? 1 : 0) + 
                 (activeFilters.searchQuery ? 1 : 0)}
              </span>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {/* Tri rapide (visible même quand filtres fermés) */}
          <select
            value={activeFilters.sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            {sortOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Panneau de filtres détaillés */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 dark:border-gray-700 md:grid-cols-2">
              {/* Catégorie */}
              <div>
                <label className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Folder className="h-4 w-4" />
                  Catégorie
                </label>
                <select
                  value={activeFilters.selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="mb-2 flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Tag className="h-4 w-4" />
                  Tag
                </label>
                <select
                  value={activeFilters.selectedTag}
                  onChange={(e) => handleTagChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">Tous les tags</option>
                  {tags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Filtres actifs */}
            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Filtres actifs:
                </span>
                
                {activeFilters.searchQuery && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    "{activeFilters.searchQuery}"
                    <button onClick={clearSearch} className="hover:text-primary/80">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {activeFilters.selectedCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                    <Folder className="h-3 w-3" />
                    {activeFilters.selectedCategory}
                    <button onClick={clearCategory} className="hover:text-blue-800 dark:hover:text-blue-300">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                
                {activeFilters.selectedTag !== 'all' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                    <Tag className="h-3 w-3" />
                    {activeFilters.selectedTag}
                    <button onClick={clearTag} className="hover:text-purple-800 dark:hover:text-purple-300">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                <button
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Tout effacer
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}