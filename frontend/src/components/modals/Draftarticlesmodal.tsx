'use client';

import { getToken } from '../../../services/auth.service';
import { useState, useEffect } from 'react';
import { toast } from '@/components/modals/ToastContainer';
import { X, FileText, Clock, ChevronRight, Loader2, Trash2, Edit3, AlertCircle } from 'lucide-react';
import CreateArticleModal from './CreateArticleModal';

interface DraftArticle {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: number;
    name: string;
  };
  tags?: Array<{ id: number; name: string }>;
}

interface DraftArticlesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDraftUpdated?: () => void;
}

export default function DraftArticlesModal({
  isOpen,
  onClose,
  onDraftUpdated,
}: DraftArticlesModalProps) {
  const [drafts, setDrafts] = useState<DraftArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    if (isOpen) {
      loadDrafts();
    }
  }, [isOpen]);

  const loadDrafts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getToken();
      if (!token) throw new Error('Non authentifié');

      const res = await fetch(`${API_URL}/articles/my/drafts`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Erreur ${res.status}`);

      const data = await res.json();
      const articles = Array.isArray(data) ? data : [];
      setDrafts(articles);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des brouillons');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDraft = (draftId: number) => {
    setSelectedDraftId(String(draftId));
    setIsEditModalOpen(true);
  };

  const handleDeleteDraft = async (e: React.MouseEvent, draftId: number) => {
    e.stopPropagation();
    if (!window.confirm('Supprimer ce brouillon ?')) return;

    setDeletingId(draftId);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/articles/${draftId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Suppression échouée');
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      onDraftUpdated?.();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setSelectedDraftId(null);
    loadDrafts();
    onDraftUpdated?.();
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffD = Math.floor(diffH / 24);
    if (diffD > 0) return `il y a ${diffD} jour${diffD > 1 ? 's' : ''}`;
    if (diffH > 0) return `il y a ${diffH}h`;
    return 'il y a quelques minutes';
  };

  const truncateContent = (content: string, maxLen = 80) => {
    const plain = content.replace(/[#*`>\[\]!]/g, '').replace(/\n+/g, ' ').trim();
    return plain.length > maxLen ? plain.substring(0, maxLen) + '…' : plain;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[99998] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <div
          className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden"
          style={{ animation: 'draftSlideUp 0.25s cubic-bezier(0.16,1,0.3,1)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <FileText size={18} className="text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Brouillons
                </h2>
                {!isLoading && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {drafts.length} brouillon{drafts.length !== 1 ? 's' : ''} sauvegardé{drafts.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={28} className="animate-spin text-[#00926B]" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Chargement des brouillons…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
                <AlertCircle size={28} className="text-red-400" />
                <p className="text-sm text-red-500 text-center">{error}</p>
                <button
                  onClick={loadDrafts}
                  className="text-xs text-[#00926B] hover:underline"
                >
                  Réessayer
                </button>
              </div>
            ) : drafts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                  <FileText size={28} className="text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aucun brouillon</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                  Vos articles sauvegardés comme brouillons apparaîtront ici.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {drafts.map((draft) => (
                  <li key={draft.id}>
                    <div
                      onClick={() => handleOpenDraft(draft.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && handleOpenDraft(draft.id)}
                      className="w-full text-left px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group flex items-start gap-4 cursor-pointer"
                    >
                      {/* Icon */}
                      <div className="mt-0.5 w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                        <Edit3 size={14} className="text-amber-500 dark:text-amber-400" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-[#00926B] dark:group-hover:text-[#00B383] transition-colors">
                          {draft.title || <span className="italic text-gray-400">Sans titre</span>}
                        </p>
                        {draft.content && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                            {truncateContent(draft.content)}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                            <Clock size={10} />
                            {getTimeAgo(draft.updatedAt || draft.createdAt)}
                          </span>
                          {draft.category && (
                            <span className="text-xs px-2 py-0.5 bg-[#00926B]/10 dark:bg-[#00926B]/20 text-[#00926B] dark:text-[#00B383] rounded-full font-medium">
                              {draft.category.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={(e) => handleDeleteDraft(e, draft.id)}
                          disabled={deletingId === draft.id}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Supprimer"
                        >
                          {deletingId === draft.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                        <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {!isLoading && drafts.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                Cliquez sur un brouillon pour le modifier et le publier
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reuse CreateArticleModal in edit mode */}
      {isEditModalOpen && selectedDraftId && (
        <CreateArticleModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedDraftId(null);
          }}
          onSuccess={handleEditSuccess}
          articleId={selectedDraftId}
        />
      )}

      <style jsx global>{`
        @keyframes draftSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </>
  );
}