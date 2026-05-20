'use client';

import { getToken } from '../../../services/auth.service';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, MoreVertical, ChevronLeft, ChevronRight, ArrowUpDown,
  Loader2, Copy, AlertTriangle, User,
  FolderOpen, BarChart2, Link2, Trash2, ThumbsUp, X,
} from 'lucide-react';
import { toast } from '@/components/modals/ToastContainer';
import { confirm } from '@/components/modals/ConfirmModal';
import { DuplicatePublication } from '@/app/(admin)/(others-pages)/(rejected)/rejected/duplicated/page';
import Avatar from '@/components/ui/avatar/Avatar';
import MarkdownPreview from '@/components/markdoun-editor/MarkdownPreview';
import { useTranslation } from '@/context/LanguageContext';

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

interface SimplePublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  publication: DuplicatePublication | null;
}

function SimplePublicationModal({ isOpen, onClose, publication }: SimplePublicationModalProps) {
  const { t, language } = useTranslation();

  useEffect(() => {
    if (isOpen) { document.body.style.overflow = 'hidden'; }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const diffInMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffInMs / 60000);
    if (minutes < 1) return t('notifications.just_now');
    if (minutes < 60) return t('notifications.minutes_ago', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('notifications.hours_ago', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return t(days > 1 ? 'tables.days_ago_plural' : 'tables.days_ago_one', { count: days });
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
  };

  if (!isOpen || !publication) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slideUp">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar src={publication.author?.profileImage} alt={publication.author?.name || t('tables.unknown_author_short')} size="medium" className="!w-12 !h-12" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {publication.author?.name || t('tables.unknown_author')}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span>{publication.author?.role || t('tables.member')}</span>
                <span>•</span>
                <span>{getTimeAgo(publication.createdAt)}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0">
            <X size={24} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-[#00926B]/10 dark:bg-[#00926B]/20 text-[#00926B] dark:text-[#00B383] text-sm font-medium rounded-full">
                {publication.category?.name || t('tables.uncategorized')}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{publication.title}</h1>
            <div className="prose dark:prose-invert max-w-none">
              <MarkdownPreview content={publication.content} />
            </div>
            {publication.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-200 dark:border-gray-800">
                {publication.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DuplicatesTable({ publications: initialPublications, onRefresh, title, description }: DuplicatesTableProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [publications, setPublications] = useState(initialPublications);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [expandedSimilarId, setExpandedSimilarId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedPublication, setSelectedPublication] = useState<DuplicatePublication | null>(null);
  const [isPublicationModalOpen, setIsPublicationModalOpen] = useState(false);

  useEffect(() => { setPublications(initialPublications); }, [initialPublications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getAuthHeaders = () => {
    const token = getToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

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
      toast.error(t('tables.toast_approve_error', { error: err.message }));
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
      toast.error(t('tables.toast_delete_error', { error: err.message }));
    } finally {
      setLoading(l => ({ ...l, [id]: false }));
    }
  };

  const handleViewPublication = (publication: DuplicatePublication) => {
    setSelectedPublication(publication);
    setIsPublicationModalOpen(true);
    setOpenMenuId(null);
  };

  const filteredPublications = useMemo(() => {
    if (!search.trim()) return publications;
    const s = search.toLowerCase();
    return publications.filter(a =>
      a.title.toLowerCase().includes(s) ||
      a.author?.name.toLowerCase().includes(s) ||
      a.author?.email.toLowerCase().includes(s) ||
      a.category?.name.toLowerCase().includes(s) ||
      a.tags.some(tag => tag.toLowerCase().includes(s))
    );
  }, [publications, search]);

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

  const totalPages = Math.ceil(sortedPublications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pagePublications = sortedPublications.slice(startIndex, startIndex + itemsPerPage);
  const displayRows = Array(itemsPerPage).fill(null).map((_, i) => pagePublications[i] ?? null);

  const stats = useMemo(() => {
    const scores = publications.map(a => a.duplicateScore);
    return {
      total: publications.length,
      avgScore: scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0,
      highRisk: publications.filter(a => a.duplicateScore >= 0.85).length,
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
    const pct = Math.round(score * 100);
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

  const handleCopyRejectionReason = (reason: string) => {
    navigator.clipboard.writeText(reason);
    toast.success(t('tables.toast_reason_copied'));
    setOpenMenuId(null);
  };

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors self-start">
          <ArrowUpDown size={15} /> {t('tables.refresh')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('tables.stat_total_dup'),     value: stats.total,                           gradient: 'from-orange-500 to-orange-600', icon: <Copy size={18} /> },
          { label: t('tables.stat_avg_score'),      value: `${Math.round(stats.avgScore * 100)}%`, gradient: 'from-yellow-500 to-yellow-600', icon: <BarChart2 size={18} /> },
          { label: t('tables.stat_high_risk'),      value: stats.highRisk,                        gradient: 'from-red-500 to-red-600',       icon: <AlertTriangle size={18} /> },
          { label: t('tables.stat_categories_hit'), value: stats.categories,                      gradient: 'from-purple-500 to-purple-600', icon: <FolderOpen size={18} /> },
        ].map(({ label, value, gradient, icon }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <span className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} text-white`}>{icon}</span>
            </div>
            <p className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
        <input
          type="text"
          placeholder={t('tables.search_dup')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#168F6F] focus:border-transparent"
        />
      </div>

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
                  const isLoading = loading[publication.id];
                  const truncatedTitle = truncateText(publication.title, 20);
                  const hasLongTitle = publication.title && publication.title.length > 20;
                  const simCount = publication.similarPublicationsCache.length;

                  return (
                    <React.Fragment key={publication.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 max-w-xs">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white truncate cursor-help" title={hasLongTitle ? publication.title : undefined}>{truncatedTitle}</p>
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 truncate max-w-[220px]" title={publication.rejectionReason}>{publication.rejectionReason}</p>
                          </div>
                        </td>
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
                        <td className="px-4 py-3">
                          {publication.category ? (
                            <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full">{publication.category.name}</span>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">{scoreBar(publication.duplicateScore)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(publication.createdAt)}</td>
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
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setExpandedSimilarId(expandedSimilarId === publication.id ? null : publication.id)}
                            className="flex items-center gap-1.5 text-xs text-[#168F6F] hover:underline"
                          >
                            <Link2 size={13} />
                            {t(simCount > 1 ? 'tables.similar_plural' : 'tables.similar_one', { count: simCount })}
                          </button>
                          {expandedSimilarId === publication.id && publication.similarPublicationsCache.length > 0 && (
                            <div className="mt-2 space-y-1.5 max-w-[220px]">
                              {publication.similarPublicationsCache.map(sim => {
                                const truncatedSimTitle = truncateText(sim.title, 20);
                                const hasLongSimTitle = sim.title && sim.title.length > 20;
                                return (
                                  <div key={sim.id} className="text-xs bg-gray-50 dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                                    <p className="font-medium text-gray-900 dark:text-white truncate cursor-help" title={hasLongSimTitle ? sim.title : undefined}>{truncatedSimTitle}</p>
                                    <div className="flex items-center justify-between mt-0.5">
                                      <span className="text-gray-500 dark:text-gray-400">{formatDate(sim.createdAt)}</span>
                                      <span className={`font-bold px-1.5 py-0.5 rounded ${scoreColor(sim.score)}`}>{Math.round(sim.score * 100)}%</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
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
                              <div className={`absolute z-[100] w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 ${menuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}`} style={{ left: '50%', transform: 'translateX(-90%)' }}>
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

      <SimplePublicationModal
        isOpen={isPublicationModalOpen}
        onClose={() => { setIsPublicationModalOpen(false); setSelectedPublication(null); }}
        publication={selectedPublication}
      />

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
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
