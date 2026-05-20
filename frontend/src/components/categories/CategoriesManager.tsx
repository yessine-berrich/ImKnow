'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/context/LanguageContext';
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
  Filter,
} from 'lucide-react';
import { publicationService } from '../../../services/publication.service';

interface Category {
  id: string | number;
  name: string;
  description: string;
  publicationCount: number;
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
  const { t } = useTranslation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState<Record<string | number, boolean>>({});
  const [categoryPublications, setCategoryPublications] = useState<Record<string | number, number>>({});
  const [sortBy, setSortBy] = useState<'name' | 'publicationCount'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // ✅ Navigation vers la page des publications de la catégorie
  const handleViewPublications = (categoryId: string | number) => {
    router.push(`/categories/${categoryId}/publications`);
  };

  // Charger le nombre réel d'publications pour chaque catégorie
  useEffect(() => {
    const loadPublicationCounts = async () => {
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

        // Charger tous les publications une seule fois pour optimiser
        try {
          const allPublications = await publicationService.findAll();
          
          // Compter les publications par catégorie
          categories.forEach(category => {
            const categoryId = Number(category.id);
            const publicationCount = allPublications.filter(
              publication => publication.category?.id === categoryId
            ).length;
            counts[category.id] = publicationCount;
            
            // Mettre à jour l'état de chargement pour cette catégorie
            setLoadingCategories(prev => ({
              ...prev,
              [category.id]: false
            }));
          });
        } catch (error) {
          // On error, set all counts to 0
          categories.forEach(category => {
            counts[category.id] = 0;
            setLoadingCategories(prev => ({
              ...prev,
              [category.id]: false
            }));
          });
        }
        
        setCategoryPublications(counts);
      } catch (error) {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    loadPublicationCounts();
  }, [categories]);

  // Filtrer par recherche et statut
  const filteredCategories = useMemo(() => {
    return categories.filter(category => {
      // Filtre par recherche
      const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filtre par statut
      const publicationCount = categoryPublications[category.id] !== undefined 
        ? categoryPublications[category.id] 
        : category.publicationCount;
      
      const matchesStatus = 
        filterStatus === 'all' ? true :
        filterStatus === 'active' ? publicationCount > 0 :
        publicationCount === 0;
      
      return matchesSearch && matchesStatus;
    });
  }, [categories, searchQuery, filterStatus, categoryPublications]);

  // Trier les catégories
  const sortedAndFilteredCategories = useMemo(() => {
    const categoriesWithCounts = filteredCategories.map(cat => ({
      ...cat,
      publicationCount: categoryPublications[cat.id] !== undefined 
        ? categoryPublications[cat.id] 
        : cat.publicationCount
    }));

    return categoriesWithCounts.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else {
        // ✅ CORRECTION: Inverser l'ordre pour que le plus grand nombre apparaisse en premier quand sortOrder = 'desc'
        comparison = a.publicationCount - b.publicationCount;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredCategories, categoryPublications, sortBy, sortOrder]);

  // Statistiques
  const stats = useMemo(() => {
    const categoriesWithCounts = categories.map(cat => ({
      ...cat,
      publicationCount: categoryPublications[cat.id] !== undefined 
        ? categoryPublications[cat.id] 
        : cat.publicationCount
    }));
    
    const totalCategories = categories.length;
    const totalPublications = categoriesWithCounts.reduce((sum, cat) => sum + cat.publicationCount, 0);
    const activeCategories = categoriesWithCounts.filter(c => c.publicationCount > 0).length;
    const avgPublications = totalCategories > 0 ? Math.round(totalPublications / totalCategories) : 0;
    const maxPublications = Math.max(...categoriesWithCounts.map(c => c.publicationCount), 0);
    const mostPopularCategory = categoriesWithCounts.find(c => c.publicationCount === maxPublications);

    return {
      totalCategories,
      totalPublications,
      activeCategories,
      avgPublications,
      maxPublications,
      mostPopularCategory
    };
  }, [categories, categoryPublications]);

  // Toggle sort
  const toggleSort = (field: 'name' | 'publicationCount') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      // ✅ Pour publicationCount, mettre 'desc' par défaut pour voir les plus grandes catégories en premier
      setSortOrder(field === 'publicationCount' ? 'desc' : 'asc');
    }
  };

  // Réinitialiser la recherche
  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">

      {/* Stats Cards — clickable pour filtrer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          { label: t('categories_page.stat_total'),      value: stats.totalCategories,                    gradient: 'from-blue-500 to-blue-600',    icon: <Folder size={18} />,    filter: 'all'    as FilterStatus | null },
          { label: t('categories_page.stat_total_pubs'), value: loading ? '…' : stats.totalPublications,  gradient: 'from-green-500 to-green-600',  icon: <FileText size={18} />,  filter: null     as FilterStatus | null },
          { label: t('categories_page.stat_avg_pubs'),   value: loading ? '…' : stats.avgPublications,    gradient: 'from-purple-500 to-purple-600',icon: <BarChart2 size={18} />, filter: null     as FilterStatus | null },
          { label: t('categories_page.stat_active'),     value: loading ? '…' : stats.activeCategories,   gradient: 'from-amber-500 to-amber-600', icon: <TrendingUp size={18} />, filter: 'active' as FilterStatus | null },
        ]).map(({ label, value, gradient, icon, filter }) => {
          const isActive = filter !== null && filterStatus === filter;
          return (
            <button
              key={label}
              onClick={() => { if (filter !== null) setFilterStatus(isActive ? 'all' : filter); }}
              className={`text-left bg-white dark:bg-gray-900 rounded-xl border-2 p-5 transition-all ${
                filter !== null ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'
              } ${
                isActive
                  ? 'border-[#168F6F] shadow-md ring-2 ring-[#168F6F]/20'
                  : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <span className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} text-white`}>{icon}</span>
              </div>
              <p className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{value}</p>
              {isActive && (
                <p className="text-xs text-[#168F6F] mt-1 font-medium">{t('categories_page.filter_active')}</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Barre de recherche, filtres et options de tri */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('categories_page.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#168F6F] focus:border-transparent shadow-sm"
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
            <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">{t('categories_page.filter_label')}</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#4db896] border border-[#168F6F]/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('categories_page.filter_all')}
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'active'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('categories_page.filter_active_btn')}
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === 'inactive'
                  ? 'bg-gray-400 dark:bg-gray-600 text-white border border-gray-500 dark:border-gray-500'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('categories_page.filter_inactive_btn')}
            </button>
          </div>

           {/* Options de tri */}
          <div className="flex items-center gap-2 border-l pl-3 border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">{t('categories_page.sort_label')}</span>
            <button
              onClick={() => toggleSort('name')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'name'
                  ? 'bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#4db896] border border-[#168F6F]/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('categories_page.sort_name')} {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('publicationCount')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === 'publicationCount'
                  ? 'bg-[#168F6F]/10 dark:bg-[#168F6F]/20 text-[#168F6F] dark:text-[#4db896] border border-[#168F6F]/30'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t('categories_page.sort_publications')} {sortBy === 'publicationCount' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
          {/* Nouvelle catégorie */}
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#168F6F] hover:bg-[#0e6b52] text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-95 text-sm whitespace-nowrap ml-auto"
          >
            <Plus className="h-4 w-4" />
            {t('categories_page.create_btn')}
          </button>
        </div>
      </div>

      {/* Résultats de recherche et filtre */}
      {searchQuery && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('categories_page.results_count', { count: sortedAndFilteredCategories.length, query: searchQuery })}
          </p>
          <button
            onClick={clearSearch}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {t('categories_page.clear_search')}
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
              {/* Badge de nombre d'publications */}
              <div className="absolute top-4 right-4">
                <div className={`px-2.5 py-1.5 rounded-lg border ${
                  category.publicationCount > 0
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}>
                  <span className={`text-xs font-medium ${
                    category.publicationCount > 0
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {loadingCategories[category.id] ? (
                      <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      t('categories_page.pub_count', { count: category.publicationCount })
                    )}
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 ${
                    category.publicationCount > 0
                      ? 'bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-gray-700 dark:to-gray-600'
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
                  }`}>
                    <Folder className={`w-7 h-7 ${
                      category.publicationCount > 0
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold text-lg truncate ${
                      category.publicationCount > 0
                        ? 'text-gray-900 dark:text-white'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {category.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <div className={`w-2 h-2 rounded-full ${
                        category.publicationCount > 0 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-gray-400'
                      }`} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {category.publicationCount > 0 ? t('categories_page.status_active') : t('categories_page.status_inactive')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className={`text-sm mb-4 line-clamp-3 min-h-[60px] ${
                  category.publicationCount > 0
                    ? 'text-gray-600 dark:text-gray-300'
                    : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {category.description || (
                    <span className="text-gray-400 dark:text-gray-500 italic">
                      {t('categories_page.no_description')}
                    </span>
                  )}
                </p>

                {/* Barre de progression (si publications) */}
                {category.publicationCount > 0 && (
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">{t('categories_page.occupation')}</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {Math.min(100, Math.round((category.publicationCount / stats.maxPublications) * 100))}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.min(100, Math.round((category.publicationCount / stats.maxPublications) * 100))}%` 
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => handleViewPublications(category.id)}
                    disabled={category.publicationCount === 0}
                    className={`flex items-center gap-2 text-sm transition-colors ${
                      category.publicationCount > 0
                        ? 'text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300'
                        : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                    title={category.publicationCount === 0 ? t('categories_page.no_pubs_tooltip') : t('categories_page.view_pubs_tooltip')}
                  >
                    <Eye className="h-4 w-4" />
                    {t('categories_page.view_pubs_btn')}
                    {category.publicationCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                        {category.publicationCount}
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditCategory(category)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title={t('categories_page.btn_edit_title')}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteCategory(category.id)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title={t('categories_page.btn_delete_title')}
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
            {searchQuery || filterStatus !== 'all' ? t('categories_page.empty_title_filtered') : t('categories_page.empty_title_none')}
          </h3>

          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8">
            {searchQuery
              ? filterStatus === 'active'
                ? t('categories_page.empty_search_with_filter_active', { query: searchQuery })
                : filterStatus === 'inactive'
                ? t('categories_page.empty_search_with_filter_inactive', { query: searchQuery })
                : t('categories_page.empty_search_only', { query: searchQuery })
              : filterStatus !== 'all'
              ? filterStatus === 'active'
                ? t('categories_page.empty_filter_active')
                : t('categories_page.empty_filter_inactive')
              : t('categories_page.empty_no_cats')}
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
                {t('categories_page.clear_filters_btn')}
              </button>
              <button
                onClick={onCreateClick}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                {t('categories_page.new_category_btn')}
              </button>
            </div>
          ) : (
            <button
              onClick={onCreateClick}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              {t('categories_page.create_category_btn')}
            </button>
          )}
        </div>
      )}

      {/* Pagination ou footer */}
      {sortedAndFilteredCategories.length > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p>
            {t('categories_page.footer_showing', { count: sortedAndFilteredCategories.length })}
            {searchQuery && t('categories_page.footer_for_query', { query: searchQuery })}
            {filterStatus !== 'all' && (filterStatus === 'active' ? t('categories_page.footer_filter_active') : t('categories_page.footer_filter_inactive'))}
          </p>
          <p>
            {t('categories_page.footer_stats', { active: stats.activeCategories, pubs: stats.totalPublications })}
          </p>
        </div>
      )}
    </div>
  );
}