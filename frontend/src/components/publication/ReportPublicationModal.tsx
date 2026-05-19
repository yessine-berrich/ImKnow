// components/publication/ReportPublicationModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { X, Flag, AlertTriangle, Check } from 'lucide-react';
import { publicationService } from '../../../services/publication.service';

const REPORT_REASONS = [
  {
    value: 'misinformation',
    label: 'Désinformation',
    description: 'Contenu faux, trompeur ou non vérifié',
  },
  {
    value: 'spam',
    label: 'Spam',
    description: 'Contenu répétitif, promotionnel ou hors-sujet',
  },
  {
    value: 'inappropriate_content',
    label: 'Contenu inapproprié',
    description: 'Contenu offensant, choquant ou non adapté',
  },
  {
    value: 'plagiarism',
    label: 'Plagiat',
    description: 'Contenu copié sans source ou attribution',
  },
  {
    value: 'hate_speech',
    label: 'Discours haineux',
    description: 'Incitation à la haine, discrimination',
  },
  {
    value: 'other',
    label: 'Autre',
    description: 'Précisez dans le champ ci-dessous',
  },
] as const;

type ReportReason = (typeof REPORT_REASONS)[number]['value'];
type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

interface ReportPublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  publicationId: string;
  publicationTitle: string;
}

export default function ReportPublicationModal({
  isOpen,
  onClose,
  publicationId,
  publicationTitle,
}: ReportPublicationModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Reset on open/close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedReason(null);
        setDetails('');
        setStatus('idle');
        setErrorMessage('');
      }, 200);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setStatus('submitting');
    setErrorMessage('');
    try {
      await publicationService.reportPublication(
        parseInt(publicationId),
        selectedReason,
        details.trim() || undefined,
      );
      setStatus('success');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error ? err.message : 'Une erreur est survenue. Veuillez réessayer.',
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">

        {/* ── Header ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
              <Flag size={16} className="text-red-500 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Signaler l'publication</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[260px]">{publicationTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Success state ─────────────────────────────────────────────────────── */}
        {status === 'success' ? (
          <div className="flex flex-col items-center justify-center gap-4 px-8 py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
              <Check size={32} className="text-emerald-500" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Signalement envoyé</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Merci de nous aider à maintenir la qualité de la plateforme. Notre équipe va examiner ce contenu.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 bg-[#00926B] hover:bg-[#00B383] text-white text-sm font-semibold rounded-xl transition-all active:scale-95"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">

            {/* ── Reason list ────────────────────────────────────────────────────── */}
            <div className="px-5 pt-4 pb-2">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Motif du signalement
              </p>
              <div className="space-y-2">
                {REPORT_REASONS.map(({ value, label, description }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedReason(value)}
                    className={`w-full flex items-start gap-3 px-3.5 py-3 rounded-xl border text-left transition-all ${
                      selectedReason === value
                        ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    {/* radio dot */}
                    <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      selectedReason === value
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {selectedReason === value && (
                        <span className="w-2 h-2 rounded-full bg-red-500 dark:bg-red-400" />
                      )}
                    </span>
                    <div>
                      <p className={`text-sm font-semibold ${
                        selectedReason === value
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}>
                        {label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Optional details ───────────────────────────────────────────────── */}
            <div className="px-5 py-4">
              <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">
                Précisions <span className="normal-case font-normal text-gray-400">(optionnel)</span>
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Décrivez le problème en quelques mots…"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/50 focus:border-red-300 dark:focus:border-red-700 transition-all resize-none"
              />
              <p className="text-right text-xs text-gray-400 mt-1">{details.length}/1000</p>
            </div>

            {/* ── Error ──────────────────────────────────────────────────────────── */}
            {status === 'error' && (
              <div className="mx-5 mb-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertTriangle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────────────────────── */}
        {status !== 'success' && (
          <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-2 flex-shrink-0">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedReason || status === 'submitting'}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                !selectedReason || status === 'submitting'
                  ? 'bg-red-200 dark:bg-red-900/30 text-red-400 dark:text-red-600 cursor-not-allowed'
                  : 'bg-red-500 hover:bg-red-600 text-white active:scale-[0.98]'
              }`}
            >
              {status === 'submitting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Envoi…</span>
                </>
              ) : (
                <>
                  <Flag size={14} />
                  <span>Signaler</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
