'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Search, 
  Folder, 
  FileText, 
  BarChart2, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Filter
} from 'lucide-react';
import { articleService } from '../../../services/article.service';

interface Category {
  id: string | number;
  name: string;
  description: string;
  articleCount: number;
}

interface CategoriesManagerProps {
  categories: Category[];
  onCreateClick: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (id: string | number) => void;
}

type FilterStatus = 'all' | 'active' | 'inactive';

export default function CategoriesManager({
  categories,
  onCreateClick,
  onEditCategory,
  onDeleteCategory,
}: CategoriesManagerProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState<Record<string | number, boolean>>({});
  const [categoryArticles, setCategoryArticles] = useState<Record<string | number, number>>({});
  const [showStats, setShowStats] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'articleCount'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // ✅ Navigation vers la page des articles de la catégorie
  const handleViewArticles = (categoryId: string | number) => {
    router.push(`/categories/${categoryId}/articles`);
  };

  // Charger le nombre réel d'articles pour chaque catégorie
  useEffect(() => {
    const loadArticleCounts = async () => {
      if (categories.length === 0) return;
      
      setLoading(true);
      try {
        const counts: Record<string | number, number> = {};
        const loadingState: Record<string | number, boolean> = {};
        
        // Initialiser l'état de chargement pour chaque catégorie
        categories.forEach(cat => {
          loadingState[cat.id] = true;
        });
        setLoadingCategories(loadingState);

        // Charger tous les articles une seule fois pour optimiser
        try {
          const allArticles = await articleService.findAll();
          
          // Compter les articles par catégorie
          categories.forEach(category => {
            const categoryId = Number(category.id);
            const articleCount = allArticles.filter(
              article => article.category?.id === categoryId
            ).length;
            counts[category.id] = articleCount;
            
            // Mettre à jour l'état de chargement pour cette catégorie
            setLoadingCategories(prev => ({
              ...prev,
              [category.id]: false
            }));
          });
        } catch (error) {
          console.error('Erreur chargement articles:', error);
          // En cas d'erreur, mettre tous les compteurs à 0
          categories.forEach(category => {
            counts[category.id] = 0;
            setLoadingCategories(prev => ({
              ...prev,
              [category.id]: false
            }));
          });
        }
        
        setCategoryArticles(counts);
      } catch (error) {
        console.error('Erreur globale:', error);
      } finally {
        setLoading(false);
      }
    };

    loadArticleCounts();
  }, [categories]);

  // Filtrer par recherche et statut
  const filteredCategories = useMemo(() => {
    return categories.filter(category => {
      // Filtre par recherche
      const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtre par statut
      const articleCount = categoryArticles[category.id] !== undefined 
        ? categoryArticles[category.id] 
        : category.articleCount;
      
      const matchesStatus = 
        filterStatus === 'all' ? true :
        filterStatus === 'active' ? articleCount > 0 :
        articleCount === 0;
      
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, filterStatus, categoryArticles]);

  // Trier les catégories
  const sortedAndFilteredCategories = useMemo(() => {
    const categoriesWithCounts = filteredCategories.map(cat => ({
      ...cat,
      articleCount: categoryArticles[cat.id] !== undefined 
        ? categoryArticles[cat.id] 
        : cat.articleCount
    }));

    return categoriesWithCounts.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        // ✅ CORRECTION: Inverser l'ordre pour que le plus grand nombre apparaisse en premier quand sortOrder = 'desc'
        comparison = a.articleCount - b.articleCount;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredCategories, categoryArticles, sortBy, sortOrder]);

  // Statistiques
  const stats = useMemo(() => {
    const categoriesWithCounts = categories.map(cat => ({
      ...cat,
      articleCount: categoryArticles[cat.id] !== undefined 
        ? categoryArticles[cat.id] 
        : cat.articleCount
    }));
    
    const totalCategories = categories.length;
    const totalArticles = categoriesWithCounts.reduce((sum, cat) => sum + cat.articleCount, 0);
    const activeCategories = categoriesWithCounts.filter(c => c.articleCount > 0).length;
    const avgArticles = totalCategories > 0 ? Math.round(totalArticles / totalCategories) : 0;
    const maxArticles = Math.max(...categoriesWithCounts.map(c => c.articleCount), 0);
    const mostPopularCategory = categoriesWithCounts.find(c => c.articleCount === maxArticles);

    return {
      totalCategories,
      totalArticles,
      activeCategories,
      avgArticles,
      maxArticles,
      mostPopularCategory
    };
  }, [categories, categoryArticles]);

  // Toggle sort
  const toggleSort = (field: 'name' | 'articleCount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      // ✅ Pour articleCount, mettre 'desc' par défaut pour voir les plus grandes catégories en premier
      setSortOrder(field === 'articleCount' ? 'desc' : 'asc');
    }
  };

  // Réinitialiser la recherche
  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec titre et statistiques */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Gestion des catégories
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {categories.length} catégorie{categories.length > 1 ? 's' : ''} au total
          </p>
        </div>
        
        <button
          onClick={onCreateClick}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2 shadow-md hover:shadow-lg whitespace-nowrap"
        >
          <Plus className="h-5 w-5" />
          Nouvelle catégorie
        </button>
      </div>

      {/* Stats Cards avec toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
        >
          <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-blue-600" />
            Statistiques
          </span>
          {showStats ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>

        {showStats && (
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-5 border border-blue-100 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Catégories</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.totalCategories}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                    <Folder className="w-7 h-7 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-5 border border-green-100 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">Articles total</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {loading ? (
                        <span className="inline-block w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        stats.totalArticles
                      )}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                    <FileText className="w-7 h-7 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-5 border border-purple-100 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Moyenne articles</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {loading ? '...' : stats.avgArticles}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                    <BarChart2 className="w-7 h-7 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-5 border border-amber-100 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Catégories actives</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {loading ? '...' : stats.activeCategories}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      sur {stats.totalCategories}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                    <TrendingUp className="w-7 h-7 text-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Statistiques additionnelles */}
            {stats.mostPopularCategory && stats.maxArticles > 0 && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Catégorie la plus populaire :</span>{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">
                    {stats.mostPopularCategory.name}
                  </span>{' '}
                  avec {stats.maxArticles} article{stats.maxArticles > 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Barre de recherche, filtres et options de tri */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une catégorie par nom ou description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Filtres de statut */}
          <div className="flex items-center gap-2 border-l pl-3 border-gray-200 dark:border-gray-700">
            <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">Filtre:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'active'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Actives
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'inactive'
                  ? 'bg-gray-400 dark:bg-gray-600 text-white border border-gray-500 dark:border-gray-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Inactives
            </button>
          </div>

          {/* Options de tri */}
          <div className="flex items-center gap-2 border-l pl-3 border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">Trier:</span>
            <button
              onClick={() => toggleSort('name')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'name'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Nom {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('articleCount')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'articleCount'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Articles {sortBy === 'articleCount' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>
      </div>

      {/* Résultats de recherche et filtre */}
      {searchQuery && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {sortedAndFilteredCategories.length} résultat{sortedAndFilteredCategories.length > 1 ? 's' : ''} pour "{searchQuery}"
          </p>
          <button
            onClick={clearSearch}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            Effacer la recherche
          </button>
        </div>
      )}

      {/* Grille des catégories */}
      {sortedAndFilteredCategories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAndFilteredCategories.map((category) => (
            <div
              key={category.id}
              className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-300"
            >
              {/* Badge de nombre d'articles */}
              <div className="absolute top-4 right-4">
                <div className={`px-2.5 py-1.5 rounded-lg border ${
                  category.articleCount > 0
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}>
                  <span className={`text-xs font-medium ${
                    category.articleCount > 0
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {loadingCategories[category.id] ? (
                      <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      `${category.articleCount} article${category.articleCount > 1 ? 's' : ''}`
                    )}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 ${
                    category.articleCount > 0
                      ? 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-700 dark:to-gray-600'
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
                  }`}>
                    <Folder className={`w-7 h-7 ${
                      category.articleCount > 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-lg truncate ${
                      category.articleCount > 0
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {category.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${
                        category.articleCount > 0 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {category.articleCount > 0 ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className={`text-sm mb-4 line-clamp-3 min-h-[60px] ${
                  category.articleCount > 0
                    ? 'text-gray-600 dark:text-gray-300'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {category.description || (
                    <span className="text-gray-400 dark:text-gray-500 italic">
                      Aucune description
                    </span>
                  )}
                </p>

                {/* Barre de progression (si articles) */}
                {category.articleCount > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">Occupation</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {Math.min(100, Math.round((category.articleCount / stats.maxArticles) * 100))}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, Math.round((category.articleCount / stats.maxArticles) * 100))}%` 
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handleViewArticles(category.id)}
                    disabled={category.articleCount === 0}
                    className={`flex items-center gap-2 text-sm transition-colors ${
                      category.articleCount > 0
                        ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                        : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                    title={category.articleCount === 0 ? "Aucun article dans cette catégorie" : "Voir les articles"}
                  >
                    <Eye className="h-4 w-4" />
                    Voir articles
                    {category.articleCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                        {category.articleCount}
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditCategory(category)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Modifier la catégorie"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteCategory(category.id)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Supprimer la catégorie"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
            {searchQuery || filterStatus !== 'all' ? (
              <Search className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            ) : (
              <Folder className="h-12 w-12 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            {searchQuery || filterStatus !== 'all' ? 'Aucune catégorie trouvée' : 'Aucune catégorie'}
          </h3>
          
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
            {searchQuery
              ? `Aucune catégorie ne correspond à "${searchQuery}"${
                  filterStatus !== 'all' ? ` avec le filtre ${filterStatus === 'active' ? 'Actives' : 'Inactives'}` : ''
                }. Essayez avec d'autres termes ou créez une nouvelle catégorie.`
              : filterStatus !== 'all'
              ? `Aucune catégorie ${filterStatus === 'active' ? 'active' : 'inactive'} trouvée.`
              : 'Vous n\'avez pas encore créé de catégorie. Commencez par organiser vos articles en créant votre première catégorie.'}
          </p>
          
          {searchQuery || filterStatus !== 'all' ? (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  clearSearch();
                  setFilterStatus('all');
                }}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Effacer les filtres
              </button>
              <button
                onClick={onCreateClick}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nouvelle catégorie
              </button>
            </div>
          ) : (
            <button
              onClick={onCreateClick}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              Créer une catégorie
            </button>
          )}
        </div>
      )}

      {/* Pagination ou footer */}
      {sortedAndFilteredCategories.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p>
            Affichage de {sortedAndFilteredCategories.length} catégorie{sortedAndFilteredCategories.length > 1 ? 's' : ''}
            {searchQuery && ` pour "${searchQuery}"`}
            {filterStatus !== 'all' && ` (${filterStatus === 'active' ? 'actives' : 'inactives'})`}
          </p>
          <p>
            {stats.activeCategories} active{stats.activeCategories > 1 ? 's' : ''} •{' '}
            {stats.totalArticles} article{stats.totalArticles > 1 ? 's' : ''} au total
          </p>
        </div>
      )}
    </div>
  );
}