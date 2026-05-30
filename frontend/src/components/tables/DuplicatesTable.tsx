'use client';

import { getToken } from '../../../services/auth.service';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, MoreVertical, ChevronLeft, ChevronRight, ArrowUpDown,
  Loader2, Copy, AlertTriangle, User,
  FolderOpen, BarChart2, Link2, Trash2, ThumbsUp,
} from 'lucide-react';
import { toast } from '@/components/modals/ToastContainer';
import { confirm } from '@/components/modals/ConfirmModal';
import { DuplicatePublication } from '@/app/(admin)/(others-pages)/(rejected)/rejected/duplicated/page';
import Avatar from '@/components/ui/avatar/Avatar';
import { useTranslation } from '@/context/LanguageContext';
import { translateError } from '@/utils/errorTranslation';
import PublicationDetailModal from '@/components/modals/PublicationDetailModal';

interface DuplicatesTableProps {
  publications: DuplicatePublication[];
  onRefresh: () => void;
  title?: string;
  description?: string;
}

type SortKey = 'title' | 'duplicateScore' | 'author' | 'category' | 'createdAt';

const truncateText = (text: string, maxLength: number = 20): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export default function DuplicatesTable({ publications: initialPublications, onRefresh, title, description }: DuplicatesTableProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [publications, setPublications] = useState(initialPublications);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [scoreFilter, setScoreFilter] = useState(''); // '' | 'high'
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [expandedSimilarId, setExpandedSimilarId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [modalPublication, setModalPublication] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loadingSimilarId, setLoadingSimilarId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [userToken, setUserToken] = useState<string | undefined>(undefined);

  useEffect(() => { setPublications(initialPublications); }, [initialPublications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      setUserToken(token);
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.sub);
      } catch {}
    }
  }, []);

  const getAuthHeaders = () => {
    const token = getToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  /* ── Mapper: DuplicatePublication → format PublicationDetailModal ── */
  const mapDuplicateToModal = (pub: DuplicatePublication): any => {
    const name = pub.author?.name || t('tables.unknown_author');
    const initials = name.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    return {
      id: String(pub.id),
      title: pub.title,
      content: pub.content,
      description: pub.rejectionReason || '',
      author: {
        id: pub.author?.id,
        name,
        initials,
        department: '',
        avatar: pub.author?.profileImage || null,
      },
      category: {
        name: pub.category?.name || '',
        slug: pub.category?.name?.toLowerCase().replace(/\s+/g, '-') || '',
      },
      tags: pub.tags,
      publishedAt: pub.createdAt,
      updatedAt: pub.updatedAt,
      status: 'rejected' as const,
      stats: { likes: 0, comments: 0, views: 0 },
      isLiked: false,
      isBookmarked: false,
    };
  };

  /* ── Mapper: réponse API publication → format PublicationDetailModal ── */
  const mapApiToModal = (raw: any): any => {
    const data = raw?.publication ?? raw;
    const authorName =
      data.author?.name ||
      (data.author?.firstName
        ? `${data.author.firstName} ${data.author.lastName || ''}`.trim()
        : t('tables.unknown_author'));
    const initials = authorName.split(' ').filter(Boolean).map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    return {
      id: String(data.id),
      title: data.title || '',
      content: data.content || '',
      description: data.description || data.excerpt || '',
      author: {
        id: data.author?.id,
        name: authorName,
        initials,
        department: data.author?.role || '',
        avatar: data.author?.profileImage || data.author?.avatar || null,
      },
      category: {
        name: data.category?.name || '',
        slug: data.category?.slug || data.category?.name?.toLowerCase().replace(/\s+/g, '-') || '',
      },
      tags: Array.isArray(data.tags) ? data.tags : [],
      publishedAt: data.publishedAt || data.createdAt || '',
      updatedAt: data.updatedAt || '',
      status: data.status || 'published',
      stats: {
        likes:    data.likes    ?? data._count?.likes    ?? data.stats?.likes    ?? 0,
        comments: data.comments ?? data._count?.comments ?? data.stats?.comments ?? 0,
        views:    data.views    ?? data._count?.views    ?? data.stats?.views    ?? 0,
      },
      isLiked:      data.isLiked      ?? false,
      isBookmarked: data.isBookmarked ?? false,
    };
  };

  /* ── Fetch une publication similaire puis ouvre le modal ── */
  const fetchAndViewSimilarPublication = async (simId: number) => {
    setLoadingSimilarId(simId);
    try {
      const res = await fetch(`http://localhost:3000/api/publications/${simId}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setModalPublication(mapApiToModal(data));
      setIsDetailModalOpen(true);
    } catch (err: any) {
      toast.error(translateError(err.message, t as any));
    } finally {
      setLoadingSimilarId(null);
    }
  };

  /* ── Actions ── */
  const handleApprove = async (id: number, pubTitle: string) => {
    setOpenMenuId(null);
    if (!await confirm(t('tables.approve_confirm_msg', { title: pubTitle }), { title: t('tables.approve_confirm_title') })) return;
    setLoading(l => ({ ...l, [id]: true }));
    try {
      const res = await fetch(`http://localhost:3000/api/publications/${id}/approve`, { method: 'PATCH', headers: getAuthHeaders() });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.message || `Erreur ${res.status}`); }
      setPublications(prev => prev.filter(a => a.id !== id));
      toast.success(t('tables.toast_approved'));
    } catch (err: any) {
      toast.error(t('tables.toast_approve_error', { error: translateError(err.message, t as any) }));
    } finally {
      setLoading(l => ({ ...l, [id]: false }));
    }
  };

  const handleDelete = async (id: number, pubTitle: string) => {
    setOpenMenuId(null);
    if (!await confirm(t('tables.delete_confirm_msg', { title: pubTitle }), { title: t('tables.delete_confirm_title') })) return;
    setLoading(l => ({ ...l, [id]: true }));
    try {
      const res = await fetch(`http://localhost:3000/api/publications/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok && res.status !== 204) { const err = await res.json().catch(() => ({})); throw new Error(err.message || `Erreur ${res.status}`); }
      setPublications(prev => prev.filter(a => a.id !== id));
      toast.success(t('tables.toast_deleted'));
    } catch (err: any) {
      toast.error(t('tables.toast_delete_error', { error: translateError(err.message, t as any) }));
    } finally {
      setLoading(l => ({ ...l, [id]: false }));
    }
  };

  const handleViewPublication = (publication: DuplicatePublication) => {
    setModalPublication(mapDuplicateToModal(publication));
    setIsDetailModalOpen(true);
    setOpenMenuId(null);
  };

  const handleCopyRejectionReason = (reason: string) => {
    navigator.clipboard.writeText(reason);
    toast.success(t('tables.toast_reason_copied'));
    setOpenMenuId(null);
  };

  /* ── Computed: catégories disponibles ── */
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    publications.forEach(p => { if (p.category?.name) set.add(p.category.name); });
    return Array.from(set).sort();
  }, [publications]);

  /* ── Filtrage ── */
  const filteredPublications = useMemo(() => {
    return publications.filter(a => {
      if (search.trim()) {
        const s = search.toLowerCase();
        if (!(
          a.title.toLowerCase().includes(s) ||
          a.author?.name.toLowerCase().includes(s) ||
          a.author?.email.toLowerCase().includes(s) ||
          a.category?.name.toLowerCase().includes(s) ||
          a.tags.some(tag => tag.toLowerCase().includes(s))
        )) return false;
      }
      if (categoryFilter && a.category?.name !== categoryFilter) return false;
      if (scoreFilter === 'high' && a.duplicateScore < 0.85) return false;
      return true;
    });
  }, [publications, search, categoryFilter, scoreFilter]);

  /* ── Tri ── */
  const sortedPublications = useMemo(() => {
    if (!sortConfig) return filteredPublications;
    return [...filteredPublications].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortConfig.key) {
        case 'title':          aVal = a.title;               bVal = b.title; break;
        case 'duplicateScore': aVal = a.duplicateScore;       bVal = b.duplicateScore; break;
        case 'author':         aVal = a.author?.name ?? '';   bVal = b.author?.name ?? ''; break;
        case 'category':       aVal = a.category?.name ?? ''; bVal = b.category?.name ?? ''; break;
        case 'createdAt':      aVal = a.createdAt;            bVal = b.createdAt; break;
        default: return 0;
      }
      if (typeof aVal === 'number' && typeof bVal === 'number')
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      return sortConfig.direction === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredPublications, sortConfig]);

  const totalPages  = Math.ceil(sortedPublications.length / itemsPerPage);
  const startIndex  = (currentPage - 1) * itemsPerPage;
  const pagePublications = sortedPublications.slice(startIndex, startIndex + itemsPerPage);
  const displayRows = Array(itemsPerPage).fill(null).map((_, i) => pagePublications[i] ?? null);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const scores = publications.map(a => a.duplicateScore);
    return {
      total:      publications.length,
      avgScore:   scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0,
      highRisk:   publications.filter(a => a.duplicateScore >= 0.85).length,
      categories: new Set(publications.map(a => a.category?.name).filter(Boolean)).size,
    };
  }, [publications]);

  const handleSort = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) setSortConfig({ key, direction: 'asc' });
    else if (sortConfig.direction === 'asc') setSortConfig({ key, direction: 'desc' });
    else setSortConfig(null);
  };

  const scoreColor = (score: number) => {
    if (score >= 0.9)  return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
    if (score >= 0.75) return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20';
    return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
  };

  const scoreBar = (score: number) => {
    const pct   = Math.round(score * 100);
    const color = score >= 0.9 ? 'bg-red-500' : score >= 0.75 ? 'bg-orange-500' : 'bg-yellow-500';
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden w-16">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor(score)}`}>{pct}%</span>
      </div>
    );
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });

  const renderEmptyRow = (key: number) => (
    <tr key={`empty-${key}`} className="opacity-0 pointer-events-none h-[65px]">
      <td colSpan={8}><div className="invisible">Placeholder</div></td>
    </tr>
  );

  const columns: { key: SortKey; label: string }[] = [
    { key: 'title',          label: t('tables.col_publication') },
    { key: 'author',         label: t('tables.col_author')      },
    { key: 'category',       label: t('tables.col_category')    },
    { key: 'duplicateScore', label: t('tables.col_dup_score')   },
    { key: 'createdAt',      label: t('tables.col_date')        },
  ];

  return (
    <div className="space-y-6">

      {/* ── En-tête ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors self-start"
        >
          <ArrowUpDown size={15} /> {t('tables.refresh')}
        </button>
      </div>

      {/* ── Cartes statistiques (cliquables comme ModerationTable) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {([
          {
            label:    t('tables.stat_total_dup'),
            value:    stats.total,
            gradient: 'from-orange-500 to-orange-600',
            icon:     <Copy size={18} />,
            onClick:  (() => { setCategoryFilter(''); setScoreFilter(''); setSearch(''); setCurrentPage(1); }) as (() => void) | null,
            isActive: false,
          },
          {
            label:    t('tables.stat_avg_score'),
            value:    `${Math.round(stats.avgScore * 100)}%`,
            gradient: 'from-yellow-500 to-yellow-600',
            icon:     <BarChart2 size={18} />,
            onClick:  null as (() => void) | null,
            isActive: false,
          },
          {
            label:    t('tables.stat_high_risk'),
            value:    stats.highRisk,
            gradient: 'from-red-500 to-red-600',
            icon:     <AlertTriangle size={18} />,
            onClick:  (() => { setScoreFilter(scoreFilter === 'high' ? '' : 'high'); setCurrentPage(1); }) as (() => void) | null,
            isActive: scoreFilter === 'high',
          },
          {
            label:    t('tables.stat_categories_hit'),
            value:    stats.categories,
            gradient: 'from-purple-500 to-purple-600',
            icon:     <FolderOpen size={18} />,
            onClick:  null as (() => void) | null,
            isActive: false,
          },
        ]).map(({ label, value, gradient, icon, onClick, isActive }) => (
          <div
            key={label}
            onClick={onClick ?? undefined}
            className={`bg-white dark:bg-gray-900 rounded-xl border-2 p-5 transition-all
              ${onClick ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'}
              ${isActive ? 'border-[#168F6F] shadow-md ring-2 ring-[#168F6F]/20' : 'border-gray-200 dark:border-gray-800'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <span className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} text-white`}>{icon}</span>
            </div>
            <p className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{value}</p>
            {isActive && <p className="text-xs text-[#168F6F] mt-1 font-medium">{t('tables.active_filter')}</p>}
          </div>
        ))}
      </div>

      {/* ── Barre de filtres (identique au style ModerationTable) ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col sm:flex-row gap-3">
        {/* Recherche textuelle */}
        <input
          type="text"
          placeholder={t('tables.search_dup')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#168F6F] focus:border-transparent"
        />
        {/* Filtre catégorie */}
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#168F6F] focus:border-transparent min-w-[180px]"
        >
          <option value="">{t('tables.all_categories')}</option>
          {allCategories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        {/* Filtre score */}
        <select
          value={scoreFilter}
          onChange={(e) => { setScoreFilter(e.target.value); setCurrentPage(1); }}
          className={`px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#168F6F] focus:border-transparent transition-all ${
            scoreFilter === 'high'
              ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-400 text-red-700 dark:text-red-300 font-medium'
              : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
          }`}
        >
          <option value="">{t('tables.all_severities')}</option>
          <option value="high">{t('tables.high_severity_filter')}</option>
        </select>
      </div>

      {/* ── Tableau ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {columns.map(({ key, label }) => (
                  <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <button onClick={() => handleSort(key)} className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                      {label} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('tables.col_tags')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('tables.col_similar')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('tables.col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Copy className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{t('tables.empty_dup')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayRows.map((publication, index) => {
                  if (!publication) return renderEmptyRow(index);
                  const isLoading      = loading[publication.id];
                  const truncatedTitle = truncateText(publication.title, 20);
                  const hasLongTitle   = publication.title && publication.title.length > 20;
                  const simCount       = publication.similarPublicationsCache.length;

                  return (
                    <React.Fragment key={publication.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">

                        {/* Titre + raison */}
                        <td className="px-4 py-3 max-w-xs">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white truncate cursor-help" title={hasLongTitle ? publication.title : undefined}>{truncatedTitle}</p>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 truncate max-w-[220px]" title={publication.rejectionReason}>{publication.rejectionReason}</p>
                          </div>
                        </td>

                        {/* Auteur */}
                        <td className="px-4 py-3">
                          {publication.author ? (
                            <div className="flex items-center gap-2">
                              <Avatar src={publication.author.profileImage} alt={publication.author.name} size="small" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{publication.author.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{publication.author.email}</p>
                              </div>
                            </div>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>

                        {/* Catégorie */}
                        <td className="px-4 py-3">
                          {publication.category ? (
                            <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full">{publication.category.name}</span>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>

                        {/* Score */}
                        <td className="px-4 py-3">{scoreBar(publication.duplicateScore)}</td>

                        {/* Date */}
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(publication.createdAt)}</td>

                        {/* Tags */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {publication.tags.length === 0 ? (
                              <span className="text-sm text-gray-400">—</span>
                            ) : (
                              <>
                                {publication.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded-full">{tag}</span>
                                ))}
                                {publication.tags.length > 2 && (
                                  <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs rounded-full">+{publication.tags.length - 2}</span>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* Publications similaires — avec bouton œil pour ouvrir PublicationDetailModal */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedSimilarId(expandedSimilarId === publication.id ? null : publication.id)}
                            className="flex items-center gap-1.5 text-xs text-[#168F6F] hover:underline"
                          >
                            <Link2 size={13} />
                            {t(simCount > 1 ? 'tables.similar_plural' : 'tables.similar_one', { count: simCount })}
                          </button>

                          {expandedSimilarId === publication.id && simCount > 0 && (
                            <div className="mt-2 space-y-1.5 max-w-[240px]">
                              {publication.similarPublicationsCache.map(sim => {
                                const truncatedSimTitle = truncateText(sim.title, 18);
                                const hasLongSimTitle   = sim.title && sim.title.length > 18;
                                const isSimLoading      = loadingSimilarId === sim.id;

                                return (
                                  <div key={sim.id} className="text-xs bg-gray-50 dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-start gap-1">
                                      <p
                                        className="font-medium text-gray-900 dark:text-white truncate flex-1 cursor-help"
                                        title={hasLongSimTitle ? sim.title : undefined}
                                      >
                                        {truncatedSimTitle}
                                      </p>
                                      {/* Bouton pour ouvrir PublicationDetailModal */}
                                      <button
                                        onClick={() => fetchAndViewSimilarPublication(sim.id)}
                                        disabled={isSimLoading}
                                        title={t('tables.view_publication')}
                                        className="flex-shrink-0 p-0.5 rounded text-[#168F6F] hover:bg-[#168F6F]/10 transition-colors disabled:opacity-50"
                                      >
                                        {isSimLoading
                                          ? <Loader2 size={12} className="animate-spin" />
                                          : <Eye size={12} />}
                                      </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-gray-500 dark:text-gray-400">{formatDate(sim.createdAt)}</span>
                                      <span className={`font-bold px-1.5 py-0.5 rounded ${scoreColor(sim.score)}`}>{Math.round(sim.score * 100)}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>

                        {/* Menu actions */}
                        <td className="px-4 py-3">
                          <div className="relative" ref={openMenuId === publication.id ? menuRef : undefined}>
                            <button
                              onClick={() => { setMenuPosition(index >= 5 ? 'top' : 'bottom'); setOpenMenuId(openMenuId === publication.id ? null : publication.id); }}
                              disabled={isLoading}
                              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
                            >
                              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <MoreVertical size={18} />}
                            </button>

                            {openMenuId === publication.id && !isLoading && (
                              <div
                                className={`absolute z-[100] w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 ${menuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}`}
                                style={{ left: '50%', transform: 'translateX(-90%)' }}
                              >
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate cursor-help" title={hasLongTitle ? publication.title : undefined}>{truncatedTitle}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {t('tables.dup_score_label')} <span className="font-bold text-orange-500">{Math.round(publication.duplicateScore * 100)}%</span>
                                  </p>
                                </div>
                                <button onClick={() => handleApprove(publication.id, publication.title)} className="w-full text-left px-4 py-2.5 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-3 transition-colors font-medium">
                                  <ThumbsUp size={16} className="text-green-500" /> {t('tables.approve_action')}
                                </button>
                                <button onClick={() => handleViewPublication(publication)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                  <Eye size={16} className="text-gray-400" /> {t('tables.view_publication')}
                                </button>
                                <button onClick={() => handleCopyRejectionReason(publication.rejectionReason)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                  <Copy size={16} className="text-gray-400" /> {t('tables.copy_rejection')}
                                </button>
                                <button onClick={() => { router.push(`/profile/${publication.author?.id}`); setOpenMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                  <User size={16} className="text-gray-400" /> {t('tables.view_author')}
                                </button>
                                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                                <button onClick={() => handleDelete(publication.id, publication.title)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors font-medium">
                                  <Trash2 size={16} className="text-red-500" /> {t('tables.delete_permanent')}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {startIndex + 1} – {Math.min(startIndex + itemsPerPage, sortedPublications.length)} {t('tables.pagination_of')} {sortedPublications.length}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── PublicationDetailModal (remplace SimplePublicationModal) ── */}
      <PublicationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setModalPublication(null); }}
        publication={modalPublication}
        currentUserId={currentUserId}
        userToken={userToken}
        showActions={false}
        showHistory={false}
      />

      <style jsx global>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-fadeIn  { animation: fadeIn  0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .custom-scrollbar::-webkit-scrollbar       { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        .dark .custom-scrollbar::-webkit-scrollbar-track { background: #1e293b; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #475569; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>
    </div>
  );
}
