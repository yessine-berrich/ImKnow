'use client';

import { getToken } from '../../../services/auth.service';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, MoreVertical, ChevronLeft, ChevronRight, ArrowUpDown,
  Loader2, Copy, Shield, User,
  AlertTriangle, BarChart2, Brain, Info, Trash2, ThumbsUp,
  X,
} from 'lucide-react';
import { toast } from '@/components/modals/ToastContainer';
import { confirm } from '@/components/modals/ConfirmModal';
import { ModerationPublication } from '@/app/(admin)/(others-pages)/(rejected)/rejected/moderation/page';
import Avatar from '@/components/ui/avatar/Avatar';
import MarkdownPreview from '@/components/markdoun-editor/MarkdownPreview';
import { useTranslation } from '@/context/LanguageContext';
import { translateError } from '@/utils/errorTranslation';

interface ModerationTableProps {
  publications: ModerationPublication[];
  onRefresh: () => void;
  title?: string;
  description?: string;
}

type SortKey = 'title' | 'moderationScore' | 'author' | 'category' | 'createdAt';

const CATEGORY_META: Record<string, { labelKey: string; color: string }> = {
  sexual_content: { labelKey: 'tables.cat_sexual_content', color: 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400'     },
  hate_speech:    { labelKey: 'tables.cat_hate_speech',    color: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400'         },
  violence:       { labelKey: 'tables.cat_violence',       color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' },
  harassment:     { labelKey: 'tables.cat_harassment',     color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' },
  spam:           { labelKey: 'tables.cat_spam',           color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'         },
  misinformation: { labelKey: 'tables.cat_misinformation', color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' },
  self_harm:      { labelKey: 'tables.cat_self_harm',      color: 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'      },
};

const getCategoryMeta = (cat: string) =>
  CATEGORY_META[cat] ?? { labelKey: cat, color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' };

const truncateText = (text: string, maxLength: number = 20): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

interface SimplePublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  publication: ModerationPublication | null;
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

export default function ModerationTable({ publications: initialPublications, onRefresh, title, description }: ModerationTableProps) {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [publications, setPublications] = useState(initialPublications);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [highSeverityFilter, setHighSeverityFilter] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [expandedDetailId, setExpandedDetailId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [selectedPublication, setSelectedPublication] = useState<ModerationPublication | null>(null);
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

  const getCategoryLabel = (cat: string): string =>
    CATEGORY_META[cat] ? t(CATEGORY_META[cat].labelKey) : cat;

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
      toast.error(t('tables.toast_approve_error', { error: translateError(err.message, t) }));
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
      toast.error(t('tables.toast_delete_error', { error: translateError(err.message, t) }));
    } finally {
      setLoading(l => ({ ...l, [id]: false }));
    }
  };

  const handleViewPublication = (publication: ModerationPublication) => {
    setSelectedPublication(publication);
    setIsPublicationModalOpen(true);
    setOpenMenuId(null);
  };

  const handleCopy = (text: string, successMsg: string) => {
    navigator.clipboard.writeText(text);
    toast.success(successMsg);
    setOpenMenuId(null);
  };

  const getCatKeys = (cats: Record<string, boolean> | string[] | undefined | null): string[] => {
    if (!cats) return [];
    return Array.isArray(cats) ? cats : Object.keys(cats);
  };

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    publications.forEach(a => getCatKeys(a.moderationResult?.categories).forEach(c => set.add(c)));
    return Array.from(set);
  }, [publications]);

  const filteredPublications = useMemo(() => {
    return publications.filter(a => {
      if (search.trim()) {
        const s = search.toLowerCase();
        const match =
          a.title.toLowerCase().includes(s) ||
          a.author?.name.toLowerCase().includes(s) ||
          a.author?.email.toLowerCase().includes(s) ||
          a.category?.name.toLowerCase().includes(s) ||
          a.tags.some(tag => tag.toLowerCase().includes(s)) ||
          a.rejectionReason.toLowerCase().includes(s);
        if (!match) return false;
      }
      if (categoryFilter && !getCatKeys(a.moderationResult?.categories).includes(categoryFilter)) return false;
      if (highSeverityFilter && (a.moderationScore ?? 0) < 0.8) return false;
      return true;
    });
  }, [publications, search, categoryFilter, highSeverityFilter]);

  const sortedPublications = useMemo(() => {
    if (!sortConfig) return filteredPublications;
    return [...filteredPublications].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortConfig.key) {
        case 'title':           aVal = a.title;                bVal = b.title; break;
        case 'moderationScore': aVal = a.moderationScore ?? 0; bVal = b.moderationScore ?? 0; break;
        case 'author':          aVal = a.author?.name ?? '';   bVal = b.author?.name ?? ''; break;
        case 'category':        aVal = a.category?.name ?? ''; bVal = b.category?.name ?? ''; break;
        case 'createdAt':       aVal = a.createdAt;            bVal = b.createdAt; break;
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
    const scores = publications.map(a => a.moderationScore ?? 0);
    const avgScore = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
    const catCount: Record<string, number> = {};
    publications.forEach(a => getCatKeys(a.moderationResult?.categories).forEach(c => { catCount[c] = (catCount[c] ?? 0) + 1; }));
    const topCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { total: publications.length, avgScore, highSeverity: publications.filter(a => (a.moderationScore ?? 0) >= 0.8).length, topCategory };
  }, [publications]);

  const handleSort = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) setSortConfig({ key, direction: 'asc' });
    else if (sortConfig.direction === 'asc') setSortConfig({ key, direction: 'desc' });
    else setSortConfig(null);
  };

  const scoreColor = (score: number) => {
    if (score >= 0.8) return { bar: 'bg-red-500',    badge: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20'         };
    if (score >= 0.6) return { bar: 'bg-orange-500', badge: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20' };
    return               { bar: 'bg-yellow-500',  badge: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20' };
  };

  const ScoreBar = ({ score }: { score: number }) => {
    const pct = Math.round(score * 100);
    const { bar, badge } = scoreColor(score);
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden w-16">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{pct}%</span>
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
    { key: 'title',           label: t('tables.col_publication') },
    { key: 'author',          label: t('tables.col_author')      },
    { key: 'category',        label: t('tables.col_category')    },
    { key: 'moderationScore', label: t('tables.col_ai_score')    },
    { key: 'createdAt',       label: t('tables.col_date')        },
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
        {([
          { label: t('tables.stat_total_rejected'),  value: stats.total,                             gradient: 'from-red-500 to-red-600',     icon: <Shield size={18} />,       small: false, onClick: (() => { setHighSeverityFilter(false); setCategoryFilter(''); setSearch(''); setCurrentPage(1); }) as (() => void) | null, isActive: false },
          { label: t('tables.stat_avg_ai_score'),    value: `${Math.round(stats.avgScore * 100)}%`,  gradient: 'from-orange-500 to-orange-600',icon: <BarChart2 size={18} />,    small: false, onClick: null as (() => void) | null, isActive: false },
          { label: t('tables.stat_high_severity'),   value: stats.highSeverity,                      gradient: 'from-rose-500 to-rose-600',   icon: <AlertTriangle size={18} />, small: false, onClick: (() => { setHighSeverityFilter(v => !v); setCurrentPage(1); }) as (() => void) | null, isActive: highSeverityFilter },
          { label: t('tables.stat_top_category'),    value: stats.topCategory ? getCategoryLabel(stats.topCategory) : '—', gradient: 'from-purple-500 to-purple-600', icon: <Brain size={18} />, small: true, onClick: stats.topCategory ? (() => { setCategoryFilter(stats.topCategory!); setCurrentPage(1); }) : null, isActive: !!stats.topCategory && categoryFilter === stats.topCategory },
        ]).map(({ label, value, gradient, icon, small, onClick, isActive }) => (
          <div
            key={label}
            onClick={onClick ?? undefined}
            className={`bg-white dark:bg-gray-900 rounded-xl border-2 p-5 transition-all ${onClick ? 'cursor-pointer hover:shadow-lg' : 'cursor-default'} ${isActive ? 'border-[#168F6F] shadow-md ring-2 ring-[#168F6F]/20' : 'border-gray-200 dark:border-gray-800'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <span className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} text-white`}>{icon}</span>
            </div>
            <p className={`font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent ${small ? 'text-lg leading-tight' : 'text-3xl'}`}>{value}</p>
            {isActive && <p className="text-xs text-[#168F6F] mt-1 font-medium">{t('tables.active_filter')}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder={t('tables.search_mod')}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#168F6F] focus:border-transparent"
        />
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#168F6F] focus:border-transparent min-w-[180px]"
        >
          <option value="">{t('tables.all_categories')}</option>
          {allCategories.map(cat => (
            <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
          ))}
        </select>
        <select
          value={highSeverityFilter ? 'high' : 'all'}
          onChange={(e) => { setHighSeverityFilter(e.target.value === 'high'); setCurrentPage(1); }}
          className={`px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#168F6F] focus:border-transparent transition-all ${
            highSeverityFilter
              ? 'bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-400 text-rose-700 dark:text-rose-300 font-medium'
              : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
          }`}
        >
          <option value="all">{t('tables.all_severities')}</option>
          <option value="high">{t('tables.high_severity_filter')}</option>
        </select>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('tables.col_ai_categories')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('tables.col_confidence')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('tables.col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Shield className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{t('tables.empty_mod')}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayRows.map((publication, index) => {
                  if (!publication) return renderEmptyRow(index);
                  const mr = publication.moderationResult;
                  const isLoading = loading[publication.id];
                  const truncatedTitle = truncateText(publication.title, 20);
                  const hasLongTitle = publication.title && publication.title.length > 20;

                  return (
                    <React.Fragment key={publication.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 max-w-xs">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white truncate cursor-help" title={hasLongTitle ? publication.title : undefined}>{truncatedTitle}</p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate max-w-[220px]" title={publication.rejectionReason}>{publication.rejectionReason}</p>
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
                        <td className="px-4 py-3"><ScoreBar score={publication.moderationScore ?? 0} /></td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(publication.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const cats = mr?.categories;
                              const catKeys: string[] = !cats ? [] : Array.isArray(cats) ? cats : Object.keys(cats);
                              return catKeys.length > 0
                                ? catKeys.map(cat => {
                                  const meta = getCategoryMeta(cat);
                                  return <span key={cat} className={`px-2 py-0.5 text-xs font-medium rounded-full ${meta.color}`}>{getCategoryLabel(cat)}</span>;
                                })
                                : <span className="text-sm text-gray-400">—</span>;
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {mr ? (
                            <button onClick={() => setExpandedDetailId(expandedDetailId === publication.id ? null : publication.id)} className="flex items-center gap-1.5 text-xs text-[#168F6F] hover:underline">
                              <Info size={13} /> {t('tables.confidence_label', { pct: Math.round((mr.confidence ?? 0) * 100) })}
                            </button>
                          ) : <span className="text-sm text-gray-400">—</span>}
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
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{publication.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    {t('tables.ai_score_label')} <span className="font-bold text-red-500">{Math.round((publication.moderationScore ?? 0) * 100)}%</span>
                                    {mr?.model && <span className="ml-2 text-gray-400">· {mr.model.split('-').slice(0, 2).join('-')}</span>}
                                  </p>
                                </div>
                                <button onClick={() => handleApprove(publication.id, publication.title)} className="w-full text-left px-4 py-2.5 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-3 transition-colors font-medium">
                                  <ThumbsUp size={16} className="text-green-500" /> {t('tables.approve_action')}
                                </button>
                                <button onClick={() => handleViewPublication(publication)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                  <Eye size={16} className="text-gray-400" /> {t('tables.view_publication')}
                                </button>
                                <button onClick={() => handleCopy(publication.rejectionReason, t('tables.toast_reason_copied'))} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                  <Copy size={16} className="text-gray-400" /> {t('tables.copy_rejection')}
                                </button>
                                {mr && (
                                  <button onClick={() => handleCopy(JSON.stringify(mr, null, 2), t('tables.toast_ai_report_copied'))} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                    <Brain size={16} className="text-gray-400" /> {t('tables.copy_ai_report')}
                                  </button>
                                )}
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

                      {expandedDetailId === publication.id && mr && (
                        <tr key={`detail-${publication.id}`} className="bg-gray-50 dark:bg-gray-800/40">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('tables.detail_ai_model')}</p>
                                <p className="text-gray-800 dark:text-gray-200 font-mono text-xs">{mr.model}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('tables.detail_reason')}</p>
                                <p className="text-gray-800 dark:text-gray-200">{mr.reason}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">{t('tables.detail_moderated_at')}</p>
                                <p className="text-gray-800 dark:text-gray-200">{formatDate(mr.moderatedAt)}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
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
