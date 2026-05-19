'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Flag, Search, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, Eye, EyeOff,
  FileText, Clock, User, RefreshCw, X, Shield,
  TrendingUp, TrendingDown, Minus, ChevronDown,
  MessageSquare, RotateCcw, Download,
} from 'lucide-react';
import {
  adminReportsService,
  ReportedArticleItem, ArticleReportDetail,
  ArticleReportListResponse, RiskLevel, ArticleAction,
} from '../../../../../../../services/admin-reports.service';
import { getToken } from '../../../../../../../services/auth.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { label: string; bg: string; text: string; dot: string; border: string }> = {
  critical: { label: 'Critique', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', border: 'border-red-200 dark:border-red-800' },
  high: { label: 'Élevé', bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', border: 'border-orange-200 dark:border-orange-800' },
  medium: { label: 'Modéré', bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  low: { label: 'Faible', bg: 'bg-gray-50 dark:bg-gray-800/60', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400', border: 'border-gray-200 dark:border-gray-700' },
};

const REASON_LABELS: Record<string, string> = {
  hate_speech: 'Discours haineux',
  harassment: 'Harcèlement',
  impersonation: 'Usurpation',
  inappropriate_content: 'Contenu inapproprié',
  misinformation: 'Désinformation',
  plagiarism: 'Plagiat',
  spam: 'Spam',
  other: 'Autre',
};

const ARTICLE_STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  published: { label: 'Publié', cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
  pending: { label: 'En attente', cls: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  rejected: { label: 'Rejeté', cls: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  draft: { label: 'Brouillon', cls: 'text-gray-500 bg-gray-100 dark:bg-gray-800' },
};

const SEVERITY_COLORS: Record<string, string> = {
  danger: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: RiskLevel }) {
  const c = RISK_CONFIG[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up')   return <TrendingUp size={13} className="text-red-500" />;
  if (trend === 'down') return <TrendingDown size={13} className="text-emerald-500" />;
  return <Minus size={13} className="text-gray-400" />;
}

function ScoreBar({ score }: { score: number }) {
  const max = 50;
  const pct = Math.min(100, (score / max) * 100);
  const color = score >= 25 ? '#ef4444' : score >= 12 ? '#f97316' : score >= 5 ? '#f59e0b' : '#6b7280';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`} />;
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmModal({
  title, description, confirmLabel, confirmCls, onConfirm, onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmCls: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-sm w-full mx-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${confirmCls}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function ArticleDetailDrawer({
  articleId,
  onClose,
  onActionDone,
}: {
  articleId: number;
  onClose: () => void;
  onActionDone: () => void;
}) {
  const [detail, setDetail] = useState<ArticleReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showNote, setShowNote] = useState(false);
  const [confirm, setConfirm] = useState<{ action: ArticleAction; label: string } | null>(null);

  useEffect(() => {
    setLoading(true);
    adminReportsService.getArticleReportDetail(articleId)
      .then(setDetail)
      .catch(() => setToast({ msg: 'Erreur lors du chargement', ok: false }))
      .finally(() => setLoading(false));
  }, [articleId]);

  const handleAction = async (action: ArticleAction) => {
    setActionLoading(true);
    setConfirm(null);
    try {
      const res = await adminReportsService.takeArticleAction(articleId, action, note || undefined);
      setToast({ msg: res.message, ok: true });
      setTimeout(() => { onActionDone(); onClose(); }, 1400);
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : 'Erreur', ok: false });
    } finally {
      setActionLoading(false);
    }
  };

  const requestAction = (action: ArticleAction, label: string) => {
    if (action === 'unpublish' || action === 'republish') {
      setConfirm({ action, label });
    } else {
      handleAction(action);
    }
  };

  const isRejected = detail?.article.status === 'rejected';

  return (
    <div className="fixed inset-0 z-50 flex">
      {confirm && (
        <ConfirmModal
          title={confirm.action === 'unpublish' ? 'Dépublier cet article ?' : 'Republier cet article ?'}
          description={
            confirm.action === 'unpublish'
              ? "L'article sera masqué et l'auteur sera notifié. Cette action est réversible."
              : "L'article sera rendu public à nouveau et les signalements seront clôturés."
          }
          confirmLabel={confirm.label}
          confirmCls={confirm.action === 'unpublish'
            ? 'text-white bg-red-500 hover:bg-red-600'
            : 'text-white bg-emerald-500 hover:bg-emerald-600'}
          onConfirm={() => handleAction(confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-xl bg-white dark:bg-gray-900 h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <Flag size={15} className="text-red-500" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Détail — Article signalé</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {toast && (
          <div className={`mx-6 mt-4 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
            {toast.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {toast.msg}
          </div>
        )}

        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : !detail ? (
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div>
              <AlertTriangle size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">Impossible de charger le détail</p>
              <button onClick={() => { setLoading(true); adminReportsService.getArticleReportDetail(articleId).then(setDetail).catch(() => {}).finally(() => setLoading(false)); }}
                className="mt-3 text-xs text-[#00926B] hover:underline">Réessayer</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 space-y-6">
            {/* Article info */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{detail.article.title}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${ARTICLE_STATUS_LABELS[detail.article.status]?.cls ?? 'text-gray-500 bg-gray-100'}`}>
                  {ARTICLE_STATUS_LABELS[detail.article.status]?.label ?? detail.article.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Auteur : <span className="font-medium text-gray-700 dark:text-gray-300">{detail.article.author.name}</span>
              </p>
              <p className="text-xs text-gray-400 line-clamp-3">{detail.article.content}</p>
            </div>

            {/* Intelligence */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Analyse IA</h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Score de risque', value: detail.intelligence.riskScore, Icon: TrendingUp },
                  { label: 'Signalements (24h)', value: detail.intelligence.recentCount, Icon: Clock },
                  { label: 'Rapporteurs uniques', value: detail.intelligence.uniqueReporters, Icon: User },
                ].map(({ label, value, Icon }) => (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                    <Icon size={14} className="mx-auto text-gray-400 mb-1" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Niveau :</span>
                  <RiskBadge level={detail.intelligence.riskLevel} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Tendance :</span>
                  <TrendIcon trend={(detail.intelligence as any).trend ?? 'stable'} />
                </div>
              </div>

              {/* Recommendation */}
              <div className={`flex items-start gap-3 p-3 rounded-xl border ${SEVERITY_COLORS[detail.intelligence.recommendation.severity]}`}>
                <Shield size={15} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold">Recommandation</p>
                  <p className="text-xs mt-0.5">{detail.intelligence.recommendation.label}</p>
                </div>
              </div>

              {/* Top reasons */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-medium">Motifs signalés</p>
                {detail.intelligence.topReasons.map(({ reason, count, severity }) => (
                  <div key={reason} className="flex items-center gap-2">
                    <span className="text-xs text-gray-700 dark:text-gray-300 w-36 truncate">{REASON_LABELS[reason] ?? reason}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, (severity / 10) * 100)}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-4 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Individual reports */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Signalements individuels ({detail.reports.length})
              </h4>
              {detail.reports.map((r) => (
                <div key={r.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/60 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{REASON_LABELS[r.reason] ?? r.reason}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'pending' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : r.status === 'reviewed' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-gray-400 bg-gray-100 dark:bg-gray-800'}`}>
                      {r.status === 'pending' ? 'En attente' : r.status === 'reviewed' ? 'Examiné' : 'Clôturé'}
                    </span>
                  </div>
                  {r.details && <p className="text-xs text-gray-500 dark:text-gray-400 italic">{r.details}</p>}
                  <p className="text-xs text-gray-400">Par <span className="font-medium">{r.reporter.name}</span> · {new Date(r.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              ))}
            </div>

            {/* Note optionnelle */}
            <div className="space-y-2">
              <button onClick={() => setShowNote(!showNote)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                <MessageSquare size={12} /> {showNote ? 'Masquer la note' : 'Ajouter une note (optionnel)'}
                <ChevronDown size={12} className={`transition-transform ${showNote ? 'rotate-180' : ''}`} />
              </button>
              {showNote && (
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Note interne visible dans la notification envoyée…"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00926B]/30 resize-none"
                />
              )}
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleAction('review_all')} disabled={actionLoading}
                className="py-2.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle size={13} /> Marquer examiné
              </button>
              <button
                onClick={() => handleAction('dismiss_all')} disabled={actionLoading}
                className="py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <XCircle size={13} /> Clôturer
              </button>
              <button
                onClick={() => handleAction('warn_author')} disabled={actionLoading}
                className="py-2.5 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <AlertTriangle size={13} /> Avertir l'auteur
              </button>
              {isRejected ? (
                <button
                  onClick={() => requestAction('republish', 'Republier')} disabled={actionLoading}
                  className="py-2.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={13} /> Republier
                </button>
              ) : (
                <button
                  onClick={() => requestAction('unpublish', 'Dépublier')} disabled={actionLoading}
                  className="py-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <EyeOff size={13} /> Dépublier
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReportedArticlesPage() {
  const router = useRouter();
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [data, setData] = useState<ArticleReportListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const searchTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminReportsService.getReportedArticles({
        status: statusFilter, riskLevel: riskFilter, search, page, limit: 15,
      });
      setData(res);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur de chargement', false);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, riskFilter, search, page]);

  useEffect(() => {
    try {
      const token = getToken();
      if (!token) { router.push('/signin'); return; }
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') { router.push('/error-403'); return; }
      setIsCheckingRole(false);
    } catch { router.push('/signin'); }
  }, [router]);

  useEffect(() => { if (!isCheckingRole) load(); }, [isCheckingRole, load]);

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 400);
  };

  const resetFilters = () => { setStatusFilter('all'); setRiskFilter('all'); setSearch(''); setSearchInput(''); setPage(1); };

  const handleExport = (format: 'csv' | 'json' | 'pdf') => {
    if (format === 'pdf') { window.print(); return; }

    const items = data?.items ?? [];
    const RISK_LABELS: Record<string, string>   = { critical: 'Critique', high: 'Élevé', medium: 'Modéré', low: 'Faible' };
    const STATUS_LABELS: Record<string, string> = { published: 'Publié', pending: 'En attente', rejected: 'Rejeté', draft: 'Brouillon' };
    const TREND_LABELS: Record<string, string>  = { up: 'Hausse', down: 'Baisse', stable: 'Stable' };

    let content: string;
    let filename: string;

    if (format === 'json') {
      content  = JSON.stringify({ exportedAt: new Date().toISOString(), total: data?.total ?? 0, summary: data?.summary, items }, null, 2);
      filename = 'signalements-articles.json';
    } else {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const header = ['ID', 'Titre', 'Auteur', 'Niveau de risque', 'Score', 'Signalements', 'En attente', 'Motif principal', 'Statut', 'Tendance', 'Dernier signalement'];
      const rows = items.map(item => [
        String(item.articleId),
        esc(item.title),
        esc(item.authorName),
        RISK_LABELS[item.riskLevel]     ?? item.riskLevel,
        String(item.riskScore),
        String(item.reportCount),
        String(item.pendingCount),
        item.topReason ? esc(REASON_LABELS[item.topReason] ?? item.topReason) : '',
        STATUS_LABELS[item.articleStatus] ?? item.articleStatus,
        TREND_LABELS[item.trend]        ?? item.trend,
        item.lastReportAt ? new Date(item.lastReportAt).toLocaleDateString('fr-FR') : '',
      ]);
      content  = [header, ...rows].map(r => r.join(',')).join('\n');
      filename = 'signalements-articles.csv';
    }

    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const summary = data?.summary;

  if (isCheckingRole) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-8">
      {selectedId !== null && (
        <ArticleDetailDrawer
          articleId={selectedId}
          onClose={() => setSelectedId(null)}
          onActionDone={() => { load(); showToast('Action effectuée avec succès', true); }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Articles signalés</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data?.total ?? 0} article(s) signalé(s)</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Download size={13} /> Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 z-20 min-w-[100px]">
                  <button onClick={() => { handleExport('csv');  setExportOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">CSV</button>
                  <button onClick={() => { handleExport('json'); setExportOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">JSON</button>
                  <button onClick={() => { handleExport('pdf');  setExportOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">PDF</button>
                </div>
              )}
            </div>
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualiser
            </button>
          </div>
        </div>
        {toast && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm ${toast.ok ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'}`}>
            {toast.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-auto"><X size={13} /></button>
          </div>
        )}

        {/* ── Summary — clickable pour filtrer ─────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {([
            { label: 'Critique',   value: summary?.critical ?? 0,    color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-900/20',     ring: 'ring-red-400',    isActive: riskFilter === 'critical',   click: () => { setRiskFilter(riskFilter === 'critical' ? 'all' : 'critical'); setPage(1); } },
            { label: 'Élevé',     value: summary?.high ?? 0,         color: 'text-orange-600 dark:text-orange-400',bg: 'bg-orange-50 dark:bg-orange-900/20',ring: 'ring-orange-400', isActive: riskFilter === 'high',        click: () => { setRiskFilter(riskFilter === 'high' ? 'all' : 'high'); setPage(1); } },
            { label: 'Modéré',    value: summary?.medium ?? 0,       color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20',  ring: 'ring-amber-400',  isActive: riskFilter === 'medium',      click: () => { setRiskFilter(riskFilter === 'medium' ? 'all' : 'medium'); setPage(1); } },
            { label: 'Faible',    value: summary?.low ?? 0,          color: 'text-gray-500 dark:text-gray-400',   bg: 'bg-gray-100 dark:bg-gray-800',      ring: 'ring-gray-400',   isActive: riskFilter === 'low',         click: () => { setRiskFilter(riskFilter === 'low' ? 'all' : 'low'); setPage(1); } },
            { label: 'En attente',value: summary?.totalPending ?? 0, color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20',    ring: 'ring-blue-400',   isActive: statusFilter === 'pending',   click: () => { setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending'); setPage(1); } },
          ] as const).map(({ label, value, color, bg, ring, isActive, click }) => (
            <button
              key={label}
              onClick={click}
              className={`${bg} rounded-2xl p-4 text-left transition-all border-2 cursor-pointer ${
                isActive
                  ? `border-current ring-2 ${ring}/40 shadow-md`
                  : 'border-transparent hover:border-current/20 hover:opacity-90'
              }`}
            >
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
              {isActive && <p className={`text-xs mt-1 font-medium ${color} opacity-80`}>Filtre actif</p>}
            </button>
          ))}
        </div>

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Rechercher un article ou auteur…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00926B]/30 focus:border-[#00926B]"
            />
          </div>

          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00926B]/30"
          >
            <option value="all">Tous les niveaux</option>
            <option value="critical">Critique</option>
            <option value="high">Élevé</option>
            <option value="medium">Modéré</option>
            <option value="low">Faible</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00926B]/30"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="reviewed">Examinés</option>
            <option value="dismissed">Clôturés</option>
          </select>

          {(riskFilter !== 'all' || statusFilter !== 'all' || search) && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl transition-colors">
              <X size={12} /> Réinitialiser
            </button>
          )}
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/40">
                  <th className="px-6 py-3 font-medium">Article</th>
                  <th className="px-4 py-3 font-medium">Risque</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium text-center">Signalements</th>
                  <th className="px-4 py-3 font-medium">Motif principal</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Tendance</th>
                  <th className="px-4 py-3 font-medium">Dernier signal.</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-5" /></td>
                      ))}
                    </tr>
                  ))
                ) : !data?.items.length ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <Flag size={32} className="mx-auto text-gray-200 dark:text-gray-700 mb-3" />
                      <p className="text-sm text-gray-400">Aucun article signalé trouvé</p>
                      {(riskFilter !== 'all' || statusFilter !== 'all' || search) && (
                        <button onClick={resetFilters} className="mt-2 text-xs text-[#00926B] hover:underline">Réinitialiser les filtres</button>
                      )}
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => {
                    const rc = RISK_CONFIG[item.riskLevel];
                    const sc = ARTICLE_STATUS_LABELS[item.articleStatus];
                    return (
                      <tr
                        key={item.articleId}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors cursor-pointer ${item.riskLevel === 'critical' ? 'border-l-2 border-l-red-500' : item.riskLevel === 'high' ? 'border-l-2 border-l-orange-400' : ''}`}
                        onClick={() => setSelectedId(item.articleId)}
                      >
                        <td className="px-6 py-3 max-w-[200px]">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{item.title}</p>
                          <p className="text-xs text-gray-400 truncate">{item.authorName}</p>
                        </td>
                        <td className="px-4 py-3"><RiskBadge level={item.riskLevel} /></td>
                        <td className="px-4 py-3 w-28"><ScoreBar score={item.riskScore} /></td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex flex-col items-center">
                            <span className="font-bold text-gray-900 dark:text-white">{item.reportCount}</span>
                            {item.pendingCount > 0 && (
                              <span className="text-xs text-amber-500">({item.pendingCount} en att.)</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {item.topReason ? (REASON_LABELS[item.topReason] ?? item.topReason) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${sc?.cls ?? 'text-gray-500 bg-gray-100'}`}>
                            {sc?.label ?? item.articleStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <TrendIcon trend={item.trend} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {item.lastReportAt ? new Date(item.lastReportAt).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedId(item.articleId); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg transition-colors"
                          >
                            <Eye size={12} /> Voir
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <p className="text-xs text-gray-400">{data.total} résultat(s) · page {data.page}/{data.totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30 transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30 transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
