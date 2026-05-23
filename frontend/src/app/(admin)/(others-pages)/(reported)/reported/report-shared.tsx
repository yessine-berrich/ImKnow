'use client';

import React, { useState } from 'react';
import { AlertTriangle, Sparkles, X } from 'lucide-react';
import type { AiAnalysis, RiskLevel } from '../../../../../../services/admin-reports.service';
import { useTranslation } from '@/context/LanguageContext';

const RC: Record<string, { text: string; dot: string; border: string; bg: string }> = {
  critical: { bg: 'bg-red-50 dark:bg-red-900/20',    text: 'text-red-600 dark:text-red-400',    dot: 'bg-red-500',    border: 'border-red-200 dark:border-red-800' },
  high:     { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500', border: 'border-orange-200 dark:border-orange-800' },
  medium:   { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-600 dark:text-amber-400',  dot: 'bg-amber-400',  border: 'border-amber-200 dark:border-amber-800' },
  low:      { bg: 'bg-gray-50 dark:bg-gray-800/60',   text: 'text-gray-500 dark:text-gray-400',   dot: 'bg-gray-400',   border: 'border-gray-200 dark:border-gray-700' },
};

const AI_ACTIONS: Record<string, { label: string; cls: string }> = {
  dismiss: { label: 'Rejeter',   cls: 'text-gray-500 bg-gray-100 dark:bg-gray-800' },
  review:  { label: 'Examiner',  cls: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
  warn:    { label: 'Avertir',   cls: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  hide:    { label: 'Masquer',   cls: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20' },
  ban:     { label: 'Suspendre', cls: 'text-red-600 bg-red-50 dark:bg-red-900/20' },
};

export function AiAnalysisCell({ ai, sysRiskLevel }: { ai: AiAnalysis | null | undefined; sysRiskLevel: RiskLevel }) {
  const { t } = useTranslation();
  const T = t as (k: string) => string;

  if (!ai || !ai.analyzedAt) {
    return <span className="text-xs text-gray-400 italic">{T('reported_page.ai_not_analyzed')}</span>;
  }

  const aiLvl     = ai.riskLevel ?? 'low';
  const rc        = RC[aiLvl] ?? RC.low;
  const act       = ai.recommendedAction ? (AI_ACTIONS[ai.recommendedAction] ?? null) : null;
  const pct       = Math.round((ai.confidence ?? 0) * 100);
  const isConflict = ai.riskLevel !== null && ai.riskLevel !== sysRiskLevel;

  return (
    <div className="flex flex-col gap-0.5 min-w-[100px]">
      <div className="flex items-center gap-1 flex-wrap">
        <Sparkles size={9} className="text-purple-500 flex-shrink-0" />
        <span className={`text-xs font-semibold ${rc.text}`}>{aiLvl}</span>
        {isConflict && (
          <span className="px-1 text-[9px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800 leading-none">
            ≠
          </span>
        )}
      </div>
      {act && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit ${act.cls}`}>
          {act.label}
        </span>
      )}
      <span className="text-[10px] text-gray-400">{pct}% conf.</span>
    </div>
  );
}

export function BulkActionBar<T extends string>({
  count,
  actions,
  onAction,
  onClear,
}: {
  count: number;
  actions: { action: T; label: string; cls: string }[];
  onAction: (action: T) => void;
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl border border-gray-700 whitespace-nowrap">
      <span className="text-sm font-semibold text-gray-100">{count} sélectionné(s)</span>
      <div className="w-px h-5 bg-gray-600" />
      {actions.map(({ action, label, cls }) => (
        <button key={action} onClick={() => onAction(action)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${cls}`}>
          {label}
        </button>
      ))}
      <button onClick={onClear} className="ml-1 p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-white">
        <X size={14} />
      </button>
    </div>
  );
}

export function ConfirmActionModal({
  title,
  description,
  confirmLabel,
  confirmCls,
  withNote,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmCls: string;
  withNote?: boolean;
  onConfirm: (note?: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
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
        {withNote && (
          <div className="mb-4">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Motif de décision, commentaire…"
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00926B]/30 resize-none"
            />
          </div>
        )}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {t('reported_page.cancel')}
          </button>
          <button
            onClick={() => onConfirm(withNote && note.trim() ? note.trim() : undefined)}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors ${confirmCls}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
