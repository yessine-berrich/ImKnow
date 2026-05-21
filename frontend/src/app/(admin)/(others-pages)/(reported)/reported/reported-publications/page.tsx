'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Flag, Search, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, EyeOff,
  Clock, User, RefreshCw, X, Shield,
  TrendingUp, TrendingDown, Minus,
  MessageSquare, RotateCcw, Download,
} from 'lucide-react';

type TabType = 'analysis' | 'reports' | 'notes';
import {
  adminReportsService,
  ReportedPublicationItem, PublicationReportDetail,
  PublicationReportListResponse, RiskLevel, PublicationAction, AdminNote,
} from '../../../../../../../services/admin-reports.service';
import { getToken } from '../../../../../../../services/auth.service';
import { useTranslation } from '@/context/LanguageContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { labelKey: string; bg: string; text: string; dot: string; border: string }> = {
  critical: { labelKey: 'reported_page.risk_critical', bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', dot: 'bg-red-500', border: 'border-red-200 dark:border-red-800' },
  high:     { labelKey: 'reported_page.risk_high',     bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', border: 'border-orange-200 dark:border-orange-800' },
  medium:   { labelKey: 'reported_page.risk_medium',   bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-400', border: 'border-amber-200 dark:border-amber-800' },
  low:      { labelKey: 'reported_page.risk_low',      bg: 'bg-gray-50 dark:bg-gray-800/60', text: 'text-gray-500 dark:text-gray-400', dot: 'bg-gray-400', border: 'border-gray-200 dark:border-gray-700' },
};

const REASON_LABEL_KEYS: Record<string, string> = {
  hate_speech:            'reported_page.reason_hate_speech',
  harassment:             'reported_page.reason_harassment',
  impersonation:          'reported_page.reason_impersonation',
  inappropriate_content:  'reported_page.reason_inappropriate_content',
  misinformation:         'reported_page.reason_misinformation',
  plagiarism:             'reported_page.reason_plagiarism',
  spam:                   'reported_page.reason_spam',
  other:                  'reported_page.reason_other',
};

const PUBLICATION_STATUS_LABEL_KEYS: Record<string, { labelKey: string; cls: string }> = {
  published: { labelKey: 'reported_page.pub_status_published', cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
  pending:   { labelKey: 'reported_page.pub_status_pending',   cls: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  rejected:  { labelKey: 'reported_page.pub_status_rejected',  cls: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  draft:     { labelKey: 'reported_page.pub_status_draft',     cls: 'text-gray-500 bg-gray-100 dark:bg-gray-800' },
};

const SEVERITY_COLORS: Record<string, string> = {
  danger:  'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
  warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
  info:    'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: RiskLevel }) {
  const { t } = useTranslation();
  const c = RISK_CONFIG[level];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {t(c.labelKey)}
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
  title: string; description: string; confirmLabel: string; confirmCls: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
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
            {t('reported_page.cancel')}
          </button>
          <button onClick={onConfirm} className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${confirmCls}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Notes ─────────────────────────────────────────────────────────────

function AdminNotesSection({
  type, targetId, currentAdminId,
}: {
  type: 'user' | 'publication'; targetId: number; currentAdminId: number;
}) {
  const { t, language } = useTranslation();
  const [notes, setNotes]         = useState<AdminNote[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [input, setInput]         = useState('');
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<number | null>(null);

  useEffect(() => {
    adminReportsService.getNotes(type, targetId).then(setNotes).catch(() => {});
  }, [type, targetId]);

  const myNote = notes.find((n) => n.adminId === currentAdminId) ?? null;

  const handleSave = async () => {
    if (!input.trim()) return;
    setSaving(true);
    try {
      const saved = await adminReportsService.saveNote(type, targetId, input.trim());
      setNotes((prev) => {
        const idx = prev.findIndex((n) => n.adminId === currentAdminId);
        return idx >= 0 ? prev.map((n, i) => (i === idx ? saved : n)) : [saved, ...prev];
      });
      setEditingId(null);
      setInput('');
    } catch {}
    finally { setSaving(false); }
  };

  const handleDelete = async (noteId: number) => {
    setDeleting(noteId);
    try {
      await adminReportsService.deleteNote(type, targetId, noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {}
    finally { setDeleting(null); }
  };

  const startEdit = (note: AdminNote) => { setEditingId(note.id); setInput(note.content); };
  const cancelEdit = () => { setEditingId(null); setInput(''); };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
        <MessageSquare size={12} /> {t('reported_page.note_section_title')}
      </h4>

      {notes.filter((n) => n.adminId !== currentAdminId).map((n) => (
        <div key={n.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">{n.adminName}</span>
            <span className="text-xs text-gray-400">{new Date(n.updatedAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{n.content}</p>
        </div>
      ))}

      {myNote && editingId !== myNote.id ? (
        <div className="p-3 rounded-xl border border-[#00926B]/30 bg-emerald-50/50 dark:bg-emerald-900/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#00926B]">{myNote.adminName} ({t('reported_page.note_you')})</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{new Date(myNote.updatedAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}</span>
              <button onClick={() => startEdit(myNote)} className="text-xs text-gray-400 hover:text-[#00926B] transition-colors">{t('reported_page.note_edit')}</button>
              <button onClick={() => handleDelete(myNote.id)} disabled={deleting === myNote.id} className="text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50">{t('reported_page.note_delete')}</button>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{myNote.content}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder={t('reported_page.note_placeholder')}
            className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00926B]/30 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving || !input.trim()} className="px-3 py-1.5 text-xs font-semibold text-white bg-[#00926B] hover:bg-[#007a59] rounded-lg disabled:opacity-50 transition-colors">
              {saving ? '…' : t('reported_page.note_save')}
            </button>
            {editingId && (
              <button onClick={cancelEdit} className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                {t('reported_page.cancel')}
              </button>
            )}
          </div>
        </div>
      )}

      {notes.length === 0 && !myNote && (
        <p className="text-xs text-gray-400 italic">{t('reported_page.note_empty')}</p>
      )}
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function PublicationDetailDrawer({
  publicationId, onClose, onActionDone, initialTab,
}: {
  publicationId: number; onClose: () => void; onActionDone: () => void; initialTab: TabType;
}) {
  const { t, language } = useTranslation();
  const [detail, setDetail] = useState<PublicationReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ action: PublicationAction; label: string } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const currentAdminId = (() => {
    try { const token = getToken(); return JSON.parse(atob(token!.split('.')[1])).sub as number; }
    catch { return 0; }
  })();

  useEffect(() => {
    setLoading(true);
    adminReportsService.getPublicationReportDetail(publicationId)
      .then(setDetail)
      .catch(() => setToast({ msg: t('reported_page.load_error'), ok: false }))
      .finally(() => setLoading(false));
  }, [publicationId]);

  const handleAction = async (action: PublicationAction) => {
    setActionLoading(true);
    setConfirm(null);
    try {
      const res = await adminReportsService.takePublicationAction(publicationId, action, undefined);
      setToast({ msg: res.message, ok: true });
      setTimeout(() => { onActionDone(); onClose(); }, 1400);
    } catch (err) {
      setToast({ msg: err instanceof Error ? err.message : t('reported_page.load_error'), ok: false });
    } finally {
      setActionLoading(false);
    }
  };

  const requestAction = (action: PublicationAction, label: string) => {
    if (action === 'unpublish' || action === 'republish') {
      setConfirm({ action, label });
    } else {
      handleAction(action);
    }
  };

  const isRejected = detail?.publication.status === 'rejected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {confirm && (
        <ConfirmModal
          title={confirm.action === 'unpublish' ? t('reported_page.confirm_unpublish_title') : t('reported_page.confirm_republish_title')}
          description={confirm.action === 'unpublish' ? t('reported_page.confirm_unpublish_desc') : t('reported_page.confirm_republish_desc')}
          confirmLabel={confirm.label}
          confirmCls={confirm.action === 'unpublish'
            ? 'text-white bg-red-500 hover:bg-red-600'
            : 'text-white bg-emerald-500 hover:bg-emerald-600'}
          onConfirm={() => handleAction(confirm.action)}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <Flag size={15} className="text-red-500" />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">{t('reported_page.drawer_pub_title')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          {([
            { key: 'analysis',  Icon: Shield,        labelKey: 'reported_page.tab_analysis' },
            { key: 'reports',   Icon: Flag,          labelKey: 'reported_page.tab_reports' },
            { key: 'notes',     Icon: MessageSquare, labelKey: 'reported_page.tab_notes' },
          ] as const).map(({ key, Icon, labelKey }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-[#00926B] text-[#00926B]'
                  : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={12} /> {t(labelKey)}
            </button>
          ))}
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
              <p className="text-sm text-gray-400">{t('reported_page.load_detail_error')}</p>
              <button onClick={() => { setLoading(true); adminReportsService.getPublicationReportDetail(publicationId).then(setDetail).catch(() => {}).finally(() => setLoading(false)); }}
                className="mt-3 text-xs text-[#00926B] hover:underline">{t('reported_page.retry')}</button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* ── Analysis tab ── */}
            {activeTab === 'analysis' && (
              <div className="p-6 space-y-6">
                {/* Publication info */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">{detail.publication.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ${PUBLICATION_STATUS_LABEL_KEYS[detail.publication.status]?.cls ?? 'text-gray-500 bg-gray-100'}`}>
                      {PUBLICATION_STATUS_LABEL_KEYS[detail.publication.status]
                        ? t(PUBLICATION_STATUS_LABEL_KEYS[detail.publication.status].labelKey)
                        : detail.publication.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t('reported_page.author_label')} <span className="font-medium text-gray-700 dark:text-gray-300">{detail.publication.author.name}</span>
                  </p>
                  <p className="text-xs text-gray-400 line-clamp-3">{detail.publication.content}</p>
                </div>

                {/* Intelligence */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('reported_page.section_ai')}</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { labelKey: 'reported_page.stat_risk_score',       value: detail.intelligence.riskScore,       Icon: TrendingUp },
                      { labelKey: 'reported_page.stat_reports_24h',      value: detail.intelligence.recentCount,     Icon: Clock },
                      { labelKey: 'reported_page.stat_unique_reporters', value: detail.intelligence.uniqueReporters, Icon: User },
                    ].map(({ labelKey, value, Icon }) => (
                      <div key={labelKey} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                        <Icon size={14} className="mx-auto text-gray-400 mb-1" />
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t(labelKey)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{t('reported_page.level_label')}</span>
                      <RiskBadge level={detail.intelligence.riskLevel} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">{t('reported_page.trend_label')}</span>
                      <TrendIcon trend={(detail.intelligence as any).trend ?? 'stable'} />
                    </div>
                  </div>
                  <div className={`flex items-start gap-3 p-3 rounded-xl border ${SEVERITY_COLORS[detail.intelligence.recommendation.severity]}`}>
                    <Shield size={15} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">{t('reported_page.recommendation_title')}</p>
                      <p className="text-xs mt-0.5">{detail.intelligence.recommendation.label}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 font-medium">{t('reported_page.top_reasons_title')}</p>
                    {detail.intelligence.topReasons.map(({ reason, count, severity }) => (
                      <div key={reason} className="flex items-center gap-2">
                        <span className="text-xs text-gray-700 dark:text-gray-300 w-36 truncate">
                          {REASON_LABEL_KEYS[reason] ? t(REASON_LABEL_KEYS[reason]) : reason}
                        </span>
                        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, (severity / 10) * 100)}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-4 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button onClick={() => handleAction('review_all')} disabled={actionLoading}
                    className="py-2.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                    <CheckCircle size={13} /> {t('reported_page.action_review')}
                  </button>
                  <button onClick={() => handleAction('dismiss_all')} disabled={actionLoading}
                    className="py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                    <XCircle size={13} /> {t('reported_page.action_dismiss')}
                  </button>
                  <button onClick={() => handleAction('warn_author')} disabled={actionLoading}
                    className="py-2.5 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                    <AlertTriangle size={13} /> {t('reported_page.action_warn_author')}
                  </button>
                  {isRejected ? (
                    <button onClick={() => requestAction('republish', t('reported_page.action_republish'))} disabled={actionLoading}
                      className="py-2.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <RotateCcw size={13} /> {t('reported_page.action_republish')}
                    </button>
                  ) : (
                    <button onClick={() => requestAction('unpublish', t('reported_page.action_unpublish'))} disabled={actionLoading}
                      className="py-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5">
                      <EyeOff size={13} /> {t('reported_page.action_unpublish')}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Reports tab ── */}
            {activeTab === 'reports' && (
              <div className="p-6 space-y-3">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {t('reported_page.individual_reports_title', { count: detail.reports.length })}
                </h4>
                {detail.reports.length === 0 && (
                  <p className="text-xs text-gray-400 italic">{t('reported_page.no_reports')}</p>
                )}
                {detail.reports.map((r) => (
                  <div key={r.id} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                        {REASON_LABEL_KEYS[r.reason] ? t(REASON_LABEL_KEYS[r.reason]) : r.reason}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'pending' ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' : r.status === 'reviewed' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-gray-400 bg-gray-100 dark:bg-gray-800'}`}>
                        {r.status === 'pending' ? t('reported_page.status_pending') : r.status === 'reviewed' ? t('reported_page.status_reviewed') : t('reported_page.status_dismissed')}
                      </span>
                    </div>
                    {r.details && <p className="text-xs text-gray-500 dark:text-gray-400 italic">{r.details}</p>}
                    <p className="text-xs text-gray-400">Par <span className="font-medium">{r.reporter.name}</span> · {new Date(r.createdAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}</p>
                  </div>
                ))}
              </div>
            )}

            {/* ── Notes tab ── */}
            {activeTab === 'notes' && (
              <div className="p-6">
                <AdminNotesSection type="publication" targetId={publicationId} currentAdminId={currentAdminId} />
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────


export default function ReportedPublicationsPage() {
  const { t, language } = useTranslation();
  const router = useRouter();
  const [isCheckingRole, setIsCheckingRole] = useState(true);
  const [data, setData] = useState<PublicationReportListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<{ id: number; tab: TabType } | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportRef   = useRef<HTMLDivElement>(null);

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
      const res = await adminReportsService.getReportedPublications({
        status: statusFilter, riskLevel: riskFilter, search, page, limit: 15,
      });
      setData(res);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('reported_page.load_error'), false);
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
    const RISK_LABELS: Record<string, string>   = { critical: t('reported_page.export_risk_critical'), high: t('reported_page.export_risk_high'), medium: t('reported_page.export_risk_medium'), low: t('reported_page.export_risk_low') };
    const STATUS_LABELS: Record<string, string> = { published: t('reported_page.export_status_published'), pending: t('reported_page.export_status_pending'), rejected: t('reported_page.export_status_rejected'), draft: t('reported_page.export_status_draft') };
    const TREND_LABELS: Record<string, string>  = { up: t('reported_page.export_trend_up'), down: t('reported_page.export_trend_down'), stable: t('reported_page.export_trend_stable') };

    let content: string;
    let filename: string;

    if (format === 'json') {
      content  = JSON.stringify({ exportedAt: new Date().toISOString(), total: data?.total ?? 0, summary: data?.summary, items }, null, 2);
      filename = 'reported-publications.json';
    } else {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const header = [
        t('reported_page.export_col_id'), t('reported_page.export_col_title'), t('reported_page.export_col_author'),
        t('reported_page.export_col_risk_level'), t('reported_page.export_col_score'), t('reported_page.export_col_reports'),
        t('reported_page.export_col_pending'), t('reported_page.export_col_top_reason'), t('reported_page.export_col_status'),
        t('reported_page.export_col_trend'), t('reported_page.export_col_last_report'),
      ];
      const rows = items.map(item => [
        String(item.publicationId),
        esc(item.title),
        esc(item.authorName),
        RISK_LABELS[item.riskLevel]     ?? item.riskLevel,
        String(item.riskScore),
        String(item.reportCount),
        String(item.pendingCount),
        item.topReason ? esc(REASON_LABEL_KEYS[item.topReason] ? t(REASON_LABEL_KEYS[item.topReason]) : item.topReason) : '',
        STATUS_LABELS[item.publicationStatus] ?? item.publicationStatus,
        TREND_LABELS[item.trend]        ?? item.trend,
        item.lastReportAt ? new Date(item.lastReportAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US') : '',
      ]);
      content  = [header, ...rows].map(r => r.join(',')).join('\n');
      filename = 'reported-publications.csv';
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
      {selected !== null && (
        <PublicationDetailDrawer
          publicationId={selected.id}
          initialTab={selected.tab}
          onClose={() => setSelected(null)}
          onActionDone={() => { load(); showToast(t('reported_page.action_done'), true); }}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('reported_page.pub_title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {(data?.total ?? 0) <= 1
                ? t('reported_page.pub_subtitle_one',    { count: data?.total ?? 0 })
                : t('reported_page.pub_subtitle_plural', { count: data?.total ?? 0 })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen(o => !o)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Download size={13} /> {t('reported_page.export')}
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
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {t('reported_page.refresh')}
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

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {([
            { labelKey: 'reported_page.risk_critical', value: summary?.critical ?? 0,    color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-900/20',      ring: 'ring-red-400',    isActive: riskFilter === 'critical',   click: () => { setRiskFilter(riskFilter === 'critical' ? 'all' : 'critical'); setPage(1); } },
            { labelKey: 'reported_page.risk_high',     value: summary?.high ?? 0,         color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', ring: 'ring-orange-400', isActive: riskFilter === 'high',        click: () => { setRiskFilter(riskFilter === 'high' ? 'all' : 'high'); setPage(1); } },
            { labelKey: 'reported_page.risk_medium',   value: summary?.medium ?? 0,       color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20',  ring: 'ring-amber-400',  isActive: riskFilter === 'medium',      click: () => { setRiskFilter(riskFilter === 'medium' ? 'all' : 'medium'); setPage(1); } },
            { labelKey: 'reported_page.risk_low',      value: summary?.low ?? 0,          color: 'text-gray-500 dark:text-gray-400',    bg: 'bg-gray-100 dark:bg-gray-800',      ring: 'ring-gray-400',   isActive: riskFilter === 'low',         click: () => { setRiskFilter(riskFilter === 'low' ? 'all' : 'low'); setPage(1); } },
            { labelKey: 'reported_page.status_pending',value: summary?.totalPending ?? 0, color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20',    ring: 'ring-blue-400',   isActive: statusFilter === 'pending',   click: () => { setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending'); setPage(1); } },
          ] as const).map(({ labelKey, value, color, bg, ring, isActive, click }) => (
            <button
              key={labelKey}
              onClick={click}
              className={`${bg} rounded-2xl p-4 text-left transition-all border-2 cursor-pointer ${
                isActive ? `border-current ring-2 ${ring}/40 shadow-md` : 'border-transparent hover:border-current/20 hover:opacity-90'
              }`}
            >
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t(labelKey)}</p>
              {isActive && <p className={`text-xs mt-1 font-medium ${color} opacity-80`}>{t('reported_page.active_filter')}</p>}
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
              placeholder={t('reported_page.search_pub_placeholder')}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00926B]/30 focus:border-[#00926B]"
            />
          </div>

          <select
            value={riskFilter}
            onChange={(e) => { setRiskFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00926B]/30"
          >
            <option value="all">{t('reported_page.all_levels')}</option>
            <option value="critical">{t('reported_page.risk_critical')}</option>
            <option value="high">{t('reported_page.risk_high')}</option>
            <option value="medium">{t('reported_page.risk_medium')}</option>
            <option value="low">{t('reported_page.risk_low')}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00926B]/30"
          >
            <option value="all">{t('reported_page.all_statuses')}</option>
            <option value="pending">{t('reported_page.status_pending')}</option>
            <option value="reviewed">{t('reported_page.reviewed_filter')}</option>
            <option value="dismissed">{t('reported_page.dismissed_filter')}</option>
          </select>

          {(riskFilter !== 'all' || statusFilter !== 'all' || search) && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl transition-colors">
              <X size={12} /> {t('reported_page.reset_filters')}
            </button>
          )}
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/40">
                  <th className="px-6 py-3 font-medium">{t('reported_page.col_publication')}</th>
                  <th className="px-4 py-3 font-medium">{t('reported_page.col_risk')}</th>
                  <th className="px-4 py-3 font-medium">{t('reported_page.col_score')}</th>
                  <th className="px-4 py-3 font-medium text-center">{t('reported_page.col_reports')}</th>
                  <th className="px-4 py-3 font-medium">{t('reported_page.col_top_reason')}</th>
                  <th className="px-4 py-3 font-medium">{t('reported_page.col_status')}</th>
                  <th className="px-4 py-3 font-medium">{t('reported_page.col_trend')}</th>
                  <th className="px-4 py-3 font-medium">{t('reported_page.col_last_report')}</th>
                  <th className="px-4 py-3 font-medium text-right">{t('reported_page.col_action')}</th>
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
                      <p className="text-sm text-gray-400">{t('reported_page.empty_pub')}</p>
                      {(riskFilter !== 'all' || statusFilter !== 'all' || search) && (
                        <button onClick={resetFilters} className="mt-2 text-xs text-[#00926B] hover:underline">{t('reported_page.reset_filters')}</button>
                      )}
                    </td>
                  </tr>
                ) : (
                  data.items.map((item) => {
                    const rc = RISK_CONFIG[item.riskLevel];
                    const sc = PUBLICATION_STATUS_LABEL_KEYS[item.publicationStatus];
                    return (
                      <tr
                        key={item.publicationId}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors ${item.riskLevel === 'critical' ? 'border-l-2 border-l-red-500' : item.riskLevel === 'high' ? 'border-l-2 border-l-orange-400' : ''}`}
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
                              <span className="text-xs text-amber-500">({t('reported_page.pending_short', { count: item.pendingCount })})</span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {item.topReason ? (REASON_LABEL_KEYS[item.topReason] ? t(REASON_LABEL_KEYS[item.topReason]) : item.topReason) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${sc?.cls ?? 'text-gray-500 bg-gray-100'}`}>
                            {sc ? t(sc.labelKey) : item.publicationStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <TrendIcon trend={item.trend} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {item.lastReportAt ? new Date(item.lastReportAt).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setSelected({ id: item.publicationId, tab: 'analysis' })}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-lg transition-colors">
                              <Shield size={11} /> {t('reported_page.tab_analysis')}
                            </button>
                            <button onClick={() => setSelected({ id: item.publicationId, tab: 'reports' })}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 text-xs font-medium rounded-lg transition-colors">
                              <Flag size={11} /> {t('reported_page.tab_reports')}
                            </button>
                            <button onClick={() => setSelected({ id: item.publicationId, tab: 'notes' })}
                              className="inline-flex items-center gap-1 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium rounded-lg transition-colors">
                              <MessageSquare size={11} /> {t('reported_page.tab_notes')}
                            </button>
                          </div>
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
              <p className="text-xs text-gray-400">{t('reported_page.pagination', { total: data.total, page: data.page, pages: data.totalPages })}</p>
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
