'use client';

import { getToken } from '../../../services/auth.service';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Eye, MoreVertical, ChevronLeft, ChevronRight, ArrowUpDown,
  Loader2, CheckCircle, XCircle, Copy, Shield, User,
  AlertTriangle, BarChart2, Tag, Brain, Info, Trash2, ThumbsUp,
  X,
} from 'lucide-react';
import { ModerationArticle } from '@/app/(admin)/(others-pages)/(rejected)/rejected/moderation/page';
import Avatar from '@/components/ui/avatar/Avatar';
import MarkdownPreview from '@/components/markdoun-editor/MarkdownPreview';

interface ModerationTableProps {
  articles: ModerationArticle[];
  onRefresh: () => void;
  title?: string;
  description?: string;
}

type SortKey = 'title' | 'moderationScore' | 'author' | 'category' | 'createdAt';

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  sexual_content: { label: 'Contenu sexuel',   color: 'bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400' },
  hate_speech:    { label: 'Discours haineux', color: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' },
  violence:       { label: 'Violence',          color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' },
  harassment:     { label: 'Harcèlement',       color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' },
  spam:           { label: 'Spam',              color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
  misinformation: { label: 'Désinformation',    color: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' },
  self_harm:      { label: 'Auto-mutilation',   color: 'bg-rose-100 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400' },
};

const getCategoryMeta = (cat: string) =>
  CATEGORY_META[cat] ?? { label: cat, color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' };

const truncateText = (text: string, maxLength: number = 20): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

// ─── Confirmation modal ───────────────────────────────────────────────────────
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  icon: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

function ConfirmModal({
  isOpen, title, message, confirmLabel, confirmClass, icon,
  onConfirm, onCancel, loading,
}: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 w-full max-w-sm animate-slideIn">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">{icon}</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button onClick={onCancel} disabled={loading} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
              Annuler
            </button>
            <button onClick={onConfirm} disabled={loading} className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${confirmClass}`}>
              {loading && <Loader2 size={16} className="animate-spin" />}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Modal d'article simplifié ────────────────────────────────────────────────
interface SimpleArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: ModerationArticle | null;
}

function SimpleArticleModal({ isOpen, onClose, article }: SimpleArticleModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const diffInMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffInMs / 60000);
    if (minutes < 1) return "à l'instant";
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `il y a ${days} jour${days > 1 ? 's' : ''}`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  if (!isOpen || !article) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose} />
      
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar
              src={article.author?.profileImage}
              alt={article.author?.name || 'Auteur'}
              size="medium"
              className="!w-12 !h-12"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {article.author?.name || 'Auteur inconnu'}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span>{article.author?.role || 'Membre'}</span>
                <span>•</span>
                <span>{getTimeAgo(article.createdAt)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - sans commentaires, sans interactions */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-[#00926B]/10 dark:bg-[#00926B]/20 text-[#00926B] dark:text-[#00B383] text-sm font-medium rounded-full">
                {article.category?.name || 'Non classé'}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {article.title}
            </h1>

            <div className="prose dark:prose-invert max-w-none">
              <MarkdownPreview content={article.content} />
            </div>

            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-6 border-t border-gray-200 dark:border-gray-800">
                {article.tags.map((tag, i) => (
                  <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer supprimé - plus de vues ni d'interactions */}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ModerationTable({
  articles: initialArticles,
  onRefresh,
  title = 'Articles Rejetés — Modération IA',
  description = 'Articles rejetés par le système de modération automatique',
}: ModerationTableProps) {
  const router = useRouter();
  const [articles, setArticles] = useState(initialArticles);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
  const [loading, setLoading] = useState<Record<number, boolean>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedDetailId, setExpandedDetailId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [selectedArticle, setSelectedArticle] = useState<ModerationArticle | null>(null);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);

  const [modal, setModal] = useState<{
    open: boolean;
    type: 'approve' | 'delete' | null;
    articleId: number | null;
    articleTitle: string;
    loading: boolean;
  }>({ open: false, type: null, articleId: null, articleTitle: '', loading: false });

  useEffect(() => { setArticles(initialArticles); }, [initialArticles]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getAuthHeaders = () => {
    const token = getToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  };

  const handleApprove = async () => {
    if (!modal.articleId) return;
    setModal((m) => ({ ...m, loading: true }));
    try {
      const res = await fetch(`http://localhost:3000/api/articles/${modal.articleId}/approve`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erreur ${res.status}`);
      }
      setArticles((prev) => prev.filter((a) => a.id !== modal.articleId));
      showToast(`✅ Article approuvé et publié avec succès`, 'success');
    } catch (err: any) {
      showToast(`❌ Échec de l'approbation : ${err.message}`, 'error');
    } finally {
      setModal({ open: false, type: null, articleId: null, articleTitle: '', loading: false });
    }
  };

  const handleDelete = async () => {
    if (!modal.articleId) return;
    setModal((m) => ({ ...m, loading: true }));
    try {
      const res = await fetch(`http://localhost:3000/api/articles/${modal.articleId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Erreur ${res.status}`);
      }
      setArticles((prev) => prev.filter((a) => a.id !== modal.articleId));
      showToast(`🗑️ Article supprimé définitivement`, 'success');
    } catch (err: any) {
      showToast(`❌ Échec de la suppression : ${err.message}`, 'error');
    } finally {
      setModal({ open: false, type: null, articleId: null, articleTitle: '', loading: false });
    }
  };

  const openApproveModal = (id: number, title: string) => {
    setOpenMenuId(null);
    setModal({ open: true, type: 'approve', articleId: id, articleTitle: title, loading: false });
  };

  const openDeleteModal = (id: number, title: string) => {
    setOpenMenuId(null);
    setModal({ open: true, type: 'delete', articleId: id, articleTitle: title, loading: false });
  };

  const handleViewArticle = (article: ModerationArticle) => {
    setSelectedArticle(article);
    setIsArticleModalOpen(true);
    setOpenMenuId(null);
  };

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => a.moderationResult?.categories?.forEach((c) => set.add(c)));
    return Array.from(set);
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (search.trim()) {
        const s = search.toLowerCase();
        const match =
          a.title.toLowerCase().includes(s) ||
          a.author?.name.toLowerCase().includes(s) ||
          a.author?.email.toLowerCase().includes(s) ||
          a.category?.name.toLowerCase().includes(s) ||
          a.tags.some((t) => t.toLowerCase().includes(s)) ||
          a.rejectionReason.toLowerCase().includes(s);
        if (!match) return false;
      }
      if (categoryFilter && !a.moderationResult?.categories?.includes(categoryFilter)) return false;
      return true;
    });
  }, [articles, search, categoryFilter]);

  const sortedArticles = useMemo(() => {
    if (!sortConfig) return filteredArticles;
    return [...filteredArticles].sort((a, b) => {
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
      return sortConfig.direction === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredArticles, sortConfig]);

  const totalPages = Math.ceil(sortedArticles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const pageArticles = sortedArticles.slice(startIndex, startIndex + itemsPerPage);
  const displayRows = Array(itemsPerPage).fill(null).map((_, i) => pageArticles[i] ?? null);

  const stats = useMemo(() => {
    const scores = articles.map((a) => a.moderationScore ?? 0);
    const avgScore = scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0;
    const catCount: Record<string, number> = {};
    articles.forEach((a) =>
      a.moderationResult?.categories?.forEach((c) => { catCount[c] = (catCount[c] ?? 0) + 1; })
    );
    const topCategory = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return {
      total: articles.length,
      avgScore,
      highSeverity: articles.filter((a) => (a.moderationScore ?? 0) >= 0.8).length,
      topCategory,
    };
  }, [articles]);

  const handleSort = (key: SortKey) => {
    if (!sortConfig || sortConfig.key !== key) setSortConfig({ key, direction: 'asc' });
    else if (sortConfig.direction === 'asc') setSortConfig({ key, direction: 'desc' });
    else setSortConfig(null);
  };

  const scoreColor = (score: number) => {
    if (score >= 0.8) return { bar: 'bg-red-500',    badge: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20' };
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
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`✅ ${label} copié`, 'success');
    setOpenMenuId(null);
  };

  const renderEmptyRow = (key: number) => (
    <tr key={`empty-${key}`} className="opacity-0 pointer-events-none h-[65px]">
      <td colSpan={8}>
        <div className="invisible">Placeholder</div>
      </td>
    </tr>
  );

  const columns: { key: SortKey; label: string }[] = [
    { key: 'title', label: 'Article' },
    { key: 'author', label: 'Auteur' },
    { key: 'category', label: 'Catégorie' },
    { key: 'moderationScore', label: 'Score IA' },
    { key: 'createdAt', label: 'Date' },
  ];

  return (
    <div className="space-y-6">
      <ConfirmModal
        isOpen={modal.open}
        loading={modal.loading}
        title={modal.type === 'approve' ? 'Approuver l\'article ?' : 'Supprimer définitivement ?'}
        message={modal.type === 'approve'
          ? `"${modal.articleTitle}" sera publié et l'auteur en sera notifié.`
          : `"${modal.articleTitle}" sera supprimé définitivement. Cette action est irréversible.`}
        confirmLabel={modal.type === 'approve' ? 'Approuver & Publier' : 'Supprimer'}
        confirmClass={modal.type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
        icon={modal.type === 'approve' ? <ThumbsUp size={28} className="text-green-600" /> : <Trash2 size={28} className="text-red-600" />}
        onConfirm={modal.type === 'approve' ? handleApprove : handleDelete}
        onCancel={() => setModal({ open: false, type: null, articleId: null, articleTitle: '', loading: false })}
      />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl animate-slideIn backdrop-blur-sm ${
          toast.type === 'success' ? 'bg-green-600/95 border border-green-500' : 'bg-red-600/95 border border-red-500'
        } text-white`}>
          {toast.type === 'success' ? <CheckCircle size={22} /> : <XCircle size={22} />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors self-start">
          <ArrowUpDown size={15} /> Actualiser
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total rejetés', value: stats.total, gradient: 'from-red-500 to-red-600', icon: <Shield size={18} /> },
          { label: 'Score moyen IA', value: `${Math.round(stats.avgScore * 100)}%`, gradient: 'from-orange-500 to-orange-600', icon: <BarChart2 size={18} /> },
          { label: 'Haute sévérité (≥80%)', value: stats.highSeverity, gradient: 'from-rose-500 to-rose-600', icon: <AlertTriangle size={18} /> },
          { label: 'Catégorie principale', value: stats.topCategory ? getCategoryMeta(stats.topCategory).label : '—', gradient: 'from-purple-500 to-purple-600', icon: <Brain size={18} />, small: true },
        ].map(({ label, value, gradient, icon, small }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <span className={`p-1.5 rounded-lg bg-gradient-to-br ${gradient} text-white`}>{icon}</span>
            </div>
            <p className={`font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent ${small ? 'text-lg leading-tight' : 'text-3xl'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Rechercher par titre, auteur, catégorie, raison..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
          className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]"
        >
          <option value="">Toutes les catégories</option>
          {allCategories.map((cat) => (
            <option key={cat} value={cat}>{getCategoryMeta(cat).label}</option>
          ))}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Catégories IA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Confiance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Shield className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-3" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun article rejeté par modération</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayRows.map((article, index) => {
                  if (!article) return renderEmptyRow(index);
                  const mr = article.moderationResult;
                  const isLoading = loading[article.id];
                  const truncatedTitle = truncateText(article.title, 20);
                  const hasLongTitle = article.title && article.title.length > 20;

                  return (
                    <React.Fragment key={article.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-4 py-3 max-w-xs">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white truncate cursor-help" title={hasLongTitle ? article.title : undefined}>
                              {truncatedTitle}
                            </p>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate max-w-[220px]" title={article.rejectionReason}>
                              {article.rejectionReason}
                            </p>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {article.author ? (
                            <div className="flex items-center gap-2">
                              <Avatar src={article.author.profileImage} alt={article.author.name} size="small" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{article.author.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{article.author.email}</p>
                              </div>
                            </div>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>

                        <td className="px-4 py-3">
                          {article.category ? (
                            <span className="px-2.5 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-full">
                              {article.category.name}
                            </span>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>

                        <td className="px-4 py-3"><ScoreBar score={article.moderationScore ?? 0} /></td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">{formatDate(article.createdAt)}</td>

                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {mr?.categories?.length ? mr.categories.map((cat) => {
                              const meta = getCategoryMeta(cat);
                              return <span key={cat} className={`px-2 py-0.5 text-xs font-medium rounded-full ${meta.color}`}>{meta.label}</span>;
                            }) : <span className="text-sm text-gray-400">—</span>}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          {mr ? (
                            <button onClick={() => setExpandedDetailId(expandedDetailId === article.id ? null : article.id)} className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                              <Info size={13} /> {Math.round((mr.confidence ?? 0) * 100)}% conf.
                            </button>
                          ) : <span className="text-sm text-gray-400">—</span>}
                        </td>

                        <td className="px-4 py-3">
                          <div className="relative" ref={openMenuId === article.id ? menuRef : undefined}>
                            <button
                              onClick={() => { setMenuPosition(index >= 5 ? 'top' : 'bottom'); setOpenMenuId(openMenuId === article.id ? null : article.id); }}
                              disabled={isLoading}
                              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors disabled:opacity-50"
                            >
                              {isLoading ? <Loader2 size={18} className="animate-spin" /> : <MoreVertical size={18} />}
                            </button>

                            {openMenuId === article.id && !isLoading && (
                              <div className={`absolute z-[100] w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 ${menuPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}`} style={{ left: '50%', transform: 'translateX(-90%)' }}>
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{article.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Score IA : <span className="font-bold text-red-500">{Math.round(article.moderationScore * 100)}%</span>
                                    {mr?.model && <span className="ml-2 text-gray-400">· {mr.model.split('-').slice(0, 2).join('-')}</span>}
                                  </p>
                                </div>

                                <button onClick={() => openApproveModal(article.id, article.title)} className="w-full text-left px-4 py-2.5 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-3 transition-colors font-medium">
                                  <ThumbsUp size={16} className="text-green-500" /> Approuver & Publier
                                </button>

                                <button onClick={() => handleViewArticle(article)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                  <Eye size={16} className="text-gray-400" /> Voir l'article
                                </button>

                                <button onClick={() => handleCopy(article.rejectionReason, 'Raison de rejet')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                  <Copy size={16} className="text-gray-400" /> Copier la raison de rejet
                                </button>

                                {mr && (
                                  <button onClick={() => handleCopy(JSON.stringify(mr, null, 2), 'Résultat de modération')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                    <Brain size={16} className="text-gray-400" /> Copier le rapport IA
                                  </button>
                                )}

                                <button onClick={() => { router.push(`/profile/${article.author?.id}`); setOpenMenuId(null); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors">
                                  <User size={16} className="text-gray-400" /> Voir l'auteur
                                </button>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-800" />

                                <button onClick={() => openDeleteModal(article.id, article.title)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors font-medium">
                                  <Trash2 size={16} className="text-red-500" /> Supprimer définitivement
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {expandedDetailId === article.id && mr && (
                        <tr key={`detail-${article.id}`} className="bg-gray-50 dark:bg-gray-800/40">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Modèle IA</p>
                                <p className="text-gray-800 dark:text-gray-200 font-mono text-xs">{mr.model}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Raison détaillée</p>
                                <p className="text-gray-800 dark:text-gray-200">{mr.reason}</p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Date de modération</p>
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
              {startIndex + 1} – {Math.min(startIndex + itemsPerPage, sortedArticles.length)} sur {sortedArticles.length}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <SimpleArticleModal
        isOpen={isArticleModalOpen}
        onClose={() => {
          setIsArticleModalOpen(false);
          setSelectedArticle(null);
        }}
        article={selectedArticle}
      />

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: translateX(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slideIn { animation: slideIn 0.3s ease-out; }
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